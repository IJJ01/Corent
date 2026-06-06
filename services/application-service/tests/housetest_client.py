import uuid
import grpc

# --- Applications (Houssam) ---
from shared.generated import (admin_service_pb2, admin_service_pb2_grpc,
                              application_pb2, application_pb2_grpc,
                              house_pb2, house_pb2_grpc)

APP_ADDR = "127.0.0.1:50051"
HOUSE_ADDR = "127.0.0.1:50052"
ADMIN_ADDR = "127.0.0.1:50054"


def hr():
    print("\n" + "-" * 70)


def safe_rpc(title, fn):
    print(f"\n=== {title} ===")
    try:
        resp = fn()
        return resp
    except grpc.RpcError as e:
        print("❌ RPC FAILED")
        print("  code   :", e.code())
        print("  details:", e.details())
        return None


def app_status_name(val):
    try:
        return application_pb2.Status.Name(val)
    except Exception:
        return str(val)


def house_status_name(val):
    # If HouseStatus is enum in proto
    try:
        return house_pb2.HouseStatus.Name(val)
    except Exception:
        return str(val)


def main():
    print("Connecting to:")
    print("  Applications:", APP_ADDR)
    print("  House       :", HOUSE_ADDR)
    print("  Admin       :", ADMIN_ADDR)

    app_channel = grpc.insecure_channel(APP_ADDR)
    house_channel = grpc.insecure_channel(HOUSE_ADDR)
    admin_channel = grpc.insecure_channel(ADMIN_ADDR)

    app_stub = application_pb2_grpc.AppServiceStub(app_channel)
    house_stub = house_pb2_grpc.HouseServiceStub(house_channel)
    admin_stub = admin_service_pb2_grpc.AdminServiceStub(admin_channel)

    # ------------------------------------------------------------------
    # 1) Create a house with 3 rooms
    # ------------------------------------------------------------------
    owner_id = str(uuid.uuid4())
    create_house_resp = safe_rpc(
        "1) HouseService.CreateHouse (total_rooms=3, occupied=0)",
        lambda: house_stub.CreateHouse(
            house_pb2.CreateHouseRequest(
                owner_id=owner_id,
                title="Workflow Demo House (3 rooms)",
                description="Full workflow integration test",
                location="Rabat",
                price_per_room=1200.0,
                total_rooms=3,
                occupied_rooms=0,
            )
        ),
    )
    if not create_house_resp or not getattr(create_house_resp, "house", None) or not create_house_resp.house.id:
        print("Stop: could not create house.")
        return

    house_id = create_house_resp.house.id
    print("✅ house_id:", house_id)
    print("   total_rooms:", create_house_resp.house.total_rooms)
    print("   occupied_rooms:", create_house_resp.house.occupied_rooms)
    if hasattr(create_house_resp.house, "status"):
        print("   status:", house_status_name(create_house_resp.house.status))

    # ------------------------------------------------------------------
    # 2) 3 applicants apply
    # ------------------------------------------------------------------
    applicants = [str(uuid.uuid4()) for _ in range(3)]
    app_ids = []

    for i, applicant_id in enumerate(applicants, start=1):
        resp = safe_rpc(
            f"2.{i}) AppService.ApplyForHouse (applicant #{i})",
            lambda a=applicant_id: app_stub.ApplyForHouse(
                application_pb2.ApplyForHouseRequest(
                    applicant_id=a,
                    house_id=house_id,
                    message=f"Applicant #{i} applying for the house.",
                )
            ),
        )
        if not resp:
            print("Stop: apply failed.")
            return
        if getattr(resp, "error", ""):
            print("Stop: apply returned error:", resp.error)
            return
        if not resp.application.id:
            print("Stop: missing application.id")
            return

        app_ids.append(resp.application.id)
        print(f"✅ application_id={resp.application.id} status={app_status_name(resp.application.status)}")

    # ------------------------------------------------------------------
    # 3) Accept all 3 applications (should increment occupancy each time)
    # ------------------------------------------------------------------
    for i, application_id in enumerate(app_ids, start=1):
        resp = safe_rpc(
            f"3.{i}) AppService.AcceptApplication",
            lambda x=application_id: app_stub.AcceptApplication(
                application_pb2.ChangeApplicationStatusRequest(application_id=x)
            ),
        )
        if not resp:
            print("Stop: accept failed.")
            return
        if getattr(resp, "error", ""):
            print("Stop: accept returned error:", resp.error)
            return

        print(f"✅ accepted application_id={application_id} status={app_status_name(resp.application.status)}")

    # ------------------------------------------------------------------
    # 4) Verify the house is FULL (occupied_rooms=3) and status unavailable
    # ------------------------------------------------------------------
    house_after = safe_rpc(
        "4) HouseService.GetHouse (verify occupancy/status)",
        lambda: house_stub.GetHouse(house_pb2.GetHouseRequest(id=house_id)),
    )
    if not house_after or not getattr(house_after, "house", None):
        print("Stop: GetHouse failed.")
        return

    h = house_after.house
    hr()
    print("HOUSE AFTER 3 ACCEPTS:")
    print("  occupied_rooms:", h.occupied_rooms)
    print("  total_rooms   :", h.total_rooms)
    if hasattr(h, "status"):
        print("  status        :", house_status_name(h.status))
    else:
        print("  status        : (not in proto response)")

    if h.occupied_rooms == h.total_rooms:
        print("✅ House is full by occupancy.")
    else:
        print("❌ House occupancy not full. Something is wrong.")
        return

    # ------------------------------------------------------------------
    # 5) 4th applicant applies, then try accepting -> should FAIL (house full)
    # ------------------------------------------------------------------
    fourth_applicant = str(uuid.uuid4())
    fourth_apply = safe_rpc(
        "5.1) AppService.ApplyForHouse (4th applicant)",
        lambda: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(
                applicant_id=fourth_applicant,
                house_id=house_id,
                message="4th applicant applying (should not be accepted because full).",
            )
        ),
    )
    if not fourth_apply:
        return
    if getattr(fourth_apply, "error", ""):
        print("Stop: 4th apply returned error:", fourth_apply.error)
        return

    fourth_app_id = fourth_apply.application.id
    print("✅ 4th application_id:", fourth_app_id)

    # Expect FAILED_PRECONDITION with "House is already full" (from HouseService)
    _ = safe_rpc(
        "5.2) AppService.AcceptApplication (4th) EXPECT FAIL",
        lambda: app_stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=fourth_app_id)
        ),
    )

    # ------------------------------------------------------------------
    # 6) Report listing (simulate a user report)
    # ------------------------------------------------------------------
    reporter_id = applicants[0]
    report_resp = safe_rpc(
        "6) AppService.ReportListing",
        lambda: app_stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=reporter_id,
                house_id=house_id,
                reason="Scam / fake info",
                details="Workflow test report: suspicious content.",
            )
        ),
    )
    if not report_resp:
        return
    if getattr(report_resp, "error", ""):
        print("Stop: report returned error:", report_resp.error)
        return

    report_id = report_resp.report.id
    print("✅ report_id:", report_id)
    print("   report.status:", report_resp.report.status)

    # ------------------------------------------------------------------
    # 7) Admin lists reports (admin service calls your app service under the hood)
    # ------------------------------------------------------------------
    admin_list = safe_rpc(
        "7) AdminService.ListReports (status=open)",
        lambda: admin_stub.ListReports(
            admin_service_pb2.ListReportsRequest(
                status="open",
                page_size=10,
                page_token="0",
            )
        ),
    )
    if not admin_list:
        return

    print(f"✅ Admin received {len(admin_list.reports)} report(s)")
    for r in admin_list.reports[:5]:
        print(f"  - id={r.id} status={r.status} house_id={r.house_id}")

    # ------------------------------------------------------------------
    # 8) Admin gets report details
    # ------------------------------------------------------------------
    admin_detail = safe_rpc(
        "8) AdminService.GetReportDetails",
        lambda: admin_stub.GetReportDetails(
            admin_service_pb2.GetReportDetailsRequest(report_id=report_id)
        ),
    )
    if not admin_detail:
        return

    print("✅ found:", admin_detail.found)
    if admin_detail.found:
        print("   id:", admin_detail.report.id)
        print("   status:", admin_detail.report.status)
        print("   reason:", admin_detail.report.reason)

    # ------------------------------------------------------------------
    # 9) Admin resolves report (reviewed) -> should update in your AppService DB too
    # ------------------------------------------------------------------
    admin_id = str(uuid.uuid4())
    resolve_resp = safe_rpc(
        "9) AdminService.ResolveReport (status=reviewed)",
        lambda: admin_stub.ResolveReport(
            admin_service_pb2.ResolveReportRequest(
                report_id=report_id,
                admin_id=admin_id,
                status="reviewed",
            )
        ),
    )
    if resolve_resp:
        print("✅ resolve:", resolve_resp.success, "|", resolve_resp.message)

    # ------------------------------------------------------------------
    # 10) Verify report updated in AppService (GetReport)
    # ------------------------------------------------------------------
    verify_report = safe_rpc(
        "10) AppService.GetReport (verify status updated)",
        lambda: app_stub.GetReport(application_pb2.GetReportRequest(report_id=report_id)),
    )
    if verify_report and not getattr(verify_report, "error", ""):
        print("✅ report.status now =", verify_report.report.status)
    else:
        print("❌ Could not verify report update.")

    hr()
    print("✅ FULL WORKFLOW TEST DONE")

    app_channel.close()
    house_channel.close()
    admin_channel.close()


if __name__ == "__main__":
    main()
