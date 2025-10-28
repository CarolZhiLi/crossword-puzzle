from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from crossword_grid_generator import CrosswordGenerator
from request import request as generate_words

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

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


if __name__ == '__main__':
    print("🚀 Starting Crossword Generator API Server...")
    print("📡 API Endpoints:")
    print("   POST /api/generate-crossword - Generate full crossword")
    print("🌐 Server running on http://localhost:5050")

    app.run(debug=True, host='0.0.0.0', port=5050)
