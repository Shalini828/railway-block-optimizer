from fastapi import APIRouter
import importlib
import sys
import time

router = APIRouter(
    prefix="/optimization",
    tags=["Optimization"]
)

# Store latest successful result
_last_successful_result = None


def format_block(block):
    """
    Convert optimizer output into frontend-safe JSON.
    """

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


@router.post("/")
def run_optimization():

    global _last_successful_result

    start_time = time.time()

    try:

        module_name = "logic.block_optimizer"

        # --------------------------------------------------
        # ALWAYS REFRESH THE OPTIMIZER
        #
        # block_optimizer.py reads the database when it loads.
        # Therefore we must reload it when the user clicks
        # "Run Optimization".
        # --------------------------------------------------

        if module_name in sys.modules:

            optimizer = importlib.reload(
                sys.modules[module_name]
            )

        else:

            optimizer = importlib.import_module(
                module_name
            )

        # --------------------------------------------------
        # READ OPTIMIZER RESULTS
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
        # FORMAT BLOCKS
        # --------------------------------------------------

        blocks = [
            format_block(block)
            for block in optimized_blocks
        ]

        requests_processed = len(requests)
        blocks_generated = len(blocks)

        # --------------------------------------------------
        # CALCULATE METRICS
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
        # SUCCESSFUL OPTIMIZATION
        # --------------------------------------------------

        if requests_processed > 0 or blocks_generated > 0:

            _last_successful_result = {
                "status": "success",

                "message":
                    "Optimization completed successfully",

                "requests_processed":
                    requests_processed,

                "blocks_generated":
                    blocks_generated,

                "execution_time":
                    execution_time,

                "total_duration":
                    total_duration,

                "average_utilization":
                    round(
                        average_utilization,
                        2
                    ),

                "train_impact":
                    train_impact,

                "conflicts_avoided":
                    conflicts_avoided,

                "blocks":
                    blocks
            }

            return _last_successful_result

        # --------------------------------------------------
        # IF CURRENT RUN HAS ZERO BUT WE HAVE A PREVIOUS
        # SUCCESSFUL RESULT, RETURN THAT RESULT.
        # --------------------------------------------------

        if _last_successful_result is not None:

            return {
                **_last_successful_result,

                "message":
                    "Showing the latest successful optimization plan."
            }

        # --------------------------------------------------
        # ABSOLUTELY NO DATA
        # --------------------------------------------------

        return {
            "status": "success",

            "message":
                "No pending maintenance requests are available.",

            "requests_processed": 0,

            "blocks_generated": 0,

            "execution_time":
                execution_time,

            "total_duration": 0,

            "average_utilization": 0,

            "train_impact": 0,

            "conflicts_avoided": 0,

            "blocks": []
        }

    except Exception as e:

        return {
            "status": "error",

            "message": str(e),

            "requests_processed": 0,

            "blocks_generated": 0,

            "execution_time":
                round(
                    time.time() - start_time,
                    2
                ),

            "total_duration": 0,

            "average_utilization": 0,

            "train_impact": 0,

            "conflicts_avoided": 0,

            "blocks": []
        }