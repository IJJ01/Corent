from django.db import migrations
from django.contrib.auth.hashers import make_password


def seed_admin(apps, schema_editor):
    User = apps.get_model("users", "User")

    email = "admin@co-rent.com"

    if User.objects.filter(email=email).exists():
        return

    User.objects.create(
        email=email,
        first_name="Admin",
        last_name="Root",
        is_admin=True,
        is_active=True,
        password=make_password("Admin@123"),
    )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_admin),
    ]
