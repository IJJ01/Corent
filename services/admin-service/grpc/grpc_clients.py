import grpc
from shared.generated import application_pb2, application_pb2_grpc

class AppServiceClient:
    def __init__(self, addr="localhost:50052"):
        self.channel = grpc.insecure_channel(addr)
        self.stub = application_pb2_grpc.AppServiceStub(self.channel)

    def list_reports(self, status, page_size, page_token):
        return self.stub.ListReports(
            application_pb2.ListReportsRequest(
                status=status,
                page_size=page_size,
                page_token=page_token,
            )
        )

    def get_report(self, report_id):
        return self.stub.GetReport(
            application_pb2.GetReportRequest(report_id=report_id)
        )

    def update_report_status(self, report_id, status):
        return self.stub.UpdateReportStatus(
            application_pb2.UpdateReportStatusRequest(
                report_id=report_id,
                status=status,
            )
        )
