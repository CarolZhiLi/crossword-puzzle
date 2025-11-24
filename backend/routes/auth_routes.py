from flask import Blueprint, request as flask_request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models import User
from werkzeug.security import check_password_hash, generate_password_hash
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
        data = flask_request.get_json(force=True)
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

    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'error': 'Username already exists'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'Email already registered'}), 409

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    access_token = create_access_token(identity=username)
    return jsonify({'success': True, 'access_token': access_token, 'user': new_user.to_dict()}), 201

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
        data = flask_request.get_json(force=True)
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

    user = User.query.filter((User.username == username) | (User.email == username)).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=user.username)
        return jsonify({'success': True, 'access_token': access_token, 'user': user.to_dict()})

    return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

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
    current_username = get_jwt_identity()
    user_data = service.me(current_username) # Assumes service.me exists and returns a dict
    if not user_data:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': user_data})


@auth_bp.route('/change-username', methods=['PUT'])
@jwt_required()
def change_username():
    """Changes the username for the currently authenticated user.
    ---
    tags:
      - Authentication
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [newUsername]
          properties:
            newUsername:
              type: string
              description: The new desired username.
    responses:
      200:
        description: Username changed successfully.
        schema:
          type: object
          properties:
            success: { type: boolean }
            message: { type: string }
            access_token: { type: string, description: "A new JWT with the updated username." }
      400:
        description: Bad request (e.g., new username is too short).
      401:
        description: Unauthorized, token is missing or invalid.
      404:
        description: User not found.
      409:
        description: Username is already taken.
    """
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    data = flask_request.get_json()
    new_username = data.get('newUsername')

    if not new_username or len(new_username) < 6:
        return jsonify({'success': False, 'error': 'New username must be at least 6 characters'}), 400

    if User.query.filter(User.username == new_username).first():
        return jsonify({'success': False, 'error': 'This user name has already been used. Please change another one.'}), 409

    user.username = new_username
    db.session.commit()

    # Create a new token with the new username as the identity
    new_access_token = create_access_token(identity=new_username)

    # Return the new token so the frontend can update its storage
    return jsonify({'success': True, 'message': 'Username changed successfully.', 'access_token': new_access_token})


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    """Changes the password for the currently authenticated user.
    ---
    tags:
      - Authentication
    security:
      - bearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [currentPassword, newPassword]
          properties:
            currentPassword:
              type: string
              description: The user's current password.
            newPassword:
              type: string
              description: The new password (min 6 characters).
    responses:
      200:
        description: Password updated successfully.
      400:
        description: Bad request (e.g., new password is too short).
      401:
        description: Unauthorized, or wrong current password.
      404:
        description: User not found.
    """
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    data = flask_request.get_json()
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    if not user.check_password(current_password):
        return jsonify({'success': False, 'error': 'Wrong password! Please try again'}), 401

    if not new_password or len(new_password) < 6:
        return jsonify({'success': False, 'error': 'New password must be at least 6 characters'}), 400

    user.set_password(new_password)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Password updated successfully.'})

# Placeholder for forgot-password logic
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
        data = flask_request.get_json(force=True)
        identifier = (data.get('email') or data.get('username') or '').strip()
        # Always return a generic response to avoid enumeration
        service.forgot_password(identifier)
        return jsonify({'success': True, 'message': 'If that account exists, a reset link has been sent.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Placeholder for reset-password logic
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
        data = flask_request.get_json(force=True)
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
