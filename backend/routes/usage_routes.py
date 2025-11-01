from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.usage_service import UsageService
from utils.security import is_admin_username


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
    if not is_admin_username(username):
        return jsonify({ 'success': False, 'error': 'Forbidden' }), 403
    results = usage.get_all_summaries()
    return jsonify({ 'success': True, 'results': results })

