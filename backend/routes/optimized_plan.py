from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row

from db_config import DB_CONFIG
from auth.security import (
    get_current_user,
    require_permission,
    CurrentUser,
    RBACForbiddenException,
    ENFORCE_CONTROLLER_REVIEW,
)
from auth.audit import (
    record_audit,
    record_review_event,
    get_block_review_summary,
    get_block_history,
)

router = APIRouter(
    prefix="/optimized-plan",
    tags=["Optimized Plan"]
)


def get_connection():
    return psycopg.connect(
        **DB_CONFIG,
        row_factory=dict_row
    )


# ============================================================
# GET ALL OPTIMIZED BLOCKS (WITH SCOPING & REVIEW SUMMARY)
# ============================================================

@router.get("/", dependencies=[Depends(require_permission("planner.view"))])
def get_optimized_plan(user: CurrentUser = Depends(get_current_user)):

    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            # ------------------------------------------------
            # Fetch optimized blocks
            # ------------------------------------------------
            cursor.execute("""
                SELECT
                    block_id,
                    corridor_id,
                    block_date,
                    start_time,
                    end_time,
                    duration_min,
                    utilization_percent,
                    train_impact_score,
                    optimization_score,
                    number_of_tasks,
                    number_of_departments,
                    block_status,
                    approved_by,
                    approved_at
                FROM optimized_blocks
                ORDER BY block_date, start_time
            """)

            blocks = cursor.fetchall()

            # ------------------------------------------------
            # Fetch train impacts
            # ------------------------------------------------
            cursor.execute("""
                SELECT
                    bti.block_id,
                    t.train_id,
                    t.train_number,
                    t.train_name,
                    t.train_type,
                    t.arrival_time,
                    t.departure_time,
                    t.operational_priority,
                    bti.estimated_delay_min
                FROM block_train_impact bti
                JOIN trains t
                    ON bti.train_id = t.train_id
            """)

            impacts = cursor.fetchall()

            # ------------------------------------------------
            # Fetch tasks belonging to blocks
            # ------------------------------------------------
            cursor.execute("""
                SELECT
                    bt.block_id,
                    mt.task_id,
                    mt.department,
                    mt.task_type,
                    mt.description,
                    mt.estimated_duration_min,
                    mt.priority_score
                FROM block_tasks bt
                JOIN maintenance_tasks mt
                    ON bt.task_id = mt.task_id
            """)

            tasks = cursor.fetchall()

        # ----------------------------------------------------
        # Group train impacts by block
        # ----------------------------------------------------
        impacts_by_block = {}

        for impact in impacts:
            block_id = impact["block_id"]

            if block_id not in impacts_by_block:
                impacts_by_block[block_id] = []

            impacts_by_block[block_id].append(
                {
                    key: str(value) if value is not None else None
                    for key, value in impact.items()
                }
            )

        # ----------------------------------------------------
        # Group tasks by block
        # ----------------------------------------------------
        tasks_by_block = {}

        for task in tasks:
            block_id = task["block_id"]

            if block_id not in tasks_by_block:
                tasks_by_block[block_id] = []

            tasks_by_block[block_id].append(
                {
                    key: str(value) if value is not None else None
                    for key, value in task.items()
                }
            )

        # ----------------------------------------------------
        # Format blocks for frontend (applying department scoping)
        # ----------------------------------------------------
        formatted_blocks = []

        for block in blocks:
            block_id = block["block_id"]
            all_block_tasks = tasks_by_block.get(block_id, [])

            if user.scope != "network":
                user_dept = (user.dept or "").upper()
                own_tasks = [
                    t for t in all_block_tasks
                    if (t.get("department") or "").upper() == user_dept
                ]
                # If block does not contain any of own department's tasks, skip it
                if not own_tasks:
                    continue

                processed_tasks = []
                for t in all_block_tasks:
                    if (t.get("department") or "").upper() == user_dept:
                        processed_tasks.append(t)
                    else:
                        # Other departments' tasks in shared blocks: return summary only
                        processed_tasks.append({
                            "department": t.get("department"),
                            "task_type": t.get("task_type"),
                            "estimated_duration_min": t.get("estimated_duration_min"),
                            "task_id": None,
                            "description": None,
                            "priority_score": None,
                        })

                own_task_count = len(own_tasks)
                is_own = (own_task_count == len(all_block_tasks))
            else:
                processed_tasks = all_block_tasks
                own_task_count = len(all_block_tasks)
                is_own = True

            block_dict = {
                key: str(value) if value is not None else None
                for key, value in block.items()
            }

            # Train impacts / conflicts
            block_dict["conflicts"] = impacts_by_block.get(
                block_id,
                []
            )

            # Maintenance tasks
            block_dict["tasks"] = processed_tasks

            # Useful frontend-friendly fields
            block_dict["train_conflicts"] = len(
                block_dict["conflicts"]
            )

            block_dict["task_count"] = len(
                block_dict["tasks"]
            )

            block_dict["own_task_count"] = own_task_count
            block_dict["is_own"] = is_own

            # Review status timeline summary
            block_dict["review"] = get_block_review_summary(block_id)

            formatted_blocks.append(block_dict)

        return {
            "status": "success",
            "block_count": len(formatted_blocks),
            "blocks": formatted_blocks,
            "scope": user.scope,
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch optimized plan: {str(e)}"
        )

    finally:
        conn.close()


