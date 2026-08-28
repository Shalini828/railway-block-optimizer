from fastapi import APIRouter
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/block-requests", tags=["Block Requests"])


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


@router.get("/")
def get_block_requests():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            request_id,
            task_id,
            team_id,
            corridor_id,
            requested_date,
            requested_start,
            requested_end,
            requested_duration_min,
            block_type,
            request_status,
            submitted_date
        FROM block_requests
        ORDER BY requested_date, requested_start
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return [
        {
            "request_id": row[0],
            "task_id": row[1],
            "team_id": row[2],
            "corridor_id": row[3],
            "requested_date": str(row[4]) if row[4] else None,
            "requested_start": str(row[5]) if row[5] else None,
            "requested_end": str(row[6]) if row[6] else None,
            "requested_duration_min": row[7],
            "block_type": row[8],
            "request_status": row[9],
            "submitted_date": str(row[10]) if row[10] else None
        }
        for row in rows
    ]