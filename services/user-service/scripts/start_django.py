import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.management import execute_from_command_line  # noqa


if __name__ == "__main__":
    execute_from_command_line(["manage.py", "runserver", "127.0.0.1:8000"])
