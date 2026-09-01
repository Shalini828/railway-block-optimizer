from fastapi import APIRouter
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# ============================================================
# DASHBOARD KPIs
# ============================================================

@router.get("/kpis")
def get_dashboard_kpis():
    """
    Returns the KPI data required by the React dashboard.

    The endpoint is intentionally defensive:
    if a database table/query is unavailable, the dashboard
    still receives a valid response instead of crashing.
    """

    # --------------------------------------------------------
    # Default values
    # --------------------------------------------------------

    overall_asset_availability = 0.0
    scheduled_blocks = 0
    shadow_block_savings = 0.0
    punctuality_impact_index = 0.0

    pending_ai_scheduling = 0
    clustered_shadowed = 0
    approved = 0
    active = 0
    completed = 0

    corridor_status = []
    urgent_risks = []
    train_forecast = []

    # --------------------------------------------------------
    # Database
    # --------------------------------------------------------

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ----------------------------------------------------
        # Optimization history
        # ----------------------------------------------------

        try:
            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(blocks_generated), 0),
                    COALESCE(SUM(total_train_impact), 0),
                    COALESCE(SUM(total_train_conflicts), 0)
                FROM optimization_history
                """
            )

            row = cursor.fetchone()

            if row:
                scheduled_blocks = int(row[0] or 0)
                shadow_block_savings = float(row[1] or 0)
                punctuality_impact_index = float(row[2] or 0)

        except Exception:
            # Table/query may not exist yet.
            conn.rollback()

        # ----------------------------------------------------
        # Block requests
        # ----------------------------------------------------

        try:
            cursor.execute(
                """
                SELECT
                    COUNT(*)
                FROM block_requests
                """
            )

            row = cursor.fetchone()

            if row:
                pending_ai_scheduling = int(row[0] or 0)

        except Exception:
            conn.rollback()

        # ----------------------------------------------------
        # Maintenance tasks
        # ----------------------------------------------------

        try:
            cursor.execute(
                """
                SELECT
                    COUNT(*)
                FROM maintenance_tasks
                """
            )

            row = cursor.fetchone()

            if row:
                completed = int(row[0] or 0)

        except Exception:
            conn.rollback()

        cursor.close()
        conn.close()

    except Exception:
        # Dashboard should still load even if DB is unavailable.
        pass

    # --------------------------------------------------------
    # Corridor status
    # --------------------------------------------------------

    corridor_status = [
        {
            "id": "ndls-cnb",
            "name": "New Delhi (NDLS) – Kanpur (CNB)",
            "from": "New Delhi (NDLS)",
            "to": "Kanpur (CNB)",
            "trains_running": 0,
            "window": "11:00 – 14:00",
            "traffic_intensity": 87,
            "tracks": [
                "Up Main",
                "Down Main",
                "Line 3 Up",
            ],
        },
        {
            "id": "cnb-ald",
            "name": "Kanpur (CNB) – Prayagraj (ALD)",
            "from": "Kanpur (CNB)",
            "to": "Prayagraj (ALD)",
            "trains_running": 0,
            "window": "10:30 – 13:30",
            "traffic_intensity": 64,
            "tracks": [
                "Up Main",
                "Down Main",
            ],
        },
        {
            "id": "ald-bsb",
            "name": "Prayagraj (ALD) – Varanasi (BSB)",
            "from": "Prayagraj (ALD)",
            "to": "Varanasi (BSB)",
            "trains_running": 0,
            "window": "12:00 – 15:00",
            "traffic_intensity": 41,
            "tracks": [
                "Up Main",
                "Down Main",
            ],
        },
    ]

    # --------------------------------------------------------
    # Urgent risk radar
    # --------------------------------------------------------

    urgent_risks = [
        {
            "id": "TRK-ENG-982",
            "title": "IMR Track Fracture",
            "severity": "Critical",
            "asset": "TRK-ENG-982",
            "location": "NDLS-CNB Down Main",
            "description": (
                "USFD Class IMR flaw. TSR 30 kmph imposed "
                "if defect >48h."
            ),
        },
        {
            "id": "SIG-PNT-119",
            "title": "Point Machine Failure",
            "severity": "High",
            "asset": "SIG-PNT-119",
            "location": "DDU-BSB Up Main",
            "description": (
                "Repeated non-setting of points; "
                "3 detentions logged in 24h."
            ),
        },
        {
            "id": "OHE-MAST-112",
            "title": "OHE Hot Spot",
            "severity": "High",
            "asset": "OHE-MAST-112",
            "location": "NDLS-CNB Down Main",
            "description": (
                "Thermal anomaly detected on OHE equipment."
            ),
        },
    ]

    # --------------------------------------------------------
    # COA train path forecast
    # --------------------------------------------------------

    train_forecast = [
        {
            "id": "forecast-1",
            "train": "COA-001",
            "corridor": "NDLS – CNB",
            "status": "On Time",
            "time": "11:15",
        },
        {
            "id": "forecast-2",
            "train": "COA-002",
            "corridor": "CNB – ALD",
            "status": "On Time",
            "time": "11:45",
        },
        {
            "id": "forecast-3",
            "train": "COA-003",
            "corridor": "ALD – BSB",
            "status": "Expected",
            "time": "12:20",
        },
        {
            "id": "forecast-4",
            "train": "COA-004",
            "corridor": "NDLS – CNB",
            "status": "Expected",
            "time": "12:40",
        },
    ]

    # --------------------------------------------------------
    # Return response
    # --------------------------------------------------------

    return {
        "status": "success",

        "kpis": {
            "overall_asset_availability": overall_asset_availability,
            "scheduled_blocks": scheduled_blocks,
            "shadow_block_savings": shadow_block_savings,
            "punctuality_impact_index": punctuality_impact_index,
        },

        "corridor_status": corridor_status,

        "urgent_risks": urgent_risks,

        "train_forecast": train_forecast,

        "requisition_pipeline": {
            "pending_ai_scheduling": pending_ai_scheduling,
            "clustered_shadowed": clustered_shadowed,
            "approved": approved,
            "active": active,
            "completed": completed,
        },
    }