from django.db import models
import uuid


class RentRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    applicant_id = models.UUIDField()
    house_id = models.UUIDField()

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("accepted", "Accepted"),
            ("rejected", "Rejected"),
        ],
        default="pending",
    )

    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rent_requests"
        indexes = [
            models.Index(fields=["applicant_id"]),
            models.Index(fields=["house_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.applicant_id} -> {self.house_id} ({self.status})"


class ListingReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reporter_id = models.UUIDField()
    house_id = models.UUIDField()

    reason = models.CharField(max_length=50)
    details = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ("open", "Open"),
            ("reviewed", "Reviewed"),
            ("dismissed", "Dismissed"),
        ],
        default="open",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "listing_reports"
        indexes = [
            models.Index(fields=["reporter_id"]),
            models.Index(fields=["house_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Report({self.house_id}) by {self.reporter_id} - {self.status}"
