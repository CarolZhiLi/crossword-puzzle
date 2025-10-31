from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.auth_service import AuthService


auth_bp = Blueprint('auth', __name__)
service = AuthService()


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json(force=True)
        public_user, token = service.register(
            (data.get('username') or '').strip(),
            (data.get('email') or '').strip(),
            data.get('password') or ''
        )
        return jsonify({'success': True, 'user': public_user, 'access_token': token}), 201
    except ValueError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        public_user, token = service.login(
            (data.get('username') or '').strip(),
            data.get('password') or ''
        )
        return jsonify({'success': True, 'user': public_user, 'access_token': token}), 200
    except ValueError as ve:
        # Differentiate invalid creds vs other validation
        msg = str(ve)
        code = 401 if msg == 'Invalid credentials.' else 400
        return jsonify({'success': False, 'error': msg}), code
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current = get_jwt_identity()
    user = service.me(current)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': user}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json(force=True)
        identifier = (data.get('email') or data.get('username') or '').strip()
        # Always return a generic response to avoid enumeration
        service.forgot_password(identifier)
        return jsonify({'success': True, 'message': 'If that account exists, a reset link has been sent.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json(force=True)
        service.reset_password(
            (data.get('token') or '').strip(),
            data.get('password') or '',
            data.get('confirmPassword')
        )
        return jsonify({'success': True, 'message': 'Password reset successful. You can now sign in.'}), 200
    except ValueError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
