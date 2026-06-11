import grpc
import uuid
from django.db import transaction
from django.utils import timezone
from google.protobuf.timestamp_pb2 import Timestamp
import os

from shared.generated import (application_pb2, application_pb2_grpc,
                              house_pb2, house_pb2_grpc, user_pb2, user_pb2_grpc, notification_pb2, notification_pb2_grpc)


from app.models import RentRequest, ListingReport


def _to_timestamp(dt):
    ts = Timestamp()
    if dt is None:
        return ts
    # Django typically returns aware datetimes if USE_TZ=True
    if timezone.is_aware(dt):
        ts.FromDatetime(dt.astimezone(timezone.utc))
    else:
        ts.FromDatetime(dt)
    return ts

class UserServiceClient:
    def __init__(self, target: str):
        self.channel = grpc.insecure_channel(target)
        self.stub = user_pb2_grpc.UserServiceStub(self.channel)

    def list_admin_ids(self, *, jwt_token: str = "") -> list[str]:
        md = []

        # internal key (preferred for service-to-service)
        key = os.environ.get("INTERNAL_GRPC_KEY", "").strip()
        if key:
            md.append(("x-internal-key", key))

        # optional JWT (only needed if your server insists on Authorization presence)
        if jwt_token:
            token = jwt_token.strip()
            if token.lower().startswith("bearer "):
                md.append(("authorization", token))
            else:
                md.append(("authorization", f"Bearer {token}"))

        res = self.stub.ListAdmins(user_pb2.ListAdminsRequest(), metadata=md)

        # handle proto variants
        ok = getattr(res, "ok", True)
        if not ok:
            return []

        users = getattr(res, "users", [])
        return [u.user_id for u in users if getattr(u, "is_admin", False)]

    def close(self):
        self.channel.close()


# -------------------------
# HouseService gRPC Client
# -------------------------
class HouseServiceClient:
    def __init__(self, target: str):
        print(f"[HouseClient] Connecting to HouseService at {target}")
        self.channel = grpc.insecure_channel(target)
        self.stub = house_pb2_grpc.HouseServiceStub(self.channel)

    def increment_occupancy(self, house_id: str, reason: str):
        print(f"[HouseClient] increment_occupancy called")
        print(f"  house_id = {house_id}")
        print(f"  reason   = {reason}")

        resp = self.stub.UpdateOccupancy(
            house_pb2.UpdateOccupancyRequest(
                house_id=house_id,
                action=house_pb2.INCREMENT,
                value=1,
                reason=reason,
            )
        )

        print("[HouseClient] UpdateOccupancy response:")
        print(f"  success         = {resp.success}")
        print(f"  occupied_rooms  = {resp.occupied_rooms}")
        print(f"  total_rooms     = {resp.total_rooms}")
        print(f"  available       = {resp.available}")

        return resp

    def close(self):
        self.channel.close()



# -------------------------
# NotificationService gRPC Client               
# -------------------------
class NotificationServiceClient:
    def __init__(self, target: str):
        self.channel = grpc.insecure_channel(target)
        self.stub = notification_pb2_grpc.NotificationServiceStub(self.channel)

        # This is the identity notif-service expects.
        # IMPORTANT: keep "service:" prefix so notif service can recognize it as an internal service.
        self.service_user_id = os.environ.get("SERVICE_USER_ID", "service:app_service").strip()
        if not self.service_user_id.startswith("service:"):
            self.service_user_id = "service:" + self.service_user_id

        # Optional role (notif service allows services anyway, but keep for clarity)
        self.service_role = os.environ.get("SERVICE_USER_ROLE", "SERVICE").strip()

    def _md(self, actor_id: str | None = None, actor_role: str | None = None):
        """
        Build gRPC metadata for notif-service auth.
        - x-user-id is REQUIRED
        - x-user-role is optional
        We keep caller as the service identity.
        """
        uid = self.service_user_id
        role = actor_role or self.service_role
        md = [("x-user-id", uid)]
        if role:
            md.append(("x-user-role", role))
        return tuple(md)

    def create_notification(
        self,
        recipient_id: str,
        ntype: str,
        title: str,
        body: str,
        payload_json: str = "{}",
        priority=notification_pb2.NORMAL,
        dedup_key: str = "",
        actor_id: str | None = None,   # optional; kept for API compatibility
        actor_role: str | None = None, # optional; kept for API compatibility
    ):
        return self.stub.CreateNotification(
            notification_pb2.CreateNotificationRequest(
                recipient_id=recipient_id,
                type=ntype,
                title=title,
                body=body,
                payload_json=payload_json,
                priority=priority,
                dedup_key=dedup_key,
            ),
            metadata=self._md(actor_id=actor_id, actor_role=actor_role),
        )

    def create_bulk(self, requests, actor_id: str | None = None, actor_role: str | None = None):
        return self.stub.CreateBulkNotifications(
            notification_pb2.CreateBulkNotificationsRequest(requests=requests),
            metadata=self._md(actor_id=actor_id, actor_role=actor_role),
        )

    def close(self):
        self.channel.close()

