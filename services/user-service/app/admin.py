from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "is_admin", "banned_at", "deleted_at", "created_at")
    search_fields = ("email", "first_name", "last_name", "CIN", "phone_number")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "birth_date", "phone_number", "CIN", "profile_pic_url", "adress", "city")}),
        ("Status", {"fields": ("is_admin", "banned_at", "deleted_at", "is_active", "is_staff", "is_superuser")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "created_at", "edited_at")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "password1", "password2", "is_staff", "is_superuser"),
        }),
    )
