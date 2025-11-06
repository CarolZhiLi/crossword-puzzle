import os
import ssl
from contextlib import contextmanager
from urllib.parse import urlparse, urlunparse, quote

from sqlalchemy import create_engine
from sqlalchemy.orm import Session


def _build_admin_database_url() -> str:
    """Construct a MySQL PyMySQL URL using admin credentials from env.

    Prefers existing DATABASE_URL with swapped admin credentials when possible.
    Fallback to components (DB_HOST/DB_PORT/DB_NAME + DB_ADMIN/ADMIN_PASSWORD).
    """
    admin_user = os.getenv('DB_ADMIN') or os.getenv('DB_ADMIN_USER')
    admin_password = os.getenv('ADMIN_PASSWORD')
    if not admin_user or not admin_password:
        raise RuntimeError('Admin DB credentials are not set (DB_ADMIN/ADMIN_PASSWORD).')

    database_url = os.getenv('DATABASE_URL')
    if database_url:
        try:
            parsed = urlparse(database_url)
            if parsed.scheme.lower().startswith('mysql'):
                host = parsed.hostname or ''
                port = f':{parsed.port}' if parsed.port else ''
                auth = f"{admin_user}:{quote(admin_password, safe='')}@"
                netloc = f"{auth}{host}{port}"
                return urlunparse(parsed._replace(netloc=netloc))
        except Exception:
            # Fall through to manual build
            pass

    host = os.getenv('DB_HOST', 'localhost')
    port = os.getenv('DB_PORT', '3306')
    name = os.getenv('DB_NAME', 'crswd')
    return f"mysql+pymysql://{admin_user}:{quote(admin_password, safe='')}@{host}:{port}/{name}"


def _admin_engine_connect_args() -> dict:
    """Return connect_args for TLS based on env (matches config.py behavior)."""
    connect_args: dict = {}
    dsn = _build_admin_database_url()
    if str(dsn).lower().startswith('mysql'):
        ssl_mode = (os.getenv('DB_SSL_MODE') or '').strip().upper()
        insecure = (os.getenv('DB_SSL_INSECURE') or '').strip().lower() == 'true'
        if ssl_mode == 'REQUIRED':
            if insecure:
                connect_args['ssl'] = {'cert_reqs': ssl.CERT_NONE}
            else:
                connect_args['ssl'] = {}
    return connect_args


def get_admin_engine():
    """Create an Engine bound with admin credentials."""
    url = _build_admin_database_url()
    connect_args = _admin_engine_connect_args()
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


@contextmanager
def admin_session_scope():
    """Provide a transactional scope around a series of operations using admin DB creds."""
    engine = get_admin_engine()
    session = Session(bind=engine, future=True)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        try:
            engine.dispose()
        except Exception:
            pass

