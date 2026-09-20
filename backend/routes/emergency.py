from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/emergency",
    tags=["Emergency"]
)


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


# ==========================================
# REQUEST MODEL
# ==========================================

class EmergencyCreate(BaseModel):
    incident_type: str
    severity: str
    corridor_id: str
    section_id: str
    required_start: str
    required_duration: int
    reason: str
    created_by: str


# ==========================================
# GET ALL EMERGENCY INCIDENTS
# ==========================================

@router.get("/")
def get_emergency_incidents():

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                incident_id,
                incident_type,
                severity,
                corridor_id,
                section_id,
                reported_at,
                required_start,
                required_duration,
                reason,
                status,
                created_by
            FROM emergency_incidents
            ORDER BY reported_at DESC
        """)

        rows = cursor.fetchall()

        return [
            {
                "incident_id": row[0],
                "incident_type": row[1],
                "severity": row[2],
                "corridor_id": row[3],
                "section_id": row[4],
                "reported_at": str(row[5]) if row[5] else None,
                "required_start": str(row[6]) if row[6] else None,
                "required_duration": row[7],
                "reason": row[8],
                "status": row[9],
                "created_by": row[10]
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        cursor.close()
        conn.close()