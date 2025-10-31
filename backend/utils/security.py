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

