from repositories.user_repository import UserRepository
from utils.jwt_tokens import create_access_token


class AuthService:
    def __init__(self):
        self.repo = UserRepository()

    def signup_process(self, data: dict):
        # 1) email unique
        existing = self.repo.get_by_email(data["email"])
        if existing:
            return False, "Email already exists", None, None

        # 2) create user (password hashing handled by UserManager)
        user = self.repo.create_user(**data)

        # 3) generate JWT
        token = create_access_token(user)
        return True, "Signup successful", token, user

    def login_process(self, email: str, password: str):
        user = self.repo.get_by_email(email)
        if not user:
            return False, "Invalid credentials", None, None

        # banned check
        if user.banned_at is not None:
            return False, "User is banned", None, None

        # password check
        if not user.check_password(password):
            return False, "Invalid credentials", None, None

        token = create_access_token(user)
        return True, "Login successful", token, user
