"""
GIGA MEGA TEST (E2E)
- Dynamic admin discovery from UserService.ListAdmins (via x-internal-key)
- Tests:
  1) 3 applies + 3 accepts => house UNAVAILABLE + notifications
  2) House full => 4th accept fails + NO accepted notification
  3) Reject => no occupancy increment + rejected notification
  4) Duplicate pending apply fails + NO extra notification
  5) Accept already processed fails + NO extra notification
  6) Reports workflow in AppService (create/list/get/update)
  6B) Reporting triggers admin notifications (dynamic admins)
  7) AdminService resolves a fresh open report (admin -> app integration)
  8) Admin moderation: set rating, set status, delete house
  9) Ban/unban user => login blocked then works again
  10) Admin overview sanity
"""

import os
import uuid
import grpc
from typing import Tuple, List, Dict

from dotenv import load_dotenv
load_dotenv()

from shared.generated import (admin_service_pb2, admin_service_pb2_grpc,
                              application_pb2, application_pb2_grpc,
                              house_pb2, house_pb2_grpc, user_pb2, user_pb2_grpc)


# ---------------------------
# Addresses
# ---------------------------
USER_ADDR  = os.environ.get("USER_GRPC_ADDR",  "127.0.0.1:50053")
APP_ADDR   = os.environ.get("APP_GRPC_ADDR",   "127.0.0.1:50051")
HOUSE_ADDR = os.environ.get("HOUSE_GRPC_ADDR", "127.0.0.1:50052")
ADMIN_ADDR = os.environ.get("ADMIN_GRPC_ADDR", "127.0.0.1:50054")
NOTIF_ADDR = os.environ.get("NOTIF_GRPC_ADDR", "127.0.0.1:50056")

INTERNAL_GRPC_KEY = os.environ.get("INTERNAL_GRPC_KEY", "").strip()

# ---------------------------
# Notif test caller metadata
# (your NotificationService requires x-user-id)
# ---------------------------
NOTIF_TEST_CALLER_ID   = os.environ.get("NOTIF_TEST_CALLER_ID", "service:gigamegatest")
NOTIF_TEST_CALLER_ROLE = os.environ.get("NOTIF_TEST_CALLER_ROLE", "ADMIN")
NOTIF_MD = (("x-user-id", NOTIF_TEST_CALLER_ID), ("x-user-role", NOTIF_TEST_CALLER_ROLE))


# ---------------------------
# Helpers
# ---------------------------
def hr():
    print("\n" + "=" * 90)

def safe_rpc(label, fn, expect_fail=False, expected_code=None):
    print(f"\n=== {label} ===")
    try:
        resp = fn()
        if expect_fail:
            print("❌ Expected failure but call succeeded")
            raise SystemExit(1)
        return resp
    except grpc.RpcError as e:
        if not expect_fail:
            print("❌ RPC FAILED")
            print("  code   :", e.code())
            print("  details:", e.details())
            raise
        print("✅ Failed as expected")
        print("  code   :", e.code())
        print("  details:", e.details())
        if expected_code and e.code() != expected_code:
            raise AssertionError(f"Expected code {expected_code} but got {e.code()}")
        return None


# ---------------------------
# Notification helpers
# ---------------------------
def notif_unread_count(notif_stub, recipient_id: str) -> int:
    resp = notif_stub.GetUnreadCount(
        notification_pb2.GetUnreadCountRequest(recipient_id=recipient_id),
        metadata=NOTIF_MD,
    )
    return int(resp.unread_count)

def notif_list_unread(notif_stub, recipient_id: str, page_size=50):
    unread_enum = getattr(notification_pb2, "UNREAD", 1)
    return notif_stub.ListNotifications(
        notification_pb2.ListNotificationsRequest(
            recipient_id=recipient_id,
            status=unread_enum,
            page_size=page_size,
            page_token="0",
        ),
        metadata=NOTIF_MD,
    )

def notif_mark_all_read(notif_stub, recipient_id: str):
    notif_stub.MarkAllAsRead(
        notification_pb2.MarkAllAsReadRequest(recipient_id=recipient_id),
        metadata=NOTIF_MD,
    )

