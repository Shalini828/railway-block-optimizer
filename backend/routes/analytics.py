from fastapi import APIRouter, HTTPException
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


@router.get("/")
def get_analytics():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ==========================================
        # ASSET AVAILABILITY
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

        total_assets = asset_data[0] or 0
        operational_assets = asset_data[1] or 0

        asset_availability = (
            round((operational_assets / total_assets) * 100, 2)
            if total_assets > 0
            else 0
        )


        # ==========================================
        # OPTIMIZED BLOCKS
        # ==========================================

        cursor.execute("""
            SELECT
                COUNT(*) AS total_blocks,
                COALESCE(
                    SUM(duration_min),
                    0
                ) AS total_block_minutes,
                COALESCE(
                    SUM(train_impact_score),
                    0
                ) AS total_train_impact,
                COALESCE(
                    AVG(optimization_score),
                    0
                ) AS average_optimization_score
            FROM optimized_blocks
        """)

        block_data = cursor.fetchone()

        total_blocks = block_data[0] or 0
        total_block_minutes = float(block_data[1] or 0)
        total_train_impact = float(block_data[2] or 0)
        average_optimization_score = round(
            float(block_data[3] or 0),
            2
        )

        total_block_hours = round(
            total_block_minutes / 60,
            2
        )


        # ==========================================
        # TRAIN DELAY IMPACT
        # ==========================================

        cursor.execute("""
            SELECT
                COALESCE(
                    SUM(estimated_delay_min),
                    0
                )
            FROM block_train_impact
        """)

        train_delay = cursor.fetchone()[0] or 0

        train_delay = int(train_delay)


        # ==========================================
        # SINGLE VS COORDINATED BLOCKS
        # ==========================================

        cursor.execute("""
            SELECT
                COUNT(*) FILTER (
                    WHERE department_count = 1
                ) AS single_department_blocks,

                COUNT(*) FILTER (
                    WHERE department_count > 1
                ) AS coordinated_blocks

            FROM (
                SELECT
                    bt.block_id,
                    COUNT(
                        DISTINCT mt.department
                    ) AS department_count
                FROM block_tasks bt
                JOIN maintenance_tasks mt
                    ON bt.task_id = mt.task_id
                GROUP BY bt.block_id
            ) AS block_departments
        """)

        mix_data = cursor.fetchone()

        single_department_blocks = mix_data[0] or 0
        coordinated_blocks = mix_data[1] or 0


        # ==========================================
        # MAINTENANCE TASK SUMMARY
        # ==========================================

        cursor.execute("""
            SELECT
                COUNT(*) AS total_tasks,

                COUNT(*) FILTER (
                    WHERE task_status = 'PENDING'
                ) AS pending_tasks,

                COUNT(*) FILTER (
                    WHERE task_status = 'COMPLETED'
                ) AS completed_tasks,

                COUNT(*) FILTER (
                    WHERE priority_category = 'CRITICAL'
                ) AS critical_tasks
            FROM maintenance_tasks
        """)

        task_data = cursor.fetchone()

        total_tasks = task_data[0] or 0
        pending_tasks = task_data[1] or 0
        completed_tasks = task_data[2] or 0
        critical_tasks = task_data[3] or 0


        # ==========================================
        # DEPARTMENT ASSET AVAILABILITY
        # ==========================================

        cursor.execute("""
            SELECT
                department,
                COUNT(*) AS total_assets,
                COUNT(*) FILTER (
                    WHERE operational_status = 'OPERATIONAL'
                ) AS operational_assets
            FROM assets
            GROUP BY department
            ORDER BY department
        """)

        department_rows = cursor.fetchall()

        department_availability = []

        for row in department_rows:
            department = row[0]
            department_total = row[1] or 0
            department_operational = row[2] or 0

            availability = (
                round(
                    (department_operational / department_total) * 100,
                    2
                )
                if department_total > 0
                else 0
            )

            department_availability.append({
                "department": department,
                "total_assets": department_total,
                "operational_assets": department_operational,
                "availability_percent": availability
            })

        # ==========================================
        # POST-BLOCK REPORT
        # ==========================================

        cursor.execute("""
            SELECT
                ob.block_id,
                c.corridor_name,
                c.source_station,
                c.destination_station,
                ob.block_date,
                ob.start_time,
                ob.end_time,
                ob.duration_min,
                ob.train_impact_score,
                ob.optimization_score,
                ob.block_status,
                STRING_AGG(
                    DISTINCT mt.department,
                    ', '
                ) AS departments
            FROM optimized_blocks ob
            JOIN corridors c
                ON ob.corridor_id = c.corridor_id
            LEFT JOIN block_tasks bt
                ON ob.block_id = bt.block_id
            LEFT JOIN maintenance_tasks mt
                ON bt.task_id = mt.task_id
            GROUP BY
                ob.block_id,
                c.corridor_name,
                c.source_station,
                c.destination_station,
                ob.block_date,
                ob.start_time,
                ob.end_time,
                ob.duration_min,
                ob.train_impact_score,
                ob.optimization_score,
                ob.block_status
            ORDER BY
                ob.block_date,
                ob.start_time
        """)

        report_rows = cursor.fetchall()

        post_block_report = []

        for row in report_rows:
            post_block_report.append({
                "block_id": row[0],
                "corridor_name": row[1],
                "source_station": row[2],
                "destination_station": row[3],
                "block_date": str(row[4]),
                "start_time": str(row[5]),
                "end_time": str(row[6]),
                "duration_min": row[7] or 0,
                "train_impact_score": float(row[8] or 0),
                "optimization_score": float(row[9] or 0),
                "block_status": row[10],
                "departments": row[11] or "N/A"
            }) 
        # ==========================================
        # RESPONSE
        # ==========================================

        return {
    "status": "success",

    "asset_availability_percent": asset_availability,
    "total_assets": total_assets,
    "operational_assets": operational_assets,

    "scheduled_blocks": total_blocks,
    "total_block_hours": total_block_hours,

    "train_delay_impact_minutes": train_delay,
    "average_optimization_score": average_optimization_score,

    "single_department_blocks": single_department_blocks,
    "coordinated_blocks": coordinated_blocks,

    "total_maintenance_tasks": total_tasks,
    "pending_maintenance_tasks": pending_tasks,
    "completed_maintenance_tasks": completed_tasks,
    "critical_maintenance_tasks": critical_tasks,
    "department_availability": department_availability,
    "post_block_report": post_block_report
}

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        cursor.close()
        conn.close()