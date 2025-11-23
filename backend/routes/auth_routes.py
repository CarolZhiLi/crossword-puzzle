from flask import Blueprint, request as flask_request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models import User
from werkzeug.security import check_password_hash, generate_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = flask_request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

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
    data = flask_request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter((User.username == username) | (User.email == username)).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=user.username)
        return jsonify({'success': True, 'access_token': access_token, 'user': user.to_dict()})

    return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': user.to_dict()})


@auth_bp.route('/change-username', methods=['PUT'])
@jwt_required()
def change_username():
    """Changes the username for the currently authenticated user."""
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
    """Changes the password for the currently authenticated user."""
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
    # This is a placeholder. Full implementation would involve sending an email.
    return jsonify({'success': True, 'message': 'If an account with that email exists, a reset link has been sent.'})

# Placeholder for reset-password logic
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    # This is a placeholder. Full implementation would involve validating a token.
    return jsonify({'success': True, 'message': 'Password has been reset successfully.'})