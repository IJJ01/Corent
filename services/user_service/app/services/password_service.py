import os

from services.user_service.app.repositories.user_repository import UserRepository
from services.user_service.app.utils.reset_tokens import create_reset_token, verify_reset_token


class PasswordService:
    def __init__(self):
        self.repo = UserRepository()
        self.frontend_reset_url = os.getenv("FRONTEND_RESET_URL", "http://localhost:3000/reset-password")

    def edit_user_password(self, user_id: str, old_password: str, new_password: str):
        user = self.repo.get_by_id(user_id)
        if not user:
            return False, "User not found"

        if not user.check_password(old_password):
            return False, "Old password is incorrect"

        self.repo.set_password(user, new_password)
        return True, "Password updated"

    def forget_password_process(self, email: str):
        user = self.repo.get_by_email(email)
        if not user:
            # security: do not reveal whether email exists
            return True, "If the email exists, a reset link was sent."

        token = create_reset_token(user)
        reset_link = f"{self.frontend_reset_url}?token={token}"

        # For now, we just return success.
        # Later: send email via notification service.
        # You can log reset_link during dev if you want.
        return True, f"Reset link generated: {reset_link}"

    def reset_password_process(self, token: str, new_password: str):
        payload = verify_reset_token(token)
        if not payload:
            return False, "Invalid or expired token"

        user_id = payload.get("user_id")
        user = self.repo.get_by_id(user_id)
        if not user:
            return False, "User not found"

        self.repo.set_password(user, new_password)
        return True, "Password reset successful"
