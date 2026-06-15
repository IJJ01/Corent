import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import grpc

from app.config import settings

from shared.generated import (admin_service_pb2_grpc,
                              application_pb2_grpc,
                              house_pb2_grpc, user_pb2_grpc,
                              notification_pb2_grpc)


class GrpcClients:
    def __init__(self) -> None:
        self.user_channel = grpc.insecure_channel(settings.USER_GRPC_ADDR)
        self.house_channel = grpc.insecure_channel(settings.HOUSE_GRPC_ADDR)
        self.app_channel = grpc.insecure_channel(settings.APP_GRPC_ADDR)
        self.admin_channel = grpc.insecure_channel(settings.ADMIN_GRPC_ADDR)
        self.notif_channel = grpc.insecure_channel(settings.NOTIF_GRPC_ADDR)

        self.users = user_pb2_grpc.UserServiceStub(self.user_channel)
        self.houses = house_pb2_grpc.HouseServiceStub(self.house_channel)
        self.apps = application_pb2_grpc.AppServiceStub(self.app_channel)
        self.admin = admin_service_pb2_grpc.AdminServiceStub(self.admin_channel)
        self.notifs = notification_pb2_grpc.NotificationServiceStub(self.notif_channel)

    def close(self) -> None:
        self.user_channel.close()
        self.house_channel.close()
        self.app_channel.close()
        self.admin_channel.close()
        self.notif_channel.close()
