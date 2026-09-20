from fastapi import APIRouter, Depends
import psycopg
import os
from dotenv import load_dotenv

from auth.security import get_current_user, require_permission, CurrentUser
from auth.scoping import get_relevant_corridor_ids

load_dotenv()

router = APIRouter(
    prefix="/corridors",
    tags=["Corridors"]
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


@router.get("/", dependencies=[Depends(require_permission("corridors.view"))])
def get_corridors(user: CurrentUser = Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    if user.scope != "network":
        relevant_corridors = get_relevant_corridor_ids(cursor, user.dept)
        if not relevant_corridors:
            cursor.close()
            conn.close()
            return {
                "status": "success",
                "corridor_count": 0,
                "corridors": [],
                "scope": user.scope,
                "department": user.dept,
            }

        cursor.execute("""
            SELECT
                corridor_id,
                division_id,
                corridor_name,
                source_station,
                destination_station,
                distance_km,
                traffic_level,
                electrified,
                max_block_duration_min
            FROM corridors
            WHERE corridor_id = ANY(%s)
            ORDER BY corridor_id
        """, (relevant_corridors,))
    else:
        cursor.execute("""
            SELECT
                corridor_id,
                division_id,
                corridor_name,
                source_station,
                destination_station,
                distance_km,
                traffic_level,
                electrified,
                max_block_duration_min
            FROM corridors
            ORDER BY corridor_id
        """)

    rows = cursor.fetchall()

    columns = [desc[0] for desc in cursor.description]

    cursor.close()
    conn.close()

    corridors = []

    for row in rows:
        corridor = {}

        for column, value in zip(columns, row):
            corridor[column] = str(value) if value is not None else None

        corridors.append(corridor)

    return {
        "status": "success",
        "corridor_count": len(corridors),
        "corridors": corridors
    }