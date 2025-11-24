from flask import Blueprint, request as flask_request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, jwt_required
from crossword_grid_generator import CrosswordGenerator
from request import request as generate_words
from services.usage_service import UsageService
from extensions import db
from models import GameSession, User, UserRole, UserQuota, AppSetting, ApiUsage, SavedGame
from utils.tokens import estimate_tokens
from datetime import datetime, timedelta
from constants import DEFAULT_DAILY_FREE_LIMIT


puzzle_bp = Blueprint('puzzle', __name__)
usage = UsageService()

DIFF_LEVELS = {
    'easy': 10,
    'medium': 15,
    'hard': 20
}

# THIS IS THE CORRECT VERSION TO USE

def _clean_llm_term(raw_string: str) -> str:
    """
    Cleans a raw string from the LLM to be a valid crossword word.
    This is our "safety net" for inconsistent AI output.
    Example: '16. ES6' -> 'ES6'
    Example: 'Document Object Model (DOM)' -> 'DOM'
    """
    # If the string contains a period, assume it's a numbered list
    # and take everything after the first period.
    if '.' in raw_string:
        try:
            # Strip leading/trailing whitespace from the term part
            term = raw_string.split('.', 1)[1].strip()
        except IndexError:
            term = raw_string.strip()
    else:
        term = raw_string.strip()

    # Case 1: The LLM provided an acronym with its full name, like "Document Object Model (DOM)".
    # We should extract just the acronym.
    if '(' in term and ')' in term:
        start = term.rfind('(')
        end = term.rfind(')')
        if start < end:
            acronym = term[start+1:end]
            # Check if the extracted part is a valid-looking acronym (all uppercase, short)
            if acronym.isupper() and len(acronym) > 1 and acronym.isalpha():
                return acronym
    
    # Case 2: The term is a mix of letters and numbers (like ES6).
    # Keep alphanumeric characters, remove others.
    # e.g., 'If/Else' -> 'IFELSE'
    # e.g., 'ES6' -> 'ES6'
    cleaned_word = ''.join(char for char in term if char.isalnum()).upper()
    
    return cleaned_word

