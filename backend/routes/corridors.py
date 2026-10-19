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


from db_config import DB_CONFIG


def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


DEFAULT_CORRIDORS = [
    {
        "corridor_id": "C01",
        "division_id": "DIV-DLI",
        "corridor_name": "New Delhi - Kanpur (NDLS-CNB)",
        "source_station": "NDLS",
        "destination_station": "CNB",
        "distance_km": "440",
        "traffic_level": "HIGH",
        "electrified": "true",
        "max_block_duration_min": "240"
    },
    {
        "corridor_id": "C02",
        "division_id": "DIV-PRYJ",
        "corridor_name": "Kanpur - Prayagraj (CNB-PRYJ)",
        "source_station": "CNB",
        "destination_station": "PRYJ",
        "distance_km": "194",
        "traffic_level": "HIGH",
        "electrified": "true",
        "max_block_duration_min": "180"
    },
    {
        "corridor_id": "C03",
        "division_id": "DIV-PRYJ",
        "corridor_name": "Prayagraj - Pt. Deen Dayal Upadhyaya (PRYJ-DDU)",
        "source_station": "PRYJ",
        "destination_station": "DDU",
        "distance_km": "153",
        "traffic_level": "HIGH",
        "electrified": "true",
        "max_block_duration_min": "180"
    },
    {
        "corridor_id": "C04",
        "division_id": "DIV-MB",
        "corridor_name": "Ghaziabad - Moradabad (GZB-MB)",
        "source_station": "GZB",
        "destination_station": "MB",
        "distance_km": "141",
        "traffic_level": "MEDIUM",
        "electrified": "true",
        "max_block_duration_min": "180"
    },
    {
        "corridor_id": "C05",
        "division_id": "DIV-JHS",
        "corridor_name": "Agra Cantt - Jhansi (AGC-VGLB)",
        "source_station": "AGC",
        "destination_station": "VGLB",
        "distance_km": "215",
        "traffic_level": "MEDIUM",
        "electrified": "true",
        "max_block_duration_min": "210"
    }
]

@router.get("/", dependencies=[Depends(require_permission("corridors.view"))])
def get_corridors(user: CurrentUser = Depends(get_current_user)):
    conn = get_connection()
    if not conn:
        return {
            "status": "success",
            "corridor_count": len(DEFAULT_CORRIDORS),
            "corridors": DEFAULT_CORRIDORS,
            "scope": user.scope,
            "department": user.dept,
        }

    cursor = None
    try:
        cursor = conn.cursor()

        if user.scope != "network":
            relevant_corridors = get_relevant_corridor_ids(cursor, user.dept)
            if not relevant_corridors:
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
    except Exception:
        return {
            "status": "success",
            "corridor_count": len(DEFAULT_CORRIDORS),
            "corridors": DEFAULT_CORRIDORS,
            "scope": user.scope,
            "department": user.dept,
        }
    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass