import jwt
import os
from datetime import datetime, timedelta, timezone

RESET_SECRET = os.getenv("JWT_SECRET", "jwt-secret-key")  # you can later separate this
RESET_ALGORITHM = "HS256"
RESET_TOKEN_TTL_MIN = int(os.getenv("RESET_TOKEN_TTL_MIN", 15))


def create_reset_token(user):
    payload = {
        "user_id": str(user.user_id),
        "email": user.email,
        "purpose": "password_reset",
        "iat": datetime.now(tz=timezone.utc),
        "exp": datetime.now(tz=timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MIN),
    }
    return jwt.encode(payload, RESET_SECRET, algorithm=RESET_ALGORITHM)


def verify_reset_token(token: str):
    try:
        payload = jwt.decode(token, RESET_SECRET, algorithms=[RESET_ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
