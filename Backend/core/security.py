import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional

# Secret key and algorithm for JWT signing
# Note: In production, load this from environment variables (e.g., via pydantic-settings)
SECRET_KEY = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours


def hash_password(password: str) -> str:
    """
    Hashes a plain text password safely using native bcrypt.
    Handles bcrypt's 72-byte native limit by encoding and truncating bytes cleanly.
    """
    if not password:
        return ""

    # 1. Convert password string to UTF-8 bytes and safely limit to 72 bytes
    pwd_bytes = password.encode("utf-8")[:72]

    # 2. Generate salt and hash
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(pwd_bytes, salt)

    # 3. Return string representation for PostgreSQL VARCHAR storage
    return hashed_bytes.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a stored bcrypt hash string.
    """
    if not plain_password or not hashed_password:
        return False

    pwd_bytes = plain_password.encode("utf-8")[:72]
    hash_bytes = hashed_password.encode("utf-8")

    try:
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a signed JWT access token containing session payload parameters.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates an incoming JWT access token.
    Returns the payload dictionary if valid, or None if token is invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None