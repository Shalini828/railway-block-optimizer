from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import psycopg
import os

from dotenv import load_dotenv
from datetime import date, datetime, time, timedelta

from auth.security import get_current_user, require_permission, CurrentUser, RBACForbiddenException


load_dotenv()


router = APIRouter(
    prefix="/block-requests",
    tags=["Block Requests"]
)


from db_config import DB_CONFIG


# =========================================================
# DATABASE CONNECTION & RESILIENT FALLBACKS
# =========================================================

def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


FALLBACK_BLOCK_REQUESTS: List[Dict[str, Any]] = [
    {
        "request_id": "REQ-TMS-1041",
        "task_id": "TRK-ENG-982",
        "asset_id": "TRK-ENG-982",
        "team_id": "TEAM-TMS-01",
        "corridor_id": "NDLS-CNB",
        "section_id": "NDLS-CNB",
        "line": "Down Main",
        "chainage": "KM 380/02 - 385/06",
        "requested_date": "2026-08-27",
        "requested_start": "09:00:00",
        "requested_end": "12:00:00",
        "requested_duration_min": 180,
        "block_type": "Traffic Block",
        "request_status": "PENDING",
        "submitted_date": "2026-08-20",
        "requested_by": "SSE / P.Way / CNB",
        "department_id": "DEPT-TMS",
        "criticality": "High",
        "safety_risk": True,
        "description": "USFD flaw rectification – IMR rail fracture site",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-20T10:00:00",
        "updated_at": "2026-08-20T10:00:00",
    },
    {
        "request_id": "REQ-TDMS-2210",
        "task_id": "OHE-MAST-112",
        "asset_id": "OHE-MAST-112",
        "team_id": "TEAM-TDMS-01",
        "corridor_id": "NDLS-CNB",
        "section_id": "NDLS-CNB",
        "line": "Down Main",
        "chainage": "KM 381/04 - 384/00",
        "requested_date": "2026-08-27",
        "requested_start": "09:30:00",
        "requested_end": "11:30:00",
        "requested_duration_min": 120,
        "block_type": "Power Block",
        "request_status": "PENDING",
        "submitted_date": "2026-08-21",
        "requested_by": "SSE / TRD / NDLS",
        "department_id": "DEPT-TDMS",
        "criticality": "High",
        "safety_risk": False,
        "description": "OHE cantilever adjustment + hot spot repair",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-21T09:15:00",
        "updated_at": "2026-08-21T09:15:00",
    },
    {
        "request_id": "REQ-SMMS-3307",
        "task_id": "SIG-AXLE-401",
        "asset_id": "SIG-AXLE-401",
        "team_id": "TEAM-SMMS-01",
        "corridor_id": "NDLS-CNB",
        "section_id": "NDLS-CNB",
        "line": "Down Main",
        "chainage": "KM 382/00 - 383/02",
        "requested_date": "2026-08-27",
        "requested_start": "10:00:00",
        "requested_end": "12:00:00",
        "requested_duration_min": 120,
        "block_type": "Disconnection",
        "request_status": "PENDING",
        "submitted_date": "2026-08-22",
        "requested_by": "SSE / S&T / CNB",
        "department_id": "DEPT-SMMS",
        "criticality": "Medium",
        "safety_risk": False,
        "description": "Axle counter + point machine overhaul",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-22T11:30:00",
        "updated_at": "2026-08-22T11:30:00",
    },
    {
        "request_id": "REQ-TMS-1055",
        "task_id": "TRK-ENG-774",
        "asset_id": "TRK-ENG-774",
        "team_id": "TEAM-TMS-02",
        "corridor_id": "NDLS-CNB",
        "section_id": "NDLS-CNB",
        "line": "Up Main",
        "chainage": "KM 395/10 - 398/00",
        "requested_date": "2026-08-28",
        "requested_start": "01:00:00",
        "requested_end": "05:00:00",
        "requested_duration_min": 240,
        "block_type": "Traffic Block",
        "request_status": "PENDING",
        "submitted_date": "2026-08-18",
        "requested_by": "SSE / P.Way / ALJN",
        "department_id": "DEPT-TMS",
        "criticality": "Critical",
        "safety_risk": True,
        "description": "Turnout sleeper renewal & tamping",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-18T14:20:00",
        "updated_at": "2026-08-18T14:20:00",
    },
    {
        "request_id": "REQ-SMMS-3355",
        "task_id": "SIG-CBL-102",
        "asset_id": "SIG-CBL-102",
        "team_id": "TEAM-SMMS-02",
        "corridor_id": "NDLS-CNB",
        "section_id": "NDLS-CNB",
        "line": "Up Main",
        "chainage": "KM 396/00 - 397/00",
        "requested_date": "2026-08-28",
        "requested_start": "02:00:00",
        "requested_end": "03:30:00",
        "requested_duration_min": 90,
        "block_type": "Disconnection",
        "request_status": "PENDING",
        "submitted_date": "2026-08-23",
        "requested_by": "SSE / S&T / ALJN",
        "department_id": "DEPT-SMMS",
        "criticality": "Low",
        "safety_risk": False,
        "description": "Signaling cable meggering & route relay interlocking check",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-23T08:00:00",
        "updated_at": "2026-08-23T08:00:00",
    },
    {
        "request_id": "REQ-TDMS-2278",
        "task_id": "OHE-ISO-044",
        "asset_id": "OHE-ISO-044",
        "team_id": "TEAM-TDMS-02",
        "corridor_id": "NDLS-CNB",
        "section_id": "NDLS-CNB",
        "line": "Up Main",
        "chainage": "KM 395/00 - 398/00",
        "requested_date": "2026-08-28",
        "requested_start": "01:30:00",
        "requested_end": "04:00:00",
        "requested_duration_min": 150,
        "block_type": "Power Block",
        "request_status": "PENDING",
        "submitted_date": "2026-08-22",
        "requested_by": "SSE / TRD / ALJN",
        "department_id": "DEPT-TDMS",
        "criticality": "Medium",
        "safety_risk": False,
        "description": "Isolator testing and contact wire height adjustment",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-22T16:45:00",
        "updated_at": "2026-08-22T16:45:00",
    },
    {
        "request_id": "REQ-TMS-1090",
        "task_id": "TRK-ENG-512",
        "asset_id": "TRK-ENG-512",
        "team_id": "TEAM-TMS-03",
        "corridor_id": "CNB-PRYJ",
        "section_id": "CNB-PRYJ",
        "line": "Down Main",
        "chainage": "KM 440/00 - 442/00",
        "requested_date": "2026-08-29",
        "requested_start": "13:00:00",
        "requested_end": "16:30:00",
        "requested_duration_min": 210,
        "block_type": "Traffic Block",
        "request_status": "PENDING",
        "submitted_date": "2026-08-19",
        "requested_by": "SSE / P.Way / FTP",
        "department_id": "DEPT-TMS",
        "criticality": "High",
        "safety_risk": True,
        "description": "Deep screening of ballast at bridge approaches",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-19T11:10:00",
        "updated_at": "2026-08-19T11:10:00",
    },
    {
        "request_id": "REQ-SMMS-3401",
        "task_id": "SIG-GATE-088",
        "asset_id": "SIG-GATE-088",
        "team_id": "TEAM-SMMS-03",
        "corridor_id": "CNB-PRYJ",
        "section_id": "CNB-PRYJ",
        "line": "Single Line",
        "chainage": "KM 455/12 - 455/18",
        "requested_date": "2026-08-29",
        "requested_start": "13:30:00",
        "requested_end": "16:30:00",
        "requested_duration_min": 180,
        "block_type": "Disconnection",
        "request_status": "PENDING",
        "submitted_date": "2026-08-21",
        "requested_by": "SSE / S&T / PRYJ",
        "department_id": "DEPT-SMMS",
        "criticality": "High",
        "safety_risk": True,
        "description": "Level crossing gate interlock modernization",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-21T15:00:00",
        "updated_at": "2026-08-21T15:00:00",
    },
    {
        "request_id": "REQ-TDMS-2299",
        "task_id": "OHE-BOND-309",
        "asset_id": "OHE-BOND-309",
        "team_id": "TEAM-TDMS-03",
        "corridor_id": "CNB-PRYJ",
        "section_id": "CNB-PRYJ",
        "line": "Down Main",
        "chainage": "KM 441/00 - 443/00",
        "requested_date": "2026-08-29",
        "requested_start": "14:00:00",
        "requested_end": "16:00:00",
        "requested_duration_min": 120,
        "block_type": "Power Block",
        "request_status": "PENDING",
        "submitted_date": "2026-08-24",
        "requested_by": "SSE / TRD / PRYJ",
        "department_id": "DEPT-TDMS",
        "criticality": "Medium",
        "safety_risk": False,
        "description": "Traction bonding & neutral section inspection",
        "review_status": "PENDING_REVIEW",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "created_at": "2026-08-24T10:20:00",
        "updated_at": "2026-08-24T10:20:00",
    },
]


