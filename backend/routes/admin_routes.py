import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from extensions import db
from utils.db_admin import admin_session_scope
from models import User, UserRole, AppSetting, UserQuota, ApiUsage, GameSession, PasswordReset, UserDailyReset, ApiStatistic, SavedGame
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
    """Get application settings.
    Retrieves all application-wide settings, such as daily usage limits.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    responses:
      200:
        description: Settings retrieved successfully.
        schema:
          type: object
          properties:
            success:
              type: boolean
            settings:
              type: object
              properties:
                DAILY_FREE_LIMIT:
                  type: string
                  description: The global daily limit for free puzzle generations per user.
      403:
        description: Forbidden. The current user is not an admin.
    """
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
    """Update application settings.
    Updates one or more application-wide settings.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            DAILY_FREE_LIMIT:
              type: integer
              description: The new global daily limit for free puzzle generations.
              example: 25
    responses:
      200:
        description: Settings updated successfully.
        schema:
          type: object
          properties:
            success:
              type: boolean
            changed:
              type: object
              description: A map of the settings that were successfully changed.
      403:
        description: Forbidden. The current user is not an admin.
    """
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
    """Set a user's role.
    Assigns a role ('user' or 'admin') to a specific user.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [username, role]
          properties:
            username:
              type: string
              description: The username of the target user.
            role:
              type: string
              description: The role to assign.
              enum: ['user', 'admin']
    responses:
      200:
        description: User role updated successfully.
      400:
        description: Invalid role specified.
      403:
        description: Forbidden. The current user is not an admin.
      404:
        description: User not found.

    """
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
    """Set a user's daily puzzle generation quota.
    Overrides the global daily limit for a specific user.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [username, daily_limit]
          properties:
            username:
              type: string
              description: The username of the target user.
            daily_limit:
              type: integer
              description: The custom daily limit to set for the user.
    responses:
      200:
        description: User quota updated successfully.
      400:
        description: Invalid limit provided.
      403:
        description: Forbidden. The current user is not an admin.
      404:
        description: User not found.
    """
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
    """Reset API usage counts.
    Resets the historical API usage counts for a specific user or all users.
    This is a legacy endpoint and `reset-today` is generally preferred.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: false
        schema:
          type: object
          properties:
            username:
              type: string
              description: The username to reset. If omitted or set to '*', resets all users.
              example: 'testuser'
    responses:
      200:
        description: Usage counts reset successfully.
        schema:
          type: object
          properties:
            success: { type: boolean }
            reset: { type: string, description: "Username or 'all' that was reset." }
            rows: { type: integer, description: "Number of records updated." }
      403:
        description: Forbidden. The current user is not an admin.
      404:
        description: User not found (if a specific username was provided).
    """
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
    """Reset today's daily puzzle limit for a user.
    Allows a user to bypass the daily generation limit for the current day.
    This works by creating a reset marker; it does not delete any history.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: false
        schema:
          type: object
          properties:
            username:
              type: string
              description: The username to reset for today. If omitted or set to '*', resets all users.
              example: 'testuser'
    responses:
      200:
        description: Daily limit reset successfully for the user(s).
      403:
        description: Forbidden. The current user is not an admin.
      404:
        description: User not found (if a specific username was provided).
      500:
        description: Internal server error during the reset operation.
    """
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

@admin_bp.route('/admin/usage/stats', methods=['GET'])
@jwt_required()
def get_api_usage_stats():
    """Get API endpoint usage statistics.
    Retrieves the total call count for each API endpoint recorded by the system.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    responses:
      200:
        description: API statistics retrieved successfully.
        schema:
          type: object
          properties:
            success: { type: boolean }
            stats:
              type: array
              items:
                type: object
                properties:
                  method: { type: string }
                  endpoint: { type: string }
                  count: { type: integer }
      403:
        description: Forbidden. The current user is not an admin.
    """
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    try:
        with admin_session_scope() as s:
            stats = s.query(
                ApiStatistic.method,
                ApiStatistic.endpoint,
                ApiStatistic.count
            ).filter(ApiStatistic.endpoint.startswith('/api'))
            result = [
                {
                    'method': row.method,
                    'endpoint': row.endpoint,
                    'count': row.count
                }
                for row in stats
            ]
            return jsonify({'success': True, 'stats': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/admin/users/delete', methods=['POST'])
@jwt_required()
def delete_user_and_related():
    """Delete a user and all their associated data.
    Permanently removes a user and all related records (saved games, usage data, roles, etc.).
    This action is irreversible. Admins cannot be deleted via this endpoint.
    Requires admin privileges.
    ---
    tags:
      - Admin
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [username]
          properties:
            username:
              type: string
              description: The username of the user to delete.
    responses:
      200:
        description: User and all related data deleted successfully.
        schema:
          type: object
          properties:
            success: { type: boolean }
            deleted:
              type: object
              description: A count of deleted records from each database table.
      400:
        description: Username is required.
      403:
        description: Forbidden. The current user is not an admin or is trying to delete another admin.
      404:
        description: User not found.
    """
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
            deleted['saved_games'] = s.query(SavedGame).filter_by(user_id=user.id).delete(synchronize_session=False) or 0
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
