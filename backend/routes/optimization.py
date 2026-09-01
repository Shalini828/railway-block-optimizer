from fastapi import APIRouter
import importlib
import sys

router = APIRouter(
    prefix="/optimization",
    tags=["Optimization"]
)


@router.post("/")
def run_optimization():

    try:

        module_name = "logic.block_optimizer"

        if module_name in sys.modules:
            optimizer = importlib.reload(
                sys.modules[module_name]
            )
        else:
            optimizer = importlib.import_module(
                module_name
            )

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

        return {
            "status": "success",
            "message": "Optimization completed successfully",
            "requests_processed": len(requests),
            "blocks_generated": len(optimized_blocks),

            "blocks": [
                {
                    "block_id": block["block_id"],
                    "corridor": block["corridor"],
                    "date": str(block["date"]),
                    "start": str(block["start"]),
                    "end": str(block["end"]),
                    "duration": block["duration"],
                    "utilization": block["utilization"],
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
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }