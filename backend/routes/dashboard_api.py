from fastapi import APIRouter, HTTPException
from datetime import datetime, date
from pathlib import Path
import os

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT
# ============================================================

# Load .env from backend directory
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db_connection():
    """
    Creates a PostgreSQL connection using the existing
    railway_block_planning database configuration.

    Supports either DATABASE_URL or individual DB_* variables.
    """

    database_url = os.getenv("DATABASE_URL")

    try:
        if database_url:
            return psycopg2.connect(database_url)

        return psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "railway_block_planning"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD"),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(exc)}"
        )


# ============================================================
# SMALL HELPERS
# ============================================================

def safe_number(value, default=0):
    if value is None:
        return default

    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def format_corridor(corridor_id):
    """
    Converts IDs such as:
        NDLS-CNB -> NDLS - CNB
        ndls_cnb -> NDLS - CNB
        COR-001  -> COR-001
    """

    if not corridor_id:
        return "Unknown Corridor"

    value = str(corridor_id).strip()

    if "_" in value:
        value = value.replace("_", "-")

    parts = value.split("-")

    if len(parts) == 2:
        return f"{parts[0].upper()} - {parts[1].upper()}"

    return value.upper()


def get_status_from_intensity(intensity):
    if intensity > 90:
        return "Restricted"

    if intensity > 70:
        return "Congested"

    if intensity > 40:
        return "Moderate"

    return "Operational"


# ============================================================
# DASHBOARD KPI ENDPOINT
# ============================================================

