from fastapi import APIRouter, Depends, HTTPException

import importlib
import sys
import time
import psycopg
import os
import io
from threading import Lock
from contextlib import redirect_stdout
from dotenv import load_dotenv

from auth.security import require_permission
from logic.optimization_eligibility import (
    EligibleRequestSetChanged,
    OPTIMIZATION_ELIGIBLE_STATUS,
    count_eligible_requests,
)
from logic.ir_abps_pipeline import InfeasibleOptimizationError

load_dotenv()


router = APIRouter(
    prefix="/optimization",
    tags=["Optimization"]
)


from db_config import DB_CONFIG


_last_db_failure_time = 0.0
_optimization_run_lock = Lock()


def get_connection():
    global _last_db_failure_time
    if time.time() - _last_db_failure_time < 15.0:
        return None
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        _last_db_failure_time = time.time()
        return None


def format_block(block):
    tasks = block.get("tasks", []) or []
    conflicts = block.get("train_conflicts", []) or []
    conflict_count = (
        conflicts
        if isinstance(conflicts, int)
        else len(conflicts)
    )

    def safe_float(value):
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    return {
        "block_id": str(block.get("block_id", "")),
        "corridor": str(
            block.get("corridor", block.get("corridor_id", ""))
        ),
        "date": str(
            block.get("date", block.get("block_date", ""))
        ),
        "start": str(
            block.get("start", block.get("start_time", ""))
        ),
        "end": str(
            block.get("end", block.get("end_time", ""))
        ),
        "duration": safe_float(
            block.get("duration", block.get("duration_min", 0))
        ),
        "utilization": safe_float(
            block.get("utilization", block.get("utilization_percent", 0))
        ),
        "train_impact": safe_float(
            block.get("train_impact", block.get("train_impact_score", 0))
        ),
        "train_impact_score": safe_float(
            block.get("train_impact_score", block.get("train_impact", 0))
        ),
        "estimated_delay": safe_float(
            block.get("estimated_delay", block.get("estimated_delay_min", 0))
        ),
        "number_of_tasks": int(
            block.get("number_of_tasks", len(tasks)) or 0
        ),
        "train_conflicts": int(
            block.get("train_conflicts_count", conflict_count) or 0
        ),
        "conflict_count": int(
            block.get("conflict_count", conflict_count) or 0
        ),

        # Preserve the optimizer's decision evidence.
        "optimization_score": safe_float(block.get("optimization_score", 0)),
        "maintenance_priority": safe_float(block.get("maintenance_priority", 0)),
        "asset_risk_score": safe_float(block.get("asset_risk_score", 0)),
        "traffic_impact_score": safe_float(block.get("traffic_impact_score", 0)),
        "goods_impact_score": safe_float(block.get("goods_impact_score", 0)),
        "consolidation_score": safe_float(block.get("consolidation_score", 0)),
        "ai_decision_confidence": block.get("ai_decision_confidence"),
        "ai_reasons": block.get("ai_reasons") or [],
        "ai_explanation": block.get("ai_explanation"),
        "reason": block.get("reason") or block.get("optimization_reason"),
        "cluster_id": block.get("cluster_id"),
        "request_ids": block.get("request_ids") or [str(task[0]) for task in tasks if task],
        "departments": block.get("departments") or [],
        "cross_department_cluster": bool(block.get("cross_department_cluster", False)),
        "cluster_reasons": block.get("cluster_reasons") or [],
        "candidate_windows_evaluated": block.get("candidate_windows_evaluated"),
        "candidate_windows_rejected_for_train_conflict": block.get("candidate_windows_rejected_for_train_conflict"),
        "timetable_verified": block.get("timetable_verified"),
    }



