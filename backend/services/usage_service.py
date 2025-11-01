from typing import Optional, Dict, List
from datetime import datetime

from extensions import db
from models import User, ApiUsage


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
            return { 'total_calls': 0, 'by_endpoint': {} }
        rows: List[ApiUsage] = ApiUsage.query.filter_by(user_id=user.id).all()
        by_endpoint = { r.endpoint: int(r.count or 0) for r in rows }
        total = sum(by_endpoint.values())
        return {
            'total_calls': int(total),
            'by_endpoint': by_endpoint
        }

    def get_all_summaries(self) -> List[Dict]:
        """Return usage summary for all users."""
        # Fetch all usage rows and aggregate per user
        rows: List[ApiUsage] = ApiUsage.query.all()
        per_user: Dict[int, Dict] = {}
        for r in rows:
            entry = per_user.setdefault(r.user_id, { 'total_calls': 0, 'by_endpoint': {} })
            entry['by_endpoint'][r.endpoint] = int(entry['by_endpoint'].get(r.endpoint, 0)) + int(r.count or 0)
            entry['total_calls'] = int(entry['total_calls']) + int(r.count or 0)

        # Map to usernames
        users = { u.id: u for u in User.query.filter(User.id.in_(per_user.keys())).all() }
        result: List[Dict] = []
        for uid, data in per_user.items():
            u = users.get(uid)
            result.append({
                'username': (u.username if u else f'user:{uid}'),
                'email': (u.email if u else None),
                'total_calls': int(data['total_calls']),
                'by_endpoint': data['by_endpoint']
            })
        # Sort desc by total calls
        result.sort(key=lambda x: x['total_calls'], reverse=True)
        return result