# =========================================================
# REQUEST MODEL
# =========================================================

class BlockRequestCreate(BaseModel):
    dept: str
    assetId: str
    work: str

    section: str
    line: str
    chainage: str

    blockType: str
    duration: float
    crew: int

    criticality: str
    daysOverdue: int
    tsrRisk: bool

    requestedBy: str


# =========================================================
# HELPERS
# =========================================================

def normalize_criticality(value: str) -> str:
    value = (value or "").strip().lower()

    mapping = {
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
    }

    return mapping.get(value, "Low")


def criticality_to_level(value: str) -> int:
    mapping = {
        "Critical": 5,
        "High": 4,
        "Medium": 3,
        "Low": 2,
    }

    return mapping.get(value, 2)


def resolve_user_id(cursor, requested_by: str):
    """
    Try to resolve the frontend's requestedBy value to an existing
    users.user_id.

    The frontend may send:
      - user_id
      - employee_code
      - email

    If no matching user exists, return None because requested_by
    is intentionally nullable for backward compatibility.
    """

    if not requested_by:
        return None

    value = requested_by.strip()

    if not value:
        return None

    cursor.execute(
        """
        SELECT user_id
        FROM users
        WHERE user_id = %s
          OR email = %s
        LIMIT 1
        """,
        (value, value)
    )

    row = cursor.fetchone()

    return row[0] if row else None


