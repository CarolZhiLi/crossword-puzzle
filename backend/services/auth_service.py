from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy import or_
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

from extensions import db
from models import User, PasswordReset
from utils.validators import is_valid_email, is_valid_password, is_valid_username
from utils.security import gen_reset_token, hash_token, build_reset_link
from services.email_service import EmailService


class AuthService:
    def __init__(self):
        self.email = EmailService()

    # --- Queries ---
    def find_user_by_identifier(self, identifier: str) -> Optional[User]:
        return User.query.filter(or_(User.username == identifier, User.email == identifier)).first()

    # --- Actions ---
    def register(self, username: str, email: str, password: str) -> Tuple[dict, str]:
        if not is_valid_username(username):
            raise ValueError('Invalid username. Must be 6-12 chars, letters and numbers, and include both.')
        if not is_valid_email(email):
            raise ValueError('Invalid email address.')
        if not is_valid_password(password):
            raise ValueError('Invalid password. Must be 6-15 characters.')

        existing = User.query.filter(or_(User.username == username, User.email == email)).first()
        if existing:
            raise ValueError('Username or email already in use.')

        user = User(username=username, email=email, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()

        token = create_access_token(identity=username)
        return {'username': username, 'email': email}, token

    def login(self, identifier: str, password: str) -> Tuple[dict, str]:
        if not identifier or not password:
            raise ValueError('Username/email and password are required.')
        user = self.find_user_by_identifier(identifier)
        if not user or not check_password_hash(user.password_hash, password):
            raise ValueError('Invalid credentials.')
        token = create_access_token(identity=user.username)
        return {'username': user.username, 'email': user.email}, token

    def me(self, username: str) -> Optional[dict]:
        user = User.query.filter_by(username=username).first()
        if not user:
            return None
        return {'username': user.username, 'email': user.email}

    def forgot_password(self, identifier: str) -> None:
        if not identifier:
            return
        user = self.find_user_by_identifier(identifier)
        if not user:
            return
        token = gen_reset_token()
        token_hash = hash_token(token)
        ttl_minutes = int((__import__('os').getenv('RESET_TOKEN_MINUTES') or '15'))
        expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)

        pr = PasswordReset(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        db.session.add(pr)
        db.session.commit()

        reset_link = build_reset_link(token)
        sent = self.email.send_reset_email(user.email, reset_link)
        if sent:
            print(f"[Password Reset] Email sent to {user.email}")
        print(f"[Password Reset] Link for {user.email}: {reset_link}")

    def reset_password(self, token: str, password: str, confirm_password: Optional[str] = None) -> None:
        if not token:
            raise ValueError('Invalid or expired token.')
        confirm = confirm_password or password
        if password != confirm:
            raise ValueError('Passwords do not match.')
        if not is_valid_password(password):
            raise ValueError('Invalid password. Must be 6-15 characters.')

        token_hash = hash_token(token)
        pr = PasswordReset.query.filter_by(token_hash=token_hash).first()
        if not pr or (pr.used_at is not None) or (pr.expires_at < datetime.utcnow()):
            raise ValueError('Invalid or expired token.')

        user = User.query.get(pr.user_id)
        if not user:
            raise ValueError('Invalid or expired token.')

        user.password_hash = generate_password_hash(password)
        pr.used_at = datetime.utcnow()
        db.session.commit()
