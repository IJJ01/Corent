import uuid
from django.db import models
class BanLog(models.Model):
    ACTION_CHOICES = [
        ("BAN", "Ban"),
        ("UNBAN", "Unban"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(null=True)
    admin_id = models.UUIDField(null=True)
    action = models.CharField(max_length=5, choices=ACTION_CHOICES)
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [
            models.Index(fields=["user_id", "created_at"]),
            models.Index(fields=["admin_id", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

class HouseRatingLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    house_id = models.UUIDField(null=True)
    admin_id = models.UUIDField(null=True)
    rating = models.PositiveSmallIntegerField()
    category = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [
            models.Index(fields=["house_id", "created_at"]),
            models.Index(fields=["admin_id", "created_at"]),
            models.Index(fields=["created_at"]),
        ]
class ReportLog(models.Model):
    ACTION_CHOICES = [
        ("REVIEWED", "Reviewed"),
        ("DISMISSED", "Dismissed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    report_id = models.UUIDField()
    house_id = models.UUIDField(null=True)
    reporter_id = models.UUIDField(null=True)

    admin_id = models.UUIDField(null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "report_logs"
        indexes = [
            models.Index(fields=["report_id", "created_at"]),
            models.Index(fields=["admin_id", "created_at"]),
            models.Index(fields=["created_at"]),
        ]