def get_saved_blocks():
    """
    Read the latest optimized blocks directly from PostgreSQL.

    This is a read-only reconstruction of the saved engine result.
    It preserves the AI decision fields so the frontend can explain
    why each block was selected.
    """

    conn = get_connection()
    if not conn:
        return []

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
                ob.train_impact_score,
                COALESCE(SUM(bti.estimated_delay_min), 0) AS estimated_delay_min,
                ob.optimization_score,
                ob.number_of_tasks,
                ob.maintenance_priority,
                ob.asset_risk_score,
                ob.traffic_impact_score,
                ob.goods_impact_score,
                ob.consolidation_score,
                ob.ai_decision_confidence,
                ob.ai_reasons,
                ob.ai_explanation,
                ob.optimization_reason,
                COUNT(DISTINCT bti.train_id) AS train_conflict_count
            FROM optimized_blocks ob
            LEFT JOIN block_train_impact bti
                ON bti.block_id = ob.block_id
            GROUP BY
                ob.block_id,
                ob.corridor_id,
                ob.block_date,
                ob.start_time,
                ob.end_time,
                ob.duration_min,
                ob.utilization_percent,
                ob.train_impact_score,
                ob.optimization_score,
                ob.number_of_tasks,
                ob.maintenance_priority,
                ob.asset_risk_score,
                ob.traffic_impact_score,
                ob.goods_impact_score,
                ob.consolidation_score,
                ob.ai_decision_confidence,
                ob.ai_reasons,
                ob.ai_explanation,
                ob.optimization_reason
            ORDER BY
                ob.block_date,
                ob.start_time
        """)

        rows = cursor.fetchall()
        if not rows:
            return []

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
                "train_impact_score": float(row[7] or 0),
                "estimated_delay": float(row[8] or 0),
                "number_of_tasks": int(row[10] or 0),
                "train_conflicts": int(row[20] or 0),
                "conflict_count": int(row[20] or 0),

                # AI decision fields
                "optimization_score": float(row[9] or 0),
                "maintenance_priority": float(row[11] or 0),
                "asset_risk_score": float(row[12] or 0),
                "traffic_impact_score": float(row[13] or 0),
                "goods_impact_score": float(row[14] or 0),
                "consolidation_score": float(row[15] or 0),
                "ai_decision_confidence": row[16],
                "ai_reasons": row[17],
                "ai_explanation": row[18],
                "reason": row[19],
            })

        return blocks

    except Exception:
        return []

    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass


def get_saved_request_count():
    """
    Count distinct BDMS requests represented in the persisted optimized plan.
    This is the authoritative demand/request metric for the saved-plan path.
    """

    conn = get_connection()
    if not conn:
        return 0

    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT COUNT(DISTINCT br.request_id)
            FROM block_requests br
            JOIN block_tasks bt
                ON bt.task_id = br.task_id
            JOIN optimized_blocks ob
                ON ob.block_id = bt.block_id
        """)

        row = cursor.fetchone()
        count = int((row[0] if row else 0) or 0)
        return count

    except Exception:
        return 0

    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if conn:
            try: conn.close()
            except Exception: pass



def _time_to_minutes(value):
    """Convert PostgreSQL time/string values to minutes since midnight."""
    if value is None:
        return 0

    if hasattr(value, "hour") and hasattr(value, "minute"):
        return (
            int(value.hour) * 60
            + int(value.minute)
            + int(getattr(value, "second", 0)) / 60
        )

    text = str(value).strip()
    if not text:
        return 0

    parts = text.split(":")
    try:
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        seconds = float(parts[2]) if len(parts) > 2 else 0
        return hours * 60 + minutes + seconds / 60
    except (ValueError, TypeError):
        return 0


