import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    # gRPC addresses
    USER_GRPC_ADDR: str = os.getenv("USER_GRPC_ADDR", "127.0.0.1:50053")
    HOUSE_GRPC_ADDR: str = os.getenv("HOUSE_GRPC_ADDR", "127.0.0.1:50052")
    APP_GRPC_ADDR: str = os.getenv("APP_GRPC_ADDR", "127.0.0.1:50051")
    ADMIN_GRPC_ADDR: str = os.getenv("ADMIN_GRPC_ADDR", "127.0.0.1:50054")
    NOTIF_GRPC_ADDR: str = os.getenv("NOTIF_GRPC_ADDR", "127.0.0.1:50056")

    INTERNAL_GRPC_KEY: str = os.getenv("INTERNAL_GRPC_KEY", "").strip()

    # CORS
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


settings = Settings()
