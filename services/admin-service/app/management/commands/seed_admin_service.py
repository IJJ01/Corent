import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from app.models import User, House, HouseImage, BanLog, HouseRatingLog

# -----------------------
# CONSTANTES
# -----------------------
CITIES = ["Casablanca", "Rabat", "Marrakech", "Agadir", "Tanger", "Fes", "Oujda"]

STATUSES = ["available", "unavailable", "archived"]
STATUS_WEIGHTS = [0.70, 0.20, 0.10]

RATING_VALUES = [1, 2, 3, 4, 5]
RATING_WEIGHTS = [0.05, 0.10, 0.25, 0.35, 0.25]

BAN_ACTIONS = ["BAN", "UNBAN"]
BAN_WEIGHTS = [0.25, 0.75]


# -----------------------
# UTILS
# -----------------------
def rating_to_category(rating: int):
    return {
        1: "Studio / basique",
        2: "Petit appartement",
        3: "Maison standard",
        4: "Grande maison / bonne qualité",
        5: "Villa / premium",
    }.get(rating, "Non classé")


def rand_email(prefix, i):
    return f"{prefix}{i}@example.com"


def rand_phone():
    return "+2126" + "".join(str(random.randint(0, 9)) for _ in range(8))


def rand_cin(i):
    return f"AA{i:06d}"


def rand_address(city):
    return f"{random.randint(1, 200)} Rue {random.choice(['Atlas', 'Hassan', 'Zerktouni'])}, {city}"


def random_location(city):
    return f"{random.choice(['Quartier', 'Residence', 'Hay'])} {random.choice(['Centre', 'Ocean', 'Ennakhil'])}, {city}"


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


# -----------------------
# COMMAND
# -----------------------
class Command(BaseCommand):
    help = "Seed réaliste pour admin_service (users, houses, images, bans, ratings)"

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=30)
        parser.add_argument("--houses", type=int, default=80)
        parser.add_argument("--images-per-house", type=int, default=3)
        parser.add_argument("--ban-logs", type=int, default=25)
        parser.add_argument("--rating-logs", type=int, default=60)
        parser.add_argument("--clear", action="store_true")

    @transaction.atomic
    def handle(self, *args, **opts):
        users_n = clamp(opts["users"], 1, 2000)
        houses_n = clamp(opts["houses"], 1, 10000)
        images_n = clamp(opts["images_per_house"], 0, 10)
        ban_logs_n = clamp(opts["ban_logs"], 0, 5000)
        rating_logs_n = clamp(opts["rating_logs"], 0, 10000)
        clear = opts["clear"]

        if clear:
            HouseImage.objects.all().delete()
            House.objects.all().delete()
            HouseRatingLog.objects.all().delete()
            BanLog.objects.all().delete()
            User.objects.all().delete()

        now = timezone.now()

        # -----------------------
        # ADMINS
        # -----------------------
        admins = []
        for i in range(1, 4):
            admin, _ = User.objects.get_or_create(
                email=rand_email("admin", i),
                defaults=dict(
                    password="adminpass",
                    phone_number=rand_phone(),
                    CIN=rand_cin(900000 + i),
                    first_name=f"Admin{i}",
                    last_name="User",
                    address=rand_address(random.choice(CITIES)),
                    city=random.choice(CITIES),
                ),
            )
            admins.append(admin)

        # -----------------------
        # USERS / OWNERS
        # -----------------------
        owners = []
        for i in range(1, users_n + 1):
            city = random.choice(CITIES)
            user, _ = User.objects.get_or_create(
                email=rand_email("user", i),
                defaults=dict(
                    password="pass123",
                    phone_number=rand_phone(),
                    CIN=rand_cin(i),
                    first_name=f"User{i}",
                    last_name=random.choice(["El Amrani", "Benali", "Alaoui"]),
                    address=rand_address(city),
                    city=city,
                ),
            )
            owners.append(user)

        # -----------------------
        # HOUSES + IMAGES
        # -----------------------
        houses = []
        for i in range(1, houses_n + 1):
            owner = random.choice(owners)
            city = random.choice(CITIES)
            status = random.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0]

            total_rooms = random.randint(1, 10)
            occupied = (
                total_rooms if status == "unavailable"
                else random.randint(0, total_rooms - 1)
            )

            house = House.objects.create(
                owner=owner,
                title=f"House {i} - {city}",
                description=f"Logement situé à {city}",
                location=random_location(city),
                price_per_room=round(random.uniform(100, 900), 2),
                total_rooms=total_rooms,
                occupied_rooms=occupied,
                status=status,
                created_at=now - timedelta(days=random.randint(0, 120)),
            )
            houses.append(house)

            for j in range(images_n):
                HouseImage.objects.create(
                    house=house,
                    image_url=f"https://picsum.photos/seed/house_{house.id}_{j}/800/500",
                )

        # -----------------------
        # RATINGS
        # -----------------------
        for _ in range(rating_logs_n):
            admin = random.choice(admins)
            house = random.choice(houses)

            rating = random.choices(RATING_VALUES, weights=RATING_WEIGHTS, k=1)[0]
            category = rating_to_category(rating)

            house.rating = rating
            house.save(update_fields=["rating"])

            HouseRatingLog.objects.create(
                house_id=str(house.id),
                admin_id=str(admin.user_id),
                rating=rating,
                category=category,
                created_at=now - timedelta(days=random.randint(0, 60)),
            )

        # -----------------------
        # BANS
        # -----------------------
        for _ in range(ban_logs_n):
            admin = random.choice(admins)
            user = random.choice(owners)

            action = random.choices(BAN_ACTIONS, weights=BAN_WEIGHTS, k=1)[0]

            BanLog.objects.create(
                user_id=str(user.user_id),
                admin_id=str(admin.user_id),
                action=action,
                reason=random.choice(["Spam", "Abus", "Fake annonces", ""]),
                user_email=user.email,
                admin_email=admin.email,
                created_at=now - timedelta(days=random.randint(0, 60)),
            )

            if action == "BAN":
                user.banned_at = now - timedelta(days=random.randint(1, 30))
                user.unban_date = None
            else:
                user.banned_at = None
                user.unban_date = now + timedelta(days=random.randint(1, 30))

            user.save(update_fields=["banned_at", "unban_date"])

        self.stdout.write(self.style.SUCCESS("✅ Seed terminé avec succès"))
