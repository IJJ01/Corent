import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.resolve()

services = [
    ("user-service",         ROOT / "services/user_service/.venv/Scripts/python.exe",         "services.user_service.rpc.server"),
    ("house-service",        ROOT / "services/house_service/.venv/Scripts/python.exe",        "services.house_service.rpc.server"),
    ("application-service",  ROOT / "services/application_service/.venv/Scripts/python.exe",  "services.application_service.rpc.server"),
    ("admin-service",        ROOT / "services/admin_service/.venv/Scripts/python.exe",        "services.admin_service.rpc.server"),
    ("notification-service", ROOT / "services/notification_service/.venv/Scripts/python.exe", "services.notification_service.rpc.server"),
]

for name, python, module in services:
    subprocess.Popen(
        f'start "{name}" cmd /k "{python} -m {module}"',
        shell=True, cwd=ROOT
    )

uvicorn = ROOT / "gateway/.venv/Scripts/uvicorn.exe"
subprocess.Popen(
    f'start "gateway" cmd /k "{uvicorn} app.main:app --host 0.0.0.0 --port 8000 --reload"',
    shell=True, cwd=ROOT / "gateway"
)

print("All services launched in separate terminals.")