# ============================================================
# APPROVAL MODEL
# ============================================================

class BlockApprovalRequest(BaseModel):
    approved_by: Optional[str] = None


# ============================================================
# APPROVE BLOCK (FINAL AUTHORIZATION — ADMIN ONLY)
# ============================================================

@router.post("/{block_id}/approve", dependencies=[Depends(require_permission("planner.approve"))])
def approve_block(
    block_id: str,
    request: Optional[BlockApprovalRequest] = None,
    user: CurrentUser = Depends(get_current_user),
):

    conn = get_connection()

    try:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    block_id,
                    block_status
                FROM optimized_blocks
                WHERE block_id = %s
                """,
                (block_id,)
            )

            block = cursor.fetchone()

            if not block:
                raise HTTPException(
                    status_code=404,
                    detail="Optimized block not found"
                )

            if block["block_status"] == "APPROVED":
                raise HTTPException(
                    status_code=400,
                    detail="Block is already approved"
                )

            # Check controller review endorsement (soft-gate)
            review_summary = get_block_review_summary(block_id)
            has_endorsement = review_summary.get("has_controller_endorsement", False)

            if not has_endorsement and ENFORCE_CONTROLLER_REVIEW:
                raise HTTPException(
                    status_code=409,
                    detail="Block has not yet been reviewed and endorsed by Chief Controller",
                )

            approver_identity = f"{user.name} ({user.title})"

            cursor.execute(
                """
                UPDATE optimized_blocks
                SET
                    block_status = 'APPROVED',
                    approved_by = %s,
                    approved_at = CURRENT_TIMESTAMP
                WHERE block_id = %s
                """,
                (
                    approver_identity,
                    block_id
                )
            )

        conn.commit()

        # Audit and review trail
        override_flag = not has_endorsement
        record_review_event(
            block_id=block_id,
            actor_role=user.role_id,
            actor_name=user.name,
            actor_dept=user.dept,
            action="ADMIN_APPROVED",
            note="Final block authorization approved",
            payload={"override_without_review": override_flag},
        )
        record_audit(
            actor_role=user.role_id,
            actor_name=user.name,
            method="POST",
            path=f"/optimized-plan/{block_id}/approve",
            action="BLOCK_APPROVE",
            target_type="block",
            target_id=block_id,
            outcome="SUCCESS",
            detail={"override_without_review": override_flag},
        )

        return {
            "status": "success",
            "message": "Block approved successfully",
            "block_id": block_id,
            "block_status": "APPROVED",
            "approved_by": approver_identity,
            "override_without_review": override_flag,
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
        conn.close()


# ============================================================
# REJECT BLOCK (FINAL REJECTION — ADMIN ONLY)
# ============================================================

@router.post("/{block_id}/reject", dependencies=[Depends(require_permission("planner.reject"))])
def reject_block(
    block_id: str,
    user: CurrentUser = Depends(get_current_user),
):

    conn = get_connection()

    try:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    block_id,
                    block_status
                FROM optimized_blocks
                WHERE block_id = %s
                """,
                (block_id,)
            )

            block = cursor.fetchone()

            if not block:
                raise HTTPException(
                    status_code=404,
                    detail="Optimized block not found"
                )

            cursor.execute(
                """
                UPDATE optimized_blocks
                SET block_status = 'REJECTED'
                WHERE block_id = %s
                """,
                (block_id,)
            )

        conn.commit()

        record_review_event(
            block_id=block_id,
            actor_role=user.role_id,
            actor_name=user.name,
            actor_dept=user.dept,
            action="ADMIN_REJECTED",
            note="Final authorization rejected",
        )
        record_audit(
            actor_role=user.role_id,
            actor_name=user.name,
            method="POST",
            path=f"/optimized-plan/{block_id}/reject",
            action="BLOCK_REJECT",
            target_type="block",
            target_id=block_id,
            outcome="SUCCESS",
        )

        return {
            "status": "success",
            "message": "Block rejected successfully",
            "block_id": block_id,
            "block_status": "REJECTED"
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
        conn.close()


# ============================================================
# SEND BLOCK FOR REWORK (ADMIN & CONTROL)
# ============================================================

@router.post("/{block_id}/rework", dependencies=[Depends(require_permission("planner.rework"))])
def rework_block(
    block_id: str,
    user: CurrentUser = Depends(get_current_user),
):

    conn = get_connection()

    try:

        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    block_id,
                    block_status
                FROM optimized_blocks
                WHERE block_id = %s
                """,
                (block_id,)
            )

            block = cursor.fetchone()

            if not block:
                raise HTTPException(
                    status_code=404,
                    detail="Optimized block not found"
                )

            cursor.execute(
                """
                UPDATE optimized_blocks
                SET block_status = 'REWORK'
                WHERE block_id = %s
                """,
                (block_id,)
            )

        conn.commit()

        action_name = "CONTROLLER_SENT_REWORK" if user.role_id == "control" else "ADMIN_SENT_REWORK"
        record_review_event(
            block_id=block_id,
            actor_role=user.role_id,
            actor_name=user.name,
            actor_dept=user.dept,
            action=action_name,
            note="Block sent back for rework/rescheduling",
        )
        record_audit(
            actor_role=user.role_id,
            actor_name=user.name,
            method="POST",
            path=f"/optimized-plan/{block_id}/rework",
            action="BLOCK_REWORK",
            target_type="block",
            target_id=block_id,
            outcome="SUCCESS",
        )

        return {
            "status": "success",
            "message": "Block marked for rework",
            "block_id": block_id,
            "block_status": "REWORK"
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
        conn.close()


# ============================================================
# CONTROLLER REVIEW DECISION (ENDORSE / RECOMMEND REWORK / RECOMMEND REJECT)
# ============================================================

class BlockReviewRequest(BaseModel):
    decision: str  # "ENDORSE" | "RECOMMEND_REWORK" | "RECOMMEND_REJECT"
    note: Optional[str] = None


@router.post("/{block_id}/review", dependencies=[Depends(require_permission("planner.review"))])
def review_block(
    block_id: str,
    request: BlockReviewRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Chief Controller (and Admin) human-in-the-loop review decision.
    Records endorsement, rework recommendation, or rejection recommendation.
    Does NOT mutate block_status directly.
    """
    decision_clean = request.decision.strip().upper()
    valid_decisions = {
        "ENDORSE": "CONTROLLER_ENDORSED",
        "RECOMMEND_REWORK": "CONTROLLER_RECOMMEND_REWORK",
        "RECOMMEND_REJECT": "CONTROLLER_RECOMMEND_REJECT",
    }
    if decision_clean not in valid_decisions:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid review decision '{request.decision}'. Expected one of: {list(valid_decisions.keys())}",
        )

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT block_id FROM optimized_blocks WHERE block_id = %s", (block_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Optimized block not found")

        action_name = valid_decisions[decision_clean]
        record_review_event(
            block_id=block_id,
            actor_role=user.role_id,
            actor_name=user.name,
            actor_dept=user.dept,
            action=action_name,
            note=request.note,
        )
        record_audit(
            actor_role=user.role_id,
            actor_name=user.name,
            method="POST",
            path=f"/optimized-plan/{block_id}/review",
            action="BLOCK_REVIEW",
            target_type="block",
            target_id=block_id,
            outcome="SUCCESS",
            detail={"decision": decision_clean, "note": request.note},
        )

        return {
            "status": "success",
            "message": f"Controller review decision '{decision_clean}' recorded successfully",
            "block_id": block_id,
            "decision": decision_clean,
        }
    finally:
        conn.close()


