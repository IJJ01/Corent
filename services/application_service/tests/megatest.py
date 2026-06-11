import uuid
import time
import grpc

from shared.generated import (admin_service_pb2, admin_service_pb2_grpc,
                              application_pb2, application_pb2_grpc,
                              house_pb2, house_pb2_grpc)


APP_ADDR = "127.0.0.1:50051"
HOUSE_ADDR = "127.0.0.1:50052"
ADMIN_ADDR = "127.0.0.1:50054"
NOTIF_ADDR = "127.0.0.1:50056"

# If your notification creation is async (queue), set a small wait + retries:
NOTIF_RETRY = 5
NOTIF_RETRY_SLEEP = 0.15


# =============================================================================
# Helpers
# =============================================================================
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
            print(f"❌ Expected code {expected_code} but got {e.code()}")
            raise SystemExit(1)
        return None


def status_name(s):
    if s == application_pb2.PENDING:
        return "PENDING"
    if s == application_pb2.ACCEPTED:
        return "ACCEPTED"
    if s == application_pb2.REJECTED:
        return "REJECTED"
    return str(s)


# =============================================================================
# Notifications helpers + debug
# =============================================================================
def notif_unread_count(notif_stub, recipient_id: str) -> int:
    resp = notif_stub.GetUnreadCount(
        notification_pb2.GetUnreadCountRequest(recipient_id=recipient_id)
    )
    return int(resp.unread_count)


def notif_list(notif_stub, recipient_id: str, status_enum: int, page_size=50):
    return notif_stub.ListNotifications(
        notification_pb2.ListNotificationsRequest(
            recipient_id=recipient_id,
            status=status_enum,
            page_size=page_size,
            page_token="0",
        )
    )


def notif_mark_all_read(notif_stub, recipient_id: str):
    notif_stub.MarkAllAsRead(
        notification_pb2.MarkAllAsReadRequest(recipient_id=recipient_id)
    )


def _dump_notifs(notif_stub, recipient_id: str, title: str):
    print(f"\n--- DEBUG DUMP for recipient={recipient_id} ({title}) ---")

    # UNREAD
    try:
        unread = notif_list(notif_stub, recipient_id, notification_pb2.UNREAD, page_size=50)
        print(f"UNREAD count={len(unread.notifications)}")
        for n in unread.notifications[:10]:
            print(f"  - id={getattr(n, 'id', '')} type={n.type} title={n.title} status={getattr(n, 'status', '')} payload={n.payload_json}")
    except grpc.RpcError as e:
        print("UNREAD list failed:", e.code(), e.details())

    # ALL / status=0 fallback (many protos use 0 as ALL)
    try:
        all_status = getattr(notification_pb2, "ALL", 0)
        alln = notif_list(notif_stub, recipient_id, all_status, page_size=50)
        print(f"ALL/0 count={len(alln.notifications)} (status={all_status})")
        for n in alln.notifications[:10]:
            print(f"  - id={getattr(n, 'id', '')} type={n.type} title={n.title} status={getattr(n, 'status', '')} payload={n.payload_json}")
    except Exception:
        print("ALL/0 list not supported or failed (fine).")


