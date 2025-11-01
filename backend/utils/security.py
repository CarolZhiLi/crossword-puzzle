import hashlib
import secrets
import os


def gen_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def build_reset_link(token: str) -> str:
    base = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5500')
    return f"{base.rstrip('/')}/reset.html?token={token}"


def is_admin_username(username: str) -> bool:
    """Return True if the given username is configured as an admin via env vars.

    Supports:
    - ADMIN_USERNAMES="user1,user2"
    - ADMIN_USERNAME="user1" (single)
    """
    if not username:
        return False
    admins = os.getenv('ADMIN_USERNAMES')
    single = os.getenv('ADMIN_USERNAME')
    names = []
    if admins:
        names.extend([x.strip() for x in admins.split(',') if x.strip()])
    if single:
        names.append(single.strip())
    return username in set(names)
