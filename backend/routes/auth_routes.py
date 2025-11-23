from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.auth_service import AuthService


auth_bp = Blueprint('auth', __name__)
service = AuthService()


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user.
    Creates a new user account and returns a JWT for immediate login.
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          id: UserRegistration
          type: object
          required: [username, email, password]
          properties:
            username:
              type: string
              description: The desired username.
            email:
              type: string
              description: The user's email address.
            password:
              type: string
              description: The user's password (min 8 characters).
    responses:
      201:
        description: User registered successfully.
        schema:
          type: object
          properties:
            success: { type: boolean }
            user: { type: object, description: "Public user profile." }
            access_token: { type: string, description: "JWT for authentication." }
      400:
        description: Bad request (e.g., username taken, invalid email, weak password).
    """
    try:
        data = request.get_json(force=True)
        public_user, token, usage = service.register(
            (data.get('username') or '').strip(),
            (data.get('email') or '').strip(),
            data.get('password') or ''
        )
        return jsonify({'success': True, 'user': public_user, 'usage': usage, 'access_token': token}), 201
    except ValueError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Logs in a user.
    Authenticates a user with a username and password, returning a JWT.
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          id: UserLogin
          type: object
          required: [username, password]
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Login successful.
        schema:
          type: object
          properties:
            success: { type: boolean }
            user: { type: object, description: "Public user profile." }
            access_token: { type: string, description: "JWT for authentication." }
      401:
        description: Invalid credentials.
    """
    try:
        data = request.get_json(force=True)
        public_user, token, usage = service.login(
            (data.get('username') or '').strip(),
            data.get('password') or ''
        )
        return jsonify({'success': True, 'user': public_user, 'usage': usage, 'access_token': token}), 200
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
    """Get current user's profile.
    Retrieves the profile information for the currently authenticated user.
    ---
    tags:
      - Authentication
    security:
      - bearerAuth: []
    responses:
      200:
        description: User profile retrieved successfully.
        schema:
          type: object
          properties:
            success: { type: boolean }
            user: { type: object, description: "Public user profile." }
      401:
        description: Unauthorized, token is missing or invalid.
    """
    current = get_jwt_identity()
    user = service.me(current)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': user}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request a password reset link.
    Initiates the password reset process for a user by their email or username.
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              description: The user's email or username.
    responses:
      200:
        description: A generic success message is always returned to prevent user enumeration.
      500:
        description: Internal server error.
    """
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
    """Reset password using a token.
    Sets a new password for a user using a valid password reset token.
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          id: PasswordReset
          type: object
          required: [token, password, confirmPassword]
          properties:
            token:
              type: string
              description: The password reset token sent to the user's email.
            password:
              type: string
              description: The new password.
            confirmPassword:
              type: string
              description: Confirmation of the new password.
    responses:
      200:
        description: Password has been successfully reset.
      400:
        description: Bad request (e.g., token is invalid/expired, passwords don't match).
    """
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