# ============================================================
# DEPARTMENT CHANGE REQUEST (ENGINEERING & TRACTION)
# ============================================================

class BlockChangeRequest(BaseModel):
    reason: str
    suggested_shift_min: Optional[int] = None


@router.post("/{block_id}/request-change", dependencies=[Depends(require_permission("planner.request_change"))])
def request_block_change(
    block_id: str,
    request: BlockChangeRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Department user requests rework/shift on a planned block containing their department's task.
    """
    if not request.reason or not request.reason.strip():
        raise HTTPException(status_code=422, detail="Change request reason is required")

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            user_dept = (user.dept or "").upper()
            cursor.execute("""
                SELECT bt.block_id
                FROM block_tasks bt
                JOIN maintenance_tasks mt ON bt.task_id = mt.task_id
                WHERE bt.block_id = %s AND UPPER(mt.department) = %s
            """, (block_id, user_dept))

            if not cursor.fetchone():
                raise RBACForbiddenException(
                    required=f"block.ownership.{user_dept}",
                    role=user.role_id,
                    detail="Cannot request changes on a block outside your department scope",
                )

        payload = {"suggested_shift_min": request.suggested_shift_min}
        record_review_event(
            block_id=block_id,
            actor_role=user.role_id,
            actor_name=user.name,
            actor_dept=user.dept,
            action="DEPT_CHANGE_REQUEST",
            note=request.reason,
            payload=payload,
        )
        record_audit(
            actor_role=user.role_id,
            actor_name=user.name,
            method="POST",
            path=f"/optimized-plan/{block_id}/request-change",
            action="BLOCK_CHANGE_REQUEST",
            target_type="block",
            target_id=block_id,
            outcome="SUCCESS",
            detail={"reason": request.reason, "suggested_shift_min": request.suggested_shift_min},
        )

        return {
            "status": "success",
            "message": "Department change request recorded successfully",
            "block_id": block_id,
        }
    finally:
        conn.close()


# ============================================================
# DEPARTMENT ACKNOWLEDGE SCHEDULE (ENGINEERING & TRACTION)
# ============================================================

@router.post("/{block_id}/acknowledge", dependencies=[Depends(require_permission("conflicts.acknowledge"))])
def acknowledge_block(
    block_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Department user acknowledges and accepts the scheduled maintenance window."""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            user_dept = (user.dept or "").upper()
            cursor.execute("""
                SELECT bt.block_id
                FROM block_tasks bt
                JOIN maintenance_tasks mt ON bt.task_id = mt.task_id
                WHERE bt.block_id = %s AND UPPER(mt.department) = %s
            """, (block_id, user_dept))

            if not cursor.fetchone():
                raise RBACForbiddenException(
                    required=f"block.ownership.{user_dept}",
                    role=user.role_id,
                    detail="Cannot acknowledge a block outside your department scope",
                )

        record_review_event(
            block_id=block_id,
            actor_role=user.role_id,
            actor_name=user.name,
            actor_dept=user.dept,
            action="DEPT_ACKNOWLEDGED",
            note="Block schedule acknowledged by department",
        )
        record_audit(
            actor_role=user.role_id,
            actor_name=user.name,
            method="POST",
            path=f"/optimized-plan/{block_id}/acknowledge",
            action="BLOCK_ACKNOWLEDGE",
            target_type="block",
            target_id=block_id,
            outcome="SUCCESS",
        )

        return {
            "status": "success",
            "message": "Block schedule acknowledged successfully",
            "block_id": block_id,
        }
    finally:
        conn.close()


# ============================================================
# GET BLOCK REVIEW & AUTHORIZATION TIMELINE HISTORY
# ============================================================

@router.get("/{block_id}/history", dependencies=[Depends(require_permission("planner.view"))])
def get_block_timeline(
    block_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Retrieve chronologically ordered review and authorization timeline for a block."""
    if user.scope != "network":
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                user_dept = (user.dept or "").upper()
                cursor.execute("""
                    SELECT bt.block_id
                    FROM block_tasks bt
                    JOIN maintenance_tasks mt ON bt.task_id = mt.task_id
                    WHERE bt.block_id = %s AND UPPER(mt.department) = %s
                """, (block_id, user_dept))

                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Block not found or outside domain")
        finally:
            conn.close()

    history = get_block_history(block_id)

    return {
        "status": "success",
        "block_id": block_id,
        "history": history,
    }