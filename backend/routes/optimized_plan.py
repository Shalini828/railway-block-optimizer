from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/optimized-plan",
    tags=["Optimized Plan"]
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


@router.get("/")
def get_optimized_plan():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM optimized_blocks
        ORDER BY 1
    """)

    rows = cursor.fetchall()

    # Get column names dynamically
    columns = [desc[0] for desc in cursor.description]

    cursor.close()
    conn.close()

    blocks = []

    for row in rows:
        block = {}

        for column, value in zip(columns, row):
            block[column] = str(value) if value is not None else None

        blocks.append(block)

    return {
        "status": "success",
        "block_count": len(blocks),
        "blocks": blocks
    }

# ==========================================
# APPROVE OPTIMIZED BLOCK
# ==========================================

class BlockApprovalRequest(BaseModel):
    approved_by: str


@router.post("/{block_id}/approve")
def approve_block(
    block_id: str,
    request: BlockApprovalRequest
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Check that the block exists
        cursor.execute("""
            SELECT block_id, block_status
            FROM optimized_blocks
            WHERE block_id = %s
        """, (block_id,))

        block = cursor.fetchone()

        if not block:
            raise HTTPException(
                status_code=404,
                detail="Optimized block not found"
            )

        # Prevent approving an already approved block
        if block[1] == "APPROVED":
            raise HTTPException(
                status_code=400,
                detail="Block is already approved"
            )

        # Approve the block
        cursor.execute("""
            UPDATE optimized_blocks
            SET
                block_status = 'APPROVED',
                approved_by = %s,
                approved_at = %s
            WHERE block_id = %s
        """, (
            request.approved_by,
            datetime.now(),
            block_id
        ))

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
        cursor.close()
        conn.close()