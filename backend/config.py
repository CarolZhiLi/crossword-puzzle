import os
import ssl
from urllib.parse import urlparse, urlunparse, quote


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
            # If DB_USER equals the admin DB username, use ADMIN_PASSWORD
            admin_user = os.getenv('DB_ADMIN') or os.getenv('DB_ADMIN_USER')
            admin_password = os.getenv('ADMIN_PASSWORD')
            use_admin = bool(admin_user and admin_password and db_user == admin_user)
            user = admin_user if use_admin else db_user
            pwd = admin_password if use_admin else db_password
            database_url = f"mysql+pymysql://{user}:{pwd}@{db_host}:{db_port}/{db_name}"
        else:
            # Fallback to SQLite in-memory if nothing provided (developer convenience)
            database_url = 'sqlite:///crossythink.db'

    # If a full DATABASE_URL is provided and targets the admin DB user, replace password with ADMIN_PASSWORD
    try:
        parsed = urlparse(database_url)
        if parsed.scheme.lower().startswith('mysql'):
            admin_user = os.getenv('DB_ADMIN') or os.getenv('DB_ADMIN_USER')
            admin_password = os.getenv('ADMIN_PASSWORD')
            if admin_user and admin_password and parsed.username == admin_user:
                host = parsed.hostname or ''
                port = f":{parsed.port}" if parsed.port else ''
                auth = f"{admin_user}:{quote(admin_password, safe='')}@"
                new_netloc = f"{auth}{host}{port}"
                database_url = urlunparse(parsed._replace(netloc=new_netloc))
    except Exception:
        pass

    engine_options = { 'pool_pre_ping': True }
    # Only apply SSL to MySQL connections
    if str(database_url).lower().startswith('mysql'):
        ssl_mode = (os.getenv('DB_SSL_MODE') or '').strip().upper()
        insecure = (os.getenv('DB_SSL_INSECURE') or '').strip().lower() == 'true'

        if ssl_mode == 'REQUIRED':
            # Enable TLS; no custom CA handling
            if insecure:
                engine_options['connect_args'] = {
                    'ssl': {'cert_reqs': ssl.CERT_NONE}
                }
            else:
                # TLS enabled with library defaults (may not verify cert)
                engine_options['connect_args'] = {
                    'ssl': {}
                }

    cfg['SQLALCHEMY_DATABASE_URI'] = database_url
    cfg['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
    cfg['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    return cfg
