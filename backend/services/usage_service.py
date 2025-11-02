from typing import Optional, Dict, List
from datetime import datetime, timedelta

from extensions import db
from models import User, ApiUsage, GameSession, UserDailyReset
from models import AppSetting
from constants import DEFAULT_FREE_CALLS_LIMIT


class UsageService:
    def _get_user(self, username: str) -> Optional[User]:
        if not username:
            return None
        return User.query.filter_by(username=username).first()

    def increment(self, username: str, endpoint: str) -> None:
        """Increment usage count for a user on a given endpoint."""
        user = self._get_user(username)
        if not user or not endpoint:
            return
        usage = ApiUsage.query.filter_by(user_id=user.id, endpoint=endpoint).first()
        if not usage:
            usage = ApiUsage(user_id=user.id, endpoint=endpoint, count=1)
            db.session.add(usage)
        else:
            usage.count = (usage.count or 0) + 1
            # last_used_at auto-updates via onupdate; ensure unit of work notes change
            usage.last_used_at = datetime.utcnow()
        db.session.commit()

    def get_user_summary(self, username: str) -> Dict:
        user = self._get_user(username)
        if not user:
            return { 'total_calls': 0, 'by_endpoint': {}, 'tokens_total': 0, 'games_count': 0 }
        rows: List[ApiUsage] = ApiUsage.query.filter_by(user_id=user.id).all()
        by_endpoint = { r.endpoint: int(r.count or 0) for r in rows }
        total = sum(by_endpoint.values())
        # Aggregate tokens/games from sessions (best-effort)
        try:
            sess_rows: List[GameSession] = GameSession.query.filter_by(user_id=user.id).all()
            tokens_total = sum(int(getattr(s, 'tokens_total') or 0) for s in sess_rows)
            games_count = len(sess_rows)
        except Exception:
            tokens_total = 0
            games_count = 0
        # Fallback: if no sessions recorded, approximate games from endpoint usage
        if games_count == 0:
            games_count = int(by_endpoint.get('/api/generate-crossword', 0))
        # Fallback tokens approximation per game if tokens_total is 0 but we have games
        if tokens_total == 0 and games_count > 0:
            tokens_total = int(games_count * 1000)  # coarse approx
        # Daily free calls (server local midnight)
        try:
            s = AppSetting.query.filter_by(key='DAILY_FREE_LIMIT').first()
            daily_limit = int((s.value if s else str(DEFAULT_DAILY_FREE_LIMIT)) or str(DEFAULT_DAILY_FREE_LIMIT))
        except Exception:
            daily_limit = DEFAULT_DAILY_FREE_LIMIT
        # Count today's sessions after any reset marker
        try:
            now = datetime.now()
            start = datetime(now.year, now.month, now.day, 0, 0, 0)
            end = start + timedelta(days=1)
            sess_rows_today: List[GameSession] = GameSession.query.filter(
                GameSession.user_id == user.id,
                GameSession.started_at >= start,
                GameSession.started_at < end
            ).all()
            # Apply reset marker
            reset_row = UserDailyReset.query.filter_by(user_id=user.id, date=start.date()).first()
            used_today = 0
            for srow in sess_rows_today:
                if reset_row and srow.started_at <= reset_row.reset_at:
                    continue
                used_today += 1
        except Exception:
            used_today = 0
        daily_info = {
            'limit': int(daily_limit),
            'used': int(used_today),
            'remaining': max(0, int(daily_limit) - int(used_today))
        }
        return { 'total_calls': int(total), 'by_endpoint': by_endpoint, 'tokens_total': int(tokens_total), 'games_count': int(games_count), 'daily': daily_info }

    def get_all_summaries(self, range_opt: str = 'all') -> List[Dict]:
        """Return usage summary for all users.
        range_opt: 'all' | 'today' (UTC)
        """
        # Fetch all usage rows and aggregate per user (all-time calls)
        rows: List[ApiUsage] = ApiUsage.query.all()
        per_user: Dict[int, Dict] = {}
        for r in rows:
            entry = per_user.setdefault(r.user_id, { 'total_calls': 0, 'by_endpoint': {} })
            entry['by_endpoint'][r.endpoint] = int(entry['by_endpoint'].get(r.endpoint, 0)) + int(r.count or 0)
            entry['total_calls'] = int(entry['total_calls']) + int(r.count or 0)

        # Map to usernames
        users = { u.id: u for u in User.query.filter(User.id.in_(per_user.keys())).all() } if per_user else {}

        # Include token totals/games per user
        by_user_tokens: Dict[int, int] = {}
        by_user_games: Dict[int, int] = {}
        if range_opt == 'today':
            # Today counts: from midnight UTC, and after any reset markers
            try:
                today = datetime.utcnow().date()
                sess_rows: List[GameSession] = GameSession.query.filter(db.func.date(GameSession.started_at) == today).all()
                # Build reset map: user_id -> reset_at
                reset_rows: List[UserDailyReset] = UserDailyReset.query.filter_by(date=today).all()
                reset_map = { r.user_id: r.reset_at for r in reset_rows }
                for s in sess_rows:
                    ra = reset_map.get(s.user_id)
                    if ra and s.started_at <= ra:
                        continue
                    by_user_tokens[s.user_id] = int(by_user_tokens.get(s.user_id, 0)) + int(getattr(s, 'tokens_total') or 0)
                    by_user_games[s.user_id] = int(by_user_games.get(s.user_id, 0)) + 1
            except Exception:
                pass
        else:
            try:
                sess_rows: List[GameSession] = GameSession.query.all()
                for s in sess_rows:
                    by_user_tokens[s.user_id] = int(by_user_tokens.get(s.user_id, 0)) + int(getattr(s, 'tokens_total') or 0)
                    by_user_games[s.user_id] = int(by_user_games.get(s.user_id, 0)) + 1
            except Exception:
                pass

        result: List[Dict] = []
        for uid, data in per_user.items():
            u = users.get(uid)
            # Fallback derive games from endpoint usage if sessions absent (all-time only)
            fallback_games = int(data['by_endpoint'].get('/api/generate-crossword', 0))
            if range_opt == 'today':
                games = int(by_user_games.get(uid, 0))
            else:
                games = int(by_user_games.get(uid, 0) or fallback_games)
            tokens = int(by_user_tokens.get(uid, 0))
            if tokens == 0 and games > 0:
                tokens = int(games * 1000)  # coarse approx
            result.append({
                'username': (u.username if u else f'user:{uid}'),
                'email': (u.email if u else None),
                'total_calls': int(data['total_calls']),
                'by_endpoint': data['by_endpoint'],
                'tokens_total': tokens,
                'games_count': games,
            })
        # Sort desc by total calls
        result.sort(key=lambda x: x['total_calls'], reverse=True)
        return result
