# General
MSG_SUCCESS = 'Success'
MSG_FORBIDDEN = 'Forbidden'
MSG_USER_NOT_FOUND = 'User not found'
MSG_INTERNAL_SERVER_ERROR = 'An internal server error occurred.'

# Auth
MSG_USERNAME_EXISTS = 'Username already exists'
MSG_EMAIL_EXISTS = 'Email already registered'
MSG_INVALID_CREDENTIALS = 'Invalid username or password'
MSG_USERNAME_MIN_LENGTH = 'New username must be at least 6 characters'
MSG_USERNAME_TAKEN = 'This user name has already been used. Please change another one.'
MSG_USERNAME_CHANGED = 'Username changed successfully.'
MSG_WRONG_PASSWORD = 'Wrong password! Please try again'
MSG_PASSWORD_MIN_LENGTH = 'New password must be at least 6 characters'
MSG_PASSWORD_UPDATED = 'Password updated successfully.'
MSG_FORGOT_PASSWORD_SENT = 'If that account exists, a reset link has been sent.'
MSG_PASSWORD_RESET_SUCCESS = 'Password reset successful. You can now sign in.'

# Puzzle Generation
MSG_DAILY_LIMIT_REACHED = 'Daily free limit reached'
MSG_GEN_SERVICE_CONNECTION_FAIL = 'Failed to connect to word generation service. Please check your internet connection and try again.'
MSG_GEN_SERVICE_FAIL = 'Failed to connect to word generation service'
MSG_GEN_SERVICE_EMPTY = 'Word generation API returned no results. The service may be unavailable or the response format was unexpected.'
MSG_GEN_FAILED = 'Word generation failed'
MSG_NO_VALID_WORDS_FILTERED = 'No valid words after filtering (all words too long)'
MSG_TOO_FEW_WORDS_PREFIX = 'Too few valid words'
MSG_TOO_FEW_WORDS_SUFFIX = 'Need at least 3 words to generate a crossword.'
MSG_CROSSWORD_FAIL_PARTIAL = 'Could only place {placed_count} out of {total_words} words. The crossword generator needs words that can intersect. Try a different topic with more common terms.'
MSG_CROSSWORD_FAIL_TOTAL = 'Crossword generation failed. Could only place {placed_count} out of {total_words} words. The words may not have enough common letters to intersect. Try a different topic or difficulty.'
MSG_INVALID_GRID_FORMAT = 'Invalid grid format generated'
MSG_INVALID_GRID_ROW_FORMAT = 'Invalid grid row format'
MSG_NO_VALID_WORD_COORDS = 'No valid word coordinates generated'

# Saved Games
MSG_SAVE_GAME_MISSING_FIELDS = 'Missing required fields: words, definitions, grid'
MSG_SAVE_GAME_SUCCESS = 'Game saved successfully.'
MSG_SAVE_GAME_NOT_FOUND = 'Saved game not found or access denied'
MSG_SAVE_GAME_OVERRIDDEN = 'Game overridden successfully.'
MSG_SAVE_GAME_DELETED = 'Game deleted successfully.'

# Admin
MSG_ADMIN_INVALID_ROLE = 'Invalid role'
MSG_ADMIN_INVALID_LIMIT = 'Invalid limit'
MSG_ADMIN_DB_PERMISSION_DENIED = 'Database permission denied for DELETE on one or more tables. Use admin DB user or adjust grants.'
MSG_ADMIN_DB_UPDATE_PERMISSION_DENIED = 'Database permission denied for UPDATE on api_usage. Grant UPDATE or perform reset with DB admin.'
MSG_ADMIN_CANNOT_DELETE_ADMIN = 'not enough privilege to delete an admin'
MSG_ADMIN_USERNAME_REQUIRED = 'Username is required'
