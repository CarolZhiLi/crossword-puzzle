from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.usage_service import UsageService
from models import User, UserRole
import strings


usage_bp = Blueprint('usage', __name__)
usage = UsageService()


@usage_bp.route('/usage/me', methods=['GET'])
@jwt_required()
def my_usage():
    """Get my API usage summary.
    Retrieves the API usage summary for the currently authenticated user.
    ---
    tags:
      - Usage
    security:
      - bearerAuth: []
    responses:
      200:
        description: Usage summary retrieved successfully.
        schema:
          type: object
          properties:
            success:
              type: boolean
            usage:
              type: object
              properties:
                username:
                  type: string
                endpoints:
                  type: object
                  additionalProperties:
                    type: integer
                  description: A map of endpoints to their call counts.
      401:
        description: Unauthorized, token is missing or invalid.

    """
    username = get_jwt_identity()
    summary = usage.get_user_summary(username)
    return jsonify({ 'success': True, 'usage': summary })


@usage_bp.route('/usage/all', methods=['GET'])
@jwt_required()
def all_usage():
    """Get all users' API usage summaries.
    Retrieves API usage summaries for all users. Requires admin privileges.
    ---
    tags:
      - Usage
    security:
      - bearerAuth: []
    parameters:
      - name: range
        in: query
        type: string
        enum: [all, today]
        default: all
        description: Filter usage data for all time or just for the current day.
    responses:
      200:
        description: All usage summaries retrieved successfully.
        schema:
          type: object
          properties:
            success:
              type: boolean
            results:
              type: array
              items:
                type: object
                properties:
                  username:
                    type: string
                  endpoints:
                    type: object
                    additionalProperties:
                      type: integer
                    description: A map of endpoints to their call counts for the user.
      401:
        description: Unauthorized, token is missing or invalid.
      403:
        description: Forbidden. The current user is not an admin.

    """
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    ur = UserRole.query.filter_by(user_id=user.id).first() if user else None
    if not ur or (ur.role or "").lower() != "admin":
        return jsonify({ 'success': False, 'error': strings.MSG_FORBIDDEN }), 403
    range_opt = (request.args.get('range') or 'all').strip().lower()
    if range_opt not in ('all','today'):
        range_opt = 'all'
    results = usage.get_all_summaries(range_opt)
    return jsonify({ 'success': True, 'results': results })
