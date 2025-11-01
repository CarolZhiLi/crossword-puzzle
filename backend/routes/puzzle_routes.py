from flask import Blueprint, request as flask_request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from crossword_grid_generator import CrosswordGenerator
from request import request as generate_words
from services.usage_service import UsageService


puzzle_bp = Blueprint('puzzle', __name__)
usage = UsageService()

DIFF_LEVELS = {
    'easy': 10,
    'medium': 15,
    'hard': 20
}


@puzzle_bp.route('/generate-crossword', methods=['POST'])
def generate_crossword():
    try:
        data = flask_request.get_json() or {}

        topic = data.get('topic', 'JavaScript')
        word_count = DIFF_LEVELS.get((data.get('difficulty', 'easy') or 'easy').lower(), 10)

        prompt = (
            f"Generate {word_count} one-word terms related to {topic}. "
            f"Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description."
        )
        results = generate_words(prompt)

        pairs = []
        for item in results:
            try:
                _, w, definition = item
                pairs.append((w.upper(), (definition or '').strip()))
            except Exception:
                continue

        if not pairs:
            return jsonify({'success': False, 'error': 'Word generation failed'}), 502

        words = [w for w, _ in pairs]
        definitions = {w: d for w, d in pairs}

        generator = CrosswordGenerator(words)
        success = generator.solve()

        if not success:
            return jsonify({'success': False, 'error': 'Crossword generation failed'}), 500

        used_words = [word for word, _, _, _ in generator.solution_coordinates]
        size = generator.grid_size
        grid = generator.grid

        response = {
            'success': True,
            'grid': grid,
            'words': [
                {
                    'word': word,
                    'direction': ('across' if (str(direction).upper() == 'H') else 'down'),
                    'row': row,
                    'col': col,
                    'length': len(word)
                }
                for word, col, row, direction in generator.solution_coordinates
            ],
            'definitions': definitions,
            'total_words': len(words),
            'placed_words': len(used_words),
            'grid_size': size
        }

        # Optional usage tracking if user is authenticated
        try:
            verify_jwt_in_request(optional=True)
            username = get_jwt_identity()
            if username:
                usage.increment(username, '/api/generate-crossword')
        except Exception:
            pass

        return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
