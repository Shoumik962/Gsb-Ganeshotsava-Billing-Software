"""Session tokens and login; no hardcoded passwords or signing secrets."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 390000)
    return 'pbkdf2_sha256$390000$' + salt.hex() + '$' + digest.hex()

def verify_password(password: str, value: str) -> bool:
    try:
        algo, iterations, salt, digest = value.split('$')
        if algo != 'pbkdf2_sha256': return False
        check = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(check, bytes.fromhex(digest))
    except (ValueError, TypeError):
        return False

def sign_token(user: User) -> str:
    secret = os.getenv('JWT_SECRET', '')
    if len(secret) < 32: raise RuntimeError('JWT_SECRET must be at least 32 characters')
    now = datetime.now(timezone.utc)
    return jwt.encode({'sub': user.id, 'iat': now, 'exp': now + timedelta(hours=8)}, secret, algorithm='HS256')

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials: raise HTTPException(401, 'Staff sign-in required')
    try:
        secret = os.getenv('JWT_SECRET', '')
        if len(secret) < 32: raise ValueError('Missing JWT_SECRET')
        payload = jwt.decode(credentials.credentials, secret, algorithms=['HS256'])
        user = db.get(User, payload['sub'])
        if not user or not user.active: raise ValueError('No active user')
        return user
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(401, 'Invalid or expired session')

def require_roles(*roles):
    def check(user: User = Depends(current_user)) -> User:
        if user.role not in roles: raise HTTPException(403, 'Insufficient permissions')
        return user
    return check

def optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User | None:
    """Permit anonymous donations while requiring a valid identity when a token is supplied."""
    if credentials is None:
        return None
    return current_user(credentials, db)
