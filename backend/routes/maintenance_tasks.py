from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import psycopg
import os
from dotenv import load_dotenv

from auth.security import get_current_user, require_permission, CurrentUser, RBACForbiddenException

load_dotenv()

router = APIRouter(
    prefix="/maintenance-tasks",
    tags=["Maintenance Tasks"]
)


from db_config import DB_CONFIG


def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


FALLBACK_TASKS = [
    {
        "task_id": "TSK-TMS-001",
        "asset_id": "TRK-ENG-982",
        "department": "TMS",
        "task_type": "Corrective Maintenance",
        "description": "USFD flaw rectification – IMR rail fracture site",
        "created_date": "2026-08-15",
        "due_date": "2026-08-26",
        "estimated_duration_min": 180,
        "overdue_days": 11,
        "safety_risk": True,
        "task_status": "PENDING",
        "priority_score": 92.5,
        "priority_category": "CRITICAL",
    },
    {
        "task_id": "TSK-TDMS-002",
        "asset_id": "OHE-MAST-112",
        "department": "TDMS",
        "task_type": "Preventive Maintenance",
        "description": "OHE cantilever adjustment + hot spot repair",
        "created_date": "2026-08-16",
        "due_date": "2026-08-27",
        "estimated_duration_min": 120,
        "overdue_days": 6,
        "safety_risk": False,
        "task_status": "PENDING",
        "priority_score": 81.0,
        "priority_category": "HIGH",
    },
    {
        "task_id": "TSK-SMMS-003",
        "asset_id": "SIG-AXLE-401",
        "department": "SMMS",
        "task_type": "Overhaul",
        "description": "Axle counter + point machine overhaul",
        "created_date": "2026-08-17",
        "due_date": "2026-08-28",
        "estimated_duration_min": 120,
        "overdue_days": 3,
        "safety_risk": False,
        "task_status": "PENDING",
        "priority_score": 74.0,
        "priority_category": "MEDIUM",
    },
    {
        "task_id": "TSK-TMS-004",
        "asset_id": "TRK-ENG-774",
        "department": "TMS",
        "task_type": "Corrective Maintenance",
        "description": "Turnout sleeper renewal & tamping",
        "created_date": "2026-08-10",
        "due_date": "2026-08-24",
        "estimated_duration_min": 240,
        "overdue_days": 14,
        "safety_risk": True,
        "task_status": "PENDING",
        "priority_score": 95.0,
        "priority_category": "CRITICAL",
    },
    {
        "task_id": "TSK-SMMS-005",
        "asset_id": "SIG-CBL-102",
        "department": "SMMS",
        "task_type": "Inspection",
        "description": "Signaling cable meggering & route relay interlocking check",
        "created_date": "2026-08-20",
        "due_date": "2026-08-29",
        "estimated_duration_min": 90,
        "overdue_days": 1,
        "safety_risk": False,
        "task_status": "PENDING",
        "priority_score": 45.0,
        "priority_category": "LOW",
    },
    {
        "task_id": "TSK-TDMS-006",
        "asset_id": "OHE-ISO-044",
        "department": "TDMS",
        "task_type": "Testing",
        "description": "Isolator testing and contact wire height adjustment",
        "created_date": "2026-08-18",
        "due_date": "2026-08-28",
        "estimated_duration_min": 150,
        "overdue_days": 4,
        "safety_risk": False,
        "task_status": "PENDING",
        "priority_score": 68.0,
        "priority_category": "MEDIUM",
    },
]


# ==========================================
# GET ALL MAINTENANCE TASKS
# ==========================================

@router.get("/", dependencies=[Depends(require_permission("tasks.view"))])
def get_maintenance_tasks(user: CurrentUser = Depends(get_current_user)):
    conn = get_connection()
    if not conn:
        clean_dept = (user.dept or "").upper() if user and hasattr(user, "dept") else "ALL"
        raw_tasks = FALLBACK_TASKS
        if user and getattr(user, "scope", "network") != "network":
            raw_tasks = [
                t for t in FALLBACK_TASKS
                if t.get("department", "").upper() == clean_dept
            ]
        demo_tasks = [{**t, "is_demo": True, "data_source": "SYNTHETIC_DEMO"} for t in raw_tasks]
        return {
            "status": "success",
            "is_demo": True,
            "data_source": "SYNTHETIC_DEMO",
            "notice": "DEMO MODE: Synthetic Railway Test Data (PostgreSQL disconnected)",
            "task_count": len(demo_tasks),
            "tasks": demo_tasks,
        }

    cursor = conn.cursor()

    try:
        if user.scope != "network":
            cursor.execute("""
                SELECT
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
                FROM maintenance_tasks
                WHERE UPPER(department) = %s
                ORDER BY priority_score DESC NULLS LAST, task_id
            """, (user.dept.upper(),))
        else:
            cursor.execute("""
                SELECT
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
                FROM maintenance_tasks
                ORDER BY priority_score DESC NULLS LAST, task_id
            """)

        rows = cursor.fetchall()

        tasks = []

        for row in rows:
            tasks.append({
                "task_id": row[0],
                "asset_id": row[1],
                "department": row[2],
                "task_type": row[3],
                "description": row[4],
                "created_date": str(row[5]) if row[5] else None,
                "due_date": str(row[6]) if row[6] else None,
                "estimated_duration_min": row[7],
                "overdue_days": row[8],
                "safety_risk": row[9],
                "task_status": row[10],
                "priority_score": float(row[11]) if row[11] is not None else None,
                "priority_category": row[12]
            })

        return {
            "status": "success",
            "is_demo": False,
            "data_source": "POSTGRESQL",
            "task_count": len(tasks),
            "tasks": tasks
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass


# ==========================================
# UPDATE TASK STATUS
# ==========================================

class TaskStatusUpdate(BaseModel):
    task_status: str


@router.put("/{task_id}/status", dependencies=[Depends(require_permission("tasks.update"))])
def update_task_status(
    task_id: str,
    request: TaskStatusUpdate,
    user: CurrentUser = Depends(get_current_user)
):
    conn = get_connection()
    if not conn:
        for t in FALLBACK_TASKS:
            if t["task_id"] == task_id:
                t["task_status"] = request.task_status
                break
        return {
            "status": "success",
            "message": "Maintenance task status updated successfully (offline mode)",
            "task_id": task_id,
            "task_status": request.task_status
        }

    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT task_id, department
            FROM maintenance_tasks
            WHERE task_id = %s
        """, (task_id,))

        task = cursor.fetchone()

        if not task:
            raise HTTPException(
                status_code=404,
                detail="Maintenance task not found"
            )

        if user.scope != "network":
            task_dept = (task[1] or "").strip().upper()
            user_dept = (user.dept or "").strip().upper()
            if task_dept != user_dept:
                raise RBACForbiddenException(
                    required=f"department.{user.dept}",
                    role=user.role_id,
                    detail=f"Cannot update task belonging to another department ({task_dept})",
                )

        cursor.execute("""
            UPDATE maintenance_tasks
            SET task_status = %s
            WHERE task_id = %s
        """, (
            request.task_status,
            task_id
        ))

        conn.commit()

        return {
            "status": "success",
            "message": "Maintenance task status updated successfully",
            "task_id": task_id,
            "task_status": request.task_status
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
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass