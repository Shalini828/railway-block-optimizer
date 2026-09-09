from fastapi import APIRouter
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/trains",
    tags=["Trains"]
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
def get_trains():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            train_id,
            train_number,
            train_name,
            train_type,
            corridor_id,
            travel_date,
            arrival_time,
            departure_time,
            direction,
            operational_priority
        FROM trains
        ORDER BY travel_date, departure_time
    """)

    rows = cursor.fetchall()

    columns = [desc[0] for desc in cursor.description]

    cursor.close()
    conn.close()

    trains = []

    for row in rows:
        train = {}

        for column, value in zip(columns, row):
            train[column] = str(value) if value is not None else None

        trains.append(train)

    return {
        "status": "success",
        "train_count": len(trains),
        "trains": trains
    }