def resolve_section_id(cursor, section: str, corridor_id: str):
    """
    Resolve a frontend section value to corridor_sections.section_id.

    We support:
      - section_id
      - section_code
      - section_name

    If the current database has no matching section yet,
    return None so existing requests continue to work.
    """

    if not section:
        return None

    value = section.strip()

    if not value:
        return None

    cursor.execute(
    """
    SELECT section_id
    FROM corridor_sections
    WHERE corridor_id = %s
      AND (
            section_id = %s
            OR section_name = %s
          )
    LIMIT 1
    """,
    (corridor_id, value, value)
)

    row = cursor.fetchone()

    return row[0] if row else None


# =========================================================
# GET ALL BLOCK REQUESTS
# =========================================================

@router.get("/", dependencies=[Depends(require_permission("requests.view"))])
def get_block_requests(user: CurrentUser = Depends(get_current_user)):
    conn = get_connection()
    if not conn:
        clean_dept = (user.dept or "").upper() if user and hasattr(user, "dept") else "ALL"
        raw_list = FALLBACK_BLOCK_REQUESTS
        if user and getattr(user, "scope", "network") != "network":
            raw_list = [
                req for req in FALLBACK_BLOCK_REQUESTS
                if req.get("department_id") in (f"DEPT-{clean_dept}", clean_dept, user.dept)
            ]
        return [
            {**r, "is_demo": True, "data_source": "SYNTHETIC_DEMO"}
            for r in raw_list
        ]

    cursor = conn.cursor()

    try:
        if user.scope != "network":
            clean_dept = user.dept.upper()

            cursor.execute(
                """
                SELECT
                    br.request_id,
                    br.task_id,
                    mt.asset_id,
                    br.team_id,
                    br.corridor_id,
                    br.requested_date,
                    br.requested_start,
                    br.requested_end,
                    br.requested_duration_min,
                    br.block_type,
                    br.request_status,
                    br.submitted_date,
                    br.requested_by,
                    br.department_id,
                    br.section_id,
                    br.criticality,
                    br.safety_risk,
                    br.description,
                    br.review_status,
                    br.reviewed_by,
                    br.reviewed_at,
                    br.rejection_reason,
                    br.created_at,
                    br.updated_at
                FROM block_requests br
                LEFT JOIN maintenance_tasks mt
                    ON mt.task_id = br.task_id
                WHERE UPPER(COALESCE(br.department_id, '')) IN (%s, %s)
                ORDER BY
                    br.requested_date NULLS LAST,
                    br.requested_start NULLS LAST
                """,
                (f"DEPT-{clean_dept}", clean_dept),
            )
        else:
            cursor.execute(
                """
                SELECT
                    br.request_id,
                    br.task_id,
                    mt.asset_id,
                    br.team_id,
                    br.corridor_id,
                    br.requested_date,
                    br.requested_start,
                    br.requested_end,
                    br.requested_duration_min,
                    br.block_type,
                    br.request_status,
                    br.submitted_date,
                    br.requested_by,
                    br.department_id,
                    br.section_id,
                    br.criticality,
                    br.safety_risk,
                    br.description,
                    br.review_status,
                    br.reviewed_by,
                    br.reviewed_at,
                    br.rejection_reason,
                    br.created_at,
                    br.updated_at
                FROM block_requests br
                LEFT JOIN maintenance_tasks mt
                    ON mt.task_id = br.task_id
                ORDER BY
                    br.requested_date NULLS LAST,
                    br.requested_start NULLS LAST
                """
            )

        rows = cursor.fetchall()

        return [
            {
                "request_id": row[0],
                "task_id": row[1],
                "asset_id": row[2],
                "team_id": row[3],
                "corridor_id": row[4],
                "requested_date": str(row[5]) if row[5] else None,
                "requested_start": str(row[6]) if row[6] else None,
                "requested_end": str(row[7]) if row[7] else None,
                "requested_duration_min": row[8],
                "block_type": row[9],
                "request_status": row[10],
                "submitted_date": str(row[11]) if row[11] else None,
                "requested_by": row[12],
                "department_id": row[13],
                "section_id": row[14],
                "criticality": row[15],
                "safety_risk": row[16],
                "description": row[17],
                "review_status": row[18],
                "reviewed_by": row[19],
                "reviewed_at": row[20].isoformat() if row[20] else None,
                "rejection_reason": row[21],
                "created_at": row[22].isoformat() if row[22] else None,
                "updated_at": row[23].isoformat() if row[23] else None,
            }
            for row in rows
        ]

    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="Unable to load requisitions from PostgreSQL.",
        ) from exc

    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass

