import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from extensions import db, jwt
from config import build_config
from routes.auth_routes import auth_bp
from routes.puzzle_routes import puzzle_bp
from routes.usage_routes import usage_bp
from routes.admin_routes import admin_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # Load environment variables from backend/.env
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

    # Apply config
    app.config.from_mapping(build_config())

    # Init extensions
    db.init_app(app)
    jwt.init_app(app)
    # Allow Authorization headers for cross-origin requests (frontend served on different port)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(puzzle_bp, url_prefix='/api')
    app.register_blueprint(usage_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')

    # Create tables on first run (opt-in)
    # Set DB_AUTO_CREATE=true in backend/.env to enable automatic table creation.
    if (os.getenv('DB_AUTO_CREATE') or 'false').strip().lower() == 'true':
        with app.app_context():
            db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()
    print('Starting Crossword Generator API Server...')
    print('Server running on http://localhost:5050')
    app.run(debug=True, host='0.0.0.0', port=5050)