def _pipeline_failure(status_counts, stage, message, details=None, *, prior_stages_completed=False):
    stage_order = [
        ("BDMS_INGESTION", "BDMS Ingestion"),
        ("CRITICALITY_SCORING", "Criticality Scoring"),
        ("SHADOW_CLUSTERING", "Cross-department clustering"),
        ("CORRIDOR_MATCHING", "Corridor and timetable matching"),
        ("MEGABLOCK_PERSISTENCE", "Megablock plan persistence"),
    ]
    stages = []
    failed_seen = False
    for stage_id, name in stage_order:
        if stage_id == stage:
            stages.append({"id": stage_id, "name": name, "status": "FAILED", "details": message, "evidence": details})
            failed_seen = True
        elif failed_seen:
            stages.append({"id": stage_id, "name": name, "status": "SKIPPED", "details": "An earlier stage failed."})
        elif not failed_seen and prior_stages_completed:
            stages.append({"id": stage_id, "name": name, "status": "COMPLETED", "details": "Completed before the reported failure."})
        else:
            stages.append({"id": stage_id, "name": name, "status": "NOT_VERIFIED", "details": "The engine did not return evidence that this stage completed."})
    return {
        "code": "OPTIMIZATION_INFEASIBLE",
        "status": "FAILED",
        "stage": stage,
        "message": message,
        "details": details,
        "status_counts": status_counts,
        "pipeline": {"stages": stages},
    }


