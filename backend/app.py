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

from hooks.hooks import record_api_call

from flasgger import Swagger


def create_app() -> Flask:
    app = Flask(__name__)

    # Load environment variables from backend/.env
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

    # Apply config
    app.config.from_mapping(build_config())

    # Init extensions
    db.init_app(app)
    jwt.init_app(app)

    # Init Flasgger for API documentation
    swagger_config = {
        # The title and version of your API
        "title": "Crossword Puzzle API",
        "uiversion": 3,
        # The URL path for the Swagger UI
        "specs_route": "/api/v1/docs/",
        # The specs for the Swagger UI
        "specs": [
            {
                "endpoint": 'apispec_1',
                "route": '/api/v1/docs/apispec_1.json',
                "rule_filter": lambda rule: True,  # all in
                "model_filter": lambda tag: True,  # all in
            }
        ],
        "headers": [],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
    }
    Swagger(app, config=swagger_config)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(puzzle_bp, url_prefix='/api')
    app.register_blueprint(usage_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')

    # Initialize CORS after blueprints are registered to ensure all routes are covered
    CORS(app,
         resources={r"/api/*": {
             "origins": ["http://localhost:5500"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"]
         }}, supports_credentials=True)

    # Create tables on first run (opt-in)
    # Set DB_AUTO_CREATE=true in backend/.env to enable automatic table creation.
    if (os.getenv('DB_AUTO_CREATE') or 'false').strip().lower() == 'true':
        with app.app_context():
            db.create_all()

    app.after_request(record_api_call)

    return app


if __name__ == '__main__':
    app = create_app()
    print('Starting Crossword Generator API Server...')
    print('Server running on http://localhost:5050')
    app.run(debug=True, host='0.0.0.0', port=5050)
