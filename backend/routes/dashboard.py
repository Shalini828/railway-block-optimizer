from fastapi import APIRouter

import psycopg
import os

from dotenv import load_dotenv

load_dotenv()


# ==========================================
# DASHBOARD ROUTER
# ==========================================

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_connection():

    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


# ==========================================
# 1. DASHBOARD KPIs
# ==========================================

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


        # ==========================================
        # RESPONSE
        # ==========================================

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


# ==========================================
# 2. GET OPTIMIZED BLOCKS
# ==========================================

@router.get("/blocks")
def get_optimized_blocks():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                block_id,
                corridor_id,
                block_date,
                start_time,
                end_time,
                duration_min,
                utilization_percent,
                train_impact_score,
                number_of_tasks,
                number_of_departments,
                optimization_score,
                block_status

            FROM optimized_blocks

            ORDER BY
                block_date,
                start_time
        """)

        blocks = cursor.fetchall()


        # ==========================================
        # FORMAT BLOCK DATA
        # ==========================================

        formatted_blocks = []

        for block in blocks:

            formatted_blocks.append({

                "block_id":
                    block[0],

                "corridor":
                    block[1],

                "date":
                    str(block[2]),

                "start":
                    str(block[3]),

                "end":
                    str(block[4]),

                "duration":
                    block[5],

                "utilization":
                    float(block[6] or 0),

                "train_impact":
                    float(block[7] or 0),

                "number_of_tasks":
                    block[8],

                "number_of_departments":
                    block[9],

                "optimization_score":
                    float(block[10] or 0),

                "status":
                    block[11]
            })


        # ==========================================
        # RESPONSE
        # ==========================================

        return {

            "status": "success",

            "total_blocks":
                len(formatted_blocks),

            "blocks":
                formatted_blocks
        }


    finally:

        cursor.close()
        conn.close()


# ==========================================
# 3. OPTIMIZATION INSIGHTS
# ==========================================

@router.get("/insights")
def get_optimization_insights():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                block_id,
                corridor_id,
                block_date,
                start_time,
                end_time,
                duration_min,
                utilization_percent,
                train_impact_score,
                number_of_tasks,
                number_of_departments,
                optimization_score,
                block_status

            FROM optimized_blocks

            ORDER BY
                optimization_score DESC,
                block_date,
                start_time
        """)

        blocks = cursor.fetchall()

        insights = []

        for block in blocks:

            (
                block_id,
                corridor,
                block_date,
                start_time,
                end_time,
                duration,
                utilization,
                train_impact,
                tasks,
                departments,
                score,
                status
            ) = block


            # ==========================================
            # UTILIZATION INSIGHT
            # ==========================================

            if utilization >= 90:

                utilization_message = (
                    "Highly efficient maintenance window"
                )

            elif utilization >= 70:

                utilization_message = (
                    "Good maintenance window utilization"
                )

            else:

                utilization_message = (
                    "Low utilization - consolidation possible"
                )


            # ==========================================
            # TRAIN IMPACT INSIGHT
            # ==========================================

            if train_impact == 0:

                train_message = (
                    "No train schedule conflicts detected"
                )

            elif train_impact <= 30:

                train_message = (
                    "Low train schedule impact"
                )

            elif train_impact <= 60:

                train_message = (
                    "Moderate train schedule impact"
                )

            else:

                train_message = (
                    "High train schedule impact - review required"
                )


            # ==========================================
            # OVERALL RECOMMENDATION
            # ==========================================

            if score >= 90 and train_impact == 0:

                recommendation = (
                    "Excellent block: high optimization "
                    "score with no train conflicts."
                )

            elif score >= 80:

                recommendation = (
                    "Strong block: suitable for approval."
                )

            elif score >= 60:

                recommendation = (
                    "Acceptable block but review "
                    "utilization and train impact."
                )

            else:

                recommendation = (
                    "Optimization review recommended."
                )


            insights.append({

                "block_id": block_id,

                "corridor": corridor,

                "date": str(block_date),

                "start": str(start_time),

                "end": str(end_time),

                "duration_minutes": duration,

                "utilization_percent":
                    float(utilization or 0),

                "train_impact_score":
                    float(train_impact or 0),

                "number_of_tasks":
                    tasks,

                "number_of_departments":
                    departments,

                "optimization_score":
                    float(score or 0),

                "status":
                    status,

                "utilization_insight":
                    utilization_message,

                "train_impact_insight":
                    train_message,

                "recommendation":
                    recommendation
            })


        return {

            "status": "success",

            "total_blocks":
                len(insights),

            "insights":
                insights
        }


    finally:

        cursor.close()
        conn.close()

# ==========================================
# 4. TRAIN CONFLICTS / IMPACT
# ==========================================

@router.get("/train-conflicts")
def get_train_conflicts():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                bti.block_id,
                bti.train_id,
                t.train_number,
                t.train_name,
                t.train_type,
                ob.corridor_id,
                ob.block_date,
                ob.start_time,
                ob.end_time,
                bti.impact_type,
                bti.estimated_delay_min

            FROM block_train_impact bti

            JOIN optimized_blocks ob
                ON bti.block_id = ob.block_id

            JOIN trains t
                ON bti.train_id = t.train_id

            ORDER BY
                ob.block_date,
                ob.start_time
        """)

        conflicts = cursor.fetchall()

        formatted_conflicts = []

        for conflict in conflicts:

            formatted_conflicts.append({

                "block_id": conflict[0],

                "train_id": conflict[1],

                "train_number": conflict[2],

                "train_name": conflict[3],

                "train_type": conflict[4],

                "corridor": conflict[5],

                "date": str(conflict[6]),

                "block_start": str(conflict[7]),

                "block_end": str(conflict[8]),

                "impact_type": conflict[9],

                "estimated_delay_minutes":
                    conflict[10]
            })


        return {

            "status": "success",

            "total_conflicts":
                len(formatted_conflicts),

            "total_estimated_delay_minutes":
                sum(
                    c["estimated_delay_minutes"] or 0
                    for c in formatted_conflicts
                ),

            "conflicts":
                formatted_conflicts
        }


    finally:

        cursor.close()
        conn.close()