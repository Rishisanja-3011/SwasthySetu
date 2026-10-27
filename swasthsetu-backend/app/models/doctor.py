from typing import Any


def doctor_record(
    *,
    auth_user_id: str,
    name: str,
    email: str,
    doctor_code: str,
    qr_value: str,
) -> dict[str, Any]:
    return {
        "auth_user_id": auth_user_id,
        "name": name,
        "email": email,
        "doctor_code": doctor_code,
        "qr_value": qr_value,
    }