@puzzle_bp.route('/generate-crossword', methods=['POST'])
def generate_crossword():
    """
    Generate a new crossword puzzle.
    Creates a crossword puzzle based on a given topic and difficulty.
    This endpoint can be used by guests, but authenticated users are subject to daily usage limits.
    ---
    tags:
      - Puzzle
    parameters:
      - name: body
        in: body
        required: true
        schema:
          id: PuzzleGenerationRequest
          type: object
          properties:
            topic:
              type: string
              description: The topic for the crossword puzzle.
              default: 'JavaScript'
            difficulty:
              type: string
              description: The desired difficulty level, which determines the number of words.
              enum: ['easy', 'medium', 'hard']
              default: 'easy'
    security:
      - bearerAuth: []
    responses:
      200:
        description: Crossword puzzle generated successfully.
        schema:
          id: PuzzleGenerationResponse
          type: object
          properties:
            success:
              type: boolean
            grid:
              type: array
              items:
                type: array
                items:
                  type: string
              description: The 2D array representing the crossword grid.
            words:
              type: array
              items:
                type: object
                properties:
                  word: { type: string }
                  direction: { type: string, enum: ['across', 'down'] }
                  row: { type: integer }
                  col: { type: integer }
                  length: { type: integer }
            definitions:
              type: object
              additionalProperties:
                type: string
              description: A map of words to their definitions.
            total_words: { type: integer }
            placed_words: { type: integer }
            grid_size: { type: integer }
            daily:
              type: object
              description: (Authenticated users only) Daily usage statistics.
              properties:
                limit: { type: integer }
                used: { type: integer }
                remaining: { type: integer }
      429:
        description: Daily free limit reached for the authenticated user.
      500:
        description: Internal server error, such as a failure in the crossword generation logic.
      502:
        description: The upstream word generation service is unavailable or returned an error.
    """
    try:
        data = flask_request.get_json() or {}

        topic = data.get('topic', 'JavaScript')
        word_count = DIFF_LEVELS.get((data.get('difficulty', 'easy') or 'easy').lower(), 10)

        # Enforce per-user daily free limit (DB-based); guests are not enforced
        try:
            verify_jwt_in_request(optional=True)
            username = get_jwt_identity()
            user = User.query.filter_by(username=username).first() if username else None
            if user:
                # Determine limit: per-user quota overrides global setting
                try:
                    uq = UserQuota.query.filter_by(user_id=user.id).first()
                except Exception:
                    uq = None
                if uq and isinstance(getattr(uq, 'daily_limit', None), int):
                    daily_limit = int(uq.daily_limit)
                else:
                    s = AppSetting.query.filter_by(key='DAILY_FREE_LIMIT').first()
                    try:
                        daily_limit = int((s.value if s else str(DEFAULT_DAILY_FREE_LIMIT)) or str(DEFAULT_DAILY_FREE_LIMIT))
                    except Exception:
                        daily_limit = DEFAULT_DAILY_FREE_LIMIT

                # Count today's sessions (server-local midnight) after any reset marker
                now = datetime.now()
                start = datetime(now.year, now.month, now.day, 0, 0, 0)
                end = start + timedelta(days=1)
                q = GameSession.query.filter(
                    GameSession.user_id == user.id,
                    GameSession.started_at >= start,
                    GameSession.started_at < end
                )
                try:
                    from models import UserDailyReset
                    rr = UserDailyReset.query.filter_by(user_id=user.id, date=start.date()).first()
                    if rr is not None:
                        q = q.filter(GameSession.started_at > rr.reset_at)
                except Exception:
                    pass
                used_today_before = q.count()
                if used_today_before >= daily_limit:
                    return jsonify({
                        'success': False,
                        'error': 'Daily free limit reached',
                        'daily': {
                            'limit': int(daily_limit),
                            'used': int(used_today_before),
                            'remaining': 0
                        }
                    }), 429
        except Exception:
            # If anything fails here, do not block puzzle generation
            pass

        # Use a more detailed, multi-line prompt to guide the LLM.
        prompt = f"""Generate a list of {word_count} vacabularies about {topic}. The list must be suitable for creating an interlocking crossword puzzle.
Do not use bold (**), punctuation marks, or formatting other than the pattern WORD - description.
Provide the output in the format:
WORD - Clue"""
        t0 = datetime.utcnow()
        try:
            results = generate_words(prompt)
        except Exception as e:
            print(f"Error calling word generation API: {e}")
            error_msg = str(e)
            if "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                return jsonify({'success': False, 'error': 'Failed to connect to word generation service. Please check your internet connection and try again.'}), 502
            return jsonify({'success': False, 'error': f'Failed to connect to word generation service: {error_msg}'}), 502

        if not results or len(results) == 0:
            print("Word generation API returned empty results")
            return jsonify({'success': False, 'error': 'Word generation API returned no results. The service may be unavailable or the response format was unexpected.'}), 502

        pairs = []
        for item in results:
            try:
                # Ensure item is a tuple/list with at least 3 elements
                if not isinstance(item, (tuple, list)) or len(item) < 3:
                    continue
                
                _, raw_word, definition = item
                
                # Skip error responses from the API
                if raw_word == "Error" or (isinstance(definition, str) and definition.startswith("{")):
                    print(f"Skipping error response: {item}")
                    continue
                
                # Ensure raw_word is a string
                if not isinstance(raw_word, str):
                    continue
                
                # Apply the cleaning function here
                cleaned_word = _clean_llm_term(raw_word)
                
                # Only add the pair if the cleaned word is not empty and has reasonable length
                if cleaned_word and len(cleaned_word) > 0 and len(cleaned_word) <= 30:
                    pairs.append((cleaned_word, (definition or '').strip()))
            except (ValueError, TypeError, IndexError) as e:
                # Log the error for debugging but continue processing
                print(f"Error processing word item: {item}, error: {e}")
                continue
            except Exception as e:
                # Catch any other unexpected errors
                print(f"Unexpected error processing word item: {item}, error: {e}")
                continue

        if not pairs:
            return jsonify({'success': False, 'error': 'Word generation failed'}), 502

        words = [w for w, _ in pairs]
        definitions = {w: d for w, d in pairs}

        # Filter out words that are too long for the grid (grid_size is 30 by default)
        max_word_length = 30
        valid_words = [w for w in words if len(w) <= max_word_length]
        
        print(f"Generated {len(pairs)} word pairs, {len(valid_words)} valid words after filtering")
        print(f"Valid words: {valid_words[:10]}...")  # Print first 10 for debugging
        
        if not valid_words:
            return jsonify({'success': False, 'error': 'No valid words after filtering (all words too long)'}), 502

        if len(valid_words) < 3:
            return jsonify({'success': False, 'error': f'Too few valid words ({len(valid_words)}). Need at least 3 words to generate a crossword.'}), 502

        generator = CrosswordGenerator(valid_words)
        success = generator.solve()

        if not success:
            placed_count = len(generator.solution_coordinates)
            print(f"Crossword generation failed: placed {placed_count}/{len(valid_words)} words")
            
            # If we placed at least 50% of words, consider it a partial success
            # But for now, we'll still return an error to maintain quality
            min_required = max(3, len(valid_words) // 2)
            if placed_count >= min_required:
                print(f"Partial success: {placed_count} words placed (minimum: {min_required})")
                # Continue with partial grid - this is acceptable
                # But we need to update the logic to handle this
                # For now, we'll still fail but with a more helpful message
                return jsonify({
                    'success': False, 
                    'error': f'Could only place {placed_count} out of {len(valid_words)} words. The crossword generator needs words that can intersect. Try a different topic with more common terms.'
                }), 500
            else:
                return jsonify({
                    'success': False, 
                    'error': f'Crossword generation failed. Could only place {placed_count} out of {len(valid_words)} words. The words may not have enough common letters to intersect. Try a different topic or difficulty.'
                }), 500

        used_words = [word for word, _, _, _ in generator.solution_coordinates]
        size = generator.grid_size
        grid = generator.grid

        # Validate grid format - ensure it's a 2D list
        if not grid or not isinstance(grid, list):
            print(f"Invalid grid format: {type(grid)}")
            return jsonify({'success': False, 'error': 'Invalid grid format generated'}), 500
        
        # Ensure grid cells are strings (convert empty strings to empty strings for JSON)
        grid_serializable = []
        for row in grid:
            if not isinstance(row, list):
                print(f"Invalid grid row format: {type(row)}")
                return jsonify({'success': False, 'error': 'Invalid grid row format'}), 500
            grid_serializable.append([str(cell) if cell else '' for cell in row])

        # Build words list with validation
        words_list = []
        for coord in generator.solution_coordinates:
            try:
                if len(coord) != 4:
                    print(f"Invalid coordinate format: {coord}")
                    continue
                word, col, row, direction = coord
                words_list.append({
                    'word': str(word),
                    'direction': ('across' if (str(direction).upper() == 'H') else 'down'),
                    'row': int(row),
                    'col': int(col),
                    'length': len(str(word))
                })
            except (ValueError, TypeError, IndexError) as e:
                print(f"Error processing coordinate {coord}: {e}")
                continue

        if not words_list:
            print("No valid words in solution_coordinates")
            return jsonify({'success': False, 'error': 'No valid word coordinates generated'}), 500

        # Ensure definitions are JSON serializable (all keys and values should be strings)
        definitions_serializable = {}
        for word, definition in definitions.items():
            if isinstance(word, str) and isinstance(definition, str):
                definitions_serializable[word] = definition
            else:
                definitions_serializable[str(word)] = str(definition) if definition else ''

        response = {
            'success': True,
            'grid': grid_serializable,
            'words': words_list,
            'definitions': definitions_serializable,
            'total_words': len(valid_words),
            'placed_words': len(used_words),
            'grid_size': size
        }
        
        print(f"Response prepared: {len(words_list)} words, grid size {size}x{size}, {len(definitions_serializable)} definitions")

        # Optional usage + token tracking if user is authenticated
        try:
            verify_jwt_in_request(optional=True)
            username = get_jwt_identity()
            if username:
                user = User.query.filter_by(username=username).first()
                # Increment usage first
                usage.increment(username, '/api/v1/generate-crossword')

                # Compute daily info (server local midnight): sessions today + 1 (including this request)
                daily_limit = int((AppSetting.query.filter_by(key='DAILY_FREE_LIMIT').first() or type('X',(object,),{'value':'20'})()).value)
                used_today_before = 0
                if user:
                    now = datetime.now()
                    start = datetime(now.year, now.month, now.day, 0, 0, 0)
                    end = start + timedelta(days=1)
                    q = GameSession.query.filter(
                        GameSession.user_id == user.id,
                        GameSession.started_at >= start,
                        GameSession.started_at < end
                    )
                    # Apply reset marker if any
                    try:
                        from models import UserDailyReset
                        rr = UserDailyReset.query.filter_by(user_id=user.id, date=start.date()).first()
                        if rr is not None:
                            q = q.filter(GameSession.started_at > rr.reset_at)
                    except Exception:
                        pass
                    used_today_before = q.count()
                used_after = used_today_before + 1
                response['daily'] = {
                    'limit': daily_limit,
                    'used': used_after,
                    'remaining': max(0, daily_limit - used_after)
                }

                # Compute rough token usage
                prompt_tokens = estimate_tokens(prompt)
                # Build a completion text approximation using parsed definitions
                try:
                    completion_text = '\n'.join([f"{w}: {definitions.get(w, '')}" for w in valid_words])
                except Exception:
                    completion_text = ''
                completion_tokens = estimate_tokens(completion_text)
                total_tokens = prompt_tokens + completion_tokens

                # No longer persist automatic game sessions here.
                # Game data will be saved only when user explicitly clicks save.
        except Exception:
            pass

        return jsonify(response)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in generate_crossword route: {e}")
        print(f"Traceback: {error_trace}")
        return jsonify({'success': False, 'error': str(e)}), 500


@puzzle_bp.route('/save-game', methods=['POST'])
def save_game():
    """
    Save a generated crossword puzzle.
    Saves the state of a generated crossword puzzle for the currently authenticated user.
    This endpoint requires a valid JWT token.
    ---
    tags:
      - Puzzle
    parameters:
      - name: body
        in: body
        required: true
        schema:
          id: SaveGameRequest
          type: object
          required: [words, definitions, grid]
          properties:
            topic:
              type: string
              description: The topic of the saved puzzle.
            difficulty:
              type: string
              description: The difficulty of the saved puzzle.
            words:
              type: object
              description: The words list from the generated puzzle response.
            definitions:
              type: object
              description: The definitions map from the generated puzzle response.
            grid:
              type: object
              description: The grid array from the generated puzzle response.
    security:
      - bearerAuth: []
    responses:
      201:
        description: Game saved successfully.
        schema:
          type: object
          properties:
            success: { type: boolean }
            id: { type: integer, description: "The ID of the saved game record." }
      400:
        description: Bad request, missing required fields in the payload.
      401:
        description: Unauthorized, JWT token is missing or invalid.
      404:
        description: User not found.
      500:
        description: Internal server error during the save operation.
    """
    try:
        verify_jwt_in_request()
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        payload = flask_request.get_json(silent=True) or {}
        topic = payload.get('topic')
        difficulty = payload.get('difficulty')
        words = payload.get('words')
        definitions = payload.get('definitions')
        grid = payload.get('grid')

        # Basic validation
        if grid is None or definitions is None or words is None:
            return jsonify({'success': False, 'error': 'Missing required fields: words, definitions, grid'}), 400

        # Persist to saved_games
        row = SavedGame(
            user_id=user.id,
            topic=topic,
            difficulty=difficulty,
            words_json=words,
            definitions_json=definitions,
            grid_json=grid,
        )
        db.session.add(row)
        db.session.commit()

        return jsonify({'success': True, 'id': row.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@puzzle_bp.route('/saved-games', methods=['GET'])
@jwt_required()
def get_saved_games():
    """Fetches a summary of the current user's saved games."""
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Fetch the first 3 saved games, ordered by when they were saved
        saved_games = SavedGame.query.filter_by(user_id=user.id).order_by(SavedGame.id.asc()).limit(3).all()

        games_summary = []
        for game in saved_games:
            games_summary.append({
                'id': game.id,
                'topic': game.topic,
                'difficulty': game.difficulty,
                'started_at': game.started_at.isoformat()
            })

        return jsonify({'success': True, 'saved_games': games_summary})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@puzzle_bp.route('/saved-games/<int:game_id>', methods=['GET'])
@jwt_required()
def get_saved_game_by_id(game_id):
    """Fetches the full data for a single saved game, ensuring it belongs to the current user."""
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Fetch the specific game and verify ownership
        game = SavedGame.query.filter_by(id=game_id, user_id=user.id).first()
        if not game:
            return jsonify({'success': False, 'error': 'Saved game not found or access denied'}), 404

        # The JSON columns are already stored as JSON, so we can return them directly
        game_data = {
            'id': game.id,
            'grid': game.grid_json,
            'words': game.words_json,
            'definitions': game.definitions_json
        }

        return jsonify({'success': True, 'game': game_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@puzzle_bp.route('/saved-games/<int:game_id>', methods=['PUT'])
@jwt_required()
def override_saved_game(game_id):
    """Overrides an existing saved game with new data."""
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Fetch the specific game and verify ownership
        game_to_override = SavedGame.query.filter_by(id=game_id, user_id=user.id).first()
        if not game_to_override:
            return jsonify({'success': False, 'error': 'Saved game not found or access denied'}), 404

        payload = flask_request.get_json(silent=True) or {}
        
        # Update the fields of the existing game record
        game_to_override.topic = payload.get('topic')
        game_to_override.difficulty = payload.get('difficulty')
        game_to_override.words_json = payload.get('words')
        game_to_override.definitions_json = payload.get('definitions')
        game_to_override.grid_json = payload.get('grid')
        # Update the timestamp to reflect the new save time
        game_to_override.started_at = datetime.utcnow()

        db.session.commit()

        return jsonify({'success': True, 'id': game_to_override.id, 'message': 'Game overridden successfully.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@puzzle_bp.route('/saved-games/<int:game_id>', methods=['DELETE'])
@jwt_required()
def delete_saved_game(game_id):
    """Deletes a single saved game, ensuring it belongs to the current user."""
    try:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Fetch the specific game and verify ownership before deleting
        game = SavedGame.query.filter_by(id=game_id, user_id=user.id).first()
        if not game:
            return jsonify({'success': False, 'error': 'Saved game not found or access denied'}), 404

        db.session.delete(game)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Game deleted successfully.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
