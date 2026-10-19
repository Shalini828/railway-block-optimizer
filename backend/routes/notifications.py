from fastapi import APIRouter, HTTPException, Depends
import psycopg
import os
from dotenv import load_dotenv
from auth.security import get_current_user

load_dotenv()

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
    dependencies=[Depends(get_current_user)]
)


from db_config import DB_CONFIG


def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


@router.get("/")
def get_notifications(user_id: str | None = None):
    conn = get_connection()
    if not conn:
        return []

    cursor = conn.cursor()

    try:

        if user_id:
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
            """, (user_id,))
        else:
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
                "created_at": str(row[8]) if row[8] else None
            }
            for row in rows
        ]

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass

# ==========================================
# MARK NOTIFICATION AS READ
# ==========================================

@router.patch("/{notification_id}/read")
def mark_notification_read(notification_id: int):
    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database offline: cannot persist notification status without database connection"
        )

    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE notification_id = %s
            RETURNING notification_id
        """, (notification_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        conn.commit()

        return {
            "status": "success",
            "message": "Notification marked as read",
            "notification_id": notification_id
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass        