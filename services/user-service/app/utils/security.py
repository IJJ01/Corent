from passlib.hash import bcrypt


def hash_password(raw_password: str) -> str:
    return bcrypt.hash(raw_password)


def verify_password(raw_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.verify(raw_password, hashed_password)
    except Exception:
        return False
