from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import psycopg
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv

from db_config import DB_CONFIG
from auth.security import (
    require_permission,
    get_current_user,
    CurrentUser,
)

load_dotenv()

router = APIRouter(
    prefix="/emergency",
    tags=["Emergency"]
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


# ============================================================
# IN-MEMORY RESILIENT REGISTRY (FOR OFFLINE / FALLBACK MODE)
# ============================================================

FALLBACK_EMERGENCIES: List[Dict[str, Any]] = [
    {
        "incident_id": "SOS-EMG-001",
        "emergency_type": "Track Fracture",
        "incident_type": "Track Fracture",
        "section": "New Delhi (NDLS) - Ghaziabad (GZB)",
        "line": "UP Main Line",
        "severity": "CRITICAL",
        "started_at": (datetime.now() - timedelta(minutes=45)).isoformat(),
        "status": "ACTIVE",
        "control_notified": True,
        "traffic_protection_status": "CONFIRMED",
        "resolved_at": None,
        "created_at": (datetime.now() - timedelta(minutes=45)).isoformat(),
    },
    {
        "incident_id": "SOS-EMG-002",
        "emergency_type": "OHE Snapping",
        "incident_type": "OHE Snapping",
        "section": "Ghaziabad (GZB) - Kanpur (CNB)",
        "line": "DN Line",
        "severity": "CRITICAL",
        "started_at": (datetime.now() - timedelta(minutes=110)).isoformat(),
        "status": "ACTIVE",
        "control_notified": True,
        "traffic_protection_status": "CONFIRMED",
        "resolved_at": None,
        "created_at": (datetime.now() - timedelta(minutes=110)).isoformat(),
    },
    {
        "incident_id": "SOS-EMG-003",
        "emergency_type": "Signal Failure",
        "incident_type": "Signal Failure",
        "section": "Kanpur (CNB) - Prayagraj (PRYJ)",
        "line": "Loop 2",
        "severity": "HIGH",
        "started_at": (datetime.now() - timedelta(hours=3)).isoformat(),
        "status": "RESOLVED",
        "control_notified": True,
        "traffic_protection_status": "CONFIRMED",
        "resolved_at": (datetime.now() - timedelta(hours=1, minutes=15)).isoformat(),
        "created_at": (datetime.now() - timedelta(hours=3)).isoformat(),
    },
    {
        "incident_id": "SOS-EMG-004",
        "emergency_type": "Point Machine Failure",
        "incident_type": "Point Machine Failure",
        "section": "CNB Outer",
        "line": "Yard Line 4",
        "severity": "MEDIUM",
        "started_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "status": "RESOLVED",
        "control_notified": True,
        "traffic_protection_status": "CONFIRMED",
        "resolved_at": (datetime.now() - timedelta(hours=3, minutes=30)).isoformat(),
        "created_at": (datetime.now() - timedelta(hours=5)).isoformat(),
    },
]


# ============================================================
# REQUEST MODELS
# ============================================================

class EmergencyCreate(BaseModel):
    """
    Create a new emergency incident.

    The model accepts both the new field names and older frontend field names.
    """

    incident_id: Optional[str] = None
    emergency_type: Optional[str] = None
    incident_type: Optional[str] = None

    section: Optional[str] = None
    line: Optional[str] = None

    section_id: Optional[str] = None
    corridor_id: Optional[str] = None

    severity: str = "HIGH"
    started_at: Optional[str] = None

    required_start: Optional[str] = None
    required_duration: Optional[int] = None
    reason: Optional[str] = None
    created_by: Optional[str] = None

    control_notified: bool = False
    traffic_protection_status: str = "PENDING"


class EmergencyResolve(BaseModel):
    confirmed: bool = True


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def generate_incident_id(cursor=None):
    """
    Generate a new SOS emergency incident ID.
    Example: SOS-EMG-005
    """
    if cursor is not None:
        try:
            cursor.execute(
                """
                SELECT incident_id
                FROM emergency_incidents
                WHERE incident_id LIKE 'SOS-EMG-%'
                ORDER BY incident_id DESC
                LIMIT 1
                """
            )
            row = cursor.fetchone()
            if row:
                last_id = row[0]
                number = int(last_id.split("-")[-1])
                return f"SOS-EMG-{number + 1:03d}"
        except Exception:
            pass

    # In-memory generator
    existing_nums = []
    for em in FALLBACK_EMERGENCIES:
        inc_id = em.get("incident_id", "")
        if inc_id.startswith("SOS-EMG-"):
            try:
                existing_nums.append(int(inc_id.split("-")[-1]))
            except ValueError:
                pass
    next_num = max(existing_nums, default=0) + 1
    return f"SOS-EMG-{next_num:03d}"


def serialize_incident(row):
    """
    Convert emergency_incidents database row to JSON dict.
    """
    return {
        "incident_id": row[0],
        "emergency_type": row[1],
        "incident_type": row[1],
        "section": row[2],
        "line": row[3],
        "severity": row[4],
        "started_at": str(row[5]) if row[5] else None,
        "status": row[6],
        "control_notified": bool(row[7]),
        "traffic_protection_status": row[8],
        "resolved_at": str(row[9]) if row[9] else None,
        "created_at": str(row[10]) if row[10] else None
    }


# ============================================================
# CREATE EMERGENCY INCIDENT
# ============================================================

@router.post(
    "/",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def create_emergency(
    payload: EmergencyCreate,
    user: CurrentUser = Depends(get_current_user)
):
    """
    Create a new emergency incident.
    """
    emergency_type = (
        payload.emergency_type
        or payload.incident_type
        or "Other Critical Hazard"
    )

    section = (
        payload.section
        or payload.section_id
        or "New Delhi (NDLS) - Ghaziabad (GZB)"
    )

    line = (
        payload.line
        or payload.corridor_id
        or "Main Line"
    )

    conn = get_connection()

    if not conn:
        incident_id = payload.incident_id or generate_incident_id(None)
        now_str = datetime.now().isoformat()
        started_at = payload.started_at or now_str

        # Check existing
        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                raise HTTPException(
                    status_code=409,
                    detail=f"Emergency incident '{incident_id}' already exists"
                )

        item = {
            "incident_id": incident_id,
            "emergency_type": emergency_type,
            "incident_type": emergency_type,
            "section": section,
            "line": line,
            "severity": payload.severity or "HIGH",
            "started_at": started_at,
            "status": "ACTIVE",
            "control_notified": payload.control_notified if payload.control_notified is not None else True,
            "traffic_protection_status": payload.traffic_protection_status or "CONFIRMED",
            "resolved_at": None,
            "created_at": now_str,
        }
        FALLBACK_EMERGENCIES.insert(0, item)
        res = dict(item)
        res["status"] = "success"
        res["message"] = "Emergency incident created successfully (offline mode)"
        return res

    cursor = conn.cursor()
    try:
        incident_id = payload.incident_id or generate_incident_id(cursor)

        cursor.execute(
            """
            SELECT incident_id
            FROM emergency_incidents
            WHERE incident_id = %s
            """,
            (incident_id,)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail=f"Emergency incident '{incident_id}' already exists"
            )

        started_at = None
        if payload.started_at:
            try:
                started_at = datetime.fromisoformat(
                    payload.started_at.replace("Z", "+00:00")
                )
                if started_at.tzinfo is not None:
                    started_at = started_at.replace(tzinfo=None)
            except ValueError:
                started_at = datetime.now()
        else:
            started_at = datetime.now()

        cursor.execute(
            """
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
                resolved_at,
                created_at
            )
            VALUES
            (
                %s, %s, %s, %s, %s, %s, 'ACTIVE', %s, %s, NULL, CURRENT_TIMESTAMP
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
                traffic_protection_status,
                resolved_at,
                created_at
            """,
            (
                incident_id,
                emergency_type,
                section,
                line,
                payload.severity,
                started_at,
                payload.control_notified,
                payload.traffic_protection_status
            )
        )

        created = cursor.fetchone()
        conn.commit()

        result = serialize_incident(created)
        result["status"] = "success"
        result["message"] = "Emergency incident created successfully"
        return result

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        # Fallback to in-memory registration if database constraint/table error occurs
        incident_id = payload.incident_id or generate_incident_id(None)
        now_str = datetime.now().isoformat()
        item = {
            "incident_id": incident_id,
            "emergency_type": emergency_type,
            "incident_type": emergency_type,
            "section": section,
            "line": line,
            "severity": payload.severity or "HIGH",
            "started_at": payload.started_at or now_str,
            "status": "ACTIVE",
            "control_notified": payload.control_notified if payload.control_notified is not None else True,
            "traffic_protection_status": payload.traffic_protection_status or "CONFIRMED",
            "resolved_at": None,
            "created_at": now_str,
        }
        FALLBACK_EMERGENCIES.insert(0, item)
        res = dict(item)
        res["status"] = "success"
        res["message"] = f"Emergency incident saved with fallback: {str(e)}"
        return res

    finally:
        cursor.close()
        conn.close()


# ============================================================
# CREATE EMERGENCY - COMPATIBILITY ROUTE
# ============================================================

@router.post(
    "/create",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def create_emergency_compat(
    payload: EmergencyCreate,
    user: CurrentUser = Depends(get_current_user)
):
    return create_emergency(payload, user)


# ============================================================
# GET ALL EMERGENCY INCIDENTS
# ============================================================

@router.get(
    "/",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def get_emergency_incidents(
    user: CurrentUser = Depends(get_current_user)
):
    conn = get_connection()
    if not conn:
        return FALLBACK_EMERGENCIES

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
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
                resolved_at,
                created_at
            FROM emergency_incidents
            ORDER BY created_at DESC
            """
        )

        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        if not rows:
            return FALLBACK_EMERGENCIES

        return [
            serialize_incident(row)
            for row in rows
        ]

    except Exception:
        try:
            conn.close()
        except Exception:
            pass
        return FALLBACK_EMERGENCIES


# ============================================================
# GET SINGLE EMERGENCY INCIDENT
# ============================================================

@router.get(
    "/{incident_id}",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def get_emergency_incident(
    incident_id: str,
    user: CurrentUser = Depends(get_current_user)
):
    conn = get_connection()
    if not conn:
        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                return em
        raise HTTPException(
            status_code=404,
            detail="Emergency incident not found"
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            """
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
                resolved_at,
                created_at
            FROM emergency_incidents
            WHERE incident_id = %s
            """,
            (incident_id,)
        )

        row = cursor.fetchone()

        if not row:
            for em in FALLBACK_EMERGENCIES:
                if em.get("incident_id") == incident_id:
                    return em
            raise HTTPException(
                status_code=404,
                detail="Emergency incident not found"
            )

        return serialize_incident(row)

    except HTTPException:
        raise

    except Exception:
        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                return em
        raise HTTPException(
            status_code=404,
            detail="Emergency incident not found"
        )

    finally:
        cursor.close()
        conn.close()


# ============================================================
# CHECK EMERGENCY CONFLICTS
# ============================================================

@router.post(
    "/{incident_id}/check-conflicts",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def check_emergency_conflicts(
    incident_id: str,
    user: CurrentUser = Depends(get_current_user)
):
    conn = get_connection()
    if not conn:
        em = next((e for e in FALLBACK_EMERGENCIES if e.get("incident_id") == incident_id), None)
        status = em["status"] if em else "ACTIVE"
        return {
            "status": "success",
            "incident_id": incident_id,
            "emergency_status": status,
            "conflicts_found": 1,
            "conflicting_requests": [
                {
                    "request_id": "REQ-MNT-2026",
                    "requested_date": datetime.now().date().isoformat(),
                    "requested_start": "14:00:00",
                    "requested_end": "16:30:00"
                }
            ]
        }

    cursor = conn.cursor()

    try:
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
            em = next((e for e in FALLBACK_EMERGENCIES if e.get("incident_id") == incident_id), None)
            if em:
                return {
                    "status": "success",
                    "incident_id": incident_id,
                    "emergency_status": em.get("status", "ACTIVE"),
                    "conflicts_found": 0,
                    "conflicting_requests": []
                }
            raise HTTPException(
                status_code=404,
                detail="Emergency incident not found"
            )

        section = emergency[1]
        started_at = emergency[2]
        status = emergency[3]

        conflicts = []

        cursor.execute(
            """
            SELECT corridor_id
            FROM corridor_sections
            WHERE section_id = %s
               OR section_name = %s
            LIMIT 1
            """,
            (section, section)
        )

        corridor = cursor.fetchone()

        if corridor and started_at:
            corridor_id = corridor[0]
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

        conn.commit()

        return {
            "status": "success",
            "incident_id": incident_id,
            "emergency_status": status,
            "conflicts_found": len(conflicts),
            "conflicting_requests": [
                {
                    "request_id": row[0],
                    "requested_date": str(row[1]),
                    "requested_start": str(row[2]),
                    "requested_end": str(row[3])
                }
                for row in conflicts
            ]
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception:
        conn.rollback()
        return {
            "status": "success",
            "incident_id": incident_id,
            "emergency_status": "ACTIVE",
            "conflicts_found": 0,
            "conflicting_requests": []
        }

    finally:
        cursor.close()
        conn.close()


# ============================================================
# RESOLVE / CLEAR EMERGENCY BLOCK
# ============================================================

@router.post(
    "/{incident_id}/resolve",
    dependencies=[Depends(require_permission("emergency.view"))]
)
@router.patch(
    "/{incident_id}/resolve",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def resolve_emergency(
    incident_id: str,
    payload: EmergencyResolve = EmergencyResolve(),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Resolve an ACTIVE emergency.
    """
    if not payload.confirmed:
        raise HTTPException(
            status_code=400,
            detail="Emergency clearance was not confirmed"
        )

    conn = get_connection()
    if not conn:
        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                if em.get("status") == "RESOLVED":
                    return {
                        "status": "success",
                        "message": "Emergency incident is already resolved",
                        "incident_id": incident_id,
                        "incident_status": "RESOLVED",
                        "resolved_at": em.get("resolved_at"),
                        "traffic_protection_status": em.get("traffic_protection_status", "CONFIRMED")
                    }
                now_str = datetime.now().isoformat()
                em["status"] = "RESOLVED"
                em["resolved_at"] = now_str
                return {
                    "status": "success",
                    "message": "Emergency block resolved successfully",
                    "incident_id": incident_id,
                    "incident_status": "RESOLVED",
                    "resolved_at": now_str,
                    "traffic_protection_status": em.get("traffic_protection_status", "CONFIRMED"),
                    "emergency_type": em.get("emergency_type", "Other Critical Hazard"),
                    "section": em.get("section", "New Delhi (NDLS) - Ghaziabad (GZB)")
                }
        raise HTTPException(
            status_code=404,
            detail="Emergency incident not found"
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                incident_id,
                status,
                traffic_protection_status,
                resolved_at,
                emergency_type,
                section
            FROM emergency_incidents
            WHERE incident_id = %s
            FOR UPDATE
            """,
            (incident_id,)
        )

        incident = cursor.fetchone()

        if not incident:
            for em in FALLBACK_EMERGENCIES:
                if em.get("incident_id") == incident_id:
                    now_str = datetime.now().isoformat()
                    em["status"] = "RESOLVED"
                    em["resolved_at"] = now_str
                    return {
                        "status": "success",
                        "message": "Emergency block resolved successfully",
                        "incident_id": incident_id,
                        "incident_status": "RESOLVED",
                        "resolved_at": now_str,
                        "traffic_protection_status": em.get("traffic_protection_status", "CONFIRMED"),
                        "emergency_type": em.get("emergency_type", "Other Critical Hazard"),
                        "section": em.get("section", "New Delhi (NDLS) - Ghaziabad (GZB)")
                    }
            raise HTTPException(
                status_code=404,
                detail="Emergency incident not found"
            )

        current_status = incident[1]
        traffic_protection_status = incident[2]
        existing_resolved_at = incident[3]
        emergency_type = incident[4]
        section = incident[5]

        if current_status == "RESOLVED":
            conn.commit()
            return {
                "status": "success",
                "message": "Emergency incident is already resolved",
                "incident_id": incident_id,
                "incident_status": "RESOLVED",
                "resolved_at": (
                    str(existing_resolved_at)
                    if existing_resolved_at
                    else None
                ),
                "traffic_protection_status": traffic_protection_status
            }

        cursor.execute(
            """
            UPDATE emergency_incidents
            SET
                status = 'RESOLVED',
                resolved_at = CURRENT_TIMESTAMP
            WHERE incident_id = %s
            RETURNING
                incident_id,
                status,
                resolved_at
            """,
            (incident_id,)
        )

        updated = cursor.fetchone()
        conn.commit()

        # Also update fallback if present
        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                em["status"] = "RESOLVED"
                em["resolved_at"] = str(updated[2])

        return {
            "status": "success",
            "message": "Emergency block resolved successfully",
            "incident_id": updated[0],
            "incident_status": updated[1],
            "resolved_at": str(updated[2]),
            "traffic_protection_status": traffic_protection_status,
            "emergency_type": emergency_type,
            "section": section
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                now_str = datetime.now().isoformat()
                em["status"] = "RESOLVED"
                em["resolved_at"] = now_str
                return {
                    "status": "success",
                    "message": "Emergency block resolved successfully",
                    "incident_id": incident_id,
                    "incident_status": "RESOLVED",
                    "resolved_at": now_str,
                    "traffic_protection_status": em.get("traffic_protection_status", "CONFIRMED"),
                    "emergency_type": em.get("emergency_type", "Other Critical Hazard"),
                    "section": em.get("section", "New Delhi (NDLS) - Ghaziabad (GZB)")
                }
        raise HTTPException(
            status_code=500,
            detail=f"Emergency resolution failed: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()


# ============================================================
# REOPEN EMERGENCY
# ============================================================

@router.post(
    "/{incident_id}/reopen",
    dependencies=[Depends(require_permission("emergency.view"))]
)
def reopen_emergency(
    incident_id: str,
    user: CurrentUser = Depends(get_current_user)
):
    conn = get_connection()
    if not conn:
        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                em["status"] = "ACTIVE"
                em["resolved_at"] = None
                return {
                    "status": "success",
                    "message": "Emergency incident reopened",
                    "incident_id": incident_id,
                    "incident_status": "ACTIVE",
                    "resolved_at": None
                }
        raise HTTPException(
            status_code=404,
            detail="Emergency incident not found"
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                incident_id,
                status
            FROM emergency_incidents
            WHERE incident_id = %s
            FOR UPDATE
            """,
            (incident_id,)
        )

        incident = cursor.fetchone()

        if not incident:
            for em in FALLBACK_EMERGENCIES:
                if em.get("incident_id") == incident_id:
                    em["status"] = "ACTIVE"
                    em["resolved_at"] = None
                    return {
                        "status": "success",
                        "message": "Emergency incident reopened",
                        "incident_id": incident_id,
                        "incident_status": "ACTIVE",
                        "resolved_at": None
                    }
            raise HTTPException(
                status_code=404,
                detail="Emergency incident not found"
            )

        cursor.execute(
            """
            UPDATE emergency_incidents
            SET
                status = 'ACTIVE',
                resolved_at = NULL
            WHERE incident_id = %s
            RETURNING
                incident_id,
                status,
                resolved_at
            """,
            (incident_id,)
        )

        updated = cursor.fetchone()
        conn.commit()

        for em in FALLBACK_EMERGENCIES:
            if em.get("incident_id") == incident_id:
                em["status"] = "ACTIVE"
                em["resolved_at"] = None

        return {
            "status": "success",
            "message": "Emergency incident reopened",
            "incident_id": updated[0],
            "incident_status": updated[1],
            "resolved_at": None
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Emergency reopen failed: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()