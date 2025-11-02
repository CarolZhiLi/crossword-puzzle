from flask import Blueprint, request as flask_request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from crossword_grid_generator import CrosswordGenerator
from request import request as generate_words
from services.usage_service import UsageService
from extensions import db
from models import GameSession, User, UserRole, UserQuota, AppSetting, ApiUsage
from utils.tokens import estimate_tokens
from datetime import datetime, timedelta
from constants import DEFAULT_DAILY_FREE_LIMIT


puzzle_bp = Blueprint('puzzle', __name__)
usage = UsageService()

DIFF_LEVELS = {
    'easy': 10,
    'medium': 15,
    'hard': 20
}


@puzzle_bp.route('/generate-crossword', methods=['POST'])
def generate_crossword():
    try:
        data = flask_request.get_json() or {}

        topic = data.get('topic', 'JavaScript')
        word_count = DIFF_LEVELS.get((data.get('difficulty', 'easy') or 'easy').lower(), 10)

        # Enforce per-user daily free limit (DB-based); guests are not enforced
        try:
            verify_jwt_in_request(optional=True)
            username = get_jwt_identity()
            user = User.query.filter_by(username=username).first() if username else None
            if user:
                # Determine limit: per-user quota overrides global setting
                try:
                    uq = UserQuota.query.filter_by(user_id=user.id).first()
                except Exception:
                    uq = None
                if uq and isinstance(getattr(uq, 'daily_limit', None), int):
                    daily_limit = int(uq.daily_limit)
                else:
                    s = AppSetting.query.filter_by(key='DAILY_FREE_LIMIT').first()
                    try:
                        daily_limit = int((s.value if s else str(DEFAULT_DAILY_FREE_LIMIT)) or str(DEFAULT_DAILY_FREE_LIMIT))
                    except Exception:
                        daily_limit = DEFAULT_DAILY_FREE_LIMIT

                # Count today's sessions (server-local midnight) after any reset marker
                now = datetime.now()
                start = datetime(now.year, now.month, now.day, 0, 0, 0)
                end = start + timedelta(days=1)
                q = GameSession.query.filter(
                    GameSession.user_id == user.id,
                    GameSession.started_at >= start,
                    GameSession.started_at < end
                )
                try:
                    from models import UserDailyReset
                    rr = UserDailyReset.query.filter_by(user_id=user.id, date=start.date()).first()
                    if rr is not None:
                        q = q.filter(GameSession.started_at > rr.reset_at)
                except Exception:
                    pass
                used_today_before = q.count()
                if used_today_before >= daily_limit:
                    return jsonify({
                        'success': False,
                        'error': 'Daily free limit reached',
                        'daily': {
                            'limit': int(daily_limit),
                            'used': int(used_today_before),
                            'remaining': 0
                        }
                    }), 429
        except Exception:
            # If anything fails here, do not block puzzle generation
            pass

        prompt = (
            f"Generate {word_count} one-word terms related to {topic}. "
            f"Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description."
        )
        t0 = datetime.utcnow()
        results = generate_words(prompt)

        pairs = []
        for item in results:
            try:
                _, w, definition = item
                pairs.append((w.upper(), (definition or '').strip()))
            except Exception:
                continue

        if not pairs:
            return jsonify({'success': False, 'error': 'Word generation failed'}), 502

        words = [w for w, _ in pairs]
        definitions = {w: d for w, d in pairs}

        generator = CrosswordGenerator(words)
        success = generator.solve()

        if not success:
            return jsonify({'success': False, 'error': 'Crossword generation failed'}), 500

        used_words = [word for word, _, _, _ in generator.solution_coordinates]
        size = generator.grid_size
        grid = generator.grid

        response = {
            'success': True,
            'grid': grid,
            'words': [
                {
                    'word': word,
                    'direction': ('across' if (str(direction).upper() == 'H') else 'down'),
                    'row': row,
                    'col': col,
                    'length': len(word)
                }
                for word, col, row, direction in generator.solution_coordinates
            ],
            'definitions': definitions,
            'total_words': len(words),
            'placed_words': len(used_words),
            'grid_size': size
        }

        # Optional usage + token tracking if user is authenticated
        try:
            verify_jwt_in_request(optional=True)
            username = get_jwt_identity()
            if username:
                user = User.query.filter_by(username=username).first()
                # Increment usage first
                usage.increment(username, '/api/generate-crossword')

                # Compute daily info (server local midnight): sessions today + 1 (including this request)
                daily_limit = int((AppSetting.query.filter_by(key='DAILY_FREE_LIMIT').first() or type('X',(object,),{'value':'20'})()).value)
                used_today_before = 0
                if user:
                    now = datetime.now()
                    start = datetime(now.year, now.month, now.day, 0, 0, 0)
                    end = start + timedelta(days=1)
                    q = GameSession.query.filter(
                        GameSession.user_id == user.id,
                        GameSession.started_at >= start,
                        GameSession.started_at < end
                    )
                    # Apply reset marker if any
                    try:
                        from models import UserDailyReset
                        rr = UserDailyReset.query.filter_by(user_id=user.id, date=start.date()).first()
                        if rr is not None:
                            q = q.filter(GameSession.started_at > rr.reset_at)
                    except Exception:
                        pass
                    used_today_before = q.count()
                used_after = used_today_before + 1
                response['daily'] = {
                    'limit': daily_limit,
                    'used': used_after,
                    'remaining': max(0, daily_limit - used_after)
                }

                # Compute rough token usage
                prompt_tokens = estimate_tokens(prompt)
                # Build a completion text approximation using parsed definitions
                try:
                    completion_text = '\n'.join([f"{w}: {definitions.get(w, '')}" for w in words])
                except Exception:
                    completion_text = ''
                completion_tokens = estimate_tokens(completion_text)
                total_tokens = prompt_tokens + completion_tokens

                # Persist a game session snapshot (best-effort; ignore failures if table/perm missing)
                try:
                    if user:
                        sess = GameSession(
                            user_id=user.id,
                            topic=topic,
                            difficulty=(data.get('difficulty') or 'easy'),
                            model='gpt.newbio.net',
                            tokens_prompt=prompt_tokens,
                            tokens_completion=completion_tokens,
                            tokens_total=total_tokens,
                            words_count=len(words),
                            placed_words=len(used_words),
                            grid_size=size,
                            words_json=None,
                            definitions_json=None,
                            grid_json=None,
                            started_at=t0,
                            finished_at=datetime.utcnow(),
                            duration_ms=int(max(0, (datetime.utcnow() - t0).total_seconds() * 1000)),
                            status='completed'
                        )
                        db.session.add(sess)
                        db.session.commit()
                except Exception:
                    # Do not fail the API if we cannot record session
                    db.session.rollback()
        except Exception:
            pass

        return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
