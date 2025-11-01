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
    # Only apply SSL to MySQL connections
    if str(database_url).lower().startswith('mysql'):
        ssl_ca = os.getenv('DB_SSL_CA')
        if ssl_ca:
            ca_path = ssl_ca
            # Resolve relative paths robustly whether app is started at repo root or backend/
            if not os.path.isabs(ca_path) and not os.path.exists(ca_path):
                base = os.path.dirname(os.path.abspath(__file__))
                candidate = os.path.join(base, ca_path)
                if os.path.exists(candidate):
                    ca_path = candidate
                else:
                    norm = ca_path.replace('\\', '/')
                    if norm.startswith('backend/'):
                        alt = os.path.join(base, norm.split('/', 1)[1])
                        if os.path.exists(alt):
                            ca_path = alt
            if os.path.exists(ca_path):
                engine_options['connect_args'] = { 'ssl': { 'ca': ca_path } }

    cfg['SQLALCHEMY_DATABASE_URI'] = database_url
    cfg['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
    cfg['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    return cfg
