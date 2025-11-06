import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from extensions import db
from utils.db_admin import admin_session_scope
from models import User, UserRole, AppSetting, UserQuota, ApiUsage, GameSession, PasswordReset, UserDailyReset
from constants import DEFAULT_DAILY_FREE_LIMIT
 


admin_bp = Blueprint('admin', __name__)


def require_admin() -> User | None:
    """Authorize admin access.

    Allows either:
    - The logged-in username equals env ADMIN, or
    - The user has role 'admin' in DB.
    """
    username = get_jwt_identity()
    if not username:
        return None

    # Prefer explicit env-configured admin username
    env_admin = (os.getenv('ADMIN') or '').strip()
    if env_admin and username == env_admin:
        return User.query.filter_by(username=username).first()

    # Fallback to role-based check
    user = User.query.filter_by(username=username).first()
    if not user:
        return None
    ur = UserRole.query.filter_by(user_id=user.id).first()
    role = ur.role if ur else None
    if role != 'admin':
        return None
    return user


@admin_bp.route('/admin/settings', methods=['GET'])
@jwt_required()
def get_settings():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    settings = { s.key: s.value for s in AppSetting.query.all() }
    if 'DAILY_FREE_LIMIT' not in settings:
        settings['DAILY_FREE_LIMIT'] = str(DEFAULT_DAILY_FREE_LIMIT)
    # total free calls limit is deprecated; only daily limit is used
    return jsonify({'success': True, 'settings': settings})


@admin_bp.route('/admin/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    changed = {}
    if 'DAILY_FREE_LIMIT' in data:
        val = str(max(0, int(data['DAILY_FREE_LIMIT'])))
        with admin_session_scope() as s:
            row = s.query(AppSetting).filter_by(key='DAILY_FREE_LIMIT').first()
            if not row:
                row = AppSetting(key='DAILY_FREE_LIMIT', value=val)
                s.add(row)
            else:
                row.value = val
        changed['DAILY_FREE_LIMIT'] = val
    # ignore FREE_CALLS_LIMIT (deprecated)
    return jsonify({'success': True, 'changed': changed})


@admin_bp.route('/admin/users/role', methods=['POST'])
@jwt_required()
def set_user_role():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    role = (data.get('role') or 'user').strip()
    if role not in ('user', 'admin'):
        return jsonify({'success': False, 'error': 'Invalid role'}), 400
    with admin_session_scope() as s:
        user = s.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        ur = s.query(UserRole).filter_by(user_id=user.id).first()
        if not ur:
            ur = UserRole(user_id=user.id, role=role)
            s.add(ur)
        else:
            ur.role = role
    return jsonify({'success': True})


@admin_bp.route('/admin/users/quota', methods=['POST'])
@jwt_required()
def set_user_quota():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    limit = int(data.get('daily_limit') or 0)
    if limit < 0:
        return jsonify({'success': False, 'error': 'Invalid limit'}), 400
    with admin_session_scope() as s:
        user = s.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        uq = s.query(UserQuota).filter_by(user_id=user.id).first()
        if not uq:
            uq = UserQuota(user_id=user.id, daily_limit=limit)
            s.add(uq)
        else:
            uq.daily_limit = limit
    return jsonify({'success': True})


@admin_bp.route('/admin/usage/reset', methods=['POST'])
@jwt_required()
def reset_usage():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()

    # Instead of DELETE (which may be denied), set counts to 0 via UPDATE
    try:
        with admin_session_scope() as s:
            if username in ('*', 'all', ''):
                updated = s.query(ApiUsage).update({
                    ApiUsage.count: 0,
                    ApiUsage.last_used_at: func.current_timestamp()
                })
                return jsonify({'success': True, 'reset': 'all', 'rows': int(updated or 0)})

            user = s.query(User).filter_by(username=username).first()
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 404

            updated = s.query(ApiUsage).filter_by(user_id=user.id).update({
                ApiUsage.count: 0,
                ApiUsage.last_used_at: func.current_timestamp()
            })
            return jsonify({'success': True, 'reset': username, 'rows': int(updated or 0)})
    except Exception as e:
        # Provide clearer guidance if UPDATE is also denied
        msg = str(e)
        if '1142' in msg and 'command denied' in msg.lower():
            return jsonify({'success': False, 'error': 'Database permission denied for UPDATE on api_usage. Grant UPDATE or perform reset with DB admin.'}), 500
        return jsonify({'success': False, 'error': msg}), 500


@admin_bp.route('/admin/usage/reset-today', methods=['POST'])
@jwt_required()
def reset_usage_today():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    from datetime import datetime
    from models import UserDailyReset
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    now = datetime.utcnow()
    today = now.date()

    try:
        with admin_session_scope() as s:
            if username in ('*', 'all', ''):
                # Set/reset marker for all known users present in ApiUsage table
                user_ids = [r[0] for r in s.query(ApiUsage.user_id).distinct().all()]
                for uid in user_ids:
                    row = s.query(UserDailyReset).filter_by(user_id=uid, date=today).first()
                    if not row:
                        row = UserDailyReset(user_id=uid, date=today, reset_at=now)
                        s.add(row)
                    else:
                        row.reset_at = now
                return jsonify({'success': True, 'reset_today': 'all', 'users': len(user_ids)})

            user = s.query(User).filter_by(username=username).first()
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 404
            row = s.query(UserDailyReset).filter_by(user_id=user.id, date=today).first()
            if not row:
                row = UserDailyReset(user_id=user.id, date=today, reset_at=now)
                s.add(row)
            else:
                row.reset_at = now
            return jsonify({'success': True, 'reset_today': username})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500



@admin_bp.route('/admin/users/delete', methods=['POST'])
@jwt_required()
def delete_user_and_related():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    if not username:
        return jsonify({'success': False, 'error': 'Username is required'}), 400

    try:
        with admin_session_scope() as s:
            user = s.query(User).filter_by(username=username).first()
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 404

            # Do not allow deleting admin users
            ur = s.query(UserRole).filter_by(user_id=user.id).first()
            if ur and ur.role == 'admin':
                return jsonify({'success': False, 'error': 'not enough privilege to delete an admin'}), 403

            deleted = {}
            deleted['api_usage'] = s.query(ApiUsage).filter_by(user_id=user.id).delete(synchronize_session=False) or 0
            deleted['game_sessions'] = s.query(GameSession).filter_by(user_id=user.id).delete(synchronize_session=False) or 0
            deleted['password_resets'] = s.query(PasswordReset).filter_by(user_id=user.id).delete(synchronize_session=False) or 0
            deleted['user_daily_resets'] = s.query(UserDailyReset).filter_by(user_id=user.id).delete(synchronize_session=False) or 0
            deleted['user_roles'] = s.query(UserRole).filter_by(user_id=user.id).delete(synchronize_session=False) or 0
            deleted['user_quotas'] = s.query(UserQuota).filter_by(user_id=user.id).delete(synchronize_session=False) or 0
            # finally remove the user record itself
            deleted['users'] = s.query(User).filter_by(id=user.id).delete(synchronize_session=False) or 0
            return jsonify({'success': True, 'deleted': deleted})
    except Exception as e:
        msg = str(e)
        if '1142' in msg and 'denied' in msg.lower():
            return jsonify({'success': False, 'error': 'Database permission denied for DELETE on one or more tables. Use admin DB user or adjust grants.'}), 500
        return jsonify({'success': False, 'error': msg}), 500