def assert_notif_increment_and_type(
    notif_stub,
    *,
    recipient_id: str,
    before_count: int,
    expected_type: str,
    contains: str = "",
    label: str = "",
):
    after = notif_unread_count(notif_stub, recipient_id)
    if after != before_count + 1:
        lst = notif_list_unread(notif_stub, recipient_id, page_size=20)
        print("\n--- DEBUG: UNREAD notifications ---")
        for n in lst.notifications[:10]:
            print(f"- type={n.type} title={n.title} payload={n.payload_json}")
        raise AssertionError(f"Unread mismatch for {recipient_id} (before={before_count}, after={after}) [{label}]")

    lst = notif_list_unread(notif_stub, recipient_id, page_size=50)
    for n in lst.notifications:
        if n.type == expected_type and (contains in (n.payload_json or "")):
            print(f"✅ Notification OK: {expected_type} (+1 unread) [{label}]")
            return

    print("\n--- DEBUG: latest UNREAD notifications ---")
    for n in lst.notifications[:10]:
        print(f"- type={n.type} title={n.title} payload={n.payload_json}")
    raise AssertionError(f"Expected notification type={expected_type} containing '{contains}' not found for {recipient_id}")

def status_name_app(s):
    if s == application_pb2.PENDING:
        return "PENDING"
    if s == application_pb2.ACCEPTED:
        return "ACCEPTED"
    if s == application_pb2.REJECTED:
        return "REJECTED"
    return str(s)


# ---------------------------
# User helpers
# ---------------------------
def signup_and_login(user_stub, email: str, password: str, **extra_fields) -> Tuple[str, str]:
    safe_rpc(
        f"UserService.SignupProcess {email}",
        lambda: user_stub.SignupProcess(
            user_pb2.SignupRequest(
                email=email,
                password=password,
                phone_number=extra_fields.get("phone_number", "0600000000"),
                CIN=extra_fields.get("CIN", "CINTEST"),
                first_name=extra_fields.get("first_name", "Test"),
                last_name=extra_fields.get("last_name", "User"),
                birth_date=extra_fields.get("birth_date", "2000-01-01"),
                profile_pic_url=extra_fields.get("profile_pic_url", ""),
                adress=extra_fields.get("adress", "Test Address"),
                city=extra_fields.get("city", "Test City"),
            )
        ),
    )

    login = safe_rpc(
        f"UserService.LoginProcess {email}",
        lambda: user_stub.LoginProcess(user_pb2.LoginRequest(email=email, password=password)),
    )

    if hasattr(login, "ok") and not login.ok:
        raise AssertionError(f"Login failed for {email}: {login.message}")

    uid = login.user.user_id if getattr(login, "user", None) else ""
    token = getattr(login, "access_token", "")

    if not uid:
        raise AssertionError(f"Login did not return user_id for {email}")

    return uid, token


def get_admin_ids(user_stub) -> List[str]:
    """
    Dynamic admin discovery. Your UserService.ListAdmins must accept:
    - x-internal-key (preferred)
    OR JWT.
    """
    md = []
    if INTERNAL_GRPC_KEY:
        md.append(("x-internal-key", INTERNAL_GRPC_KEY))

    res = user_stub.ListAdmins(user_pb2.ListAdminsRequest(), metadata=md)

    ok = getattr(res, "ok", True)
    if not ok:
        raise AssertionError(f"ListAdmins returned ok=False: {getattr(res, 'message', '')}")

    admin_ids = [u.user_id for u in getattr(res, "users", []) if getattr(u, "is_admin", False)]
    if not admin_ids:
        raise AssertionError("No admins found in DB (ListAdmins returned empty)")
    print("✅ Discovered admins:", admin_ids)
    return admin_ids


# ---------------------------
# HouseService request builder
# (supports owner_id string OR numeric proto)
# ---------------------------
def build_create_house_request(
    *,
    owner_id_str: str,
    title: str,
    description: str,
    location: str,
    price_per_room: float,
    total_rooms: int,
    occupied_rooms: int,
    status_enum,
):
    f = house_pb2.CreateHouseRequest.DESCRIPTOR.fields_by_name.get("owner_id")
    if not f:
        raise RuntimeError("CreateHouseRequest has no owner_id field")

    # FieldDescriptor.TYPE_STRING == 9
    if f.type == 9:
        owner_val = owner_id_str
    else:
        owner_val = int(uuid.UUID(owner_id_str).hex[-8:], 16)

    return house_pb2.CreateHouseRequest(
        owner_id=owner_val,
        title=title,
        description=description,
        location=location,
        price_per_room=float(price_per_room),
        total_rooms=int(total_rooms),
        occupied_rooms=int(occupied_rooms),
        status=status_enum,
    )


