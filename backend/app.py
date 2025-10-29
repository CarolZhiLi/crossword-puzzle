from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import json
from crossword_grid_generator import CrosswordGenerator
from request import request as generate_words

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Simple in-memory user store (replace with Aiven DB later)
USERS = {}

# JWT setup
app.config['JWT_SECRET_KEY'] = 'change-this-secret-in-production'
jwt = JWTManager(app)

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
    if identifier in USERS:
        return USERS[identifier]
    # Search by email
    for u in USERS.values():
        if u.get('email') == identifier:
            return u
    return None


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

        if username in USERS:
            return jsonify({'success': False, 'error': 'Username already exists.'}), 409
        if any(u.get('email') == email for u in USERS.values()):
            return jsonify({'success': False, 'error': 'Email already in use.'}), 409

        user = {
            'username': username,
            'email': email,
            'password_hash': generate_password_hash(password)
        }
        USERS[username] = user

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
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'error': 'Invalid credentials.'}), 401

        token = create_access_token(identity=user['username'])
        public_user = {'username': user['username'], 'email': user['email']}
        return jsonify({'success': True, 'user': public_user, 'access_token': token}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    current = get_jwt_identity()
    user = USERS.get(current)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': {'username': user['username'], 'email': user['email']}}), 200


if __name__ == '__main__':
    print("🚀 Starting Crossword Generator API Server...")
    print("📡 API Endpoints:")
    print("   POST /api/generate-crossword - Generate full crossword")
    print("🌐 Server running on http://localhost:5050")

    app.run(debug=True, host='0.0.0.0', port=5050)
