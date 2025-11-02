from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User, UserRole, AppSetting, UserQuota, ApiUsage
from utils.security import is_admin_username


admin_bp = Blueprint('admin', __name__)


def require_admin() -> User | None:
    username = get_jwt_identity()
    if not username:
        return None
    user = User.query.filter_by(username=username).first()
    if not user:
        return None
    # Check DB role first
    ur = UserRole.query.filter_by(user_id=user.id).first()
    role = ur.role if ur else ('admin' if is_admin_username(username) else 'user')
    if role != 'admin':
        return None
    return user


@admin_bp.route('/admin/settings', methods=['GET'])
@jwt_required()
def get_settings():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    settings = { s.key: s.value for s in AppSetting.query.all() }
    # Default daily free limit = 3 if not present
    if 'DAILY_FREE_LIMIT' not in settings:
        settings['DAILY_FREE_LIMIT'] = '3'
    # Default total free calls = 20
    if 'FREE_CALLS_LIMIT' not in settings:
        settings['FREE_CALLS_LIMIT'] = '20'
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
        s = AppSetting.query.filter_by(key='DAILY_FREE_LIMIT').first()
        if not s:
            s = AppSetting(key='DAILY_FREE_LIMIT', value=val)
            db.session.add(s)
        else:
            s.value = val
        changed['DAILY_FREE_LIMIT'] = val
    if 'FREE_CALLS_LIMIT' in data:
        val = str(max(0, int(data['FREE_CALLS_LIMIT'])))
        s = AppSetting.query.filter_by(key='FREE_CALLS_LIMIT').first()
        if not s:
            s = AppSetting(key='FREE_CALLS_LIMIT', value=val)
            db.session.add(s)
        else:
            s.value = val
        changed['FREE_CALLS_LIMIT'] = val
    db.session.commit()
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
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    ur = UserRole.query.filter_by(user_id=user.id).first()
    if not ur:
        ur = UserRole(user_id=user.id, role=role)
        db.session.add(ur)
    else:
        ur.role = role
    db.session.commit()
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
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    uq = UserQuota.query.filter_by(user_id=user.id).first()
    if not uq:
        uq = UserQuota(user_id=user.id, daily_limit=limit)
        db.session.add(uq)
    else:
        uq.daily_limit = limit
    db.session.commit()
    return jsonify({'success': True})


@admin_bp.route('/admin/usage/reset', methods=['POST'])
@jwt_required()
def reset_usage():
    if not require_admin():
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    if username in ('*', 'all', ''):
        # Reset all usage counts
        try:
            ApiUsage.query.delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
        return jsonify({'success': True, 'reset': 'all'})
    # Reset single user
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    try:
        ApiUsage.query.filter_by(user_id=user.id).delete()
        db.session.commit()
        return jsonify({'success': True, 'reset': username})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