class AppServicer(application_pb2_grpc.AppServiceServicer):
    """
    gRPC servicer for:
      - Applications (rent requests)
      - Listing reports (admin review flow)
    """
    def __init__(self):
        house_addr = os.environ.get("HOUSE_GRPC_ADDR", "127.0.0.1:50052")
        self.house_client = HouseServiceClient(house_addr)

        notif_addr = os.environ.get("NOTIF_GRPC_ADDR", "127.0.0.1:50056")
        self.notif_client = NotificationServiceClient(notif_addr)

        user_addr = os.environ.get("USER_GRPC_ADDR", "127.0.0.1:50053")
        self.user_client = UserServiceClient(user_addr)

        # cache admins at startup (recommended)
        self.admin_ids_cache = []
        try:
            # if your UserService requires an Authorization header,
            # you can pass a real admin JWT later (see note below)
            self.admin_ids_cache = self.user_client.list_admin_ids()
        except Exception as e:
            print("[AppService] WARN: could not preload admin ids:", str(e))

        print("[AppService] cached admin ids:", self.admin_ids_cache)


    def _safe_notify(self, fn):
        """
        Notifications are SIDE EFFECTS.
        If they fail, we do NOT fail the main business operation.
        """
        try:
            fn()
        except grpc.RpcError as e:
            print("[AppService] Notification RPC failed:", e.code(), e.details())
        except Exception as e:
            print("[AppService] Notification error:", str(e))
       
    # -------------------------
    # Applications
    # -------------------------
    def ApplyForHouse(self, request, context):
        # Validate UUIDs
        try:
            applicant_id = uuid.UUID(request.applicant_id)
            house_id = uuid.UUID(request.house_id)
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid applicant_id or house_id UUID")
            return application_pb2.ApplicationResponse(error="Invalid applicant_id or house_id UUID")

        message = request.message or ""

        # Prevent duplicate pending request
        if RentRequest.objects.filter(applicant_id=applicant_id, house_id=house_id, status="pending").exists():
            context.set_code(grpc.StatusCode.ALREADY_EXISTS)
            context.set_details("Pending application already exists for this house")
            return application_pb2.ApplicationResponse(error="Pending application already exists for this house")

        try:
            app = RentRequest.objects.create(
                applicant_id=applicant_id,
                house_id=house_id,
                message=message,
                status="pending",
            )
            # 🔔 Notify applicant (confirmation)
            self._safe_notify(lambda: self.notif_client.create_notification(
                recipient_id=str(app.applicant_id),
                ntype="APPLICATION_SUBMITTED",
                title="Application sent",
                body="Your rental application has been submitted.",
                payload_json=f'{{"application_id":"{app.id}","house_id":"{app.house_id}"}}',
                priority=notification_pb2.NORMAL,
                dedup_key=f"app:submitted:{app.id}"
            ))
            return application_pb2.ApplicationResponse(application=self._app_to_proto(app), error="")
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return application_pb2.ApplicationResponse(error=str(e))

    def GetApplicationsByHouse(self, request, context):
        try:
            house_id = uuid.UUID(request.house_id)
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid house_id UUID")
            return application_pb2.ApplicationListResponse(error="Invalid house_id UUID")

        page_size = request.page_size if request.page_size > 0 else 20
        try:
            offset = int(request.page_token) if request.page_token else 0
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid page_token (must be integer offset)")
            return application_pb2.ApplicationListResponse(error="Invalid page_token")

        try:
            qs = RentRequest.objects.filter(house_id=house_id).order_by("-created_at")
            total = qs.count()
            items = list(qs[offset: offset + page_size])

            next_token = str(offset + page_size) if (offset + page_size) < total else ""

            return application_pb2.ApplicationListResponse(
                applications=[self._app_to_proto(x) for x in items],
                next_page_token=next_token,
                error=""
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return application_pb2.ApplicationListResponse(error=str(e))

    def GetApplicationsByUser(self, request, context):
        try:
            user_id = uuid.UUID(request.user_id)
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid user_id UUID")
            return application_pb2.ApplicationListResponse(error="Invalid user_id UUID")

        page_size = request.page_size if request.page_size > 0 else 20
        try:
            offset = int(request.page_token) if request.page_token else 0
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid page_token (must be integer offset)")
            return application_pb2.ApplicationListResponse(error="Invalid page_token")

        try:
            qs = RentRequest.objects.filter(applicant_id=user_id).order_by("-created_at")
            total = qs.count()
            items = list(qs[offset: offset + page_size])

            next_token = str(offset + page_size) if (offset + page_size) < total else ""

            return application_pb2.ApplicationListResponse(
                applications=[self._app_to_proto(x) for x in items],
                next_page_token=next_token,
                error=""
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return application_pb2.ApplicationListResponse(error=str(e))

    def AcceptApplication(self, request, context):
        return self._change_status(request.application_id, "accepted", context)

    def RejectApplication(self, request, context):
        return self._change_status(request.application_id, "rejected", context)

    def _change_status(self, application_id_str, new_status, context):
        try:
            app_id = uuid.UUID(application_id_str)
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid application_id UUID")
            return application_pb2.ApplicationResponse(error="Invalid application_id UUID")

        try:
            with transaction.atomic():
                try:
                    app = RentRequest.objects.select_for_update().get(id=app_id)
                except RentRequest.DoesNotExist:
                    context.set_code(grpc.StatusCode.NOT_FOUND)
                    context.set_details("Application not found")
                    return application_pb2.ApplicationResponse(error="Application not found")

                if app.status != "pending":
                    context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
                    context.set_details("Application already processed")
                    return application_pb2.ApplicationResponse(error="Application already processed")

                # ✅ Update occupancy ONLY when accepting
                if new_status == "accepted":
                    try:
                        house_resp = self.house_client.increment_occupancy(
                            house_id=str(app.house_id),
                            reason=str(app.id),
                        )

                        if not house_resp.success:
                            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
                            context.set_details(
                                house_resp.message or "House occupancy update failed"
                            )
                            return application_pb2.ApplicationResponse(
                                error=house_resp.message or "House occupancy update failed"
                            )

                    except grpc.RpcError as e:
                        context.set_code(e.code())
                        context.set_details(e.details())
                        return application_pb2.ApplicationResponse(error=e.details())

                # ✅ Commit only if everything succeeded
                app.status = new_status
                app.save()

                # 🔔 Notifications (side effects, never break main flow)
                if new_status == "accepted":
                    self._safe_notify(lambda: self.notif_client.create_notification(
                        recipient_id=str(app.applicant_id),
                        ntype="APPLICATION_ACCEPTED",
                        title="Application accepted",
                        body="Your application has been accepted.",
                        payload_json=f'{{"application_id":"{app.id}","house_id":"{app.house_id}"}}',
                        priority=notification_pb2.HIGH,
                        dedup_key=f"app:accepted:{app.id}"
                    ))

                elif new_status == "rejected":
                    self._safe_notify(lambda: self.notif_client.create_notification(
                        recipient_id=str(app.applicant_id),
                        ntype="APPLICATION_REJECTED",
                        title="Application rejected",
                        body="Your application has been rejected.",
                        payload_json=f'{{"application_id":"{app.id}","house_id":"{app.house_id}"}}',
                        priority=notification_pb2.NORMAL,
                        dedup_key=f"app:rejected:{app.id}"
                    ))

            return application_pb2.ApplicationResponse(
                application=self._app_to_proto(app),
                error=""
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return application_pb2.ApplicationResponse(error=str(e))

    # -------------------------
    # Reports
    # -------------------------
    def ReportListing(self, request, context):
        try:
            reporter_id = uuid.UUID(request.reporter_id)
            house_id = uuid.UUID(request.house_id)
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid reporter_id or house_id UUID")
            return application_pb2.ReportResponse(error="Invalid reporter_id or house_id UUID")

        reason = (request.reason or "").strip()
        details = request.details or ""

        if not reason:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("reason is required")
            return application_pb2.ReportResponse(error="reason is required")

        try:
            r = ListingReport.objects.create(
                reporter_id=reporter_id,
                house_id=house_id,
                reason=reason,
                details=details,
                status="open",
            )

            # 🔔 Notify admins (dynamic)
            admin_ids = list(self.admin_ids_cache)

            # refresh cache once if empty
            if not admin_ids:
                try:
                    admin_ids = self.user_client.list_admin_ids()
                    self.admin_ids_cache = admin_ids
                except Exception as e:
                    print("[AppService] Failed to fetch admin IDs:", str(e))
                    admin_ids = []

            if admin_ids:
                reqs = []
                for admin_id in admin_ids:
                    reqs.append(notification_pb2.CreateNotificationRequest(
                        recipient_id=admin_id,
                        type="LISTING_REPORTED",
                        title="Listing reported",
                        body=f"A listing was reported. Reason: {r.reason}",
                        payload_json=(
                            f'{{"report_id":"{r.id}",'
                            f'"house_id":"{r.house_id}",'
                            f'"reporter_id":"{r.reporter_id}"}}'
                        ),
                        priority=notification_pb2.HIGH,
                        dedup_key=f"report:{r.id}:{admin_id}",
                    ))

                # side-effect only
                self._safe_notify(lambda: self.notif_client.create_bulk(reqs))
            else:
                print("[AppService] No admin IDs found -> skipping admin notifications")

            return application_pb2.ReportResponse(report=self._report_to_proto(r), error="")

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return application_pb2.ReportResponse(error=str(e))


    def ListReports(self, request, context):
        # NOTE: Your API Gateway should restrict this to admin users.
        page_size = request.page_size if request.page_size > 0 else 20
        try:
            offset = int(request.page_token) if request.page_token else 0
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid page_token")
            return application_pb2.ReportListResponse(error="Invalid page_token")

        status_filter = (request.status or "").strip()

        try:
            qs = ListingReport.objects.all().order_by("-created_at")
            if status_filter:
                qs = qs.filter(status=status_filter)

            total = qs.count()
            items = list(qs[offset: offset + page_size])
            next_token = str(offset + page_size) if (offset + page_size) < total else ""

            return application_pb2.ReportListResponse(
                reports=[self._report_to_proto(x) for x in items],
                next_page_token=next_token,
                error=""
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return application_pb2.ReportListResponse(error=str(e))

    def UpdateReportStatus(self, request, context):
        # NOTE: Your API Gateway should restrict this to admin users.
        try:
            report_id = uuid.UUID(request.report_id)
        except Exception:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("Invalid report_id UUID")
            return application_pb2.ReportResponse(error="Invalid report_id UUID")

        new_status = (request.status or "").strip().lower()
        if new_status not in ("reviewed", "dismissed"):
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("status must be reviewed or dismissed")
            return application_pb2.ReportResponse(error="status must be reviewed or dismissed")

        try:
            with transaction.atomic():
                try:
                    r = ListingReport.objects.select_for_update().get(id=report_id)
                except ListingReport.DoesNotExist:
                    context.set_code(grpc.StatusCode.NOT_FOUND)
                    context.set_details("Report not found")
                    return application_pb2.ReportResponse(error="Report not found")

                r.status = new_status
                r.save()

            return application_pb2.ReportResponse(report=self._report_to_proto(r), error="")
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return application_pb2.ReportResponse(error=str(e))

    # -------------------------
    # Mappers
    # -------------------------
    def _app_to_proto(self, app: RentRequest):
        status_map = {
            "pending": application_pb2.PENDING,
            "accepted": application_pb2.ACCEPTED,
            "rejected": application_pb2.REJECTED,
        }

        return application_pb2.Application(
            id=str(app.id),
            applicant_id=str(app.applicant_id),
            house_id=str(app.house_id),
            status=status_map.get(app.status, application_pb2.STATUS_UNSPECIFIED),
            message=app.message or "",
            created_at=_to_timestamp(app.created_at),
            updated_at=_to_timestamp(app.updated_at),
        )

    def _report_to_proto(self, r: ListingReport):
        return application_pb2.Report(
            id=str(r.id),
            reporter_id=str(r.reporter_id),
            house_id=str(r.house_id),
            reason=r.reason,
            details=r.details or "",
            status=r.status,
            created_at=_to_timestamp(r.created_at),
        )
    
    def GetReport(self, request, context):
        try:
            report = ListingReport.objects.get(id=uuid.UUID(request.report_id))
            return application_pb2.ReportResponse(
                report=self._report_to_proto(report),
                error=""
            )
        except ListingReport.DoesNotExist:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details("Report not found")
            return application_pb2.ReportResponse(error="Report not found")
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            return application_pb2.ReportResponse(error=str(e))
