import random
import uuid
from django.core.management.base import BaseCommand
from datetime import timezone as dt_timezone

from app.models import RentRequest, ListingReport


class Command(BaseCommand):
    help = "Seed realistic demo data for Applications + Reports (UUID-based)."

    def add_arguments(self, parser):
        parser.add_argument("--houses", type=int, default=10)
        parser.add_argument("--owners", type=int, default=4)
        parser.add_argument("--applicants", type=int, default=20)
        parser.add_argument("--reset", action="store_true", help="Delete existing RentRequest + ListingReport first")

        # realism knobs
        parser.add_argument("--min-rooms", type=int, default=2)
        parser.add_argument("--max-rooms", type=int, default=5)

        # report likelihood (0-100)
        parser.add_argument("--reported-house-percent", type=int, default=40)  # ~40% houses get at least 1 report
        parser.add_argument("--max-reports-per-reported-house", type=int, default=3)

        # apps per house
        parser.add_argument("--min-apps-per-house", type=int, default=2)
        parser.add_argument("--max-apps-per-house", type=int, default=8)

    def handle(self, *args, **opts):
        houses_n = opts["houses"]
        owners_n = opts["owners"]
        applicants_n = opts["applicants"]
        reset = opts["reset"]

        min_rooms = opts["min_rooms"]
        max_rooms = opts["max_rooms"]

        reported_house_percent = opts["reported_house_percent"]
        max_reports = opts["max_reports_per_reported_house"]

        min_apps = opts["min_apps_per_house"]
        max_apps = opts["max_apps_per_house"]

        if reset:
            ListingReport.objects.all().delete()
            RentRequest.objects.all().delete()
            self.stdout.write(self.style.WARNING("Deleted all ListingReport and RentRequest rows."))

        # ---- Create fake IDs (since other services/DBs not present locally yet)
        house_ids = [uuid.uuid4() for _ in range(houses_n)]
        owner_ids = [uuid.uuid4() for _ in range(owners_n)]
        applicant_ids = [uuid.uuid4() for _ in range(applicants_n)]

        # Map each house to an owner + simulated room capacity
        house_meta = {}
        for hid in house_ids:
            house_meta[hid] = {
                "owner_id": random.choice(owner_ids),
                "total_rooms": random.randint(min_rooms, max_rooms),
            }

        reasons = [
            "Suspicious listing",
            "Scam / fake info",
            "Wrong location",
            "Inappropriate content",
            "Duplicate listing",
            "Misleading price",
        ]

        total_apps = 0
        total_reports = 0

        # Weighted statuses (more realistic)
        # Applications: mostly pending, then rejected, then accepted (few)
        app_status_pool = (
            ["pending"] * 60 +
            ["rejected"] * 30 +
            ["accepted"] * 10
        )

        # Reports: mostly open, then reviewed, then dismissed
        report_status_pool = (
            ["open"] * 70 +
            ["reviewed"] * 20 +
            ["dismissed"] * 10
        )

        # ---- Seed per house
        for hid in house_ids:
            owner_id = house_meta[hid]["owner_id"]
            total_rooms = house_meta[hid]["total_rooms"]

            # APPLICATIONS
            apps_count = random.randint(min_apps, max_apps)
            chosen_applicants = random.sample(applicant_ids, k=min(apps_count, len(applicant_ids)))

            accepted_so_far = 0
            for applicant in chosen_applicants:
                # Avoid owner applying to their own house (realistic)
                if applicant == owner_id:
                    continue

                # Choose a status, but enforce room capacity:
                # accepted count cannot exceed total_rooms
                status = random.choice(app_status_pool)
                if status == "accepted":
                    if accepted_so_far >= total_rooms:
                        status = "pending"  # convert overflow accepts to pending
                    else:
                        accepted_so_far += 1

                RentRequest.objects.create(
                    applicant_id=applicant,
                    house_id=hid,
                    message="Auto-generated application (demo seed).",
                    status=status,
                )
                total_apps += 1

            # REPORTS (some houses reported, not all)
            is_reported = (random.randint(1, 100) <= reported_house_percent)
            if is_reported:
                r_count = random.randint(1, max_reports)
                # Reporters are generally NOT the owner
                possible_reporters = [u for u in applicant_ids if u != owner_id]
                reporters = random.sample(possible_reporters, k=min(r_count, len(possible_reporters)))

                for rep in reporters:
                    status = random.choice(report_status_pool)
                    report = ListingReport.objects.create(
                        reporter_id=rep,
                        house_id=hid,
                        reason=random.choice(reasons),
                        details=f"Auto-generated report for admin demo (house={hid}).",
                        status=status,
                    )
                    total_reports += 1

                    # If your model later has audit fields, you can fill them safely here.
                    # (We keep it defensive so it won't crash if fields don't exist.)
                    if status in ("reviewed", "dismissed"):
                        if hasattr(report, "reviewed_at"):
                            report.reviewed_at = dt_timezone.now()
                        if hasattr(report, "reviewed_by_admin_id"):
                            report.reviewed_by_admin_id = uuid.uuid4()
                        report.save()

        # ---- Print a useful summary for teaming/testing
        self.stdout.write(self.style.SUCCESS("✅ Realistic demo data seeded"))
        self.stdout.write(f"- Houses (fake IDs): {houses_n}")
        self.stdout.write(f"- Owners (fake IDs): {owners_n}")
        self.stdout.write(f"- Applicants (fake IDs): {applicants_n}")
        self.stdout.write(f"- Applications created: {total_apps}")
        self.stdout.write(f"- Reports created: {total_reports}")

        self.stdout.write("\nSample mapping (share with admin/house teammate):")
        for hid in house_ids[:10]:
            meta = house_meta[hid]
            self.stdout.write(f"  house_id={hid} | owner_id={meta['owner_id']} | total_rooms(sim)={meta['total_rooms']}")

        self.stdout.write("\nSample applicant user_ids:")
        for uid in applicant_ids[:8]:
            self.stdout.write(f"  - {uid}")