# =========================================================
# EDIT BLOCK REQUEST (PENDING ONLY, OWN DEPT OR ADMIN)
# =========================================================

class BlockRequestUpdate(BaseModel):
    work: Optional[str] = None
    blockType: Optional[str] = None
    requested_date: Optional[str] = None
    requested_start: Optional[str] = None
    requested_end: Optional[str] = None
    duration: Optional[float] = None
    criticality: Optional[str] = None


@router.patch("/{request_id}", dependencies=[Depends(require_permission("requests.edit"))])
def update_block_request(
    request_id: str,
    payload: BlockRequestUpdate,
    user: CurrentUser = Depends(get_current_user),
):
    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. The requisition was not updated.",
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT request_id, request_status, department_id
            FROM block_requests
            WHERE request_id = %s
            """,
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = (row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be edited (current status: {req_status})",
            )

        if user.scope != "network":
            dept_id = (row[2] or "").upper()
            user_dept = user.dept.upper()
            if dept_id not in (f"DEPT-{user_dept}", user_dept):
                raise RBACForbiddenException(
                    required=f"department.{user.dept}",
                    role=user.role_id,
                    detail="Cannot edit requisitions from other departments",
                )

        updates = []
        params = []
        if payload.work is not None:
            updates.append("description = %s")
            params.append(payload.work)
        if payload.blockType is not None:
            updates.append("block_type = %s")
            params.append(payload.blockType)
        if payload.requested_date is not None:
            updates.append("requested_date = %s")
            params.append(payload.requested_date)
        if payload.requested_start is not None:
            updates.append("requested_start = %s")
            params.append(payload.requested_start)
        if payload.requested_end is not None:
            updates.append("requested_end = %s")
            params.append(payload.requested_end)
        if payload.duration is not None:
            updates.append("requested_duration_min = %s")
            params.append(int(payload.duration * 60))
        if payload.criticality is not None:
            crit = normalize_criticality(payload.criticality)
            updates.append("criticality = %s")
            params.append(criticality_to_level(crit))

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(request_id)
            cursor.execute(
                f"UPDATE block_requests SET {', '.join(updates)} WHERE request_id = %s",
                params,
            )
            conn.commit()

        return {
            "status": "success",
            "message": "Block request updated successfully",
            "request_id": request_id,
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass


# =========================================================
# CANCEL BLOCK REQUEST (PENDING ONLY, OWN DEPT OR ADMIN)
# =========================================================

@router.post("/{request_id}/cancel", dependencies=[Depends(require_permission("requests.cancel"))])
def cancel_block_request(
    request_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. The requisition was not cancelled.",
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT request_id, request_status, department_id
            FROM block_requests
            WHERE request_id = %s
            """,
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = (row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be cancelled (current status: {req_status})",
            )

        if user.scope != "network":
            dept_id = (row[2] or "").upper()
            user_dept = user.dept.upper()
            if dept_id not in (f"DEPT-{user_dept}", user_dept):
                raise RBACForbiddenException(
                    required=f"department.{user.dept}",
                    role=user.role_id,
                    detail="Cannot cancel requisitions from other departments",
                )

        cursor.execute(
            """
            UPDATE block_requests
            SET request_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
            """,
            (request_id,),
        )
        conn.commit()

        return {
            "status": "success",
            "message": "Block request cancelled",
            "request_id": request_id,
            "request_status": "CANCELLED",
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass


# =========================================================
# APPROVE BLOCK REQUEST
# =========================================================

@router.post("/{request_id}/approve", dependencies=[Depends(require_permission("requests.reject"))])
def approve_block_request(
    request_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Approve a requisition after review/optimization."""
    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. The requisition approval was not saved.",
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT request_id, request_status, department_id
            FROM block_requests
            WHERE request_id = %s
            """,
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = (row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be approved for optimization (current status: {req_status})",
            )

        if user.scope != "network":
            dept_id = (row[2] or "").upper()
            user_dept = user.dept.upper()
            if dept_id not in (f"DEPT-{user_dept}", user_dept):
                raise RBACForbiddenException(
                    required=f"department.{user.dept}",
                    role=user.role_id,
                    detail="Cannot approve requisitions from other departments",
                )

        approver_identity = (user.name or user.title or "SYSTEM")[:30]
        cursor.execute(
            """
            UPDATE block_requests
            SET
                review_status = 'APPROVED',
                reviewed_by = %s,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
            """,
            (approver_identity, request_id),
        )
        conn.commit()

        return {
            "status": "success",
            "message": "Block request approved and remains eligible for optimization",
            "request_id": request_id,
            "request_status": "PENDING",
            "review_status": "APPROVED",
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass


# =========================================================
# SEND BLOCK REQUEST FOR REWORK
# =========================================================
@router.post("/{request_id}/rework", dependencies=[Depends(require_permission("requests.reject"))])
def rework_block_request(
    request_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Send a requisition back for rework after officer review."""
    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. The requisition was not sent for rework.",
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT request_id, request_status, department_id
            FROM block_requests
            WHERE request_id = %s
            """,
            (request_id,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Block request not found",
            )

        req_status = (row[1] or "").upper()

        # Rework is not allowed for already-final requests
        if req_status in ("CANCELLED", "REJECTED", "COMPLETED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot rework request in status {req_status}",
            )

        # Department-level authorization
        if user.scope != "network":
            dept_id = (row[2] or "").upper()
            user_dept = user.dept.upper()

            if dept_id not in (f"DEPT-{user_dept}", user_dept):
                raise RBACForbiddenException(
                    required=f"department.{user.dept}",
                    role=user.role_id,
                    detail="Cannot rework requisitions from other departments",
                )

        reviewer_identity = (
            user.name or user.title or "SYSTEM"
        )[:30]

        cursor.execute(
            """
            UPDATE block_requests
            SET
                request_status = 'PENDING',
                review_status = 'REWORK',
                reviewed_by = %s,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
            """,
            (
                reviewer_identity,
                request_id,
            ),
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Block request sent for rework",
            "request_id": request_id,
            "request_status": "PENDING",
            "review_status": "REWORK",
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass


# =========================================================
# REJECT BLOCK REQUEST (ADMIN ONLY)
# =========================================================

class BlockRequestReject(BaseModel):
    reason: str


@router.post("/{request_id}/reject", dependencies=[Depends(require_permission("requests.reject"))])
def reject_block_request(
    request_id: str,
    payload: BlockRequestReject,
    user: CurrentUser = Depends(get_current_user),
):
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Rejection reason is required")

    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. The requisition was not rejected.",
        )

    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT request_id, request_status FROM block_requests WHERE request_id = %s",
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = str(row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be rejected (current status: {req_status})",
            )

        approver_identity = (user.name or user.title or "SYSTEM")[:30]
        cursor.execute(
            """
            UPDATE block_requests
            SET
                request_status = 'REJECTED',
                rejection_reason = %s,
                reviewed_by = %s,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
            """,
            (payload.reason, approver_identity, request_id),
        )
        conn.commit()

        return {
            "status": "success",
            "message": "Block request rejected",
            "request_id": request_id,
            "request_status": "REJECTED",
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass


# =========================================================
# CREATE BLOCK REQUEST
# =========================================================

@router.post("/", dependencies=[Depends(require_permission("requests.create"))])
def create_block_request(
    request: BlockRequestCreate,
    user: CurrentUser = Depends(get_current_user)
):

    # =====================================================
    # 1. NORMALIZE INPUT & ENFORCE RBAC IDENTITY
    # =====================================================

    if user.scope != "network":
        body_dept = (request.dept or "").strip().upper()
        user_dept = (user.dept or "").strip().upper()
        if body_dept and body_dept != user_dept:
            raise RBACForbiddenException(
                required=f"department.{user.dept}",
                role=user.role_id,
                detail="You may only raise requisitions for your own department",
            )
        department = user_dept
    else:
        department = request.dept.strip().upper()

    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. The requisition was not saved; reconnect and try again.",
        )

    cursor = conn.cursor()

    try:

        requester_name = user.name or user.title or request.requestedBy
        section = request.section.strip()
        asset_input = request.assetId.strip()
        block_type = request.blockType.strip()

        criticality = normalize_criticality(
            request.criticality
        )

        criticality_level = criticality_to_level(
            criticality
        )


        # =====================================================
        # 2. DEPARTMENT → REAL DATABASE TEAM ID
        # =====================================================

        team_mapping = {
            "TMS": "TEAM-001",
            "SMMS": "TEAM-002",
            "TDMS": "TEAM-003",
        }

        team_id = team_mapping.get(department)

        if not team_id:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid department: {request.dept}"
            )


        # =====================================================
        # 3. DEPARTMENT → DEPARTMENT TABLE
        # =====================================================

        department_mapping = {
            "TMS": "DEPT-TMS",
            "SMMS": "DEPT-SMMS",
            "TDMS": "DEPT-TDMS"
        }

        department_id = department_mapping.get(
            department
        )

        if not department_id:
            raise HTTPException(
                status_code=400,
                detail=f"No department configuration found for {department}."
            )


        # =====================================================
        # 4. VERIFY TEAM EXISTS
        # =====================================================

        cursor.execute(
            """
            SELECT team_id
            FROM teams
            WHERE team_id = %s
            LIMIT 1
            """,
            (team_id,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Configured team {team_id} "
                    f"does not exist in the database."
                )
            )


        # =====================================================
        # 5. CORRIDOR MAPPING
        # =====================================================

        corridor_mapping = {
            "New Delhi (NDLS) - Ghaziabad (GZB)": "C02",
            "Ghaziabad (GZB) - Kanpur (CNB)": "C02",
            "Kanpur (CNB) - Prayagraj (PRYJ)": "C03",
            "Prayagraj (PRYJ) - Varanasi (BSB)": "C04",
            "CNB Outer": "C05",
            "NDLS Station Limits": "C06",

            # Short names
            "NDLS-GZB": "C01",
            "GZB-CNB": "C02",
            "CNB-PRYJ": "C03",
            "PRYJ-BSB": "C04"
        }

        corridor_id = corridor_mapping.get(section)


        # =====================================================
        # 6. ALLOW DIRECT SECTION ID
        # =====================================================

        if not corridor_id:
            cursor.execute(
                """
                SELECT corridor_id
                FROM corridor_sections
                WHERE section_id = %s
                LIMIT 1
                """,
                (section,)
            )

            section_row = cursor.fetchone()

            if section_row:
                corridor_id = section_row[0]


        # =====================================================
        # 7. ALLOW DIRECT CORRIDOR ID
        # =====================================================

        if not corridor_id:

            cursor.execute(
                """
                SELECT corridor_id
                FROM corridors
                WHERE corridor_id = %s
                LIMIT 1
                """,
                (section,)
            )

            corridor_row = cursor.fetchone()

            if corridor_row:
                corridor_id = corridor_row[0]


        if not corridor_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid corridor/section: "
                    f"{request.section}"
                )
            )

        # =====================================================
        # 7. RESOLVE SECTION ID
        # =====================================================

        section_id = resolve_section_id(
            cursor,
            section,
            corridor_id
        )


        # =====================================================
        # 8. RESOLVE REQUESTING USER
        # =====================================================

        requested_by_user_id = resolve_user_id(
    cursor,
    requester_name
)


        # =====================================================
        # 9. ASSET ID → REAL DATABASE ASSET ID
        # =====================================================

        asset_mapping = {

            "A001": "AST-0001",
            "A002": "AST-0002",
            "A003": "AST-0003",
            "A004": "AST-0004",
            "A005": "AST-0005",
            "A006": "AST-0006",
            "A007": "AST-0007",
            "A008": "AST-0008",
            "A009": "AST-0009",
            "A010": "AST-0010",
            "A011": "AST-0011",
            "A012": "AST-0012",
            "A013": "AST-0013",
            "A014": "AST-0014",
            "A015": "AST-0015",
            "A016": "AST-0016",
            "A017": "AST-0017",
            "A018": "AST-0018",
            "A019": "AST-0019",
            "A020": "AST-0020"
        }

        asset_id = asset_mapping.get(
            asset_input,
            asset_input
        )


        # =====================================================
        # 10. VERIFY ASSET EXISTS
        # =====================================================

        cursor.execute(
            """
            SELECT asset_id
            FROM assets
            WHERE asset_id = %s
            LIMIT 1
            """,
            (asset_id,)
        )

        asset_row = cursor.fetchone()

        if not asset_row:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid assetId: {request.assetId}. "
                    f"Use an available asset such as "
                    f"A001 / AST-0001."
                )
            )


        # =====================================================
        # 11. VALIDATE DURATION
        # =====================================================

        # The portal sends hours; persist the duration in minutes.
        duration_minutes = int(
            round(request.duration * 60)
        )

        if duration_minutes <= 0:
            raise HTTPException(
                status_code=400,
                detail="Duration must be greater than 0 minutes."
            )

        if duration_minutes > 240:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Block duration cannot exceed "
                    "240 minutes (4 hours)."
                )
            )


        # =====================================================
        # 12. DETERMINE PLANNING DATE
        # =====================================================

        # New requisitions belong to the current operational date unless the
        # user explicitly supplies a planning date through a supported field.
        # Reusing MAX(requested_date) pulls a new request onto a stale historical
        # day and can make it appear optimized into an old plan.
        planning_date = date.today()


        # =====================================================
        # 13. DETERMINE START TIME
        # =====================================================

        cursor.execute(
            """
            SELECT MAX(requested_end)
            FROM block_requests
            WHERE corridor_id = %s
              AND requested_date = %s
              AND requested_end IS NOT NULL
            """,
            (
                corridor_id,
                planning_date
            )
        )

        latest_end = cursor.fetchone()[0]


        if latest_end:

            if isinstance(latest_end, time):

                start_datetime = (
                    datetime.combine(
                        planning_date,
                        latest_end
                    )
                    + timedelta(minutes=30)
                )

            else:

                start_datetime = datetime.combine(
                    planning_date,
                    time(9, 0)
                )

        else:

            start_datetime = datetime.combine(
                planning_date,
                time(9, 0)
            )


        # =====================================================
        # 14. CALCULATE END TIME
        # =====================================================

        requested_end_datetime = (
            start_datetime
            + timedelta(
                minutes=duration_minutes
            )
        )


        # =====================================================
        # 15. MIDNIGHT PROTECTION
        # =====================================================

        if requested_end_datetime.date() != planning_date:

            planning_date = (
                requested_end_datetime.date()
            )

            start_datetime = datetime.combine(
                planning_date,
                time(9, 0)
            )

            requested_end_datetime = (
                start_datetime
                + timedelta(
                    minutes=duration_minutes
                )
            )


        requested_start = start_datetime.time()

        requested_end = requested_end_datetime.time()


        # =====================================================
        # 16. GENERATE TASK ID
        # =====================================================

        cursor.execute(
            """
            SELECT task_id
            FROM maintenance_tasks
            WHERE task_id LIKE 'T-AUTO-%'
            ORDER BY task_id DESC
            LIMIT 1
            """
        )

        last_task = cursor.fetchone()

        if last_task:

            try:

                last_number = int(
                    last_task[0].replace(
                        "T-AUTO-",
                        ""
                    )
                )

                task_number = (
                    last_number + 1
                )

            except (
                ValueError,
                AttributeError
            ):

                task_number = 1

        else:

            task_number = 1

        task_id = (
            f"T-AUTO-{task_number:04d}"
        )


        # =====================================================
        # 17. GENERATE REQUEST ID
        # =====================================================

        cursor.execute(
            """
            SELECT request_id
            FROM block_requests
            WHERE request_id LIKE 'BR-AUTO-%'
            ORDER BY request_id DESC
            LIMIT 1
            """
        )

        last_request = cursor.fetchone()

        if last_request:

            try:

                last_number = int(
                    last_request[0].replace(
                        "BR-AUTO-",
                        ""
                    )
                )

                request_number = (
                    last_number + 1
                )

            except (
                ValueError,
                AttributeError
            ):

                request_number = 1

        else:

            request_number = 1

        request_id = (
            f"BR-AUTO-{request_number:04d}"
        )


        # =====================================================
        # 18. PRIORITY SCORE
        # =====================================================

        if criticality == "Critical":

            criticality_score = 50

        elif criticality == "High":

            criticality_score = 40

        elif criticality == "Medium":

            criticality_score = 25

        else:

            criticality_score = 12


        overdue_score = min(
            max(request.daysOverdue, 0) * 2.2,
            30
        )


        tsr_score = (
            18
            if request.tsrRisk
            else 0
        )


        if block_type == "Power Block":

            hazard_score = 8

        elif block_type == "Traffic Block":

            hazard_score = 10

        else:

            hazard_score = 6


        priority_score = (
            criticality_score
            + overdue_score
            + tsr_score
            + hazard_score
        )


        priority_score = round(
            min(priority_score, 100),
            2
        )


        # =====================================================
        # 19. PRIORITY CATEGORY
        # =====================================================

        if priority_score >= 85:

            priority_category = "CRITICAL"

        elif priority_score >= 70:

            priority_category = "HIGH"

        elif priority_score >= 50:

            priority_category = "MEDIUM"

        else:

            priority_category = "LOW"


        # =====================================================
        # 20. TASK TYPE
        # =====================================================

        if criticality in [
            "High",
            "Medium",
            "Critical"
        ]:

            task_type = (
                "Corrective Maintenance"
            )

        else:

            task_type = (
                "Preventive Maintenance"
            )


        # =====================================================
        # 21. SAFETY RISK
        # =====================================================

        safety_risk = (
            3
            if request.tsrRisk
            else max(1, min(5, criticality_level - 1))
        )


        # =====================================================
        # 22. DESCRIPTION
        # =====================================================

        description = (
            f"{request.work} | "
            f"Section: {request.section} | "
            f"Line: {request.line} | "
            f"Chainage: {request.chainage} | "
            f"Crew: {request.crew} | "
            f"Requested by: {requester_name}"
        )


        # =====================================================
        # 23. INSERT MAINTENANCE TASK
        # =====================================================

        cursor.execute(
            """
            INSERT INTO maintenance_tasks
            (
                task_id,
                asset_id,
                department,
                task_type,
                description,
                created_date,
                due_date,
                estimated_duration_min,
                overdue_days,
                safety_risk,
                task_status,
                priority_score,
                priority_category
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                task_id,
                asset_id,
                department,
                task_type,
                description,
                date.today(),
                None,
                duration_minutes,
                max(
                    request.daysOverdue,
                    0
                ),
                safety_risk,
                "PENDING",
                priority_score,
                priority_category
            )
        )


        # =====================================================
        # 24. INSERT BLOCK REQUEST
        # =====================================================

        cursor.execute(
            """
            INSERT INTO block_requests
            (
                request_id,
                task_id,
                team_id,
                corridor_id,
                requested_date,
                requested_start,
                requested_end,
                requested_duration_min,
                block_type,
                request_status,
                submitted_date,
                requested_by,
                department_id,
                section_id,
                criticality,
                safety_risk,
                description,
                review_status,
                created_at,
                updated_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING request_id, request_status, review_status, created_at
            """,
            (
                request_id,
                task_id,
                team_id,
                corridor_id,
                planning_date,
                requested_start,
                requested_end,
                duration_minutes,
                block_type,
                "PENDING",
                date.today(),
                requested_by_user_id,
                department_id,
                section_id,
                criticality_level,
                safety_risk,
                description,
                "PENDING",
            )
        )

        persisted_request = cursor.fetchone()
        if not persisted_request:
            raise HTTPException(
                status_code=500,
                detail="The requisition insert did not return a persisted record.",
            )

        persisted_request_id, persisted_request_status, persisted_review_status, persisted_created_at = persisted_request
        persisted_request_status = str(persisted_request_status or "").strip().upper()
        if persisted_request_status != "PENDING":
            raise HTTPException(
                status_code=500,
                detail=(
                    "The requisition was not saved in the required initial PENDING state. "
                    "The transaction was rolled back."
                ),
            )


        # =====================================================
        # 25. COMMIT TRANSACTION
        # =====================================================

        conn.commit()


        # =====================================================
        # 26. RETURN SUCCESS
        # =====================================================

        return {
            "status": "success",

            "message": (
                "Block requisition created successfully"
            ),

            "request_id": persisted_request_id,

            "task_id": task_id,

            "team_id": team_id,

            "department_id": department_id,

            "requested_by": requested_by_user_id,

            "section_id": section_id,

            "corridor_id": corridor_id,

            "asset_id": asset_id,

            "requested_date": str(
                planning_date
            ),

            "requested_start": str(
                requested_start
            ),

            "requested_end": str(
                requested_end
            ),

            "duration_min": duration_minutes,

            "priority_score": priority_score,

            "priority_category": (
                priority_category
            ),

            "criticality": criticality_level,

            "safety_risk": safety_risk,

            "review_status": persisted_review_status,

            "request_status": persisted_request_status,
            "created_at": persisted_created_at.isoformat() if persisted_created_at else None,
            "requisition": {
                "request_id": persisted_request_id,
                "task_id": task_id,
                "asset_id": asset_id,
                "team_id": team_id,
                "corridor_id": corridor_id,
                "requested_date": str(planning_date),
                "requested_start": str(requested_start),
                "requested_end": str(requested_end),
                "requested_duration_min": duration_minutes,
                "block_type": block_type,
                "request_status": persisted_request_status,
                "requested_by": requested_by_user_id,
                "department_id": department_id,
                "section_id": section_id,
                "criticality": criticality_level,
                "safety_risk": safety_risk,
                "description": description,
                "review_status": persisted_review_status,
                "created_at": persisted_created_at.isoformat() if persisted_created_at else None,
                "line": request.line,
                "chainage": request.chainage,
            }
        }


    # =====================================================
    # HTTP EXCEPTION
    # =====================================================

    except HTTPException:

        conn.rollback()

        raise


    # =====================================================
    # DATABASE / GENERAL EXCEPTION
    # =====================================================

    except Exception as e:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    # =====================================================
    # CLOSE CONNECTION
    # =====================================================

    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass
