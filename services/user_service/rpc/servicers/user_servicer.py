from datetime import date

import grpc
import os
from shared.generated import user_pb2, user_pb2_grpc
from services.user_service.app.repositories.user_repository import UserRepository
from services.user_service.app.services.auth_service import AuthService
from services.user_service.app.services.profile_service import ProfileService
from services.user_service.app.services.password_service import PasswordService
from services.user_service.app.services.admin_service import AdminService



def _dt_to_str(dt):
    return dt.isoformat() if dt else ""

def _require_jwt_or_internal(context):
    """
    Allow internal service calls using x-internal-key OR normal user calls using JWT.
    Returns:
      - None if internal key is valid (service-to-service call)
      - User object if authenticated via JWT
    """
    key = os.environ.get("INTERNAL_GRPC_KEY", "").strip()
    if key:
        md = dict(context.invocation_metadata())
        got = (md.get("x-internal-key") or "").strip()
        if got == key:
            return None

    from rpc.auth import get_user_from_metadata
    return get_user_from_metadata(context)


def _require_internal_key(context):
    key = os.environ.get("INTERNAL_GRPC_KEY", "")
    if not key:
        return  # si tu veux désactiver en dev

    md = dict(context.invocation_metadata())
    got = md.get("x-internal-key", "")
    if got != key:
        context.abort(grpc.StatusCode.PERMISSION_DENIED, "Invalid internal key")

def _date_to_str(d):
    return d.isoformat() if d else ""


def _str_to_date(s: str):
    if not s:
        return None
    try:
        return date.fromisoformat(s)  # expects "YYYY-MM-DD"
    except ValueError:
        return None


def _user_to_message(user):
    return user_pb2.UserMessage(
        user_id=str(user.user_id),
        email=user.email,
        phone_number=user.phone_number or "",
        CIN=user.CIN or "",
        first_name=user.first_name or "",
        last_name=user.last_name or "",
        birth_date=_date_to_str(user.birth_date),
        profile_pic_url=user.profile_pic_url or "",
        adress=user.adress or "",
        city=user.city or "",
        is_admin=bool(user.is_admin),
        banned_at=_dt_to_str(user.banned_at),
        deleted_at=_dt_to_str(user.deleted_at),
        edited_at=_dt_to_str(user.edited_at),
        created_at=_dt_to_str(user.created_at),
    )


