from fastapi import APIRouter
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


@router.get("/kpis")
def get_dashboard_kpis():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ==========================================
        # 1. ASSET AVAILABILITY
        # ==========================================

        cursor.execute("""
            SELECT
                COUNT(*) AS total_assets,
                COUNT(*) FILTER (
                    WHERE operational_status = 'OPERATIONAL'
                ) AS operational_assets
            FROM assets
        """)

        asset_data = cursor.fetchone()

        total_assets = asset_data[0]
        operational_assets = asset_data[1]

        if total_assets > 0:
            asset_availability = round(
                (operational_assets / total_assets) * 100,
                2
            )
        else:
            asset_availability = 0


        # ==========================================
        # 2. SCHEDULED BLOCKS
        # ==========================================

        cursor.execute("""
            SELECT COUNT(*)
            FROM optimized_blocks
            WHERE block_status IN ('PLANNED', 'APPROVED')
        """)

        scheduled_blocks = cursor.fetchone()[0]


        # ==========================================
        # 3. TOTAL BLOCK TIME
        # ==========================================

        cursor.execute("""
            SELECT COALESCE(SUM(duration_min), 0)
            FROM optimized_blocks
            WHERE block_status IN ('PLANNED', 'APPROVED')
        """)

        total_block_minutes = cursor.fetchone()[0]

        block_hours = float(
    round(total_block_minutes / 60, 2)
)


        # ==========================================
        # 4. TRAIN DELAY IMPACT
        # ==========================================

        cursor.execute("""
            SELECT COALESCE(SUM(estimated_delay_min), 0)
            FROM block_train_impact
        """)

        train_delay_minutes = cursor.fetchone()[0]


        # ==========================================
        # 5. OPTIMIZATION SCORE
        # ==========================================

        cursor.execute("""
            SELECT COALESCE(AVG(optimization_score), 0)
            FROM optimized_blocks
        """)

        optimization_score = round(
            float(cursor.fetchone()[0]),
            2
        )


        return {
            "status": "success",

            "asset_availability_percent":
                asset_availability,

            "total_assets":
                total_assets,

            "operational_assets":
                operational_assets,

            "scheduled_blocks":
                scheduled_blocks,

            "total_block_hours":
                block_hours,

            "train_delay_impact_minutes":
                train_delay_minutes,

            "average_optimization_score":
                optimization_score
        }


    except Exception as e:

        raise Exception(str(e))


    finally:

        cursor.close()
        conn.close()