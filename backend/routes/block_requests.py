from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
import psycopg
import os
import logging
import re

from dotenv import load_dotenv
from datetime import date, datetime, time, timedelta
from uuid import uuid4

from auth.security import get_current_user, require_permission, CurrentUser, RBACForbiddenException


load_dotenv()


router = APIRouter(
    prefix="/block-requests",
    tags=["Block Requests"]
)

REWORKABLE_REVIEW_STATES = frozenset({"PENDING", "PENDING_REVIEW", "APPROVED", "REWORK"})
DEPARTMENT_CODE_ALIASES = {
    "TMS": "TMS",
    "ENGINEERING": "TMS",
    "SMMS": "SMMS",
    "S&T": "SMMS",
    "TDMS": "TDMS",
    "TRD": "TDMS",
}
DEPARTMENT_IDS = {"TMS": "DEPT-TMS", "SMMS": "DEPT-SMMS", "TDMS": "DEPT-TDMS"}
TEAM_IDS = {"TMS": "ENG-01", "SMMS": "SNT-01", "TDMS": "TRD-01"}
# The role-based authentication principal is backed by one active DB principal
# per reviewer role. Resolve its FK dynamically and fail closed if that policy
# is not true in the live database.
REVIEWER_DB_ROLES = {"admin": "SYSTEM_ADMIN"}


from db_config import DB_CONFIG

logger = logging.getLogger(__name__)


def _safe_requisition_error_details(exc: Exception):
    """Return bounded, redacted diagnostics without logging submitted values."""
    diag = getattr(exc, "diag", None)
    primary_message = getattr(diag, "message_primary", None)
    if isinstance(primary_message, str) and primary_message.strip():
        message = re.sub(r"'[^']*'", "'[redacted]'", primary_message.strip())
        message = re.sub(
            r"(?i)\b(password|passwd|pwd|token|secret)\s*=\s*[^\s,;]+",
            r"\1=[redacted]",
            message,
        )
        message = re.sub(
            r"(?i)\b(?:postgres(?:ql)?|mysql)://[^\s]+",
            "[redacted connection URI]",
            message,
        )
        message = message[:300]
    else:
        message = "Unexpected requisition persistence error"

    sqlstate = getattr(exc, "sqlstate", None) or getattr(exc, "pgcode", None)
    if not isinstance(sqlstate, str) or not re.fullmatch(r"[0-9A-Z]{5}", sqlstate):
        sqlstate = None
    return message, sqlstate


# =========================================================
# DATABASE CONNECTION & RESILIENT FALLBACKS
# =========================================================

def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


def _load_request_for_action(cursor, request_id: str):
    """Load and lock a request with department data from its persisted task."""
    cursor.execute(
        """
        SELECT br.request_id, br.request_status, br.review_status,
               mt.department, br.task_id
        FROM block_requests br
        LEFT JOIN maintenance_tasks mt ON mt.task_id = br.task_id
        WHERE br.request_id = %s
        FOR UPDATE OF br
        """,
        (request_id,),
    )
    return cursor.fetchone()


def _require_request_department(row, user: "CurrentUser", action: str):
    """Department scoped callers must have a matching task department."""
    if user.scope == "network":
        return
    dept = str(row[3] or "").strip().upper()
    user_dept = str(user.dept or "").strip().upper()
    if not user_dept or dept not in (user_dept, f"DEPT-{user_dept}"):
        raise RBACForbiddenException(
            required=f"department.{user.dept}",
            role=user.role_id,
            detail=f"Cannot {action} requisitions outside your department or without a matching task",
        )


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

    @field_validator("criticality")
    @classmethod
    def validate_criticality(cls, value: str) -> str:
        return normalize_criticality(value)


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

    if value not in mapping:
        raise ValueError("Criticality must be Critical, High, Medium, or Low")
    return mapping[value]


def criticality_to_level(value: str) -> int:
    mapping = {
        "Critical": 5,
        "High": 4,
        "Medium": 3,
        "Low": 2,
    }

    return mapping.get(value, 2)


def generate_requisition_ids():
    """Generate low-collision IDs without a racy database sequence lookup."""
    # The checked-in schema caps both identifiers at VARCHAR(30).
    suffix = uuid4().hex[:22].upper()
    return f"T-AUTO-{suffix}", f"BR-AUTO-{suffix}"


def require_one_updated_row(cursor, detail: str):
    if cursor.rowcount != 1:
        raise HTTPException(status_code=409, detail=detail)


def canonical_department_code(value: Optional[str]) -> Optional[str]:
    normalized = (value or "").strip().upper()
    if normalized.startswith("DEPT-"):
        normalized = normalized[5:]
    return DEPARTMENT_CODE_ALIASES.get(normalized)


def resolve_user_id(cursor, authenticated_user: CurrentUser):
    """Return a stable user key only when authentication supplies one.

    CurrentUser currently carries a role identity, not users.user_id (or
    employee_code/email). A role can belong to many users, so it cannot safely
    be used to resolve an individual requester. Keep the nullable FK unset
    until authentication provides a stable individual identity.
    """
    return getattr(authenticated_user, "user_id", None)


def require_reviewer_id(authenticated_user: CurrentUser) -> str:
    """Require an individual database identity for reviewer foreign keys."""
    user_id = getattr(authenticated_user, "user_id", None)
    if not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(
            status_code=409,
            detail="A database user identity is required to review this request. Please sign in with an individually identified account.",
        )
    return user_id.strip()


def resolve_approval_reviewer_id(cursor, authenticated_user: CurrentUser) -> str:
    """Resolve the sole active database principal backing the approver role.

    The current login authenticates a role rather than an individual. The
    deployed users table has one active SYSTEM_ADMIN principal for the admin
    role; query it instead of writing a display label or embedding its key.
    Ambiguous or missing role principals are rejected before the request update.
    """
    db_role = REVIEWER_DB_ROLES.get(authenticated_user.role_id)
    if not db_role:
        raise HTTPException(status_code=409, detail="No database reviewer is configured for this role.")

    cursor.execute(
        """
        SELECT user_id
        FROM users
        WHERE role = %s AND active IS TRUE
        ORDER BY user_id
        LIMIT 2
        """,
        (db_role,),
    )
    matches = cursor.fetchall()
    if len(matches) != 1 or not matches[0][0]:
        raise HTTPException(
            status_code=409,
            detail="Approval requires exactly one active database reviewer for the authenticated role.",
        )
    return matches[0][0]


