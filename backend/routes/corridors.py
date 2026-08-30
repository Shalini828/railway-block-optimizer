from fastapi import APIRouter
import psycopg
import os
from dotenv import load_dotenv

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


@router.get("/")
def get_corridors():

    conn = get_connection()
    cursor = conn.cursor()

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