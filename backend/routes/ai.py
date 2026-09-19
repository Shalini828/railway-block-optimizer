from fastapi import APIRouter, HTTPException, Depends
import psycopg

from db_config import DB_CONFIG

from ml.predict_service import predict_asset_risk
from auth.security import require_permission, get_current_user, CurrentUser
from auth.permissions import is_network_scope, department_of
from auth.audit import record_audit


router = APIRouter(
    prefix="/ai",
    tags=["AI / ML"]
)


@router.get("/health")
def ai_health():
    return {
        "status": "ok",
        "service": "railway-ai-ml"
    }


@router.post("/test-prediction", dependencies=[Depends(require_permission("optimizer.simulate"))])
def test_prediction():
    asset = {
        "asset_id": "AST-TEST-001",
        "criticality": 5,
        "health_score": 42,
        "failure_risk": 78,
        "installation_date": "2008-01-15",
        "last_inspection_date": "2026-04-27"
    }

    defects = [
        {
            "severity": 5,
            "safety_impact": 5,
            "repeat_failure": True
        },
        {
            "severity": 4,
            "safety_impact": 4,
            "repeat_failure": False
        }
    ]

    history = [
        {
            "maintenance_type": "Corrective Maintenance",
            "failure_after_maintenance": True
        },
        {
            "maintenance_type": "Preventive Maintenance",
            "failure_after_maintenance": False
        }
    ]

    return predict_asset_risk(
        asset,
        defects,
        history
    )


