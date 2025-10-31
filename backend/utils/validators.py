import re


def is_valid_username(username: str) -> bool:
    if not isinstance(username, str):
        return False
    if len(username) < 6 or len(username) > 12:
        return False
    if not username.isalnum():
        return False
    has_alpha = any(c.isalpha() for c in username)
    has_digit = any(c.isdigit() for c in username)
    return has_alpha and has_digit


def is_valid_email(email: str) -> bool:
    if not isinstance(email, str):
        return False
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None


def is_valid_password(password: str) -> bool:
    if not isinstance(password, str):
        return False
    return 6 <= len(password) <= 15

