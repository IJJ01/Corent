from django.utils import timezone
import grpc

from admin_backend.admin_service.models import User

def rating_to_category(rating: int):
    return {
        1: "Studio / basique",
        2: "Petit appartement",
        3: "Maison standard",
        4: "Grande maison / bonne qualité",
        5: "Villa / premium",
    }.get(rating)

def extract_city(location: str) -> str:
    parts = [p.strip() for p in (location or "").split(",") if p.strip()]
    return parts[0] if parts else ""

def iso(dt):
    if not dt:
        return ""
    return dt.astimezone(timezone.get_current_timezone()).isoformat()

def clamp(n, min_v, max_v):
    return max(min_v, min(int(n or min_v), max_v))
def require_admin(admin_id: int, context):
    # Admin doit exister, ne pas être supprimé, et is_admin=True
    ok = User.objects.filter(
        pk=admin_id,
        is_admin=True,
        deleted_at__isnull=True
    ).exists()

    if not ok:
        context.set_code(grpc.StatusCode.PERMISSION_DENIED)
        context.set_details("Admin privileges required")
        return False

    return True

