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

    emergency_type: str
    section: str
    line: str
    severity: str


# ==========================================
# GET ACTIVE EMERGENCY INCIDENTS
# ==========================================

@router.get("/", dependencies=[Depends(require_permission("emergency.view"))])
def get_emergency_incidents(user: CurrentUser = Depends(get_current_user)):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                incident_id,
                emergency_type,
                section,
                line,
                severity,
                started_at,
                status,
                control_notified,
                traffic_protection_status
            FROM emergency_incidents
            WHERE status = 'ACTIVE'
            ORDER BY started_at DESC
        """)

        rows = cursor.fetchall()

        incidents = []

        for row in rows:
            emg_type = row[1]
            is_own_domain = is_network_scope(user.role_id) or can_report_emergency_type(user.role_id, emg_type)

            if is_own_domain:
                incidents.append({
                    "id": row[0],
                    "type": row[1],
                    "section": row[2],
                    "line": row[3],
                    "severity": row[4],
                    "started_at": row[5].isoformat()
                        if row[5] else None,
                    "status": row[6],
                    "control_notified": row[7],
                    "traffic_protection_status": row[8],
                    "is_summary_only": False
                })
            else:
                # Department role out of domain: return summary fields only for safety awareness
                incidents.append({
                    "id": row[0],
                    "type": row[1],
                    "section": row[2],
                    "line": None,
                    "severity": row[4],
                    "started_at": row[5].isoformat()
                        if row[5] else None,
                    "status": row[6],
                    "control_notified": None,
                    "traffic_protection_status": None,
                    "is_summary_only": True
                })

        return {
            "status": "success",
            "count": len(incidents),
            "emergencies": incidents
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        cursor.close()
        conn.close()


# ==========================================
# CREATE EMERGENCY INCIDENT
# ==========================================

@router.post("/", dependencies=[Depends(require_permission("emergency.report"))])
def create_emergency_incident(
    request: EmergencyCreate,
    user: CurrentUser = Depends(get_current_user)
):

    # Validate emergency type
    if request.emergency_type not in EMERGENCY_TYPE_GROUPS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown emergency type '{request.emergency_type}'. Valid types: {list(EMERGENCY_TYPE_GROUPS.keys())}"
        )

    # Validate group permission
    if not can_report_emergency_type(user.role_id, request.emergency_type):
        group = EMERGENCY_TYPE_GROUPS[request.emergency_type]
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.role_id}' is not authorized to report '{group}' emergencies ({request.emergency_type})."
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ======================================
        # GENERATE INCIDENT ID
        # ======================================

        cursor.execute("""
            SELECT incident_id
            FROM emergency_incidents
            WHERE incident_id LIKE 'SOS-EMG-%'
            ORDER BY incident_id DESC
            LIMIT 1
        """)

        last_incident = cursor.fetchone()

        if last_incident:

            last_number = int(
                last_incident[0].replace(
                    "SOS-EMG-",
                    ""
                )
            )

            incident_number = last_number + 1

        else:

            incident_number = 1


        incident_id = f"SOS-EMG-{incident_number:03d}"


        # ======================================
        # INSERT EMERGENCY INCIDENT
        # ======================================

        cursor.execute("""
            INSERT INTO emergency_incidents
            (
                incident_id,
                emergency_type,
                section,
                line,
                severity,
                started_at,
                status,
                control_notified,
                traffic_protection_status,
                reported_by
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP,
                'ACTIVE',
                TRUE,
                'RECOMMENDED',
                %s
            )
            RETURNING
                incident_id,
                emergency_type,
                section,
                line,
                severity,
                started_at,
                status,
                control_notified,
                traffic_protection_status
        """, (
            incident_id,
            request.emergency_type,
            request.section,
            request.line,
            request.severity,
            user.name or user.role_id
        ))


        row = cursor.fetchone()

        conn.commit()

        record_audit(
            user=user,
            method="POST",
            path="/emergency/",
            action="emergency.report",
            target_type="emergency",
            target_id=incident_id,
            outcome="SUCCESS",
            detail={"type": request.emergency_type, "severity": request.severity, "section": request.section}
        )

        return {
            "status": "success",
            "message": "Emergency incident created successfully",
            "emergency": {
                "id": row[0],
                "type": row[1],
                "section": row[2],
                "line": row[3],
                "severity": row[4],
                "started_at": row[5].isoformat()
                    if row[5] else None,
                "status": row[6],
                "control_notified": row[7],
                "traffic_protection_status": row[8]
            }
        }


    except Exception as e:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        cursor.close()
        conn.close()


# ==========================================
# RESOLVE EMERGENCY INCIDENT
# ==========================================

@router.patch("/{incident_id}/resolve", dependencies=[Depends(require_permission("emergency.resolve"))])
def resolve_emergency_incident(
    incident_id: str,
    user: CurrentUser = Depends(get_current_user)
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            UPDATE emergency_incidents
            SET
                status = 'RESOLVED',
                resolved_at = CURRENT_TIMESTAMP,
                resolved_by = %s
            WHERE incident_id = %s
            AND status = 'ACTIVE'
            RETURNING incident_id
        """, (user.name or user.role_id, incident_id))


        row = cursor.fetchone()


        if not row:

            raise HTTPException(
                status_code=404,
                detail="Active emergency incident not found"
            )


        conn.commit()

        record_audit(
            user=user,
            method="PATCH",
            path=f"/emergency/{incident_id}/resolve",
            action="emergency.resolve",
            target_type="emergency",
            target_id=incident_id,
            outcome="SUCCESS"
        )

        return {
            "status": "success",
            "message": "Emergency incident resolved successfully",
            "incident_id": incident_id,
            "resolved_by": user.name or user.role_id
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


# ==========================================
# GET SINGLE EMERGENCY INCIDENT
# ==========================================

@router.get("/{incident_id}", dependencies=[Depends(require_permission("emergency.view"))])
def get_emergency_incident(
    incident_id: str,
    user: CurrentUser = Depends(get_current_user)
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                incident_id,
                emergency_type,
                section,
                line,
                severity,
                started_at,
                status,
                control_notified,
                traffic_protection_status,
                resolved_at
            FROM emergency_incidents
            WHERE incident_id = %s
        """, (incident_id,))


        row = cursor.fetchone()


        if not row:

            raise HTTPException(
                status_code=404,
                detail="Emergency incident not found"
            )

        emg_type = row[1]
        is_own_domain = is_network_scope(user.role_id) or can_report_emergency_type(user.role_id, emg_type)

        if not is_own_domain:
            if row[6] != "ACTIVE":
                raise HTTPException(
                    status_code=404,
                    detail="Emergency incident not found"
                )
            return {
                "status": "success",
                "emergency": {
                    "id": row[0],
                    "type": row[1],
                    "section": row[2],
                    "line": None,
                    "severity": row[4],
                    "started_at": row[5].isoformat()
                        if row[5] else None,
                    "status": row[6],
                    "control_notified": None,
                    "traffic_protection_status": None,
                    "resolved_at": None,
                    "is_summary_only": True
                }
            }

        return {
            "status": "success",
            "emergency": {
                "id": row[0],
                "type": row[1],
                "section": row[2],
                "line": row[3],
                "severity": row[4],
                "started_at": row[5].isoformat()
                    if row[5] else None,
                "status": row[6],
                "control_notified": row[7],
                "traffic_protection_status": row[8],
                "resolved_at": row[9].isoformat()
                    if row[9] else None,
                "is_summary_only": False
            }
        }


    finally:

        cursor.close()
        conn.close()


# ==========================================
# GET IMPACTED TRAINS FOR AN EMERGENCY
# ==========================================

@router.get("/{incident_id}/impact", dependencies=[Depends(require_permission("emergency.view"))])
def get_emergency_impact(
    incident_id: str,
    user: CurrentUser = Depends(get_current_user)
):

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Get emergency incident
        cursor.execute("""
            SELECT
                incident_id,
                emergency_type,
                section,
                line,
                severity,
                started_at,
                status
            FROM emergency_incidents
            WHERE incident_id = %s
        """, (incident_id,))

        incident = cursor.fetchone()

        if not incident:
            raise HTTPException(
                status_code=404,
                detail="Emergency incident not found"
            )

        # Department roles: out-of-domain incidents return 404 for impact
        emg_type = incident[1]
        if not is_network_scope(user.role_id) and not can_report_emergency_type(user.role_id, emg_type):
            raise HTTPException(
                status_code=404,
                detail="Impact details not accessible for out-of-domain emergency"
            )

        # 2. Map emergency section to railway corridor
        section = incident[2]

        section_corridor_map = {
            "New Delhi (NDLS) - Ghaziabad (GZB)": "C02",
            "CNB Outer": "C02",
            "Ghaziabad Outer": "C03",
            "Delhi Outer": "C02",
        }

        corridor_id = section_corridor_map.get(section)

        # If no mapping exists, return the emergency
        # but don't invent affected trains.
        if not corridor_id:
            return {
                "status": "success",
                "incident": {
                    "incident_id": incident[0],
                    "emergency_type": incident[1],
                    "section": incident[2],
                    "line": incident[3],
                    "severity": incident[4],
                    "started_at": str(incident[5]),
                    "status": incident[6]
                },
                "corridor": None,
                "impacted_trains": [],
                "impact_count": 0,
                "message": "No corridor mapping is configured for this emergency section."
            }

        # 3. Get corridor information
        cursor.execute("""
            SELECT
                corridor_id,
                corridor_name
            FROM corridors
            WHERE corridor_id = %s
        """, (corridor_id,))

        corridor = cursor.fetchone()

        # 4. Get trains operating on the affected corridor
        cursor.execute("""
            SELECT
                train_id,
                train_number,
                train_name,
                train_type,
                travel_date,
                arrival_time,
                departure_time,
                direction,
                operational_priority
            FROM trains
            WHERE corridor_id = %s
            ORDER BY departure_time
        """, (corridor_id,))

        rows = cursor.fetchall()

        impacted_trains = []

        for row in rows:

            priority = row[8]

            if priority is not None and priority >= 80:
                impact_level = "CRITICAL"
            elif priority is not None and priority >= 60:
                impact_level = "HIGH"
            else:
                impact_level = "MEDIUM"

            impacted_trains.append({
                "train_id": row[0],
                "train_number": row[1],
                "train_name": row[2],
                "train_type": row[3],
                "travel_date": str(row[4]) if row[4] else None,
                "arrival_time": str(row[5]) if row[5] else None,
                "departure_time": str(row[6]) if row[6] else None,
                "direction": row[7],
                "operational_priority": row[8],
                "impact_level": impact_level
            })

        return {
            "status": "success",

            "incident": {
                "incident_id": incident[0],
                "emergency_type": incident[1],
                "section": incident[2],
                "line": incident[3],
                "severity": incident[4],
                "started_at": str(incident[5]),
                "status": incident[6]
            },

            "corridor": {
                "corridor_id": corridor[0] if corridor else corridor_id,
                "corridor_name": corridor[1] if corridor else None
            },

            "impact_count": len(impacted_trains),
            "impacted_trains": impacted_trains
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        cursor.close()
        conn.close()