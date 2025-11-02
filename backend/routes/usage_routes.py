from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.usage_service import UsageService
from models import User, UserRole


usage_bp = Blueprint('usage', __name__)
usage = UsageService()


@usage_bp.route('/usage/me', methods=['GET'])
@jwt_required()
def my_usage():
    username = get_jwt_identity()
    summary = usage.get_user_summary(username)
    return jsonify({ 'success': True, 'usage': summary })


@usage_bp.route('/usage/all', methods=['GET'])
@jwt_required()
def all_usage():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    ur = UserRole.query.filter_by(user_id=user.id).first() if user else None
    if not ur or (ur.role or "").lower() != "admin":
        return jsonify({ 'success': False, 'error': 'Forbidden' }), 403
    range_opt = (request.args.get('range') or 'all').strip().lower()
    if range_opt not in ('all','today'):
        range_opt = 'all'
    results = usage.get_all_summaries(range_opt)
    return jsonify({ 'success': True, 'results': results })