@router.get("/assets/{asset_id}/risk", dependencies=[Depends(require_permission("ai.risk.view"))])
def get_asset_risk(
    asset_id: str,
    user: CurrentUser = Depends(get_current_user)
):

    connection = None

    try:
        connection = psycopg.connect(**DB_CONFIG)

        # =====================================================
        # GET ASSET
        # =====================================================

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    asset_id,
                    criticality,
                    health_score,
                    failure_risk,
                    installation_date,
                    last_inspection_date,
                    department
                FROM assets
                WHERE asset_id = %s
                """,
                (asset_id,)
            )

            row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Asset '{asset_id}' not found"
            )

        if not is_network_scope(user.role_id):
            dept = department_of(user.role_id)
            if row[6] != dept:
                raise HTTPException(
                    status_code=404,
                    detail=f"Asset '{asset_id}' not found"
                )

        asset = {
            "asset_id": row[0],
            "criticality": row[1],
            "health_score": row[2],
            "failure_risk": row[3],
            "installation_date": row[4],
            "last_inspection_date": row[5],
        }

        # =====================================================
        # GET DEFECTS
        # =====================================================

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    severity,
                    safety_impact,
                    repeat_failure
                FROM defects
                WHERE asset_id = %s
                """,
                (asset_id,)
            )

            defect_rows = cursor.fetchall()

        defects = [
            {
                "severity": row[0],
                "safety_impact": row[1],
                "repeat_failure": row[2],
            }
            for row in defect_rows
        ]

        # =====================================================
        # GET MAINTENANCE HISTORY
        # =====================================================

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    maintenance_type,
                    failure_after_maintenance
                FROM maintenance_history
                WHERE asset_id = %s
                """,
                (asset_id,)
            )

            history_rows = cursor.fetchall()

        maintenance_history = [
            {
                "maintenance_type": row[0],
                "failure_after_maintenance": row[1],
            }
            for row in history_rows
        ]

        # =====================================================
        # ML PREDICTION
        # =====================================================

        result = predict_asset_risk(
            asset=asset,
            defects=defects,
            maintenance_history=maintenance_history,
        )

        return result

    finally:

        if connection:
            connection.close()

@router.get("/assets/risk-ranking", dependencies=[Depends(require_permission("ai.risk.view"))])
def get_asset_risk_ranking(user: CurrentUser = Depends(get_current_user)):

    connection = None

    try:
        connection = psycopg.connect(**DB_CONFIG)

        # =====================================================
        # GET ALL ASSETS
        # =====================================================

        dept = department_of(user.role_id)
        is_dept = not is_network_scope(user.role_id) and bool(dept)

        with connection.cursor() as cursor:

            if is_dept:
                cursor.execute(
                    """
                    SELECT
                        asset_id,
                        criticality,
                        health_score,
                        failure_risk,
                        installation_date,
                        last_inspection_date
                    FROM assets
                    WHERE department = %s
                    ORDER BY asset_id
                    """,
                    (dept,)
                )
            else:
                cursor.execute(
                    """
                    SELECT
                        asset_id,
                        criticality,
                        health_score,
                        failure_risk,
                        installation_date,
                        last_inspection_date
                    FROM assets
                    ORDER BY asset_id
                    """
                )

            asset_rows = cursor.fetchall()

        results = []

        # =====================================================
        # PROCESS EACH ASSET
        # =====================================================

        for row in asset_rows:

            asset = {
                "asset_id": row[0],
                "criticality": row[1],
                "health_score": row[2],
                "failure_risk": row[3],
                "installation_date": row[4],
                "last_inspection_date": row[5],
            }

            asset_id = row[0]

            # -------------------------------------------------
            # DEFECTS
            # -------------------------------------------------

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT
                        severity,
                        safety_impact,
                        repeat_failure
                    FROM defects
                    WHERE asset_id = %s
                    """,
                    (asset_id,)
                )

                defect_rows = cursor.fetchall()

            defects = [
                {
                    "severity": defect[0],
                    "safety_impact": defect[1],
                    "repeat_failure": defect[2],
                }
                for defect in defect_rows
            ]

            # -------------------------------------------------
            # MAINTENANCE HISTORY
            # -------------------------------------------------

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT
                        maintenance_type,
                        failure_after_maintenance
                    FROM maintenance_history
                    WHERE asset_id = %s
                    """,
                    (asset_id,)
                )

                history_rows = cursor.fetchall()

            maintenance_history = [
                {
                    "maintenance_type": history[0],
                    "failure_after_maintenance": history[1],
                }
                for history in history_rows
            ]

            # -------------------------------------------------
            # ML PREDICTION
            # -------------------------------------------------

            prediction = predict_asset_risk(
                asset=asset,
                defects=defects,
                maintenance_history=maintenance_history,
            )

            results.append(prediction)

        # =====================================================
        # SORT BY RISK
        # =====================================================

        results.sort(
            key=lambda x: x["risk_score"],
            reverse=True
        )

        # =====================================================
        # ADD RANK
        # =====================================================

        for index, result in enumerate(
            results,
            start=1
        ):
            result["priority_rank"] = index

        return {
            "total_assets": len(results),
            "assets": results,
        }

    finally:

        if connection:
            connection.close()


@router.get("/tasks/priority-ranking", dependencies=[Depends(require_permission("ai.risk.view"))])
def get_task_priority_ranking(user: CurrentUser = Depends(get_current_user)):

    connection = None

    try:
        connection = psycopg.connect(**DB_CONFIG)

        dept = department_of(user.role_id)
        is_dept = not is_network_scope(user.role_id) and bool(dept)

        with connection.cursor() as cursor:

            if is_dept:
                cursor.execute(
                    """
                    SELECT
                        task_id,
                        asset_id,
                        department,
                        task_type,
                        description,
                        due_date,
                        estimated_duration_min,
                        overdue_days,
                        safety_risk,
                        priority_score,
                        priority_category,
                        task_status
                    FROM maintenance_tasks
                    WHERE task_status NOT IN (
                        'COMPLETED',
                        'CANCELLED'
                    )
                    AND department = %s
                    ORDER BY task_id
                    """,
                    (dept,)
                )
            else:
                cursor.execute(
                    """
                    SELECT
                        task_id,
                        asset_id,
                        department,
                        task_type,
                        description,
                        due_date,
                        estimated_duration_min,
                        overdue_days,
                        safety_risk,
                        priority_score,
                        priority_category,
                        task_status
                    FROM maintenance_tasks
                    WHERE task_status NOT IN (
                        'COMPLETED',
                        'CANCELLED'
                    )
                    ORDER BY task_id
                    """
                )

            task_rows = cursor.fetchall()

        results = []

        for row in task_rows:

            task_id = row[0]
            asset_id = row[1]

            # -------------------------------------------------
            # GET AI RISK FOR THIS ASSET
            # -------------------------------------------------

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT
                        asset_id,
                        criticality,
                        health_score,
                        failure_risk,
                        installation_date,
                        last_inspection_date
                    FROM assets
                    WHERE asset_id = %s
                    """,
                    (asset_id,)
                )

                asset_row = cursor.fetchone()

            if asset_row is None:
                continue

            asset = {
                "asset_id": asset_row[0],
                "criticality": asset_row[1],
                "health_score": asset_row[2],
                "failure_risk": asset_row[3],
                "installation_date": asset_row[4],
                "last_inspection_date": asset_row[5],
            }

            # -------------------------------------------------
            # DEFECTS
            # -------------------------------------------------

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT
                        severity,
                        safety_impact,
                        repeat_failure
                    FROM defects
                    WHERE asset_id = %s
                    """,
                    (asset_id,)
                )

                defect_rows = cursor.fetchall()

            defects = [
                {
                    "severity": d[0],
                    "safety_impact": d[1],
                    "repeat_failure": d[2],
                }
                for d in defect_rows
            ]

            # -------------------------------------------------
            # MAINTENANCE HISTORY
            # -------------------------------------------------

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT
                        maintenance_type,
                        failure_after_maintenance
                    FROM maintenance_history
                    WHERE asset_id = %s
                    """,
                    (asset_id,)
                )

                history_rows = cursor.fetchall()

            maintenance_history = [
                {
                    "maintenance_type": h[0],
                    "failure_after_maintenance": h[1],
                }
                for h in history_rows
            ]

            # -------------------------------------------------
            # ML PREDICTION
            # -------------------------------------------------

            prediction = predict_asset_risk(
                asset=asset,
                defects=defects,
                maintenance_history=maintenance_history,
            )

            # -------------------------------------------------
            # COMBINE TASK + AI RISK
            # -------------------------------------------------

            base_priority = float(
                row[9] or 0
            )

            ai_risk = float(
                prediction["risk_score"]
            )

            ai_priority_score = round(
                (
                    base_priority * 0.40
                    + ai_risk * 0.60
                ),
                2
            )

            # -------------------------------------------------
            # CATEGORY
            # -------------------------------------------------

            if ai_priority_score >= 85:
                category = "CRITICAL"
            elif ai_priority_score >= 70:
                category = "HIGH"
            elif ai_priority_score >= 50:
                category = "MEDIUM"
            else:
                category = "LOW"

            results.append(
                {
                    "task_id": task_id,
                    "asset_id": asset_id,
                    "department": row[2],
                    "task_type": row[3],
                    "description": row[4],
                    "due_date": (
                        str(row[5])
                        if row[5]
                        else None
                    ),
                    "estimated_duration_min": row[6],
                    "overdue_days": row[7],
                    "safety_risk": row[8],
                    "original_priority_score": base_priority,
                    "ml_risk_score": ai_risk,
                    "ai_priority_score": ai_priority_score,
                    "priority_category": category,
                    "task_status": row[11],
                }
            )

        # -----------------------------------------------------
        # SORT
        # -----------------------------------------------------

        results.sort(
            key=lambda x: x["ai_priority_score"],
            reverse=True
        )

        for index, result in enumerate(
            results,
            start=1
        ):
            result["priority_rank"] = index

        return {
            "total_tasks": len(results),
            "tasks": results,
        }

    finally:

        if connection:
            connection.close()


