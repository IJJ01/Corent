import jwt
import os
from datetime import datetime, timedelta, timezone

JWT_SECRET = os.getenv("JWT_SECRET", "jwt-secret-key")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TTL_MIN = int(os.getenv("JWT_ACCESS_TTL_MIN", 30))


def create_access_token(user):
    payload = {
        "user_id": str(user.user_id),
        "email": user.email,
        "is_admin": user.is_admin,
        "iat": datetime.now(tz=timezone.utc),
        "exp": datetime.now(tz=timezone.utc) + timedelta(minutes=JWT_ACCESS_TTL_MIN),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
