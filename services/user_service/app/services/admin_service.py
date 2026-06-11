from services.user_service.app.repositories.user_repository import UserRepository


class AdminService:
    def __init__(self):
        self.repo = UserRepository()

    def ban_user(self, user_id: str):
        user = self.repo.ban_by_id(user_id)
        if not user:
            return False, "User not found", None
        return True, "User banned", user

    def unban_user(self, user_id: str):
        user = self.repo.unban_by_id(user_id)
        if not user:
            return False, "User not found", None
        return True, "User unbanned", user
