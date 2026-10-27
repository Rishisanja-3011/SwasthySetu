from datetime import datetime, timezone

from app.core.supabase import supabase_admin


def cleanup_expired_sessions() -> int:
    """
    Delete consultation sessions whose temporary lifetime has expired.

    Deleting from active_sessions automatically deletes:
        - temporary_inputs
        - temporary_intakes

    because the database uses ON DELETE CASCADE.

    Returns:
        Number of expired sessions deleted.
    """

    now = datetime.now(timezone.utc).isoformat()

    response = (
        supabase_admin
        .table("active_sessions")
        .delete()
        .lt("expires_at", now)
        .execute()
    )

    deleted_rows = response.data or []

    return len(deleted_rows)