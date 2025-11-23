import os
import sys
from dataclasses import dataclass

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

# Allow running this file directly from repo root or backend/
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models import User, UserRole  # noqa: E402


@dataclass
class Args:
    email: str
    password: str
    username: str | None = None


def parse_args() -> Args:
    # Extremely lightweight arg parsing: --email, --password, [--username]
    email = None
    password = None
    username = None
    it = iter(sys.argv[1:])
    for token in it:
        if token == "--email":
            email = next(it, None)
        elif token == "--password":
            password = next(it, None)
        elif token == "--username":
            username = next(it, None)
        else:
            # Support shortcut form: --email=a@b --password=111
            if token.startswith("--email="):
                email = token.split("=", 1)[1]
            elif token.startswith("--password="):
                password = token.split("=", 1)[1]
            elif token.startswith("--username="):
                username = token.split("=", 1)[1]
    if not email or not password:
        print("Usage: python backend/scripts/create_admin.py --email <email> --password <password> [--username <username>]")
        sys.exit(2)
    return Args(email=email.strip(), password=password, username=(username.strip() if username else None))


def resolve_username(preferred: str | None, email: str) -> str:
    # Username must be 6-12 alphanumeric and include letters and digits.
    # Prefer a supplied username; otherwise derive from 'admin01', 'admin02', ...
    base = (preferred or "admin01")
    # Ensure alnum and length; fall back to admin01 if needed
    def valid(u: str) -> bool:
        return u.isalnum() and 6 <= len(u) <= 12 and any(c.isalpha() for c in u) and any(c.isdigit() for c in u)

    candidate = base
    if not valid(candidate):
        candidate = "admin01"
    # Ensure uniqueness
    n = 1
    while User.query.filter_by(username=candidate).first() is not None:
        n += 1
        candidate = f"admin{n:02d}"
        if len(candidate) > 12:
            # Trim to last 12 chars if it ever grows too long (unlikely)
            candidate = candidate[-12:]
    return candidate


def main():
    # Load env from backend/.env (same as app)
    load_dotenv(os.path.join(BASE, ".env"))

    # Spin up app + DB context
    app = create_app()
    with app.app_context():
        args = parse_args()

        # Find or create user by email
        user = User.query.filter_by(email=args.email).first()
        if user:
            # Update password and ensure admin role
            user.password_hash = generate_password_hash(args.password, method='pbkdf2:sha256')
            assigned_username = user.username
            created = False
        else:
            assigned_username = resolve_username(args.username, args.email)
            user = User(
                username=assigned_username,
                email=args.email,
                password_hash=generate_password_hash(args.password, method='pbkdf2:sha256'),
            )
            db.session.add(user)
            created = True
        db.session.commit()

        # Upsert admin role
        role = UserRole.query.filter_by(user_id=user.id).first()
        if not role:
            role = UserRole(user_id=user.id, role='admin')
            db.session.add(role)
        else:
            role.role = 'admin'
        db.session.commit()

        print("Success! Admin user is ready:")
        print(f"  email: {user.email}")
        print(f"  username: {user.username}")
        print(f"  role: admin")
        print(f"  password: (set as provided)")
        print(f"  created: {created}")


if __name__ == "__main__":
    main()