# ---------------------------
# MAIN
# ---------------------------
def main():
    print("Connecting to services:")
    print(f"  Users        : {USER_ADDR}")
    print(f"  Applications : {APP_ADDR}")
    print(f"  House        : {HOUSE_ADDR}")
    print(f"  Notifications: {NOTIF_ADDR}")
    print(f"  Admin        : {ADMIN_ADDR}")
    if not INTERNAL_GRPC_KEY:
        print("⚠️ INTERNAL_GRPC_KEY is empty. ListAdmins may fail if your UserService requires internal key.")

    user_channel  = grpc.insecure_channel(USER_ADDR)
    app_channel   = grpc.insecure_channel(APP_ADDR)
    house_channel = grpc.insecure_channel(HOUSE_ADDR)
    notif_channel = grpc.insecure_channel(NOTIF_ADDR)
    admin_channel = grpc.insecure_channel(ADMIN_ADDR)

    user_stub  = user_pb2_grpc.UserServiceStub(user_channel)
    app_stub   = application_pb2_grpc.AppServiceStub(app_channel)
    house_stub = house_pb2_grpc.HouseServiceStub(house_channel)
    notif_stub = notification_pb2_grpc.NotificationServiceStub(notif_channel)
    admin_stub = admin_service_pb2_grpc.AdminServiceStub(admin_channel)

    # ------------------------------------------------------------------
    hr()
    print("SETUP USERS")
    # ------------------------------------------------------------------
    suffix = uuid.uuid4().hex[:8]
    pw = "Test@12345"

    # discover admins first (from seeded DB)
    admin_ids = get_admin_ids(user_stub)
    admin_id_for_actions = admin_ids[0]

    owner_id, owner_token = signup_and_login(user_stub, f"owner_{suffix}@test.com", pw, first_name="Owner")
    reporter_id, reporter_token = signup_and_login(user_stub, f"reporter_{suffix}@test.com", pw, first_name="Reporter")

    app1_id, _ = signup_and_login(user_stub, f"app1_{suffix}@test.com", pw, first_name="Applicant1")
    app2_id, _ = signup_and_login(user_stub, f"app2_{suffix}@test.com", pw, first_name="Applicant2")
    app3_id, _ = signup_and_login(user_stub, f"app3_{suffix}@test.com", pw, first_name="Applicant3")
    app4_id, _ = signup_and_login(user_stub, f"app4_{suffix}@test.com", pw, first_name="Applicant4")
    applicants = [app1_id, app2_id, app3_id, app4_id]

    print("Owner:", owner_id)
    print("Reporter:", reporter_id)
    print("Applicants:", applicants)

    # Reset notifications for determinism
    hr()
    print("RESET NOTIFICATIONS (MarkAllAsRead) for applicants + admins")
    for uid in applicants + admin_ids:
        try:
            notif_mark_all_read(notif_stub, uid)
        except grpc.RpcError:
            pass

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 1: 3 applies + 3 accepts => house UNAVAILABLE + notifications")
    # ------------------------------------------------------------------
    available_enum = getattr(house_pb2, "AVAILABLE", 0)
    create_house = safe_rpc(
        "1.1) HouseService.CreateHouse total_rooms=3 occupied_rooms=0",
        lambda: house_stub.CreateHouse(
            build_create_house_request(
                owner_id_str=owner_id,
                title="GigaMega House #1",
                description="Scenario 1 house",
                location="Test City",
                price_per_room=1000.0,
                total_rooms=3,
                occupied_rooms=0,
                status_enum=available_enum,
            )
        ),
    )
    house1_id = create_house.house.id
    print("✅ house1_id =", house1_id)

    # Apply 3
    apps = []
    for i in range(3):
        uid = applicants[i]
        before = notif_unread_count(notif_stub, uid)
        resp = safe_rpc(
            f"1.2.{i+1}) AppService.ApplyForHouse applicant#{i+1}",
            lambda uid=uid: app_stub.ApplyForHouse(
                application_pb2.ApplyForHouseRequest(
                    applicant_id=uid,
                    house_id=house1_id,
                    message=f"Hello from applicant {i+1}",
                )
            ),
        )
        app_id = resp.application.id
        apps.append((uid, app_id))
        print(f"✅ application_id={app_id} status={status_name_app(resp.application.status)}")

        assert_notif_increment_and_type(
            notif_stub,
            recipient_id=uid,
            before_count=before,
            expected_type="APPLICATION_SUBMITTED",
            contains=app_id,
            label=f"ApplyForHouse #{i+1}",
        )

    # Accept 3
    for i, (uid, app_id) in enumerate(apps):
        before = notif_unread_count(notif_stub, uid)
        resp = safe_rpc(
            f"1.3.{i+1}) AppService.AcceptApplication app#{i+1}",
            lambda app_id=app_id: app_stub.AcceptApplication(
                application_pb2.ChangeApplicationStatusRequest(application_id=app_id)
            ),
        )
        print(f"✅ accepted app#{i+1} status={status_name_app(resp.application.status)}")

        assert_notif_increment_and_type(
            notif_stub,
            recipient_id=uid,
            before_count=before,
            expected_type="APPLICATION_ACCEPTED",
            contains=app_id,
            label=f"AcceptApplication #{i+1}",
        )

    # Verify house full -> UNAVAILABLE
    house1_check = safe_rpc(
        "1.4) HouseService.GetHouse (verify full + status)",
        lambda: house_stub.GetHouse(house_pb2.GetHouseRequest(id=house1_id)),
    )
    print("occupied_rooms =", house1_check.house.occupied_rooms)
    print("total_rooms    =", house1_check.house.total_rooms)
    print("status         =", house_pb2.HouseStatus.Name(house1_check.house.status))

    unavailable_enum = getattr(house_pb2, "UNAVAILABLE", 0)
    assert house1_check.house.occupied_rooms == house1_check.house.total_rooms
    assert house1_check.house.status == unavailable_enum
    print("✅ Scenario 1 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 2: House full => 4th accept fails + NO ACCEPTED notification")
    # ------------------------------------------------------------------
    uid4 = applicants[3]
    before_submit = notif_unread_count(notif_stub, uid4)
    r4 = safe_rpc(
        "2.1) AppService.ApplyForHouse applicant#4",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(
                applicant_id=uid4, house_id=house1_id, message="I am 4th applicant"
            )
        ),
    )
    app4_pending_id = r4.application.id
    assert_notif_increment_and_type(
        notif_stub,
        recipient_id=uid4,
        before_count=before_submit,
        expected_type="APPLICATION_SUBMITTED",
        contains=app4_pending_id,
        label="ApplyForHouse #4",
    )

    before_accept = notif_unread_count(notif_stub, uid4)
    safe_rpc(
        "2.2) AppService.AcceptApplication 4th (EXPECT FAIL house full)",
        lambda: app_stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=app4_pending_id)
        ),
        expect_fail=True,
        expected_code=grpc.StatusCode.FAILED_PRECONDITION,
    )
    after_accept = notif_unread_count(notif_stub, uid4)
    assert after_accept == before_accept, "Unread count changed after failed accept"
    print("✅ Scenario 2 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 3: Reject => no occupancy increment + REJECTED notification")
    # ------------------------------------------------------------------
    create_house2 = safe_rpc(
        "3.1) HouseService.CreateHouse house2 total_rooms=3 occupied_rooms=0",
        lambda: house_stub.CreateHouse(
            build_create_house_request(
                owner_id_str=owner_id,
                title="GigaMega House #2",
                description="Scenario 3 house",
                location="Test City",
                price_per_room=900.0,
                total_rooms=3,
                occupied_rooms=0,
                status_enum=available_enum,
            )
        ),
    )
    house2_id = create_house2.house.id
    print("✅ house2_id =", house2_id)

    userA, userB = app1_id, app2_id

    beforeA = notif_unread_count(notif_stub, userA)
    a_app = safe_rpc(
        "3.2) AppService.ApplyForHouse userA",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=userA, house_id=house2_id, message="A applies")
        ),
    )
    a_app_id = a_app.application.id
    assert_notif_increment_and_type(
        notif_stub, recipient_id=userA, before_count=beforeA,
        expected_type="APPLICATION_SUBMITTED", contains=a_app_id, label="Apply userA"
    )

    beforeB = notif_unread_count(notif_stub, userB)
    b_app = safe_rpc(
        "3.3) AppService.ApplyForHouse userB",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=userB, house_id=house2_id, message="B applies")
        ),
    )
    b_app_id = b_app.application.id
    assert_notif_increment_and_type(
        notif_stub, recipient_id=userB, before_count=beforeB,
        expected_type="APPLICATION_SUBMITTED", contains=b_app_id, label="Apply userB"
    )

    beforeA2 = notif_unread_count(notif_stub, userA)
    safe_rpc(
        "3.4) AppService.AcceptApplication (A)",
        lambda: app_stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=a_app_id)
        ),
    )
    assert_notif_increment_and_type(
        notif_stub, recipient_id=userA, before_count=beforeA2,
        expected_type="APPLICATION_ACCEPTED", contains=a_app_id, label="Accept userA"
    )

    beforeB2 = notif_unread_count(notif_stub, userB)
    safe_rpc(
        "3.5) AppService.RejectApplication (B)",
        lambda: app_stub.RejectApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=b_app_id)
        ),
    )
    assert_notif_increment_and_type(
        notif_stub, recipient_id=userB, before_count=beforeB2,
        expected_type="APPLICATION_REJECTED", contains=b_app_id, label="Reject userB"
    )

    house2_check = safe_rpc(
        "3.6) HouseService.GetHouse house2 (occupancy should be 1)",
        lambda: house_stub.GetHouse(house_pb2.GetHouseRequest(id=house2_id)),
    )
    assert house2_check.house.occupied_rooms == 1, "Reject should not increase occupancy"
    print("✅ Scenario 3 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 4: Duplicate pending apply fails + NO extra notification")
    # ------------------------------------------------------------------
    dup_user_id, _ = signup_and_login(user_stub, f"dup_{suffix}@test.com", pw, first_name="Dup")
    notif_mark_all_read(notif_stub, dup_user_id)

    beforeD1 = notif_unread_count(notif_stub, dup_user_id)
    d1 = safe_rpc(
        "4.1) AppService.ApplyForHouse dup first time",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=dup_user_id, house_id=house2_id, message="dup apply")
        ),
    )
    d1_id = d1.application.id
    assert_notif_increment_and_type(
        notif_stub, recipient_id=dup_user_id, before_count=beforeD1,
        expected_type="APPLICATION_SUBMITTED", contains=d1_id, label="dup apply #1"
    )

    beforeD2 = notif_unread_count(notif_stub, dup_user_id)
    safe_rpc(
        "4.2) AppService.ApplyForHouse duplicate (EXPECT FAIL ALREADY_EXISTS)",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=dup_user_id, house_id=house2_id, message="dup again")
        ),
        expect_fail=True,
        expected_code=grpc.StatusCode.ALREADY_EXISTS,
    )
    afterD2 = notif_unread_count(notif_stub, dup_user_id)
    assert afterD2 == beforeD2, "Unread count changed after duplicate apply"
    print("✅ Scenario 4 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 5: Accept already processed fails + NO extra notification")
    # ------------------------------------------------------------------
    beforeA3 = notif_unread_count(notif_stub, userA)
    safe_rpc(
        "5.1) AppService.AcceptApplication again (EXPECT FAIL FAILED_PRECONDITION)",
        lambda: app_stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=a_app_id)
        ),
        expect_fail=True,
        expected_code=grpc.StatusCode.FAILED_PRECONDITION,
    )
    afterA3 = notif_unread_count(notif_stub, userA)
    assert afterA3 == beforeA3, "Unread count changed after re-accept"
    print("✅ Scenario 5 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 6: Reports workflow (AppService) + status update")
    # ------------------------------------------------------------------
    rep = safe_rpc(
        "6.1) AppService.ReportListing",
        lambda: app_stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=reporter_id,
                house_id=house2_id,
                reason="Suspicious listing",
                details="GigaMega report",
            )
        ),
    )
    report_id = rep.report.id
    print("✅ created report_id:", report_id)

    rep_list = safe_rpc(
        "6.2) AppService.ListReports(status=open)",
        lambda: app_stub.ListReports(
            application_pb2.ListReportsRequest(status="open", page_size=20, page_token="0")
        ),
    )
    assert rep_list.reports, "No open reports returned"
    print("✅ open reports returned:", len(rep_list.reports))

    rep_detail = safe_rpc(
        "6.3) AppService.GetReport(report_id)",
        lambda: app_stub.GetReport(application_pb2.GetReportRequest(report_id=report_id)),
    )
    assert rep_detail.report.id == report_id
    print("✅ get report status:", rep_detail.report.status)

    rep_updated = safe_rpc(
        "6.4) AppService.UpdateReportStatus(reviewed)",
        lambda: app_stub.UpdateReportStatus(
            application_pb2.UpdateReportStatusRequest(report_id=report_id, status="reviewed")
        ),
    )
    assert rep_updated.report.status == "reviewed"
    print("✅ Scenario 6 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 6B: Reporting triggers admin notifications (dynamic admins)")
    # ------------------------------------------------------------------
    # Make deterministic
    for aid in admin_ids:
        try:
            notif_mark_all_read(notif_stub, aid)
        except grpc.RpcError:
            pass
    admin_before: Dict[str, int] = {aid: notif_unread_count(notif_stub, aid) for aid in admin_ids}

    rep2 = safe_rpc(
        "6B.1) AppService.ReportListing (should notify admins)",
        lambda: app_stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=reporter_id,
                house_id=house2_id,
                reason="Owner scam suspicion",
                details="Admin notification check",
            )
        ),
    )
    report2_id = rep2.report.id
    print("✅ created report2_id:", report2_id)

    for aid in admin_ids:
        assert_notif_increment_and_type(
            notif_stub,
            recipient_id=aid,
            before_count=admin_before[aid],
            expected_type="LISTING_REPORTED",
            contains=report2_id,
            label=f"Admin notified ({aid})",
        )
    print("✅ Scenario 6B OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 7: AdminService resolves a fresh open report (admin -> app integration)")
    # ------------------------------------------------------------------
    rep3 = safe_rpc(
        "7.0) AppService.ReportListing (fresh open report)",
        lambda: app_stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=reporter_id,
                house_id=house2_id,
                reason="Another report",
                details="Fresh report for resolve scenario",
            )
        ),
    )
    rep3_id = rep3.report.id
    print("✅ fresh report_id:", rep3_id)

    admin_list = safe_rpc(
        "7.1) AdminService.ListReports(status=open)",
        lambda: admin_stub.ListReports(
            admin_service_pb2.ListReportsRequest(status="open", page_size=50, page_token="0")
        ),
    )
    assert any(r.id == rep3_id for r in admin_list.reports), "AdminService.ListReports missing fresh report"
    print("✅ admin open count:", len(admin_list.reports))

    admin_det = safe_rpc(
        "7.2) AdminService.GetReportDetails(report_id)",
        lambda: admin_stub.GetReportDetails(admin_service_pb2.GetReportDetailsRequest(report_id=rep3_id)),
    )
    assert admin_det.found is True
    print("✅ admin details status:", admin_det.report.status)

    resolved = safe_rpc(
        "7.3) AdminService.ResolveReport(status=reviewed)",
        lambda: admin_stub.ResolveReport(
            admin_service_pb2.ResolveReportRequest(
                report_id=rep3_id,
                admin_id=admin_id_for_actions,
                status="reviewed",
            )
        ),
    )
    assert resolved.success is True
    print("✅ resolve:", resolved.message)

    rep3_check = safe_rpc(
        "7.4) AppService.GetReport(report_id) (should be reviewed)",
        lambda: app_stub.GetReport(application_pb2.GetReportRequest(report_id=rep3_id)),
    )
    assert rep3_check.report.status == "reviewed"
    print("✅ Scenario 7 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 8: Admin moderation (rating + status + delete)")
    # ------------------------------------------------------------------
    safe_rpc(
        "8.1) AdminService.SetHouseRating(house2, rating=5)",
        lambda: admin_stub.SetHouseRating(
            admin_service_pb2.SetHouseRatingRequest(
                house_id=house2_id,
                admin_id=admin_id_for_actions,
                rating=5
            )
        ),
    )

    safe_rpc(
        "8.2) AdminService.SetHouseStatus(house2 -> archived)",
        lambda: admin_stub.SetHouseStatus(
            admin_service_pb2.SetHouseStatusRequest(
                house_id=house2_id,
                admin_id=admin_id_for_actions,
                status="archived",
                reason="gigamega"
            )
        ),
    )

    safe_rpc(
        "8.3) AdminService.SetHouseStatus(house2 -> available)",
        lambda: admin_stub.SetHouseStatus(
            admin_service_pb2.SetHouseStatusRequest(
                house_id=house2_id,
                admin_id=admin_id_for_actions,
                status="available",
                reason="gigamega"
            )
        ),
    )

    create_del = safe_rpc(
        "8.4) HouseService.CreateHouse (house_to_delete)",
        lambda: house_stub.CreateHouse(
            build_create_house_request(
                owner_id_str=owner_id,
                title="GigaMega House To Delete",
                description="delete test",
                location="Test City",
                price_per_room=500.0,
                total_rooms=1,
                occupied_rooms=0,
                status_enum=available_enum,
            )
        ),
    )
    del_id = create_del.house.id

    safe_rpc(
        "8.5) AdminService.DeleteHouse(house_to_delete)",
        lambda: admin_stub.DeleteHouse(
            admin_service_pb2.DeleteHouseRequest(
                house_id=del_id,
                admin_id=admin_id_for_actions,
                reason="cleanup"
            )
        ),
    )

    print("✅ Scenario 8 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 9: Ban/unban user => login blocked then works again")
    # ------------------------------------------------------------------
    victim_email = f"victim_{suffix}@test.com"
    victim_id, _ = signup_and_login(user_stub, victim_email, pw, first_name="Victim")

    safe_rpc(
        "9.1) AdminService.BanUser(victim, ban=true)",
        lambda: admin_stub.BanUser(
            admin_service_pb2.BanUserRequest(
                user_id=victim_id,
                admin_id=admin_id_for_actions,
                ban=True,
                reason="gigamega ban flow",
            )
        ),
    )

    # Login should fail either ok=False OR grpc error depending on your implementation
    try:
        res = safe_rpc(
            "9.2) UserService.LoginProcess victim (should fail)",
            lambda: user_stub.LoginProcess(user_pb2.LoginRequest(email=victim_email, password=pw)),
        )
        if hasattr(res, "ok") and res.ok:
            raise AssertionError("Victim login succeeded but should be banned")
        print("✅ Victim login blocked (ok=False):", getattr(res, "message", ""))
    except grpc.RpcError as e:
        if e.code() not in (grpc.StatusCode.PERMISSION_DENIED, grpc.StatusCode.UNAUTHENTICATED):
            raise
        print("✅ Victim login blocked via gRPC error:", e.code(), e.details())

    safe_rpc(
        "9.3) AdminService.BanUser(victim, ban=false) (unban)",
        lambda: admin_stub.BanUser(
            admin_service_pb2.BanUserRequest(
                user_id=victim_id,
                admin_id=admin_id_for_actions,
                ban=False,
                reason="gigamega unban flow",
            )
        ),
    )

    res2 = safe_rpc(
        "9.4) UserService.LoginProcess victim (should succeed after unban)",
        lambda: user_stub.LoginProcess(user_pb2.LoginRequest(email=victim_email, password=pw)),
    )
    if hasattr(res2, "ok") and not res2.ok:
        raise AssertionError(f"Victim login still failing after unban: {res2.message}")
    print("✅ Scenario 9 OK")

    # ------------------------------------------------------------------
    hr()
    print("SCENARIO 10: Admin overview sanity")
    # ------------------------------------------------------------------
    ov = safe_rpc(
        "10.1) AdminService.GetAdminOverview(recent_limit=10)",
        lambda: admin_stub.GetAdminOverview(admin_service_pb2.AdminOverviewRequest(recent_limit=10)),
    )
    print("AdminOverview:")
    print("  total_users       =", ov.total_users)
    print("  total_houses      =", ov.total_houses)
    print("  total_banned_users=", ov.total_banned_users)
    print("  total_ban_logs    =", ov.total_ban_logs)
    print("  total_rating_logs =", ov.total_rating_logs)
    print("  recent_events     =", len(ov.recent_events))

    assert ov.total_users >= 0
    assert ov.total_houses >= 0
    assert ov.total_banned_users >= 0
    print("✅ Scenario 10 OK")

    hr()
    print("✅✅✅ GIGA MEGA TEST PASSED (FULL E2E + DYNAMIC ADMINS) ✅✅✅")

    user_channel.close()
    app_channel.close()
    house_channel.close()
    notif_channel.close()
    admin_channel.close()


if __name__ == "__main__":
    main()
