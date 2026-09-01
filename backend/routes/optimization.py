from fastapi import APIRouter
import importlib
<<<<<<< HEAD
import sys
=======
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
>>>>>>> 8d385b8 (Connect frontend to optimization API)

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


@router.post("/")
def run_optimization():

    try:
<<<<<<< HEAD

        module_name = "logic.block_optimizer"

        if module_name in sys.modules:
            optimizer = importlib.reload(
                sys.modules[module_name]
            )
        else:
            optimizer = importlib.import_module(
                module_name
            )
=======
        # ==========================================
        # RUN OPTIMIZER
        # ==========================================

        optimizer = importlib.import_module(
            "logic.block_optimizer"
        )

        optimizer = importlib.reload(optimizer)
>>>>>>> 8d385b8 (Connect frontend to optimization API)

        optimized_blocks = getattr(
            optimizer,
            "optimized_blocks",
            []
        )

        requests = getattr(
            optimizer,
            "requests",
            []
        )

<<<<<<< HEAD
        return {
            "status": "success",
            "message": "Optimization completed successfully",
            "requests_processed": len(requests),
            "blocks_generated": len(optimized_blocks),

            "blocks": [
=======
        # ==========================================
        # BUILD FRONTEND-FRIENDLY BLOCK DATA
        # ==========================================

        conn = get_connection()
        cursor = conn.cursor()

        blocks = []

        for block in optimized_blocks:

            # --------------------------------------
            # REQUEST IDS
            # --------------------------------------

            request_ids = [
                request[0]
                for request in block["tasks"]
            ]

            # --------------------------------------
            # TASK IDS
            # --------------------------------------

            task_ids = [
                request[1]
                for request in block["tasks"]
            ]

            # --------------------------------------
            # DEPARTMENTS
            # --------------------------------------

            departments = []

            if task_ids:

                cursor.execute(
                    """
                    SELECT DISTINCT department
                    FROM maintenance_tasks
                    WHERE task_id = ANY(%s)
                    ORDER BY department
                    """,
                    (task_ids,)
                )

                departments = [
                    row[0]
                    for row in cursor.fetchall()
                ]

            # --------------------------------------
            # CORRIDOR DETAILS
            # --------------------------------------

            cursor.execute(
                """
                SELECT
                    corridor_name,
                    source_station,
                    destination_station
                FROM corridors
                WHERE corridor_id = %s
                """,
                (block["corridor"],)
            )

            corridor_data = cursor.fetchone()

            if corridor_data:

                corridor_name = corridor_data[0]
                source_station = corridor_data[1]
                destination_station = corridor_data[2]

            else:

                corridor_name = block["corridor"]
                source_station = block["corridor"]
                destination_station = ""

            # --------------------------------------
            # SAVED MINUTES
            # --------------------------------------

            requested_minutes = 0

            for request in block["tasks"]:

                requested_start = (
                    request[5].hour * 60
                    + request[5].minute
                )

                requested_end = (
                    request[6].hour * 60
                    + request[6].minute
                )

                if requested_end < requested_start:
                    requested_end += 1440

                requested_minutes += (
                    requested_end - requested_start
                )

            saved_minutes = max(
                0,
                requested_minutes - block["duration"]
            )

            # --------------------------------------
            # EXPECTED DELAY
            # --------------------------------------

            expected_delay = (
                len(block["train_conflicts"]) * 5
            )

            # --------------------------------------
            # BLOCK RESPONSE
            # --------------------------------------

            blocks.append(
>>>>>>> 8d385b8 (Connect frontend to optimization API)
                {
                    "block_id": block["block_id"],
                    "corridor": block["corridor"],
                    "corridor_name": corridor_name,
                    "source_station": source_station,
                    "destination_station": destination_station,

                    "date": str(block["date"]),
                    "start": str(block["start"]),
                    "end": str(block["end"]),
                    "duration": block["duration"],

                    "utilization": block["utilization"],
<<<<<<< HEAD
                    "train_impact": block.get("train_impact", 0),
                    "number_of_tasks": len(
                        block["tasks"]
                    ),
                    "train_conflicts": len(
                        block["train_conflicts"]
                    )
                }

                for block in optimized_blocks
            ]
=======
                    "train_impact": block["train_impact"],

                    "number_of_tasks": len(
                        block["tasks"]
                    ),

                    "number_of_departments": len(
                        departments
                    ),

                    "departments": departments,

                    "request_ids": request_ids,

                    "train_conflicts": block[
                        "train_conflicts"
                    ],

                    "saved_minutes": saved_minutes,
                    "expected_delay": expected_delay
                }
            )

        cursor.close()
        conn.close()

        # ==========================================
        # RESPONSE
        # ==========================================

        return {
            "status": "success",
            "message": "Optimization completed successfully",

            "requests_processed": len(requests),

            "blocks_generated": len(blocks),

            "blocks": blocks
>>>>>>> 8d385b8 (Connect frontend to optimization API)
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }