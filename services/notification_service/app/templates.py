import json

def build_review_to_homeowner(payload_json: str) -> tuple[str, str]:
    """
    payload_json expects: {"house_id": "...", "review_id": "...", "rating": 1-5, "reviewer_id": "..."}
    """
    p = json.loads(payload_json or "{}")
    rating = p.get("rating", "?")
    title = "New review received"
    body = f"A tenant left you a {rating}-star review."
    return title, body

def build_report_to_admin(payload_json: str) -> tuple[str, str]:
    """
    payload_json expects: {"report_id": "...", "house_id": "...", "reason": "...", "reporter_id": "..."}
    """
    p = json.loads(payload_json or "{}")
    reason = p.get("reason", "No reason provided")
    title = "New report received"
    body = f"A tenant reported a listing. Reason: {reason}"
    return title, body


TEMPLATES = {
    "REVIEW_TO_HOMEOWNER": build_review_to_homeowner,
    "REPORT_TO_ADMIN": build_report_to_admin,
}
