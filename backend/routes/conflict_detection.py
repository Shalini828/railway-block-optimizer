from fastapi import APIRouter
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/conflicts",
    tags=["Conflict Detection"]
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


@router.get("/")
def detect_conflicts():
    conn = get_connection()
    cursor = conn.cursor()

    # Find block requests that overlap
    # on the same corridor and requested date.
    cursor.execute("""
        SELECT
            a.request_id AS request_1,
            b.request_id AS request_2,
            a.corridor_id,
            a.requested_date,
            a.requested_start AS start_1,
            a.requested_end AS end_1,
            b.requested_start AS start_2,
            b.requested_end AS end_2
        FROM block_requests a
        JOIN block_requests b
            ON a.corridor_id = b.corridor_id
            AND a.requested_date = b.requested_date
            AND a.request_id < b.request_id
        WHERE
            a.requested_start < b.requested_end
            AND b.requested_start < a.requested_end
        ORDER BY
            a.requested_date,
            a.corridor_id
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    conflicts = []

    for row in rows:
        conflicts.append({
            "request_1": row[0],
            "request_2": row[1],
            "corridor_id": row[2],
            "requested_date": str(row[3]) if row[3] else None,
            "request_1_start": str(row[4]) if row[4] else None,
            "request_1_end": str(row[5]) if row[5] else None,
            "request_2_start": str(row[6]) if row[6] else None,
            "request_2_end": str(row[7]) if row[7] else None,
            "conflict_type": "TIME_OVERLAP"
        })

    return {
        "status": "success",
        "conflict_count": len(conflicts),
        "conflicts": conflicts
    }