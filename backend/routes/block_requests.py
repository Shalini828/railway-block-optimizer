from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg
import os
from dotenv import load_dotenv
from datetime import date

load_dotenv()

router = APIRouter(
    prefix="/block-requests",
    tags=["Block Requests"]
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
# REQUEST MODEL
# ==========================================

class BlockRequestCreate(BaseModel):

    dept: str
    assetId: str
    work: str

    section: str
    line: str
    chainage: str

    blockType: str
    duration: float
    crew: int

    criticality: str
    daysOverdue: int
    tsrRisk: bool

    requestedBy: str


# ==========================================
# GET ALL BLOCK REQUESTS
# ==========================================

@router.get("/")
def get_block_requests():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                request_id,
                task_id,
                team_id,
                corridor_id,
                requested_date,
                requested_start,
                requested_end,
                requested_duration_min,
                block_type,
                request_status,
                submitted_date
            FROM block_requests
            ORDER BY requested_date NULLS LAST,
                     requested_start NULLS LAST
        """)

        rows = cursor.fetchall()

        return [
            {
                "request_id": row[0],
                "task_id": row[1],
                "team_id": row[2],
                "corridor_id": row[3],
                "requested_date": str(row[4]) if row[4] else None,
                "requested_start": str(row[5]) if row[5] else None,
                "requested_end": str(row[6]) if row[6] else None,
                "requested_duration_min": row[7],
                "block_type": row[8],
                "request_status": row[9],
                "submitted_date": str(row[10]) if row[10] else None
            }
            for row in rows
        ]

    finally:

        cursor.close()
        conn.close()


# ==========================================
# CREATE BLOCK REQUEST
# ==========================================

@router.post("/")
def create_block_request(request: BlockRequestCreate):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ======================================
        # DEPARTMENT → TEAM MAPPING
        # ======================================

        team_mapping = {
            "TMS": "ENG-01",
            "SMMS": "SNT-01",
            "TDMS": "TRD-01"
        }

        team_id = team_mapping.get(request.dept)

        if not team_id:

            raise HTTPException(
                status_code=400,
                detail=f"Invalid department: {request.dept}"
            )


        # ======================================
        # GENERATE TASK ID
        # ======================================

        cursor.execute("""
            SELECT task_id
            FROM maintenance_tasks
            WHERE task_id LIKE 'T-AUTO-%'
            ORDER BY task_id DESC
            LIMIT 1
        """)

        last_task = cursor.fetchone()

        if last_task:

            last_number = int(
                last_task[0].replace(
                    "T-AUTO-",
                    ""
                )
            )

            task_number = last_number + 1

        else:

            task_number = 1


        task_id = f"T-AUTO-{task_number:04d}"


        # ======================================
        # PRIORITY SCORE
        # Same logic as frontend
        # ======================================

        if request.criticality == "High":

            criticality_score = 40

        elif request.criticality == "Medium":

            criticality_score = 25

        else:

            criticality_score = 12


        overdue_score = min(
            request.daysOverdue * 2.2,
            30
        )


        tsr_score = 18 if request.tsrRisk else 0


        if request.blockType == "Power Block":

            hazard_score = 8

        elif request.blockType == "Traffic Block":

            hazard_score = 10

        else:

            hazard_score = 6


        priority_score = (
            criticality_score
            + overdue_score
            + tsr_score
            + hazard_score
        )

        priority_score = round(
            min(priority_score, 100),
            2
        )


        # ======================================
        # PRIORITY CATEGORY
        # ======================================

        if priority_score >= 85:

            priority_category = "CRITICAL"

        elif priority_score >= 70:

            priority_category = "HIGH"

        elif priority_score >= 50:

            priority_category = "MEDIUM"

        else:

            priority_category = "LOW"


        # ======================================
        # TASK TYPE
        # ======================================

        if request.criticality in ["High", "Medium"]:

            task_type = "Corrective Maintenance"

        else:

            task_type = "Preventive Maintenance"


        # ======================================
        # DESCRIPTION
        # ======================================

        description = (
            f"{request.work} | "
            f"Section: {request.section} | "
            f"Line: {request.line} | "
            f"Chainage: {request.chainage} | "
            f"Crew: {request.crew} | "
            f"Requested by: {request.requestedBy}"
        )


        # ======================================
        # INSERT MAINTENANCE TASK
        # ======================================

        cursor.execute(
            """
            INSERT INTO maintenance_tasks
            (
                task_id,
                asset_id,
                department,
                task_type,
                description,
                created_date,
                due_date,
                estimated_duration_min,
                overdue_days,
                safety_risk,
                task_status,
                priority_score,
                priority_category
            )
            VALUES
            (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                'PENDING',
                %s, %s
            )
            """,
            (
                task_id,
                request.assetId,
                request.dept,
                task_type,
                description,
                date.today(),
                None,
                int(request.duration * 60),
                request.daysOverdue,
                1 if request.tsrRisk else 0,
                priority_score,
                priority_category
            )
        )


        # ======================================
        # GENERATE REQUEST ID
        # ======================================

        cursor.execute("""
            SELECT request_id
            FROM block_requests
            WHERE request_id LIKE 'BR-AUTO-%'
            ORDER BY request_id DESC
            LIMIT 1
        """)

        last_request = cursor.fetchone()

        if last_request:

            last_number = int(
                last_request[0].replace(
                    "BR-AUTO-",
                    ""
                )
            )

            request_number = last_number + 1

        else:

            request_number = 1


        request_id = f"BR-AUTO-{request_number:04d}"


        # ======================================
        # INSERT BLOCK REQUEST
        # ======================================

        cursor.execute(
            """
            INSERT INTO block_requests
            (
                request_id,
                task_id,
                team_id,
                corridor_id,
                requested_date,
                requested_start,
                requested_end,
                requested_duration_min,
                block_type,
                request_status,
                submitted_date
            )
            VALUES
            (
                %s,
                %s,
                %s,
                NULL,
                NULL,
                NULL,
                NULL,
                %s,
                %s,
                'PENDING',
                %s
            )
            """,
            (
                request_id,
                task_id,
                team_id,
                int(request.duration * 60),
                request.blockType,
                date.today()
            )
        )


        # ======================================
        # COMMIT BOTH RECORDS
        # ======================================

        conn.commit()


        return {
            "status": "success",
            "message": "Block requisition created successfully",
            "request_id": request_id,
            "task_id": task_id,
            "team_id": team_id,
            "priority_score": priority_score,
            "priority_category": priority_category
        }


    except HTTPException:

        conn.rollback()
        raise


    except Exception as e:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    finally:

        cursor.close()
        conn.close()