class UserServicer(user_pb2_grpc.UserServiceServicer):
    def __init__(self):
        self.repo = UserRepository()
        self.auth = AuthService()
        self.profile = ProfileService()
        self.passwords = PasswordService()
        self.admin = AdminService()

    # -------- Auth --------
    def SignupProcess(self, request, context):
        data = {
            "email": request.email.strip().lower(),
            "password": request.password,
            "phone_number": request.phone_number or None,
            "CIN": request.CIN or None,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "birth_date": _str_to_date(request.birth_date),
            "profile_pic_url": request.profile_pic_url or None,
            "adress": request.adress or None,
            "city": request.city or None,
            "is_admin": False,  # keep default false on signup
        }

        ok, msg, token, user = self.auth.signup_process(data)
        if not ok:
            return user_pb2.AuthResponse(ok=False, message=msg, access_token="", user=user_pb2.UserMessage())

        return user_pb2.AuthResponse(ok=True, message=msg, access_token=token, user=_user_to_message(user))

    def LoginProcess(self, request, context):
        email = request.email.strip().lower()
        ok, msg, token, user = self.auth.login_process(email, request.password)
        if not ok:
            return user_pb2.AuthResponse(ok=False, message=msg, access_token="", user=user_pb2.UserMessage())

        return user_pb2.AuthResponse(ok=True, message=msg, access_token=token, user=_user_to_message(user))

    # -------- Lists --------
    def ListAllUsers(self, request, context):
        _ = _require_jwt_or_internal(context)

        users = self.repo.list_all_users()
        return user_pb2.UsersListResponse(
            ok=True,
            message="OK",
            users=[_user_to_message(u) for u in users],
        )

    def ListAdmins(self, request, context):
        caller = _require_jwt_or_internal(context)

        # If JWT caller exists, enforce admin. If internal caller (None), allow.
        if caller is not None and not caller.is_admin:
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Admin only")

        admins = self.repo.list_admins()
        return user_pb2.UsersListResponse(
            ok=True,
            message="OK",
            users=[_user_to_message(u) for u in admins],
        )

    def ListBannedUsers(self, request, context):
        caller = _require_jwt_or_internal(context)

        if caller is not None and not caller.is_admin:
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Admin only")

        users = self.repo.list_banned_users()
        return user_pb2.UsersListResponse(
            ok=True,
            message="OK",
            users=[_user_to_message(u) for u in users],
        )

    # -------- Get user --------
    def ListAllUserInfos(self, request, context):
        user = self.repo.get_by_id(request.user_id)
        if not user:
            return user_pb2.UserResponse(ok=False, message="User not found", user=user_pb2.UserMessage())

        return user_pb2.UserResponse(ok=True, message="OK", user=_user_to_message(user))

    def ListUserInfosForProfile(self, request, context):
        from grpc_server.auth import get_user_from_metadata
        _ = get_user_from_metadata(context)

        ok, msg, profile = self.profile.list_user_infos_for_profile(request.user_id)
        if not ok:
            return user_pb2.UserProfileResponse(ok=False, message=msg)

        return user_pb2.UserProfileResponse(
            ok=True,
            message=msg,
            user_id=profile["user_id"],
            first_name=profile["first_name"],
            last_name=profile["last_name"],
            profile_pic_url=profile["profile_pic_url"],
            city=profile["city"],
            is_admin=profile["is_admin"],
        )

    # -------- Edit --------
    def EditUserInfos(self, request, context):
        from grpc_server.auth import get_user_from_metadata
        _ = get_user_from_metadata(context)


        updates = {}

        # only update if non-empty (proto strings default to "")
        if request.phone_number:
            updates["phone_number"] = request.phone_number
        if request.CIN:
            updates["CIN"] = request.CIN
        if request.first_name:
            updates["first_name"] = request.first_name
        if request.last_name:
            updates["last_name"] = request.last_name
        if request.birth_date:
            parsed = _str_to_date(request.birth_date)
            if parsed:
                updates["birth_date"] = parsed
        if request.profile_pic_url:
            updates["profile_pic_url"] = request.profile_pic_url
        if request.adress:
            updates["adress"] = request.adress
        if request.city:
            updates["city"] = request.city

        ok, msg, user = self.profile.edit_user_infos(request.user_id, updates)
        if not ok:
            return user_pb2.UserResponse(ok=False, message=msg, user=user_pb2.UserMessage())

        return user_pb2.UserResponse(ok=True, message=msg, user=_user_to_message(user))

    def EditUserPassword(self, request, context):
        from grpc_server.auth import get_user_from_metadata
        _ = get_user_from_metadata(context)
        ok, msg = self.passwords.edit_user_password(
            request.user_id,
            request.old_password,
            request.new_password,
        )
        return user_pb2.SimpleResponse(ok=ok, message=msg)

    # -------- Forgot / Reset --------
    def ForgetPasswordProcess(self, request, context):
        ok, msg = self.passwords.forget_password_process(request.email.strip().lower())
        return user_pb2.SimpleResponse(ok=ok, message=msg)

    def ResetPasswordProcess(self, request, context):
        ok, msg = self.passwords.reset_password_process(request.token, request.new_password)
        return user_pb2.SimpleResponse(ok=ok, message=msg)


    # -------- Admin actions --------
    def BanUser(self, request, context):
        _require_internal_key(context)  # ✅ pas de JWT

        ok, msg, user = self.admin.ban_user(request.user_id)
        if not ok:
            return user_pb2.UserResponse(ok=False, message=msg, user=user_pb2.UserMessage())
        return user_pb2.UserResponse(ok=True, message=msg, user=_user_to_message(user))

    def UnbanUser(self, request, context):
        _require_internal_key(context)  # ✅ pas de JWT

        ok, msg, user = self.admin.unban_user(request.user_id)
        if not ok:
            return user_pb2.UserResponse(ok=False, message=msg, user=user_pb2.UserMessage())
        return user_pb2.UserResponse(ok=True, message=msg, user=_user_to_message(user))



