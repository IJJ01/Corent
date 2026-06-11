import uuid
from django.db import models
from django.db.models import Q, F
from django.core.validators import MinValueValidator, MaxValueValidator


class House(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("unavailable", "Unavailable"),
        ("archived", "Archived"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    owner_id = models.UUIDField(db_index=True)

    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    location = models.CharField(max_length=255)

    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )

    price_per_room = models.DecimalField(max_digits=10, decimal_places=2)
    total_rooms = models.IntegerField(validators=[MinValueValidator(0)])
    occupied_rooms = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="available"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(occupied_rooms__lte=F("total_rooms")),
                name="occupied_lte_total",
            )
        ]

    def __str__(self):
        return self.title


class HouseImage(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    house = models.ForeignKey(
        House,
        related_name="images",
        on_delete=models.CASCADE
    )

    image_url = models.TextField()