def assert_notif_increment_and_type(
    notif_stub,
    *,
    recipient_id: str,
    before_count: int,
    expected_type: str,
    contains: str = "",
    also_check_owner_id: str | None = None,
    label: str = "",
):
    """
    Robust assertion:
    - retries unread_count a few times (handles async inserts)
    - if still not incremented, dumps UNREAD + ALL lists
    - optionally checks if notification went to owner by mistake
    """
    last_after = None
    for attempt in range(1, NOTIF_RETRY + 1):
        after = notif_unread_count(notif_stub, recipient_id)
        last_after = after
        if after == before_count + 1:
            break
        time.sleep(NOTIF_RETRY_SLEEP)

    after = last_after

    if after != before_count + 1:
        print("\n❌ Notification unread count did NOT increment")
        print("label        :", label)
        print("recipient_id :", recipient_id)
        print("before       :", before_count)
        print("after        :", after)
        print("expected     :", before_count + 1)

        _dump_notifs(notif_stub, recipient_id, "recipient")

        # If owner_id provided, check if it accidentally received the notification
        if also_check_owner_id:
            try:
                owner_before = notif_unread_count(notif_stub, also_check_owner_id)
                print(f"\nDEBUG owner_id={also_check_owner_id} unread_count={owner_before}")
                _dump_notifs(notif_stub, also_check_owner_id, "owner (possible wrong recipient)")
            except grpc.RpcError as e:
                print("DEBUG owner dump failed:", e.code(), e.details())

        raise AssertionError(
            f"Unread count mismatch for {recipient_id}: before={before_count} after={after} expected={before_count+1}"
        )

    # Verify type/payload exists in UNREAD list
    lst = notif_list(notif_stub, recipient_id, notification_pb2.UNREAD, page_size=50)
    found = False
    for n in lst.notifications:
        if n.type == expected_type and (contains in (n.payload_json or "")):
            found = True
            break

    if not found:
        print("\n❌ Unread count incremented but expected type/payload not found")
        print("label        :", label)
        print("recipient_id :", recipient_id)
        print("expected_type:", expected_type)
        print("contains     :", contains)
        _dump_notifs(notif_stub, recipient_id, "recipient (type mismatch?)")
        raise AssertionError(
            f"Expected notification type={expected_type} containing '{contains}' not found for {recipient_id}"
        )

    print(f"✅ Notification OK: {expected_type} (+1 unread) [{label}]")