def resolve_section_id(cursor, section: str, corridor_id: str):
    """
    Resolve a frontend section value to corridor_sections.section_id.

    We support:
      - section_id
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
                    br.created_by AS requested_by,
                    mt.department AS department_id,
                    br.corridor_id AS section_id,
                    br.criticality,
                    br.safety_risk,
                    mt.description AS description,
                    br.review_status,
                    br.reviewed_by,
                    br.reviewed_at,
                    br.rejection_reason,
                    br.submitted_date AS created_at,
                    NULL::timestamp AS updated_at
                FROM block_requests br
                LEFT JOIN maintenance_tasks mt
                    ON mt.task_id = br.task_id
                WHERE UPPER(COALESCE(mt.department, '')) IN (%s, %s)
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
                    br.created_by AS requested_by,
                    mt.department AS department_id,
                    br.corridor_id AS section_id,
                    br.criticality,
                    br.safety_risk,
                    mt.description AS description,
                    br.review_status,
                    br.reviewed_by,
                    br.reviewed_at,
                    br.rejection_reason,
                    br.submitted_date AS created_at,
                    NULL::timestamp AS updated_at
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

    @field_validator("criticality")
    @classmethod
    def validate_criticality(cls, value: Optional[str]) -> Optional[str]:
        return normalize_criticality(value) if value is not None else None


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
        row = _load_request_for_action(cursor, request_id)
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = (row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be edited (current status: {req_status})",
            )

        _require_request_department(row, user, "edit")

        updates = []
        params = []
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

        if updates or payload.work is not None:
            params.append(request_id)
            prior_review_status = str(row[2] or "PENDING").strip().upper()
            params.append(prior_review_status)
            if updates:
                cursor.execute(
                    f"""
                    UPDATE block_requests
                    SET {', '.join(updates)}
                    WHERE request_id = %s
                      AND request_status = 'PENDING'
                      AND UPPER(COALESCE(review_status, 'PENDING')) = %s
                    """,
                    params,
                )
                require_one_updated_row(cursor, "The requisition changed before editing; reload and retry.")
            if payload.work is not None:
                if row[4] is None:
                    raise HTTPException(status_code=409, detail="The requisition has no matching task to edit.")
                cursor.execute(
                    "UPDATE maintenance_tasks SET description = %s WHERE task_id = %s",
                    (payload.work, row[4]),
                )
                require_one_updated_row(cursor, "The requisition task changed before editing; reload and retry.")
            conn.commit()

        return {
            "status": "success",
            "message": "Block request updated successfully",
            "request_id": request_id,
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Unable to update the requisition.")
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
        row = _load_request_for_action(cursor, request_id)
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = (row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be cancelled (current status: {req_status})",
            )

        _require_request_department(row, user, "cancel")

        cursor.execute(
            """
            UPDATE block_requests
            SET request_status = 'CANCELLED'
            WHERE request_id = %s
              AND request_status = 'PENDING'
              AND COALESCE(review_status, 'PENDING') IN ('PENDING', 'PENDING_REVIEW', 'REWORK')
            """,
            (request_id,),
        )
        require_one_updated_row(cursor, "The requisition changed before cancellation; reload and retry.")
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
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Unable to cancel the requisition.")
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

@router.post("/{request_id}/approve", dependencies=[Depends(require_permission("planner.approve"))])
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
        row = _load_request_for_action(cursor, request_id)
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = (row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be approved for optimization (current status: {req_status})",
            )

        _require_request_department(row, user, "approve")
        reviewer_id = resolve_approval_reviewer_id(cursor, user)

        cursor.execute(
            """
            UPDATE block_requests
            SET
                review_status = 'APPROVED',
                reviewed_by = %s,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
              AND request_status = 'PENDING'
              AND COALESCE(review_status, 'PENDING') IN ('PENDING', 'PENDING_REVIEW', 'REWORK')
            """,
            (reviewer_id, request_id),
        )
        require_one_updated_row(cursor, "The requisition changed before approval; reload and retry.")
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
    except Exception as exc:
        safe_message, sqlstate = _safe_requisition_error_details(exc)
        logger.error(
            "Failed to approve requisition (exception_class=%s sqlstate=%s message=%s)",
            type(exc).__name__,
            sqlstate or "unavailable",
            safe_message,
        )
        conn.rollback()
        raise HTTPException(status_code=500, detail="Unable to approve the requisition.")
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
@router.post("/{request_id}/rework", dependencies=[Depends(require_permission("planner.rework"))])
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
        row = _load_request_for_action(cursor, request_id)

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Block request not found",
            )

        req_status = (row[1] or "").upper()

        # Rework is only valid while a request remains in the review queue.
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot rework request in status {req_status}",
            )

        prior_review_status = str(row[2] or "PENDING").strip().upper()
        if prior_review_status not in REWORKABLE_REVIEW_STATES:
            raise HTTPException(
                status_code=409,
                detail="The requisition is no longer in a reworkable review state.",
            )

        _require_request_department(row, user, "rework")
        reviewer_id = require_reviewer_id(user)

        cursor.execute(
            """
            UPDATE block_requests
            SET
                request_status = 'PENDING',
                review_status = 'REWORK',
                reviewed_by = %s,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
              AND request_status = 'PENDING'
              AND COALESCE(review_status, 'PENDING') = %s
            """,
            (
                reviewer_id,
                request_id,
                prior_review_status,
            ),
        )

        require_one_updated_row(cursor, "The requisition changed before rework; reload and retry.")
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

    except Exception:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to send the requisition for rework.",
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


@router.post("/{request_id}/reject", dependencies=[Depends(require_permission("planner.reject"))])
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
        row = _load_request_for_action(cursor, request_id)
        if not row:
            raise HTTPException(status_code=404, detail="Block request not found")

        req_status = str(row[1] or "").upper()
        if req_status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"Only PENDING requests can be rejected (current status: {req_status})",
            )

        _require_request_department(row, user, "reject")
        reviewer_id = require_reviewer_id(user)

        cursor.execute(
            """
            UPDATE block_requests
            SET
                request_status = 'REJECTED',
                rejection_reason = %s,
                reviewed_by = %s,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE request_id = %s
              AND request_status = 'PENDING'
              AND COALESCE(review_status, 'PENDING') IN ('PENDING', 'PENDING_REVIEW', 'REWORK')
            """,
            (payload.reason, reviewer_id, request_id),
        )
        require_one_updated_row(cursor, "The requisition changed before rejection; reload and retry.")
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
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Unable to reject the requisition.")
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
        body_dept = canonical_department_code(request.dept)
        user_dept = canonical_department_code(user.dept)
        if not user_dept or (request.dept.strip() and body_dept != user_dept):
            raise RBACForbiddenException(
                required=f"department.{user.dept}",
                role=user.role_id,
                detail="You may only raise requisitions for your own department",
            )
        department = user_dept
    else:
        department = canonical_department_code(request.dept)
        if not department:
            raise HTTPException(status_code=400, detail=f"Invalid department: {request.dept}")

    conn = get_connection()
    if not conn:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. The requisition was not saved; reconnect and try again.",
        )

    cursor = None
    try:
        cursor = conn.cursor()

        requester_name = user.name or user.title or "Authenticated role"
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

        team_id = TEAM_IDS.get(department)

        if not team_id:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid department: {request.dept}"
            )


        # =====================================================
        # 3. DEPARTMENT → DEPARTMENT TABLE
        # =====================================================

        department_id = DEPARTMENT_IDS.get(department)

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

        # Resolve only against persisted corridor metadata. Repository labels
        # conflict, so a hard-coded alias could silently target the wrong line.
        cursor.execute(
            """
            SELECT corridor_id, section_id
            FROM corridor_sections
            WHERE section_id = %s OR section_name = %s
            LIMIT 1
            """,
            (section, section),
        )
        section_row = cursor.fetchone()
        corridor_id = section_row[0] if section_row else None
        resolved_section_id = section_row[1] if section_row else None

        if not corridor_id:
            cursor.execute(
                "SELECT corridor_id FROM corridors WHERE corridor_id = %s LIMIT 1",
                (section,),
            )
            corridor_row = cursor.fetchone()
            corridor_id = corridor_row[0] if corridor_row else None


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

        section_id = resolved_section_id or resolve_section_id(cursor, section, corridor_id)


        # =====================================================
        # 8. RESOLVE REQUESTING USER
        # =====================================================

        # CurrentUser currently has a role identity only. Never resolve an
        # individual users.user_id from a display name or client-supplied value.
        requested_by_user_id = resolve_user_id(cursor, user)


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

        # Random identifiers avoid the SELECT MAX/latest-then-increment race.
        # Keep the existing prefixes and short VARCHAR-compatible lengths.
        task_id, request_id = generate_requisition_ids()


        # =====================================================
        # 17. GENERATE REQUEST ID
        # =====================================================



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
                created_by,
                criticality,
                safety_risk,
                review_status
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
                %s
            )
            RETURNING request_id, request_status, review_status, submitted_date
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
                criticality_level,
                safety_risk,
                "PENDING",
            )
        )

        persisted_request = cursor.fetchone()
        if not persisted_request:
            raise HTTPException(
                status_code=500,
                detail="The requisition insert did not return a persisted record.",
            )

        persisted_request_id, persisted_request_status, persisted_review_status, persisted_submitted_date = persisted_request
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
            # submitted_date is a DATE in the live schema, not a timestamp.
            "created_at": persisted_submitted_date.isoformat() if persisted_submitted_date else None,
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
                "created_at": persisted_submitted_date.isoformat() if persisted_submitted_date else None,
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

    except Exception as exc:

        safe_message, sqlstate = _safe_requisition_error_details(exc)
        logger.error(
            "Failed to save requisition (exception_class=%s sqlstate=%s message=%s)",
            type(exc).__name__,
            sqlstate or "unavailable",
            safe_message,
        )

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to save the requisition. Please retry or contact support."
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
