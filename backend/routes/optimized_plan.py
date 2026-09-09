from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
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
        password=os.getenv("DB_PASSWORD"),
        row_factory=dict_row
    )

@router.get("/")
def get_optimized_plan():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM optimized_blocks
        ORDER BY block_date, start_time
    """)
    blocks = cursor.fetchall()
    
    # fetch train impacts
    cursor.execute("""
        SELECT bti.block_id, t.train_number, t.train_name, t.train_type, t.arrival_time, t.departure_time, t.operational_priority, bti.estimated_delay_min
        FROM block_train_impact bti
        JOIN trains t ON bti.train_id = t.train_id
    """)
    impacts = cursor.fetchall()

    # fetch tasks
    cursor.execute("""
        SELECT bt.block_id, mt.task_id, mt.department, mt.task_type
        FROM block_tasks bt
        JOIN maintenance_tasks mt ON bt.task_id = mt.task_id
    """)
    tasks = cursor.fetchall()

    cursor.close()
    conn.close()
    
    impacts_by_block = {}
    for imp in impacts:
        if imp['block_id'] not in impacts_by_block:
            impacts_by_block[imp['block_id']] = []
        impacts_by_block[imp['block_id']].append(imp)
        
    tasks_by_block = {}
    for t in tasks:
        if t['block_id'] not in tasks_by_block:
            tasks_by_block[t['block_id']] = []
        tasks_by_block[t['block_id']].append(t)

    formatted_blocks = []
    for block in blocks:
        block_dict = {k: str(v) if v is not None else None for k, v in block.items()}
        block_dict['conflicts'] = []
        for imp in impacts_by_block.get(block['block_id'], []):
            block_dict['conflicts'].append({k: str(v) if v is not None else None for k, v in imp.items()})
            
        block_dict['tasks'] = []
        for t in tasks_by_block.get(block['block_id'], []):
            block_dict['tasks'].append({k: str(v) if v is not None else None for k, v in t.items()})
            
        formatted_blocks.append(block_dict)

    return {
        "status": "success",
        "block_count": len(formatted_blocks),
        "blocks": formatted_blocks
    }

class BlockApprovalRequest(BaseModel):
    approved_by: str

@router.post("/{block_id}/approve")
def approve_block(block_id: str, request: BlockApprovalRequest):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT block_id, block_status FROM optimized_blocks WHERE block_id = %s", (block_id,))
        block = cursor.fetchone()
        if not block:
            raise HTTPException(status_code=404, detail="Optimized block not found")
        if block['block_status'] == "APPROVED":
            raise HTTPException(status_code=400, detail="Block is already approved")
            
        cursor.execute("""
            UPDATE optimized_blocks
            SET block_status = 'APPROVED'
            WHERE block_id = %s
        """, (block_id,))
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/{block_id}/reject")
def reject_block(block_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT block_id, block_status FROM optimized_blocks WHERE block_id = %s", (block_id,))
        block = cursor.fetchone()
        if not block:
            raise HTTPException(status_code=404, detail="Optimized block not found")
            
        cursor.execute("""
            UPDATE optimized_blocks
            SET block_status = 'REJECTED'
            WHERE block_id = %s
        """, (block_id,))
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/{block_id}/rework")
def rework_block(block_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT block_id, block_status FROM optimized_blocks WHERE block_id = %s", (block_id,))
        block = cursor.fetchone()
        if not block:
            raise HTTPException(status_code=404, detail="Optimized block not found")
            
        cursor.execute("""
            UPDATE optimized_blocks
            SET block_status = 'REWORK'
            WHERE block_id = %s
        """, (block_id,))
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()