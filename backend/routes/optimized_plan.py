from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row

from db_config import DB_CONFIG


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
# GET ALL OPTIMIZED BLOCKS
# ============================================================

@router.get("/")
def get_optimized_plan():

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
        # Format blocks for frontend
        # ----------------------------------------------------
        formatted_blocks = []

        for block in blocks:

            block_id = block["block_id"]

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
            block_dict["tasks"] = tasks_by_block.get(
                block_id,
                []
            )

            # Useful frontend-friendly fields
            block_dict["train_conflicts"] = len(
                block_dict["conflicts"]
            )

            block_dict["task_count"] = len(
                block_dict["tasks"]
            )

            formatted_blocks.append(block_dict)

        return {
            "status": "success",
            "block_count": len(formatted_blocks),
            "blocks": formatted_blocks
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
    approved_by: str


# ============================================================
# APPROVE BLOCK
# ============================================================

@router.post("/{block_id}/approve")
def approve_block(
    block_id: str,
    request: BlockApprovalRequest
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
                    request.approved_by,
                    block_id
                )
            )

        conn.commit()

        return {
            "status": "success",
            "message": "Block approved successfully",
            "block_id": block_id,
            "block_status": "APPROVED",
            "approved_by": request.approved_by
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
# REJECT BLOCK
# ============================================================

@router.post("/{block_id}/reject")
def reject_block(block_id: str):

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
# SEND BLOCK FOR REWORK
# ============================================================

@router.post("/{block_id}/rework")
def rework_block(block_id: str):

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

        return {
            "status": "success",
            "message": "Block sent for rework successfully",
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