import json
import grpc
from shared.generated import notification_pb2, notification_pb2_grpc


# Helper function to send requests with metadata
def send_with_metadata(stub, request, metadata):
    return stub.CreateBulkNotifications(request, metadata=metadata)


def main():
    channel = grpc.insecure_channel("localhost:50056")
    stub = notification_pb2_grpc.NotificationServiceStub(channel)

    # Define admin and user metadata for role-based access
    metadata_admin = (
        ("x-user-id", "admin-001"),
        ("x-user-role", "ADMIN"),
    )

    metadata_user = (
        ("x-user-id", "user-001"),
        ("x-user-role", "USER"),
    )

    # Simulating admin access for bulk notifications
    print("\n6) CreateBulkNotifications (admin access)")
    admins = ["admin-001", "admin-002", "admin-003"]

    bulk_res = send_with_metadata(
        stub,
        notification_pb2.CreateBulkNotificationsRequest(
            requests=[
                notification_pb2.CreateNotificationRequest(
                    recipient_id=admin_id,
                    type="REPORT_TO_ADMIN",
                    title="New report received",
                    body="A tenant reported a listing. Please review.",
                    payload_json=json.dumps({"report_id": "rep-123", "house_id": "house-777", "reason": "spam"}),
                    priority=notification_pb2.HIGH,
                    dedup_key="report:rep-123",
                )
                for admin_id in admins
            ]
        ),
        metadata=metadata_admin  # Use metadata_admin for admin access
    )

    print("Bulk created:", len(bulk_res.notifications))
    for n in bulk_res.notifications:
        print("-", n.recipient_id, n.id, n.type, "status=", n.status)

    # Simulating non-admin user access (testing role-based access)
    try:
        print("\n7) CreateBulkNotifications (user access - should fail)")
        bulk_res_user = send_with_metadata(
            stub,
            notification_pb2.CreateBulkNotificationsRequest(
                requests=[
                    notification_pb2.CreateNotificationRequest(
                        recipient_id="user-001",
                        type="REPORT_TO_ADMIN",
                        title="New report received",
                        body="A tenant reported a listing. Please review.",
                        payload_json=json.dumps({"report_id": "rep-123", "house_id": "house-777", "reason": "spam"}),
                        priority=notification_pb2.HIGH,
                        dedup_key="report:rep-123",
                    )
                ]
            ),
            metadata=metadata_user  # Use metadata_user for non-admin access
        )
        print("Bulk created:", len(bulk_res_user.notifications))
    except grpc.RpcError as e:
        print(f"Error: {e.details()}")  # Expecting "Only admins can create notifications in bulk"

if __name__ == "__main__":
    main()
