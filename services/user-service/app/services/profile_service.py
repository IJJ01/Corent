from repositories.user_repository import UserRepository


class ProfileService:
    def __init__(self):
        self.repo = UserRepository()

    def list_user_infos_for_profile(self, user_id: str):
        user = self.repo.get_by_id(user_id)
        if not user:
            return False, "User not found", None

        profile = {
            "user_id": str(user.user_id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "profile_pic_url": user.profile_pic_url or "",
            "city": user.city or "",
            "is_admin": user.is_admin,
        }
        return True, "OK", profile

    def edit_user_infos(self, user_id: str, updates: dict):
        user = self.repo.get_by_id(user_id)
        if not user:
            return False, "User not found", None

        updated_user = self.repo.update_user_infos(user, **updates)
        return True, "User updated", updated_user
