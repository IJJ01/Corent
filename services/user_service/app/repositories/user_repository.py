from django.utils import timezone
from app.models import User


class UserRepository:
    # ---------- Create / Read ----------
    def get_by_email(self, email: str):
        return User.objects.filter(email=email, deleted_at__isnull=True).first()

    def get_by_id(self, user_id: str):
        return User.objects.filter(user_id=user_id, deleted_at__isnull=True).first()

    def list_all_users(self):
        return User.objects.filter(deleted_at__isnull=True).order_by("-created_at")

    def list_admins(self):
        return User.objects.filter(is_admin=True, deleted_at__isnull=True).order_by("-created_at")

    def list_banned_users(self):
        return User.objects.filter(banned_at__isnull=False, deleted_at__isnull=True).order_by("-banned_at")

    def create_user(self, **data):
        # uses UserManager methods (hashes password)
        password = data.pop("password", None)
        return User.objects.create_user(password=password, **data)

    # ---------- Update ----------
    def update_user_infos(self, user: User, **updates):
        # only apply provided (non-None) updates
        for key, value in updates.items():
            if value is not None:
                setattr(user, key, value)
        user.edited_at = timezone.now()
        user.save()
        return user

    def set_password(self, user: User, new_password: str):
        user.set_password(new_password)
        user.edited_at = timezone.now()
        user.save()
        return user

    # ---------- Soft delete / ban helpers ----------
    def soft_delete(self, user: User):
        user.deleted_at = timezone.now()
        user.save()
        return user

    def ban(self, user: User):
        user.banned_at = timezone.now()
        user.save()
        return user

    def unban(self, user: User):
        user.banned_at = None
        user.save()
        return user

    def ban_by_id(self, user_id: str):
        user = self.get_by_id(user_id)
        if not user:
            return None
        return self.ban(user)

    def unban_by_id(self, user_id: str):
        user = self.get_by_id(user_id)
        if not user:
            return None
        return self.unban(user)
