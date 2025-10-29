import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from dotenv import load_dotenv
from crossword_grid_generator import CrosswordGenerator
from request import request as generate_words
import secrets
import hashlib
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# JWT setup
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'change-this-secret-in-production')
jwt = JWTManager(app)

# Database configuration via env vars
database_url = os.getenv('DATABASE_URL')
if not database_url:
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '3306')
    db_name = os.getenv('DB_NAME', 'crswd')
    database_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

engine_options = { 'pool_pre_ping': True }
ssl_ca = os.getenv('DB_SSL_CA')
if ssl_ca and os.path.exists(ssl_ca):
    engine_options['connect_args'] = { 'ssl': { 'ca': ssl_ca } }

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(32), nullable=False, unique=True, index=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())


class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, index=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    user = db.relationship('User')

diff_levels = {
    'easy': 10,
    'medium': 15,
    'hard': 20
}

@app.route('/api/generate-crossword', methods=['POST'])
def generate_crossword():
    """
    Generate a crossword puzzle based on topic and difficulty
    Expected JSON payload:
    {
        "topic": "JavaScript",
        "difficulty": "easy",
    }
    which means:
    {
        "topic": "JavaScript",
        "wordCount": 10,
    }
    """
    try:
        data = request.get_json()
        
        # Extract parameters with defaults
        topic = data.get('topic', 'JavaScript')
        word_count = diff_levels.get(data.get('difficulty', 'easy'), 10)
        
        # Generate words based on topic
        prompt = f"Generate {word_count} one-word terms related to {topic}. Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description."
        results = generate_words(prompt)
        
        # Extract words and convert to uppercase
        words = [w.upper() for _, w, _ in results]

        # definitions
        definitions = {w.upper(): definition for _, w, definition in results}
    
        
        # Create crossword generator
        generator = CrosswordGenerator(words)
        
        # Generate crossword
        success = generator.solve()
        
        if success:
            # Extract word data
            used_words = [word for word, _, _, _ in generator.solution_coordinates]
            unused_words = list(set(words) - set(used_words))
            
            # Create grid data for frontend
            grid_data = []
            for row in generator.grid:
                grid_row = []
                for cell in row:
                    if cell:
                        grid_row.append(cell)
                    else:
                        grid_row.append('')
                grid_data.append(grid_row)
            
            # Create word coordinates for frontend
            word_coordinates = []
            for word, col, row, direction in generator.solution_coordinates:
                word_coordinates.append({
                    'word': word,
                    'col': col,
                    'row': row,
                    'direction': direction.lower(),
                    'length': len(word)
                })
            
            response = {
                'success': True,
                'grid': grid_data,
                'words': word_coordinates,
                'definitions': definitions,
                'used_words': used_words,
                'unused_words': unused_words,
                'total_words': len(words),
                'placed_words': len(used_words),
                'grid_size': generator.grid_size
            }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ------------- AUTH HELPERS -----------------
def is_valid_username(username: str) -> bool:
    # 6-12 chars, letters and numbers, must contain at least one letter and one number
    if not isinstance(username, str):
        return False
    if len(username) < 6 or len(username) > 12:
        return False
    # Only letters and digits
    if not username.isalnum():
        return False
    # Must contain at least one letter and one digit
    has_alpha = any(c.isalpha() for c in username)
    has_digit = any(c.isdigit() for c in username)
    return has_alpha and has_digit


def is_valid_email(email: str) -> bool:
    if not isinstance(email, str):
        return False
    # Simple email validation
    import re
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None


def is_valid_password(password: str) -> bool:
    if not isinstance(password, str):
        return False
    return 6 <= len(password) <= 15


def find_user_by_username_or_email(identifier: str):
    # identifier can be username or email
    return User.query.filter(or_(User.username == identifier, User.email == identifier)).first()


def _gen_reset_token() -> str:
    return secrets.token_urlsafe(32)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _build_reset_link(token: str) -> str:
    base = os.getenv('FRONTEND_BASE_URL', 'http://localhost:8080')
    return f"{base.rstrip('/')}/reset.html?token={token}"


@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json(force=True)
        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip()
        password = data.get('password') or ''

        # Validate
        if not is_valid_username(username):
            return jsonify({'success': False, 'error': 'Invalid username. Must be 6-12 chars, letters and numbers, and include both.'}), 400
        if not is_valid_email(email):
            return jsonify({'success': False, 'error': 'Invalid email address.'}), 400
        if not is_valid_password(password):
            return jsonify({'success': False, 'error': 'Invalid password. Must be 6-15 characters.'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'error': 'Username already exists.'}), 409
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'error': 'Email already in use.'}), 409

        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()

        token = create_access_token(identity=username)
        public_user = {'username': username, 'email': email}
        return jsonify({'success': True, 'user': public_user, 'access_token': token}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        identifier = (data.get('username') or '').strip()  # username or email
        password = data.get('password') or ''

        if not identifier or not password:
            return jsonify({'success': False, 'error': 'Username/email and password are required.'}), 400

        user = find_user_by_username_or_email(identifier)
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'success': False, 'error': 'Invalid credentials.'}), 401

        token = create_access_token(identity=user.username)
        public_user = {'username': user.username, 'email': user.email}
        return jsonify({'success': True, 'user': public_user, 'access_token': token}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    current = get_jwt_identity()
    user = User.query.filter_by(username=current).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': {'username': user.username, 'email': user.email}}), 200


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json(force=True)
        identifier = (data.get('email') or data.get('username') or '').strip()

        # Always return a generic response to avoid user enumeration
        generic_resp = jsonify({'success': True, 'message': 'If that account exists, a reset link has been sent.'})

        if not identifier:
            return generic_resp, 200

        user = find_user_by_username_or_email(identifier)
        if not user:
            return generic_resp, 200

        token = _gen_reset_token()
        token_hash = _hash_token(token)
        ttl_minutes = int(os.getenv('RESET_TOKEN_MINUTES', '15'))
        expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)

        pr = PasswordReset(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        db.session.add(pr)
        db.session.commit()

        reset_link = _build_reset_link(token)
        print(f"[Password Reset] Send to {user.email}: {reset_link}")

        return generic_resp, 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json(force=True)
        token = (data.get('token') or '').strip()
        password = data.get('password') or ''
        confirm = data.get('confirmPassword') or password

        if not token:
            return jsonify({'success': False, 'error': 'Invalid or expired token.'}), 400

        if password != confirm:
            return jsonify({'success': False, 'error': 'Passwords do not match.'}), 400

        if not is_valid_password(password):
            return jsonify({'success': False, 'error': 'Invalid password. Must be 6-15 characters.'}), 400

        token_hash = _hash_token(token)
        pr = PasswordReset.query.filter_by(token_hash=token_hash).first()
        if not pr:
            return jsonify({'success': False, 'error': 'Invalid or expired token.'}), 400

        if pr.used_at is not None or pr.expires_at < datetime.utcnow():
            return jsonify({'success': False, 'error': 'Invalid or expired token.'}), 400

        user = User.query.get(pr.user_id)
        if not user:
            return jsonify({'success': False, 'error': 'Invalid or expired token.'}), 400

        user.password_hash = generate_password_hash(password)
        pr.used_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'success': True, 'message': 'Password reset successful. You can now sign in.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    print("ðŸš€ Starting Crossword Generator API Server...")
    print("ðŸ“¡ API Endpoints:")
    print("   POST /api/generate-crossword - Generate full crossword")
    print("ðŸŒ Server running on http://localhost:5050")

    app.run(debug=True, host='0.0.0.0', port=5050)

