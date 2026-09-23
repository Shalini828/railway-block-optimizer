from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import psycopg
import os
from dotenv import load_dotenv

from auth.security import require_permission, get_current_user, CurrentUser
from auth.permissions import is_network_scope, can_report_emergency_type, EMERGENCY_TYPE_GROUPS, REPORTABLE_GROUPS
from auth.audit import record_audit

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

@router.get("/", dependencies=[Depends(require_permission("emergency.view"))])
def get_emergency_incidents(user: CurrentUser = Depends(get_current_user)):

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

# ==========================================
# CHECK EMERGENCY CONFLICTS
# ==========================================

@router.post(
    "/{incident_id}/check-conflicts",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def check_emergency_conflicts(
    incident_id: str,
    user: CurrentUser = Depends(get_current_user)
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Get emergency details
        cursor.execute(
            """
            SELECT
                incident_id,
                section,
                started_at,
                status
            FROM emergency_incidents
            WHERE incident_id = %s
            """,
            (incident_id,)
        )

        emergency = cursor.fetchone()

        if not emergency:
            raise HTTPException(
                status_code=404,
                detail="Emergency incident not found"
            )

        section_id = emergency[1]
        started_at = emergency[2]

        # Find corridor for the emergency section
        cursor.execute(
            """
            SELECT corridor_id
            FROM corridor_sections
            WHERE section_id = %s
            """,
            (section_id,)
        )

        corridor = cursor.fetchone()

        if not corridor:
            raise HTTPException(
                status_code=404,
                detail="Corridor not found for emergency section"
            )

        corridor_id = corridor[0]

        # Find block requests active at the emergency start time
        cursor.execute(
            """
            SELECT
                request_id,
                requested_date,
                requested_start,
                requested_end
            FROM block_requests
            WHERE corridor_id = %s
              AND requested_date = %s
              AND request_status IN ('PENDING', 'OPTIMIZED')
              AND requested_start <= %s::time
              AND requested_end > %s::time
            """,
            (
                corridor_id,
                started_at.date(),
                started_at.time(),
                started_at.time()
            )
        )

        conflicts = cursor.fetchall()

        # Save detected conflicts
        for conflict in conflicts:

            cursor.execute(
                """
                INSERT INTO emergency_conflicts
                (
                    incident_id,
                    conflict_type,
                    corridor_id,
                    section_id,
                    conflict_date,
                    conflict_start,
                    conflict_end,
                    affected_request_id,
                    conflict_status
                )
                VALUES
                (
                    %s,
                    'BLOCK_REQUEST_OVERLAP',
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    'OPEN'
                )
                """,
                (
                    incident_id,
                    corridor_id,
                    section_id,
                    conflict[1],
                    started_at,
                    started_at,
                    conflict[0]
                )
            )

        conn.commit()

        return {
            "status": "success",
            "incident_id": incident_id,
            "corridor_id": corridor_id,
            "conflicts_found": len(conflicts),
            "conflicting_requests": [
                {
                    "request_id": conflict[0],
                    "requested_date": str(conflict[1]),
                    "requested_start": str(conflict[2]),
                    "requested_end": str(conflict[3])
                }
                for conflict in conflicts
            ]
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
        cursor.close()
        conn.close()        