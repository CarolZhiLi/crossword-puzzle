import os


def build_config() -> dict:
    """Build Flask configuration from environment variables (and backend/.env loaded by app)."""
    cfg: dict = {}

    # JWT
    cfg['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'change-this-secret-in-production')

    # SQLAlchemy
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        db_user = os.getenv('DB_USER')
        db_password = os.getenv('DB_PASSWORD')
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '3306')
        db_name = os.getenv('DB_NAME', 'crswd')
        if db_user and db_password and db_name:
            database_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        else:
            # Fallback to SQLite in-memory if nothing provided (developer convenience)
            database_url = 'sqlite:///crossythink.db'

    engine_options = { 'pool_pre_ping': True }
    ssl_ca = os.getenv('DB_SSL_CA')
    if ssl_ca and os.path.exists(ssl_ca):
        engine_options['connect_args'] = { 'ssl': { 'ca': ssl_ca } }

    cfg['SQLALCHEMY_DATABASE_URI'] = database_url
    cfg['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
    cfg['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    return cfg

