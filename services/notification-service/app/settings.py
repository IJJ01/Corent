import os
from dotenv import load_dotenv

load_dotenv()

GRPC_HOST = os.getenv("GRPC_HOST", "0.0.0.0")
GRPC_PORT = int(os.getenv("GRPC_PORT", "50056"))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:ijj@123@localhost:5432/notification_service_db",
)
