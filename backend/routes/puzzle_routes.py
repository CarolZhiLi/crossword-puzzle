from flask import Blueprint, request as flask_request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from crossword_grid_generator import CrosswordGenerator
from request import request as generate_words
from services.usage_service import UsageService
from extensions import db
from models import GameSession, User, UserRole, UserQuota, AppSetting, ApiUsage
from utils.tokens import estimate_tokens
from datetime import datetime


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
                # Determine user and free calls info (total free limit, non-blocking)
                user = User.query.filter_by(username=username).first()
                # Total free calls limit (default 20). Admins get the same free limit but are not blocked anyway
                s = AppSetting.query.filter_by(key='FREE_CALLS_LIMIT').first()
                free_limit = int((s.value if s else '20') or '20')
                used_before = 0
                if user:
                    row = ApiUsage.query.filter_by(user_id=user.id, endpoint='/api/generate-crossword').first()
                    used_before = int((row.count if row else 0) or 0)
                # Increment usage
                usage.increment(username, '/api/generate-crossword')
                used_after = used_before + 1
                response['free'] = {
                    'limit': free_limit,
                    'used': used_after,
                    'remaining': max(0, free_limit - used_after),
                    'maxed': used_after >= free_limit
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
