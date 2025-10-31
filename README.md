# CrossyThink Crossword Puzzle

CrossyThink is a two-part application that lets players generate and solve AI-assisted crossword puzzles. The backend is a Flask API that talks to a MySQL database, fetches themed word lists from an external AI service, and manages authentication plus password resets. The frontend is a static website that consumes the API to deliver the interactive crossword experience.

## Project Layout
- `backend/` - Flask API, database models, crossword generation logic, and environment configuration.
- `frontend/` - Static HTML/CSS/JS game client, login/register flows, and password reset page.

## Prerequisites
- Python 3.10+ and pip.
- Access to a MySQL-compatible instance (tested with Aiven MySQL); create an empty database for the app.
- Internet access so the backend can reach `https://gpt.newbio.net/chat` for word generation.
- Optional: SMTP credentials if you want to send real password-reset emails.

## Backend Setup
1. **Create your environment file.**
   - Copy `backend/.env.example` to `backend/.env` and fill in the values:
     - `JWT_SECRET_KEY` - secret used to sign JWTs.
     - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - MySQL connection info.
     - `DB_SSL_MODE`, `DB_SSL_CA` - keep these when using TLS (Aiven requires `backend/certs/aiven-ca.pem`).
     - `DATABASE_URL` - optional SQLAlchemy DSN; leave blank to build one from the fields above.
     - `FRONTEND_BASE_URL` - origin of the static site (used when constructing reset links, e.g. `http://localhost:5500`).
     - `RESET_TOKEN_MINUTES` - lifetime for password reset tokens.
     - SMTP keys (`SMTP_*`, `APP_NAME`) - only needed if you configure outbound email.
2. **Install the dependencies in a virtual environment.**
   ```bash
   cd backend
   python -m venv .venv
   # Activate: Windows -> .venv\Scripts\activate, macOS/Linux -> source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Provide the TLS certificate** (only when your MySQL provider requires it).
   - Place the CA file at `backend/certs/aiven-ca.pem` or adjust `DB_SSL_CA` to point to the correct path.
4. **Run the API.**
   ```bash
   python app.py
   ```
   The app listens on `http://localhost:5050`. On first boot it will create the required tables (`users`, `password_resets`) in the configured database. Keep the server running while you use the frontend.

## Frontend Setup
1. Serve the static files from `frontend/`. Any simple HTTP server works; with Python:
   ```bash
   cd frontend
   python -m http.server 5500
   ```
2. Visit `http://localhost:5500/gameplay.html` in your browser. The UI expects the backend at `http://localhost:5050` and will call the API from there. If you deploy to a different host/port, update `API_BASE` in:
   - `frontend/script/gameplay.js`
   - `frontend/script/auth.js`
   - `frontend/script/reset.js`
3. Ensure `FRONTEND_BASE_URL` in `backend/.env` matches the origin you use so password-reset links open the correct page (`reset.html` lives beside `gameplay.html`).

## Password Reset & Email
- Requesting a reset in the UI hits `POST /api/auth/forgot-password`. The backend always responds with a generic success message but will store a token in the `password_resets` table.
- Reset links are built as `${FRONTEND_BASE_URL}/reset.html?token=...` and optionally emailed via SMTP if you configured the `SMTP_*` variables. Without SMTP, the link still appears in the backend logs for manual testing.
- Users complete the flow through `reset.html`, which calls `POST /api/auth/reset-password`.

## API Quick Reference
- `POST /api/generate-crossword` - body: `{ "topic": "History", "difficulty": "medium" }`. Returns a solved grid, word positions, and clue definitions.
- `POST /api/auth/register` - creates a new user (username 6-12 chars, alphanumeric with both letters and digits).
- `POST /api/auth/login` - authenticate with username or email plus password; returns a JWT access token.
- `GET /api/auth/me` - returns the current user; requires `Authorization: Bearer <token>` header.
- `POST /api/auth/forgot-password` - start the password reset process (email or username).
- `POST /api/auth/reset-password` - finish the reset using the token from the email/link.

## Development Tips
- The crossword word list comes from an external service (`request.py`). Network failures or rate limits will bubble up as `Word generation failed` responses; inspect the backend console for details.
- Modify difficulty-to-word-count mapping in `backend/app.py` (`diff_levels` dict) if you need more or fewer words per puzzle.
- Static assets live in `frontend/assets/` and styles in `frontend/css/`. No build step is required, so refreshing the browser reflects changes immediately.