# =============================================================================
# Main
# =============================================================================
def main():
    print("Connecting to services:")
    print(f"  Applications : {APP_ADDR}")
    print(f"  House        : {HOUSE_ADDR}")
    print(f"  Notifications: {NOTIF_ADDR}")
    print(f"  Admin        : {ADMIN_ADDR}")

    app_channel = grpc.insecure_channel(APP_ADDR)
    house_channel = grpc.insecure_channel(HOUSE_ADDR)
    notif_channel = grpc.insecure_channel(NOTIF_ADDR)
    admin_channel = grpc.insecure_channel(ADMIN_ADDR)

    app_stub = application_pb2_grpc.AppServiceStub(app_channel)
    house_stub = house_pb2_grpc.HouseServiceStub(house_channel)
    notif_stub = notification_pb2_grpc.NotificationServiceStub(notif_channel)
    admin_stub = admin_service_pb2_grpc.AdminServiceStub(admin_channel)

    # Test identities
    applicants = [str(uuid.uuid4()) for _ in range(6)]
    admin_id = str(uuid.uuid4())

    print("\nResetting notifications for test users (MarkAllAsRead)...")
    for u in applicants:
        try:
            notif_mark_all_read(notif_stub, u)
        except grpc.RpcError:
            pass

    # =========================================================================
    hr()
    print("SCENARIO 1: 3 applies + 3 accepts => occupied_rooms=total_rooms and status=UNAVAILABLE")
    # =========================================================================

    owner_id_house1 = str(uuid.uuid4())  # must be string in proto

    create_house_resp = safe_rpc(
        "1.1) CreateHouse house1 total_rooms=3 occupied_rooms=0",
        lambda: house_stub.CreateHouse(
            house_pb2.CreateHouseRequest(
                owner_id=owner_id_house1,
                title="MegaTest House #1",
                description="House for scenario 1",
                location="Test City",
                price_per_room=1000.0,
                total_rooms=3,
                occupied_rooms=0,
                status=house_pb2.AVAILABLE,
            )
        ),
    )
    house1_id = create_house_resp.house.id
    # try to read owner_id from response if your House message has it
    resp_owner = getattr(create_house_resp.house, "owner_id", owner_id_house1)
    print(f"✅ house1_id={house1_id} total_rooms={create_house_resp.house.total_rooms} occupied={create_house_resp.house.occupied_rooms}")
    print(f"DEBUG house1 owner_id={resp_owner}")

    # 1.2 Apply 3 users
    apps = []
    for i in range(3):
        uid = applicants[i]
        before = notif_unread_count(notif_stub, uid)

        resp = safe_rpc(
            f"1.2.{i+1}) ApplyForHouse applicant#{i+1}",
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
        print(f"✅ application_id={app_id} status={status_name(resp.application.status)}")

        assert_notif_increment_and_type(
            notif_stub,
            recipient_id=uid,
            before_count=before,
            expected_type="APPLICATION_SUBMITTED",
            contains=app_id,
            also_check_owner_id=resp_owner,
            label=f"ApplyForHouse #{i+1}",
        )

    # 1.3 Accept all 3
    for i, (uid, app_id) in enumerate(apps):
        before = notif_unread_count(notif_stub, uid)
        resp = safe_rpc(
            f"1.3.{i+1}) AcceptApplication app#{i+1}",
            lambda app_id=app_id: app_stub.AcceptApplication(
                application_pb2.ChangeApplicationStatusRequest(application_id=app_id)
            ),
        )
        print(f"✅ accepted app#{i+1} status={status_name(resp.application.status)}")

        assert_notif_increment_and_type(
            notif_stub,
            recipient_id=uid,
            before_count=before,
            expected_type="APPLICATION_ACCEPTED",
            contains=app_id,
            also_check_owner_id=resp_owner,
            label=f"AcceptApplication #{i+1}",
        )

    # 1.4 Verify house is full/unavailable
    house1_check = safe_rpc(
        "1.4) GetHouse house1 (verify full + status)",
        lambda: house_stub.GetHouse(house_pb2.GetHouseRequest(id=house1_id)),
    )
    print("\n=== RESULT (House#1) ===")
    print("occupied_rooms =", house1_check.house.occupied_rooms)
    print("total_rooms    =", house1_check.house.total_rooms)
    print("status         =", house_pb2.HouseStatus.Name(house1_check.house.status))
    assert house1_check.house.occupied_rooms == house1_check.house.total_rooms
    assert house1_check.house.status == house_pb2.UNAVAILABLE
    print("✅ Scenario 1 OK")

    # =========================================================================
    hr()
    print("SCENARIO 2: House full => 4th accept fails (and should NOT send ACCEPTED notif)")
    # =========================================================================

    uid4 = applicants[3]
    before_submit = notif_unread_count(notif_stub, uid4)

    r4 = safe_rpc(
        "2.1) ApplyForHouse applicant#4",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(
                applicant_id=uid4,
                house_id=house1_id,
                message="I am 4th applicant",
            )
        ),
    )
    app4_id = r4.application.id
    print("✅ 4th application created:", app4_id)

    assert_notif_increment_and_type(
        notif_stub,
        recipient_id=uid4,
        before_count=before_submit,
        expected_type="APPLICATION_SUBMITTED",
        contains=app4_id,
        also_check_owner_id=resp_owner,
        label="ApplyForHouse #4",
    )

    before_accept = notif_unread_count(notif_stub, uid4)

    safe_rpc(
        "2.2) AcceptApplication 4th (should fail: house full) (EXPECT FAIL)",
        lambda: app_stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=app4_id)
        ),
        expect_fail=True,
        expected_code=grpc.StatusCode.FAILED_PRECONDITION,
    )

    after_accept = notif_unread_count(notif_stub, uid4)
    if after_accept != before_accept:
        _dump_notifs(notif_stub, uid4, "uid4 after failed accept (should not change)")
        raise AssertionError("Unread count changed on failed accept (should NOT happen)")
    print("✅ Scenario 2 OK")

    # =========================================================================
    hr()
    print("SCENARIO 3: Reject does not increment occupancy + sends REJECTED notif")
    # =========================================================================

    owner_id_house2 = str(uuid.uuid4())

    create_house2 = safe_rpc(
        "3.1) CreateHouse house2 total_rooms=3 occupied_rooms=0",
        lambda: house_stub.CreateHouse(
            house_pb2.CreateHouseRequest(
                owner_id=owner_id_house2,
                title="MegaTest House #2",
                description="House for scenario 3",
                location="Test City",
                price_per_room=900.0,
                total_rooms=3,
                occupied_rooms=0,
                status=house_pb2.AVAILABLE,
            )
        ),
    )
    house2_id = create_house2.house.id
    resp_owner2 = getattr(create_house2.house, "owner_id", owner_id_house2)
    print("✅ house2_id:", house2_id)
    print("DEBUG house2 owner_id:", resp_owner2)

    userA = applicants[4]
    userB = applicants[5]

    beforeA = notif_unread_count(notif_stub, userA)
    a_app = safe_rpc(
        "3.2) ApplyForHouse userA",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=userA, house_id=house2_id, message="A applies")
        ),
    )
    a_app_id = a_app.application.id
    assert_notif_increment_and_type(
        notif_stub,
        recipient_id=userA,
        before_count=beforeA,
        expected_type="APPLICATION_SUBMITTED",
        contains=a_app_id,
        also_check_owner_id=resp_owner2,
        label="Apply userA",
    )

    beforeB = notif_unread_count(notif_stub, userB)
    b_app = safe_rpc(
        "3.3) ApplyForHouse userB",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=userB, house_id=house2_id, message="B applies")
        ),
    )
    b_app_id = b_app.application.id
    assert_notif_increment_and_type(
        notif_stub,
        recipient_id=userB,
        before_count=beforeB,
        expected_type="APPLICATION_SUBMITTED",
        contains=b_app_id,
        also_check_owner_id=resp_owner2,
        label="Apply userB",
    )

    beforeA2 = notif_unread_count(notif_stub, userA)
    safe_rpc(
        "3.4) AcceptApplication (A)",
        lambda: app_stub.AcceptApplication(application_pb2.ChangeApplicationStatusRequest(application_id=a_app_id)),
    )
    assert_notif_increment_and_type(
        notif_stub,
        recipient_id=userA,
        before_count=beforeA2,
        expected_type="APPLICATION_ACCEPTED",
        contains=a_app_id,
        also_check_owner_id=resp_owner2,
        label="Accept userA",
    )

    beforeB2 = notif_unread_count(notif_stub, userB)
    safe_rpc(
        "3.5) RejectApplication (B)",
        lambda: app_stub.RejectApplication(application_pb2.ChangeApplicationStatusRequest(application_id=b_app_id)),
    )
    assert_notif_increment_and_type(
        notif_stub,
        recipient_id=userB,
        before_count=beforeB2,
        expected_type="APPLICATION_REJECTED",
        contains=b_app_id,
        also_check_owner_id=resp_owner2,
        label="Reject userB",
    )

    house2_check = safe_rpc(
        "3.6) GetHouse house2 (occupancy should be 1)",
        lambda: house_stub.GetHouse(house_pb2.GetHouseRequest(id=house2_id)),
    )
    print("\n=== RESULT (House#2) ===")
    print("occupied_rooms =", house2_check.house.occupied_rooms, "(expected 1)")
    print("total_rooms    =", house2_check.house.total_rooms)
    print("status         =", house_pb2.HouseStatus.Name(house2_check.house.status))
    assert house2_check.house.occupied_rooms == 1
    print("✅ Scenario 3 OK")

    # =========================================================================
    hr()
    print("SCENARIO 4: Duplicate pending apply fails (no extra notif)")
    # =========================================================================

    dup_user = str(uuid.uuid4())
    try:
        notif_mark_all_read(notif_stub, dup_user)
    except grpc.RpcError:
        pass

    beforeD1 = notif_unread_count(notif_stub, dup_user)
    d1 = safe_rpc(
        "4.1) ApplyForHouse (dup_user) first time",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=dup_user, house_id=house2_id, message="dup apply")
        ),
    )
    d1_id = d1.application.id
    assert_notif_increment_and_type(
        notif_stub,
        recipient_id=dup_user,
        before_count=beforeD1,
        expected_type="APPLICATION_SUBMITTED",
        contains=d1_id,
        also_check_owner_id=resp_owner2,
        label="dup apply #1",
    )

    beforeD2 = notif_unread_count(notif_stub, dup_user)
    safe_rpc(
        "4.2) ApplyForHouse duplicate (EXPECT FAIL ALREADY_EXISTS)",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(applicant_id=dup_user, house_id=house2_id, message="dup apply again")
        ),
        expect_fail=True,
        expected_code=grpc.StatusCode.ALREADY_EXISTS,
    )
    afterD2 = notif_unread_count(notif_stub, dup_user)
    if afterD2 != beforeD2:
        _dump_notifs(notif_stub, dup_user, "dup_user after duplicate apply fail (should not change)")
        raise AssertionError("Unread count changed on duplicate apply (should NOT happen)")
    print("✅ Scenario 4 OK")

    # =========================================================================
    hr()
    print("SCENARIO 5: Accept already processed fails (no extra notif)")
    # =========================================================================
    beforeA3 = notif_unread_count(notif_stub, userA)
    safe_rpc(
        "5.1) AcceptApplication again (A) (EXPECT FAIL FAILED_PRECONDITION)",
        lambda: app_stub.AcceptApplication(application_pb2.ChangeApplicationStatusRequest(application_id=a_app_id)),
        expect_fail=True,
        expected_code=grpc.StatusCode.FAILED_PRECONDITION,
    )
    afterA3 = notif_unread_count(notif_stub, userA)
    if afterA3 != beforeA3:
        _dump_notifs(notif_stub, userA, "userA after re-accept fail (should not change)")
        raise AssertionError("Unread count changed on re-accept (should NOT happen)")
    print("✅ Scenario 5 OK")

    # =========================================================================
    hr()
    print("SCENARIO 6: AppService reports workflow + Notification unaffected")
    # =========================================================================
    reporter = userA

    before_report_unread = notif_unread_count(notif_stub, reporter)

    safe_rpc(
        "6.1) ReportListing",
        lambda: app_stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=reporter,
                house_id=house2_id,
                reason="Suspicious listing",
                details="MegaTest report for admin flow",
            )
        ),
    )

    after_report_unread = notif_unread_count(notif_stub, reporter)
    if after_report_unread != before_report_unread:
        print("\n⚠️ ReportListing changed notifications count (maybe you send report notifs).")
        _dump_notifs(notif_stub, reporter, "reporter after ReportListing")

    rep_list = safe_rpc(
        "6.2) AppService.ListReports(status=open)",
        lambda: app_stub.ListReports(application_pb2.ListReportsRequest(status="open", page_size=20, page_token="0")),
    )
    assert rep_list.reports, "No open reports returned by AppService"
    report_id = rep_list.reports[0].id
    print(f"✅ open reports returned: {len(rep_list.reports)} (using report_id={report_id})")

    rep_detail = safe_rpc(
        "6.3) AppService.GetReport(report_id)",
        lambda: app_stub.GetReport(application_pb2.GetReportRequest(report_id=report_id)),
    )
    print("✅ get report status:", rep_detail.report.status)

    rep_updated = safe_rpc(
        "6.4) AppService.UpdateReportStatus(reviewed)",
        lambda: app_stub.UpdateReportStatus(
            application_pb2.UpdateReportStatusRequest(report_id=report_id, status="reviewed")
        ),
    )
    print("✅ updated report status:", rep_updated.report.status)
    # =========================================================================
    hr()
    print("SCENARIO 6B: Admins get notified when a user reports a listing")
    # =========================================================================

    ADMIN_IDS = [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
    ]

    # reset admin unread counts so test is deterministic
    for aid in ADMIN_IDS:
        try:
            notif_mark_all_read(notif_stub, aid)
        except grpc.RpcError:
            pass

    before_admin = {aid: notif_unread_count(notif_stub, aid) for aid in ADMIN_IDS}

    # create a fresh report
    rep = safe_rpc(
        "6B.1) ReportListing (should notify admins)",
        lambda: app_stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=reporter,      # reuse reporter from scenario 6
                house_id=house2_id,        # reuse house2
                reason="Test admin notification",
                details="This report should create LISTING_REPORTED notifications for admins",
            )
        ),
    )
    report_id = rep.report.id
    print("✅ created report_id:", report_id)

    # assert each admin got +1 unread and correct type/payload contains report_id
    for aid in ADMIN_IDS:
        assert_notif_increment_and_type(
            notif_stub,
            recipient_id=aid,
            before_count=before_admin[aid],
            expected_type="LISTING_REPORTED",
            contains=report_id,
            label=f"Admin notified ({aid})",
        )

    print("✅ Scenario 6B OK (admins notified)")
    # =========================================================================
    hr()
    print("SCENARIO 7: AdminService pulls from AppService and resolves a fresh OPEN report")
    # =========================================================================

    admin_report = safe_rpc(
        "7.0) Create fresh OPEN report for admin",
        lambda: app_stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=reporter,
                house_id=house2_id,
                reason="Owner scam suspicion",
                details="Fresh report for AdminService scenario",
            )
        ),
    )
    admin_report_id = admin_report.report.id
    print("✅ fresh report_id:", admin_report_id)

    admin_list_open = safe_rpc(
        "7.1) AdminService.ListReports(status=open)",
        lambda: admin_stub.ListReports(admin_service_pb2.ListReportsRequest(status="open")),
    )
    if not admin_list_open.reports:
        raise AssertionError("AdminService.ListReports(status=open) returned empty but should contain fresh report")

    got = any(r.id == admin_report_id for r in admin_list_open.reports)
    if not got:
        print("\nAdmin returned reports (first 10):")
        for r in admin_list_open.reports[:10]:
            print("-", r.id, r.status, r.house_id)
        raise AssertionError("Admin list open did not include the freshly created report_id")

    print(f"✅ admin list open count={len(admin_list_open.reports)} includes report_id={admin_report_id}")

    admin_details = safe_rpc(
        "7.2) AdminService.GetReportDetails(report_id)",
        lambda: admin_stub.GetReportDetails(admin_service_pb2.GetReportDetailsRequest(report_id=admin_report_id)),
    )
    assert admin_details.found is True
    print("✅ admin report details status:", admin_details.report.status)

    resolved = safe_rpc(
        "7.3) AdminService.ResolveReport(status=reviewed)",
        lambda: admin_stub.ResolveReport(
            admin_service_pb2.ResolveReportRequest(
                report_id=admin_report_id,
                admin_id=admin_id,
                status="reviewed",
            )
        ),
    )
    print("✅ resolve response:", resolved.success, resolved.message)

    rep_check = safe_rpc(
        "7.4) AppService.GetReport(report_id) (should be reviewed)",
        lambda: app_stub.GetReport(application_pb2.GetReportRequest(report_id=admin_report_id)),
    )
    assert rep_check.report.status == "reviewed"
    print("✅ Scenario 7 OK (admin -> app integration)")

    hr()
    print("✅✅ ALL SCENARIOS PASSED ✅✅")

    app_channel.close()
    house_channel.close()
    notif_channel.close()
    admin_channel.close()


if __name__ == "__main__":
    main()
