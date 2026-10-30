from fastapi import APIRouter, HTTPException, Depends
import psycopg

from auth.security import CurrentUser, get_current_user
from db_config import DB_CONFIG


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
    dependencies=[Depends(get_current_user)],
)


def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


def _can_view_all_notifications(user: CurrentUser) -> bool:
    """Only callers with the explicit admin management permission are global."""
    return "admin.manage" in user.permissions


@router.get("/")
def get_notifications(
    user_id: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    can_view_all = _can_view_all_notifications(user)
    if user_id is not None and not can_view_all and user_id != user.role_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's notifications")

    conn = get_connection()
    if not conn:
        return []

    cursor = conn.cursor()
    try:
        if can_view_all and user_id is None:
            cursor.execute("""
                SELECT
                    notification_id,
                    user_id,
                    notification_type,
                    title,
                    message,
                    entity_type,
                    entity_id,
                    is_read,
                    created_at
                FROM notifications
                ORDER BY created_at DESC
            """)
        else:
            owner_id = user_id if can_view_all else user.role_id
            cursor.execute("""
                SELECT
                    notification_id,
                    user_id,
                    notification_type,
                    title,
                    message,
                    entity_type,
                    entity_id,
                    is_read,
                    created_at
                FROM notifications
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (owner_id,))

        rows = cursor.fetchall()
        return [
            {
                "notification_id": row[0],
                "user_id": row[1],
                "notification_type": row[2],
                "title": row[3],
                "message": row[4],
                "entity_type": row[5],
                "entity_id": row[6],
                "is_read": row[7],
                "created_at": str(row[8]) if row[8] else None,
            }
            for row in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user: CurrentUser = Depends(get_current_user),
):
    if notification_id <= 0:
        raise HTTPException(status_code=422, detail="Invalid notification ID")

    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database offline: cannot persist notification status without database connection",
        )

    cursor = conn.cursor()
    try:
        if _can_view_all_notifications(user):
            cursor.execute("""
                UPDATE notifications
                SET is_read = TRUE
                WHERE notification_id = %s
                RETURNING notification_id
            """, (notification_id,))
        else:
            # Ownership is part of the UPDATE predicate to prevent IDOR races
            # and to avoid updating another role's notification.
            cursor.execute("""
                UPDATE notifications
                SET is_read = TRUE
                WHERE notification_id = %s AND user_id = %s
                RETURNING notification_id
            """, (notification_id, user.role_id))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")

        conn.commit()
        return {
            "status": "success",
            "message": "Notification marked as read",
            "notification_id": notification_id,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        conn.close()