@router.get("/kpis")
def get_dashboard_kpis():

    conn = None

    try:
        conn = get_db_connection()

        # ====================================================
        # 1. OVERALL ASSET AVAILABILITY
        # ====================================================

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute("""
                SELECT
                    COUNT(*) AS total_assets,
                    AVG(health_score) AS average_health,
                    COUNT(*) FILTER (
                        WHERE LOWER(COALESCE(operational_status, ''))
                        IN ('operational', 'active', 'available')
                    ) AS operational_assets
                FROM public.assets
            """)

            asset_row = cur.fetchone()

        total_assets = int(asset_row["total_assets"] or 0)

        average_health = safe_number(
            asset_row["average_health"],
            0
        )

        operational_assets = int(
            asset_row["operational_assets"] or 0
        )

        if total_assets > 0:
            operational_percentage = (
                operational_assets / total_assets
            ) * 100
        else:
            operational_percentage = average_health

        # Prefer actual operational ratio when available.
        # If operational_status is not populated, use health score.
        if operational_assets == 0 and average_health > 0:
            overall_asset_availability = average_health
        else:
            overall_asset_availability = operational_percentage

        overall_asset_availability = round(
            min(max(overall_asset_availability, 0), 100),
            1
        )


        # ====================================================
        # 2. OPTIMIZED BLOCKS
        # ====================================================

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute("""
                SELECT
                    COUNT(*) AS total_blocks,
                    COALESCE(SUM(duration_min), 0) AS total_minutes,
                    COALESCE(AVG(utilization_percent), 0) AS avg_utilization,
                    COALESCE(AVG(train_impact_score), 0) AS avg_train_impact,
                    COALESCE(SUM(number_of_tasks), 0) AS total_tasks
                FROM public.optimized_blocks
            """)

            block_row = cur.fetchone()

        total_optimized_blocks = int(
            block_row["total_blocks"] or 0
        )

        total_optimized_minutes = safe_number(
            block_row["total_minutes"],
            0
        )

        avg_utilization = safe_number(
            block_row["avg_utilization"],
            0
        )

        avg_train_impact = safe_number(
            block_row["avg_train_impact"],
            0
        )


        # ====================================================
        # 3. BLOCK REQUESTS
        # ====================================================

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute("""
                SELECT
                    COUNT(*) AS total_requests,

                    COUNT(*) FILTER (
                        WHERE UPPER(COALESCE(request_status, ''))
                        IN ('PENDING', 'SUBMITTED')
                    ) AS pending,

                    COUNT(*) FILTER (
                        WHERE UPPER(COALESCE(request_status, ''))
                        IN ('OPTIMIZED', 'CLUSTERED', 'SHADOWED')
                    ) AS optimized,

                    COUNT(*) FILTER (
                        WHERE UPPER(COALESCE(request_status, ''))
                        IN ('APPROVED', 'APPROVE')
                    ) AS approved,

                    COUNT(*) FILTER (
                        WHERE UPPER(COALESCE(request_status, ''))
                        IN ('ACTIVE', 'IN_PROGRESS')
                    ) AS active,

                    COUNT(*) FILTER (
                        WHERE UPPER(COALESCE(request_status, ''))
                        IN ('COMPLETED', 'CLOSED', 'DONE')
                    ) AS completed,

                    COALESCE(
                        SUM(requested_duration_min)
                        FILTER (
                            WHERE UPPER(COALESCE(request_status, ''))
                        IN ('OPTIMIZED', 'CLUSTERED', 'SHADOWED')
                        ),
                        0
                    ) AS optimized_requested_minutes

                FROM public.block_requests
            """)

            request_row = cur.fetchone()

        pending_requests = int(request_row["pending"] or 0)
        clustered_requests = int(request_row["optimized"] or 0)
        approved_requests = int(request_row["approved"] or 0)
        active_requests = int(request_row["active"] or 0)
        completed_requests = int(request_row["completed"] or 0)

        optimized_requested_minutes = safe_number(
            request_row["optimized_requested_minutes"],
            0
        )


        # ====================================================
        # 4. SHADOW BLOCK SAVINGS
        # ====================================================
        #
        # Example:
        #
        # 3 requests x 60 min = 180 min requested
        # optimized block = 120 min
        # savings = 60 min
        #
        # This gives the dashboard a real optimization metric.
        # ====================================================

        shadow_block_savings_minutes = max(
            optimized_requested_minutes
            - total_optimized_minutes,
            0
        )

        shadow_block_savings_hours = round(
            shadow_block_savings_minutes / 60,
            1
        )


        # ====================================================
        # 5. OPTIMIZATION HISTORY
        # ====================================================

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute("""
                SELECT
                    COUNT(*) AS optimization_runs,
                    COALESCE(
                        SUM(blocks_generated),
                        0
                    ) AS blocks_generated,
                    COALESCE(
                        SUM(total_train_impact),
                        0
                    ) AS total_train_impact
                FROM public.optimization_history
            """)

            history_row = cur.fetchone()

        optimization_runs = int(
            history_row["optimization_runs"] or 0
        )

        history_blocks_generated = int(
            history_row["blocks_generated"] or 0
        )

        history_train_impact = safe_number(
            history_row["total_train_impact"],
            0
        )


        # ====================================================
        # 6. PUNCTUALITY IMPACT
        # ====================================================
        #
        # Derived from optimization history / train impact.
        # Lower train impact means better planning.
        #
        # We expose a positive "impact index" to the existing
        # frontend without changing its API contract.
        # ====================================================

        if history_train_impact > 0:
            punctuality_impact = round(
                max(0, 100 - history_train_impact),
                1
            )
        elif avg_train_impact > 0:
            punctuality_impact = round(
                max(0, 100 - avg_train_impact),
                1
            )
        else:
            punctuality_impact = 100.0


        # ====================================================
        # 7. CORRIDOR STATUS
        # ====================================================
        #
        # Uses actual trains + optimized blocks.
        # ====================================================

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute("""
                SELECT
                    corridor_id,
                    COUNT(*) AS trains_running,
                    MIN(departure_time) AS first_departure,
                    MAX(departure_time) AS last_departure
                FROM public.trains
                GROUP BY corridor_id
                ORDER BY COUNT(*) DESC
                LIMIT 6
            """)

            corridor_rows = cur.fetchall()

        corridor_status = []

        for index, row in enumerate(corridor_rows):

            corridor_id = row["corridor_id"]

            trains_running = int(
                row["trains_running"] or 0
            )

            # Base traffic intensity from actual train count.
            intensity = min(
                100,
                trains_running * 15
            )

            # Add pressure if optimized blocks exist.
            with conn.cursor(cursor_factory=RealDictCursor) as cur:

                cur.execute("""
                    SELECT
                        COALESCE(SUM(duration_min), 0) AS block_minutes
                    FROM public.optimized_blocks
                    WHERE corridor_id = %s
                """, (corridor_id,))

                corridor_block = cur.fetchone()

            block_minutes = safe_number(
                corridor_block["block_minutes"],
                0
            )

            # Additional operational pressure.
            intensity += min(
                30,
                block_minutes / 30
            )

            intensity = int(
                min(max(intensity, 0), 100)
            )

            status_label = get_status_from_intensity(
                intensity
            )

            first_departure = row["first_departure"]
            last_departure = row["last_departure"]

            if first_departure and last_departure:
                window = (
                    f"{str(first_departure)[:5]} - "
                    f"{str(last_departure)[:5]}"
                )
            else:
                window = "Operational window"

            corridor_status.append({
                "id": str(corridor_id),
                "name": format_corridor(corridor_id),
                "from": (
                    format_corridor(corridor_id).split(" - ")[0]
                    if " - " in format_corridor(corridor_id)
                    else format_corridor(corridor_id)
                ),
                "to": (
                    format_corridor(corridor_id).split(" - ")[1]
                    if " - " in format_corridor(corridor_id)
                    else format_corridor(corridor_id)
                ),
                "trains_running": trains_running,
                "window": window,
                "traffic_intensity": intensity,
                "tracks": [
                    "Up Main",
                    "Down Main"
                ]
            })


        # ====================================================
        # 8. URGENT RISK RADAR
        # ====================================================
        #
        # Combines maintenance task risk + overdue status.
        # ====================================================

        urgent_risks = []

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute("""
                SELECT
                    task_id,
                    asset_id,
                    department,
                    task_type,
                    description,
                    overdue_days,
                    safety_risk,
                    priority_score,
                    priority_category,
                    task_status
                FROM public.maintenance_tasks
                WHERE
                    UPPER(COALESCE(task_status, '')) NOT IN
                    ('COMPLETED', 'CLOSED', 'DONE')
                ORDER BY
                    safety_risk DESC NULLS LAST,
                    priority_score DESC NULLS LAST,
                    overdue_days DESC NULLS LAST
                LIMIT 8
            """)

            task_rows = cur.fetchall()


        for task in task_rows:

            safety_risk = int(
                task["safety_risk"] or 0
            )

            priority_score = safe_number(
                task["priority_score"],
                0
            )

            overdue_days = int(
                task["overdue_days"] or 0
            )

            priority_category = (
                str(task["priority_category"] or "")
                .strip()
                .lower()
            )

            # Severity calculation
            if (
                safety_risk >= 4
                or priority_score >= 90
                or "critical" in priority_category
            ):
                severity = "Critical"

            elif (
                safety_risk >= 3
                or priority_score >= 70
                or overdue_days >= 7
                or "high" in priority_category
            ):
                severity = "High"

            elif (
                safety_risk >= 2
                or priority_score >= 40
            ):
                severity = "Medium"

            else:
                severity = "Low"

            title = (
                task["task_type"]
                or "Maintenance Risk"
            )

            description = (
                task["description"]
                or "Maintenance task requires attention."
            )

            if overdue_days > 0:
                description = (
                    f"{description} "
                    f"Overdue by {overdue_days} day(s)."
                )

            urgent_risks.append({
                "id": str(task["asset_id"] or task["task_id"]),
                "title": str(title),
                "severity": severity,
                "location": (
                    f"{task['department'] or 'Railway'} · "
                    f"Task {task['task_id']}"
                ),
                "description": str(description)
            })


        # ====================================================
        # If maintenance data is small/empty, supplement risks
        # using asset failure risk.
        # ====================================================

        if len(urgent_risks) < 3:

            with conn.cursor(cursor_factory=RealDictCursor) as cur:

                cur.execute("""
                    SELECT
                        asset_id,
                        corridor_id,
                        department,
                        asset_type,
                        location_km,
                        health_score,
                        failure_risk,
                        operational_status
                    FROM public.assets
                    WHERE
                        COALESCE(failure_risk, 0) >= 0.5
                        OR COALESCE(health_score, 100) < 60
                    ORDER BY
                        failure_risk DESC NULLS LAST,
                        health_score ASC NULLS LAST
                    LIMIT 5
                """)

                asset_risks = cur.fetchall()


            existing_ids = {
                risk["id"]
                for risk in urgent_risks
            }

            for asset in asset_risks:

                asset_id = str(
                    asset["asset_id"]
                )

                if asset_id in existing_ids:
                    continue

                failure_risk = safe_number(
                    asset["failure_risk"],
                    0
                )

                health_score = safe_number(
                    asset["health_score"],
                    100
                )

                if failure_risk >= 0.8 or health_score < 40:
                    severity = "Critical"

                elif failure_risk >= 0.6 or health_score < 60:
                    severity = "High"

                else:
                    severity = "Medium"

                urgent_risks.append({
                    "id": asset_id,
                    "title": (
                        f"{asset['asset_type'] or 'Asset'} "
                        f"Health Risk"
                    ),
                    "severity": severity,
                    "location": (
                        f"{asset['corridor_id'] or 'Unknown Corridor'}"
                        f" · {asset['department'] or 'Unknown Department'}"
                    ),
                    "description": (
                        f"Health score "
                        f"{round(health_score, 1)}/100; "
                        f"failure risk "
                        f"{round(failure_risk * 100, 1)}%."
                    )
                })

                if len(urgent_risks) >= 5:
                    break


        # ====================================================
        # 9. TRAIN FORECAST
        # ====================================================

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute("""
                SELECT
                    train_id,
                    train_number,
                    train_name,
                    corridor_id,
                    arrival_time,
                    departure_time,
                    operational_priority
                FROM public.trains
                ORDER BY
                    departure_time ASC NULLS LAST
                LIMIT 10
            """)

            train_rows = cur.fetchall()


        train_forecast = []

        for train in train_rows:

            train_number = (
                train["train_number"]
                or train["train_id"]
                or "TRAIN"
            )

            corridor = format_corridor(
                train["corridor_id"]
            )

            departure_time = train["departure_time"]

            if departure_time:
                time_value = str(
                    departure_time
                )[:5]
            else:
                time_value = "--:--"

            priority = safe_number(
                train["operational_priority"],
                0
            )

            if priority >= 8:
                status = "Expected"
            else:
                status = "On Time"

            train_forecast.append({
                "id": str(train["train_id"]),
                "train": str(train_number),
                "corridor": corridor,
                "status": status,
                "time": time_value
            })


        # ====================================================
        # 10. REQUISITION PIPELINE
        # ====================================================

        requisition_pipeline = {
            "pending_ai_scheduling": pending_requests,
            "clustered_shadowed": clustered_requests,
            "approved": approved_requests,
            "active": active_requests,
            "completed": completed_requests
        }


        # ====================================================
        # 11. FINAL RESPONSE
        # ====================================================

        return {
            "status": "success",

            "kpis": {
                "overall_asset_availability":
                    overall_asset_availability,

                "scheduled_blocks":
                    total_optimized_blocks,

                "shadow_block_savings":
                    shadow_block_savings_hours,

                "punctuality_impact_index":
                    punctuality_impact
            },

            "corridor_status":
                corridor_status,

            "urgent_risks":
                urgent_risks[:5],

            "train_forecast":
                train_forecast[:5],

            "requisition_pipeline":
                requisition_pipeline,

            # Extra backend intelligence.
            # Existing dashboard.tsx can ignore these.
            "analytics": {
                "optimization_runs":
                    optimization_runs,

                "blocks_generated":
                    history_blocks_generated,

                "average_block_utilization":
                    round(avg_utilization, 1),

                "average_train_impact":
                    round(avg_train_impact, 1),

                "total_optimized_block_minutes":
                    round(total_optimized_minutes, 1),

                "total_assets":
                    total_assets,

                "operational_assets":
                    operational_assets,

                "total_maintenance_risks":
                    len(urgent_risks)
            },

            "last_updated":
                datetime.now().isoformat()
        }


    except HTTPException:
        raise

    except Exception as exc:

        print(
            "Dashboard API error:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Dashboard data generation failed: {str(exc)}"
        )

    finally:

        if conn:
            conn.close()