@router.post("/tasks/apply-priorities", dependencies=[Depends(require_permission("ai.priorities.apply"))])
def apply_ai_task_priorities(user: CurrentUser = Depends(get_current_user)):

    connection = None

    try:
        connection = psycopg.connect(**DB_CONFIG)

        # Get current AI rankings
        ranking_response = get_task_priority_ranking(user=user)

        tasks = ranking_response["tasks"]

        updated = 0

        with connection.cursor() as cursor:

            for task in tasks:

                cursor.execute(
                    """
                    UPDATE maintenance_tasks
                    SET
                        priority_score = %s,
                        priority_category = %s
                    WHERE task_id = %s
                    """,
                    (
                        task["ai_priority_score"],
                        task["priority_category"],
                        task["task_id"],
                    )
                )

                updated += cursor.rowcount

        connection.commit()

        record_audit(
            user=user,
            method="POST",
            path="/ai/tasks/apply-priorities",
            action="ai.priorities.apply",
            target_type="tasks",
            target_id="all",
            outcome="SUCCESS",
            detail={"tasks_updated": updated}
        )

        return {
            "status": "success",
            "message": "AI priorities applied to maintenance tasks",
            "tasks_analyzed": len(tasks),
            "tasks_updated": updated,
        }

    except Exception as exc:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )

    finally:

        if connection:
            connection.close()