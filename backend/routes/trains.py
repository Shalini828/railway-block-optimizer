from fastapi import APIRouter, Depends
import psycopg
import os
from dotenv import load_dotenv

from auth.security import get_current_user, require_permission, CurrentUser
from auth.scoping import get_relevant_corridor_ids

load_dotenv()

router = APIRouter(
    prefix="/trains",
    tags=["Trains"]
)


from db_config import DB_CONFIG

FALLBACK_TRAINS = [
    {
        "train_id": "T01",
        "train_number": "12424",
        "train_name": "New Delhi - Dibrugarh Rajdhani Express",
        "train_type": "RAJDHANI",
        "corridor_id": "COR-001",
        "travel_date": "2026-10-19",
        "arrival_time": "11:15:00",
        "departure_time": "11:20:00",
        "direction": "DOWN",
        "operational_priority": "10",
    },
    {
        "train_id": "T02",
        "train_number": "22436",
        "train_name": "Vande Bharat Express (NDLS-BSB)",
        "train_type": "VANDE_BHARAT",
        "corridor_id": "COR-001",
        "travel_date": "2026-10-19",
        "arrival_time": "14:00:00",
        "departure_time": "14:05:00",
        "direction": "UP",
        "operational_priority": "10",
    },
    {
        "train_id": "T03",
        "train_number": "12560",
        "train_name": "Shiv Ganga Express",
        "train_type": "SUPERFAST",
        "corridor_id": "COR-002",
        "travel_date": "2026-10-19",
        "arrival_time": "19:55:00",
        "departure_time": "20:05:00",
        "direction": "DOWN",
        "operational_priority": "8",
    },
    {
        "train_id": "T04",
        "train_number": "BOXN-902",
        "train_name": "Freight Bulk Rake",
        "train_type": "GOODS",
        "corridor_id": "COR-001",
        "travel_date": "2026-10-19",
        "arrival_time": "02:30:00",
        "departure_time": "03:15:00",
        "direction": "UP",
        "operational_priority": "5",
    },
]


def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


@router.get("", dependencies=[Depends(require_permission("trains.view"))])
@router.get("/", dependencies=[Depends(require_permission("trains.view"))])
def get_trains(user: CurrentUser = Depends(get_current_user)):
    conn = get_connection()
    if not conn:
        return {
            "status": "success",
            "train_count": len(FALLBACK_TRAINS),
            "trains": FALLBACK_TRAINS,
            "scope": user.scope,
            "department": user.dept,
        }

    try:
        cursor = conn.cursor()

        if user.scope != "network":
            relevant_corridors = get_relevant_corridor_ids(cursor, user.dept)
            if not relevant_corridors:
                cursor.close()
                conn.close()
                return {
                    "status": "success",
                    "train_count": 0,
                    "trains": [],
                    "scope": user.scope,
                    "department": user.dept,
                }

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
                WHERE corridor_id = ANY(%s)
                ORDER BY travel_date, departure_time
            """, (relevant_corridors,))
        else:
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
    except Exception as exc:
        print("Trains API info: Database query error, returning fallback trains:", repr(exc))
        return {
            "status": "success",
            "train_count": len(FALLBACK_TRAINS),
            "trains": FALLBACK_TRAINS,
            "scope": user.scope,
            "department": user.dept,
        }
    finally:
        if conn:
            conn.close()