def _run_optimization_locked():

    start_time = time.time()

    try:

        # --------------------------------------------------
        # STEP 1
        # Check database BEFORE running optimizer
        # --------------------------------------------------

        conn = get_connection()
        if not conn:
            raise HTTPException(
                status_code=503,
                detail="Optimization is unavailable because PostgreSQL could not be reached.",
            )

        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT request_status, COUNT(*)
                    FROM block_requests
                    GROUP BY request_status
                    ORDER BY request_status
                """)
                status_counts = {
                    str(status or "<NULL>"): int(count)
                    for status, count in cursor.fetchall()
                }
        except Exception as db_error:
            raise HTTPException(
                status_code=500,
                detail=f"Could not inspect requisition eligibility: {db_error}",
            ) from db_error
        finally:
            conn.close()

        pending_requests = count_eligible_requests(status_counts)
        if pending_requests == 0:
            counts = ", ".join(
                f"{status}: {count}" for status, count in status_counts.items()
            ) or "no block requests found"
            stages = [
                {"id": "BDMS_INGESTION", "name": "BDMS Ingestion", "status": "COMPLETED", "loaded": sum(status_counts.values()), "eligible": 0, "skipped": sum(status_counts.values()), "details": "No persisted PENDING requests were available."},
                *[{"id": stage_id, "name": name, "status": "SKIPPED", "details": "No eligible PENDING requests."} for stage_id, name in [("CRITICALITY_SCORING", "Criticality Scoring"), ("SHADOW_CLUSTERING", "Cross-department clustering"), ("CORRIDOR_MATCHING", "Corridor and timetable matching"), ("MEGABLOCK_PERSISTENCE", "Megablock plan persistence")]],
            ]
            raise HTTPException(
                status_code=409,
                detail={"code": "NO_ELIGIBLE_DEMANDS", "status": "NO_ELIGIBLE_DEMANDS", "message": ("No eligible demands: the optimizer only processes requests " f"whose request_status is {OPTIMIZATION_ELIGIBLE_STATUS}. Current request counts: {counts}. No statuses were changed."), "status_counts": status_counts, "demands_ingested": sum(status_counts.values()), "eligible_requests": 0, "pipeline": {"stages": stages}},
            )


        # --------------------------------------------------
        # STEP 3
        # Pending requests exist.
        # NOW run the optimizer.
        # --------------------------------------------------

        module_name = "logic.block_optimizer"
        requests = []
        optimized_blocks = []
        shadow_block_opportunities = []

        try:
            with redirect_stdout(io.StringIO()):
                if module_name in sys.modules:
                    optimizer = importlib.reload(
                        sys.modules[module_name]
                    )
                else:
                    optimizer = importlib.import_module(
                        module_name
                    )

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

            shadow_block_opportunities = getattr(
                optimizer,
                "shadow_block_opportunities",
                []
            ) or []
        except Exception as opt_err:
            if isinstance(opt_err, EligibleRequestSetChanged):
                raise HTTPException(
                    status_code=409,
                    detail=_pipeline_failure(status_counts, "BDMS_INGESTION", str(opt_err)),
                ) from opt_err
            if isinstance(opt_err, InfeasibleOptimizationError):
                raise HTTPException(status_code=422, detail=_pipeline_failure(status_counts, opt_err.stage, str(opt_err), opt_err.details, prior_stages_completed=True)) from opt_err
            raise HTTPException(
                status_code=500,
                detail=_pipeline_failure(status_counts, "OPTIMIZATION_ENGINE", f"Optimizer engine failed before returning verifiable stage results: {opt_err}"),
            ) from opt_err

        # --------------------------------------------------
        # STEP 5
        # Format blocks
        # --------------------------------------------------

        if not requests:
            raise HTTPException(
                status_code=409,
                detail=_pipeline_failure(status_counts, "BDMS_INGESTION", "The database check found eligible requests, but the optimizer ingestion returned no PENDING requests."),
            )
        if not optimized_blocks:
            raise HTTPException(
                status_code=422,
                detail=_pipeline_failure(status_counts, "MEGABLOCK_PERSISTENCE", "PENDING requests were found, but the optimizer produced no blocks. No success result was recorded."),
            )

        pipeline = getattr(optimizer, "pipeline_result", None)
        if not isinstance(pipeline, dict) or not pipeline.get("stages"):
            raise HTTPException(status_code=500, detail=_pipeline_failure(status_counts, "MEGABLOCK_PERSISTENCE", "Optimizer did not return verifiable stage results."))
        if not all(stage.get("status") == "COMPLETED" for stage in pipeline["stages"]):
            raise HTTPException(status_code=500, detail=_pipeline_failure(status_counts, "MEGABLOCK_PERSISTENCE", "Optimizer returned an incomplete pipeline result."))
        persistence_stage = pipeline["stages"][-1]
        if persistence_stage.get("transaction_committed") is not True:
            raise HTTPException(status_code=500, detail=_pipeline_failure(status_counts, "MEGABLOCK_PERSISTENCE", "The optimizer did not confirm its plan transaction was committed."))

        blocks = [
            format_block(block) if isinstance(block, dict) and "tasks" in block else block
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
            )
            / blocks_generated
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
            "is_demo": False,
            "data_source": "POSTGRESQL",

            "message": (
                "Optimization completed successfully"
            ),

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

            "run_metrics": {
                "total_block_minutes": round(total_duration, 2),
                "average_utilization": round(average_utilization, 2),
                "average_optimization_score": round(
                    sum(
                        block.get("optimization_score", 0)
                        for block in blocks
                    ) / blocks_generated,
                    2
                ) if blocks_generated else 0,
                "total_train_impact": round(train_impact, 2),
                "total_train_conflicts": int(conflicts_avoided),
                "compute_time_seconds": execution_time,
                "execution_latency_seconds": execution_time,
                "downtime_saved_min": pipeline.get("metrics", {}).get("downtime_saved_min"),
                "train_delays_min": pipeline.get("metrics", {}).get("train_delays_min"),
                "path_conflicts": pipeline.get("metrics", {}).get("path_conflicts"),
            },

            "blocks":
                blocks,

            "pipeline": pipeline,
            "warnings": pipeline.get("warnings", []),

            # ------------------------------------------
            # SHADOW BLOCK OPPORTUNITIES
            # ------------------------------------------

            "shadow_block_opportunities":
                shadow_block_opportunities
        }


    except HTTPException:
        raise
    except Exception as e:
        print(f"[OPTIMIZER] Unhandled error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Optimization failed: {e}",
        ) from e


@router.post(
    "/",
    dependencies=[Depends(require_permission("optimizer.run"))],
)
def run_optimization():
    if not _optimization_run_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=409,
            detail="An optimization run is already in progress. Wait for it to finish before retrying.",
        )
    try:
        return _run_optimization_locked()
    finally:
        _optimization_run_lock.release()
