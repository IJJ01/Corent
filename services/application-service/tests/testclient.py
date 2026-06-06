import uuid
import grpc
from shared.generated import application_pb2, application_pb2_grpc
                              


def new_id() -> str:
    return str(uuid.uuid4())


def safe_call(label: str, fn):
    """
    Runs an RPC call and prints either the response or the gRPC error cleanly.
    """
    print(f"\n=== {label} ===")
    try:
        resp = fn()
        # Most of our responses have "error" field; print it if present.
        if hasattr(resp, "error"):
            print("error:", getattr(resp, "error"))
        print(resp)
        return resp
    except grpc.RpcError as e:
        print("grpc code:", e.code())
        print("grpc details:", e.details())
        return None


def main():
    channel = grpc.insecure_channel("localhost:50051")
    stub = application_pb2_grpc.AppServiceStub(channel)

    applicant_id = new_id()
    house_id = new_id()

    # 1) Apply
    r1 = safe_call("1) ApplyForHouse", lambda: stub.ApplyForHouse(
        application_pb2.ApplyForHouseRequest(
            applicant_id=applicant_id,
            house_id=house_id,
            message="Hello! I'm interested in this listing."
        )
    ))

    app_id = None
    if r1 and getattr(r1, "error", "") == "" and hasattr(r1, "application"):
        app_id = r1.application.id

    # 2) Duplicate apply (expected ALREADY_EXISTS)
    safe_call("2) ApplyForHouse duplicate (should fail)", lambda: stub.ApplyForHouse(
        application_pb2.ApplyForHouseRequest(
            applicant_id=applicant_id,
            house_id=house_id,
            message="second try"
        )
    ))

    # 3) Get applications by user
    safe_call("3) GetApplicationsByUser", lambda: stub.GetApplicationsByUser(
        application_pb2.GetApplicationsByUserRequest(
            user_id=applicant_id,
            page_size=10,
            page_token=""
        )
    ))

    # 4) Get applications by house
    safe_call("4) GetApplicationsByHouse", lambda: stub.GetApplicationsByHouse(
        application_pb2.GetApplicationsByHouseRequest(
            house_id=house_id,
            page_size=10,
            page_token=""
        )
    ))

    # 5) Accept
    if app_id:
        safe_call("5) AcceptApplication", lambda: stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=app_id)
        ))

        # 6) Accept again (expected FAILED_PRECONDITION / already processed)
        safe_call("6) AcceptApplication again (should fail)", lambda: stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=app_id)
        ))
    else:
        print("\n(No application id to accept; ApplyForHouse likely failed.)")

    # 7) Report listing
    r_report = safe_call(
        "7) ReportListing",
        lambda: stub.ReportListing(
            application_pb2.ReportListingRequest(
                reporter_id=applicant_id,
                house_id=house_id,
                reason="Suspicious listing",
                details="Looks fake / misleading"
            )
        )
    )
    if r_report and r_report.report.id:
        safe_call(
            "7.1) GetReport",
            lambda: stub.GetReport(
                application_pb2.GetReportRequest(
                    report_id=r_report.report.id
                )
            )
        )

    # 8) List reports (admin simulation)
    r_list = safe_call("8) ListReports (admin simulation)", lambda: stub.ListReports(
        application_pb2.ListReportsRequest(
            status="open",
            page_size=10,
            page_token=""
        )
    ))

    # 9) Update first report status (if any)
    if r_list and getattr(r_list, "error", "") == "" and len(r_list.reports) > 0:
        rep_id = r_list.reports[0].id
        safe_call("9) UpdateReportStatus (mark reviewed)", lambda: stub.UpdateReportStatus(
            application_pb2.UpdateReportStatusRequest(
                report_id=rep_id,
                status="reviewed"
            )
        ))
    else:
        print("\n(No reports found to update.)")


if __name__ == "__main__":
    main()
