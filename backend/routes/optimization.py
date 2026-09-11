from fastapi import APIRouter
import importlib
import sys
import time
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/optimization",
    tags=["Optimization"]
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


def format_block(block):
    tasks = block.get("tasks", []) or []
    conflicts = block.get("train_conflicts", []) or []

    return {
        "block_id": str(
            block.get("block_id", "")
        ),
        "corridor": str(
            block.get(
                "corridor",
                block.get("corridor_id", "")
            )
        ),
        "date": str(
            block.get(
                "date",
                block.get("block_date", "")
            )
        ),
        "start": str(
            block.get(
                "start",
                block.get("start_time", "")
            )
        ),
        "end": str(
            block.get(
                "end",
                block.get("end_time", "")
            )
        ),
        "duration": float(
            block.get(
                "duration",
                block.get("duration_min", 0)
            ) or 0
        ),
        "utilization": float(
            block.get(
                "utilization",
                block.get("utilization_percent", 0)
            ) or 0
        ),
        "train_impact": float(
            block.get(
                "train_impact",
                block.get("train_impact_score", 0)
            ) or 0
        ),
        "number_of_tasks": len(tasks),
        "train_conflicts": len(conflicts)
    }


def get_saved_blocks():
    """
    Read the latest optimized blocks directly from PostgreSQL.
    """

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                ob.block_id,
                ob.corridor_id,
                ob.block_date,
                ob.start_time,
                ob.end_time,
                ob.duration_min,
                ob.utilization_percent,
                ob.train_impact_score
            FROM optimized_blocks ob
            ORDER BY
                ob.block_date,
                ob.start_time
        """)

        rows = cursor.fetchall()

        blocks = []

        for row in rows:
            blocks.append({
                "block_id": row[0],
                "corridor": row[1],
                "date": str(row[2]),
                "start": str(row[3]),
                "end": str(row[4]),
                "duration": float(row[5] or 0),
                "utilization": float(row[6] or 0),
                "train_impact": float(row[7] or 0),
                "number_of_tasks": 0,
                "train_conflicts": 0
            })

        return blocks

    finally:
        cursor.close()
        conn.close()


@router.post("/")
def run_optimization():

    start_time = time.time()

    try:

        # --------------------------------------------------
        # STEP 1
        # Check database BEFORE running optimizer
        # --------------------------------------------------

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*)
            FROM block_requests
            WHERE request_status = 'PENDING'
        """)

        pending_requests = cursor.fetchone()[0]

        cursor.close()
        conn.close()


        # --------------------------------------------------
        # STEP 2
        # If there are NO pending requests,
        # return the existing saved plan.
        #
        # IMPORTANT:
        # Do NOT reload block_optimizer.py here.
        # --------------------------------------------------

        if pending_requests == 0:

            saved_blocks = get_saved_blocks()

            execution_time = round(
                time.time() - start_time,
                2
            )

            total_duration = sum(
                block["duration"]
                for block in saved_blocks
            )

            average_utilization = (
                sum(
                    block["utilization"]
                    for block in saved_blocks
                ) / len(saved_blocks)
                if saved_blocks
                else 0
            )

            return {
                "status": "success",
                "message": (
                    "Showing the latest saved optimization plan."
                ),
                "requests_processed": 0,
                "blocks_generated": len(saved_blocks),
                "execution_time": execution_time,
                "total_duration": total_duration,
                "average_utilization": round(
                    average_utilization,
                    2
                ),
                "train_impact": sum(
                    block["train_impact"]
                    for block in saved_blocks
                ),
                "conflicts_avoided": 0,
                "blocks": saved_blocks
            }


        # --------------------------------------------------
        # STEP 3
        # Pending requests exist.
        # NOW run the optimizer.
        # --------------------------------------------------

        module_name = "logic.block_optimizer"

        if module_name in sys.modules:
            optimizer = importlib.reload(
                sys.modules[module_name]
            )
        else:
            optimizer = importlib.import_module(
                module_name
            )


        # --------------------------------------------------
        # STEP 4
        # Read optimizer output
        # --------------------------------------------------

        requests = getattr(
            optimizer,
            "requests",
            []
        ) or []

        optimized_blocks = getattr(
            optimizer,
            "optimized_blocks",
            []
        ) or []


        # --------------------------------------------------
        # STEP 5
        # Format blocks
        # --------------------------------------------------

        blocks = [
            format_block(block)
            for block in optimized_blocks
        ]


        requests_processed = len(requests)
        blocks_generated = len(blocks)


        # --------------------------------------------------
        # STEP 6
        # Metrics
        # --------------------------------------------------

        total_duration = sum(
            block["duration"]
            for block in blocks
        )

        average_utilization = (
            sum(
                block["utilization"]
                for block in blocks
            ) / blocks_generated
            if blocks_generated
            else 0
        )

        train_impact = sum(
            block["train_impact"]
            for block in blocks
        )

        conflicts_avoided = sum(
            block["train_conflicts"]
            for block in blocks
        )

        execution_time = round(
            time.time() - start_time,
            2
        )


        # --------------------------------------------------
        # STEP 7
        # Return newly generated plan
        # --------------------------------------------------

        return {
            "status": "success",
            "message": (
                "Optimization completed successfully"
            ),
            "requests_processed": requests_processed,
            "blocks_generated": blocks_generated,
            "execution_time": execution_time,
            "total_duration": total_duration,
            "average_utilization": round(
                average_utilization,
                2
            ),
            "train_impact": train_impact,
            "conflicts_avoided": conflicts_avoided,
            "blocks": blocks
        }


    except Exception as e:

        return {
            "status": "error",
            "message": str(e),
            "requests_processed": 0,
            "blocks_generated": 0,
            "execution_time": round(
                time.time() - start_time,
                2
            ),
            "total_duration": 0,
            "average_utilization": 0,
            "train_impact": 0,
            "conflicts_avoided": 0,
            "blocks": []
        }