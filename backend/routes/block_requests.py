from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg
import os

from dotenv import load_dotenv
from datetime import date, datetime, time, timedelta


load_dotenv()


router = APIRouter(
    prefix="/block-requests",
    tags=["Block Requests"]
)


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


# =========================================================
# REQUEST MODEL
# =========================================================

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


# =========================================================
# GET ALL BLOCK REQUESTS
# =========================================================

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
            ORDER BY
                requested_date NULLS LAST,
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


# =========================================================
# CREATE BLOCK REQUEST
# =========================================================

@router.post("/")
def create_block_request(request: BlockRequestCreate):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # =====================================================
        # 1. NORMALIZE INPUT
        # =====================================================

        department = request.dept.strip().upper()
        section = request.section.strip()
        asset_input = request.assetId.strip()
        block_type = request.blockType.strip()

        criticality = (
            request.criticality.strip().title()
        )


        # =====================================================
        # 2. DEPARTMENT → REAL DATABASE TEAM ID
        # =====================================================
        #
        # Actual DB:
        #
        # TEAM-001
        # TEAM-002
        # TEAM-003
        #
        # =====================================================

        team_mapping = {
            "TMS": "TEAM-001",
            "SMMS": "TEAM-002",
            "TDMS": "TEAM-003"
        }

        team_id = team_mapping.get(department)

        if not team_id:

            raise HTTPException(
                status_code=400,
                detail=f"Invalid department: {request.dept}"
            )


        # Verify team exists

        cursor.execute(
            """
            SELECT team_id
            FROM teams
            WHERE team_id = %s
            LIMIT 1
            """,
            (team_id,)
        )

        if cursor.fetchone() is None:

            raise HTTPException(
                status_code=500,
                detail=(
                    f"Configured team {team_id} "
                    f"does not exist in the database."
                )
            )


        # =====================================================
        # 3. CORRIDOR MAPPING
        # =====================================================

        corridor_mapping = {
            "New Delhi (NDLS) - Ghaziabad (GZB)": "C02",

            "Ghaziabad (GZB) - Kanpur (CNB)": "C02",

            "Kanpur (CNB) - Prayagraj (PRYJ)": "C03",

            "Prayagraj (PRYJ) - Varanasi (BSB)": "C04",

            "CNB Outer": "C05",

            "NDLS Station Limits": "C06",

            # Short names
            "NDLS-GZB": "C01",

            "GZB-CNB": "C02",

            "CNB-PRYJ": "C03",

            "PRYJ-BSB": "C04"
        }

        corridor_id = corridor_mapping.get(section)


        # =====================================================
        # 4. ALLOW DIRECT CORRIDOR ID
        # =====================================================

        if not corridor_id:

            cursor.execute(
                """
                SELECT corridor_id
                FROM corridors
                WHERE corridor_id = %s
                LIMIT 1
                """,
                (section,)
            )

            corridor_row = cursor.fetchone()

            if corridor_row:

                corridor_id = corridor_row[0]


        if not corridor_id:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid corridor/section: "
                    f"{request.section}"
                )
            )


        # =====================================================
        # 5. ASSET ID → REAL DATABASE ASSET ID
        # =====================================================
        #
        # Frontend may send:
        #
        # A001
        #
        # Database uses:
        #
        # AST-0001
        #
        # =====================================================

        asset_mapping = {

            "A001": "AST-0001",
            "A002": "AST-0002",
            "A003": "AST-0003",
            "A004": "AST-0004",
            "A005": "AST-0005",
            "A006": "AST-0006",
            "A007": "AST-0007",
            "A008": "AST-0008",
            "A009": "AST-0009",
            "A010": "AST-0010",
            "A011": "AST-0011",
            "A012": "AST-0012",
            "A013": "AST-0013",
            "A014": "AST-0014",
            "A015": "AST-0015",
            "A016": "AST-0016",
            "A017": "AST-0017",
            "A018": "AST-0018",
            "A019": "AST-0019",
            "A020": "AST-0020"
        }

        asset_id = asset_mapping.get(
            asset_input,
            asset_input
        )


        # =====================================================
        # 6. VERIFY ASSET EXISTS
        # =====================================================

        cursor.execute(
            """
            SELECT asset_id
            FROM assets
            WHERE asset_id = %s
            LIMIT 1
            """,
            (asset_id,)
        )

        asset_row = cursor.fetchone()

        if not asset_row:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid assetId: {request.assetId}. "
                    f"Use an available asset such as "
                    f"A001 / AST-0001."
                )
            )


        # =====================================================
        # 7. VALIDATE DURATION
        # =====================================================
        #
        # IMPORTANT:
        #
        # The frontend sends duration in MINUTES.
        #
        # 60  = 60 minutes
        # 120 = 120 minutes
        # 180 = 180 minutes
        # 240 = maximum 4 hours
        #
        # DO NOT multiply by 60.
        #
        # =====================================================

        duration_minutes = int(
            round(request.duration)
        )

        if duration_minutes <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Duration must be greater than "
                    "0 minutes."
                )
            )

        if duration_minutes > 240:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Block duration cannot exceed "
                    "240 minutes (4 hours)."
                )
            )


        # =====================================================
        # 8. DETERMINE PLANNING DATE
        # =====================================================

        cursor.execute(
            """
            SELECT MAX(requested_date)
            FROM block_requests
            WHERE requested_date IS NOT NULL
            """
        )

        latest_date = cursor.fetchone()[0]

        planning_date = (
            latest_date
            if latest_date
            else date.today()
        )


        # =====================================================
        # 9. DETERMINE START TIME
        # =====================================================
        #
        # New request is placed after the latest request
        # on the same corridor with a 30-minute separation.
        #
        # If no request exists, start at 09:00.
        #
        # =====================================================

        cursor.execute(
            """
            SELECT MAX(requested_end)
            FROM block_requests
            WHERE corridor_id = %s
              AND requested_date = %s
              AND requested_end IS NOT NULL
            """,
            (
                corridor_id,
                planning_date
            )
        )

        latest_end = cursor.fetchone()[0]


        if latest_end:

            if isinstance(latest_end, time):

                start_datetime = (
                    datetime.combine(
                        planning_date,
                        latest_end
                    )
                    + timedelta(minutes=30)
                )

            else:

                start_datetime = datetime.combine(
                    planning_date,
                    time(9, 0)
                )

        else:

            start_datetime = datetime.combine(
                planning_date,
                time(9, 0)
            )


        # =====================================================
        # 10. CALCULATE END TIME
        # =====================================================

        requested_end_datetime = (
            start_datetime
            + timedelta(
                minutes=duration_minutes
            )
        )


        # =====================================================
        # 11. MIDNIGHT PROTECTION
        # =====================================================

        if requested_end_datetime.date() != planning_date:

            planning_date = (
                requested_end_datetime.date()
            )

            start_datetime = datetime.combine(
                planning_date,
                time(9, 0)
            )

            requested_end_datetime = (
                start_datetime
                + timedelta(
                    minutes=duration_minutes
                )
            )


        requested_start = start_datetime.time()

        requested_end = requested_end_datetime.time()


        # =====================================================
        # 12. GENERATE TASK ID
        # =====================================================

        cursor.execute(
            """
            SELECT task_id
            FROM maintenance_tasks
            WHERE task_id LIKE 'T-AUTO-%'
            ORDER BY task_id DESC
            LIMIT 1
            """
        )

        last_task = cursor.fetchone()


        if last_task:

            try:

                last_number = int(
                    last_task[0].replace(
                        "T-AUTO-",
                        ""
                    )
                )

                task_number = (
                    last_number + 1
                )

            except (
                ValueError,
                AttributeError
            ):

                task_number = 1

        else:

            task_number = 1


        task_id = (
            f"T-AUTO-{task_number:04d}"
        )


        # =====================================================
        # 13. GENERATE REQUEST ID
        # =====================================================

        cursor.execute(
            """
            SELECT request_id
            FROM block_requests
            WHERE request_id LIKE 'BR-AUTO-%'
            ORDER BY request_id DESC
            LIMIT 1
            """
        )

        last_request = cursor.fetchone()


        if last_request:

            try:

                last_number = int(
                    last_request[0].replace(
                        "BR-AUTO-",
                        ""
                    )
                )

                request_number = (
                    last_number + 1
                )

            except (
                ValueError,
                AttributeError
            ):

                request_number = 1

        else:

            request_number = 1


        request_id = (
            f"BR-AUTO-{request_number:04d}"
        )


        # =====================================================
        # 14. PRIORITY SCORE
        # =====================================================

        if criticality == "Critical":

            criticality_score = 50

        elif criticality == "High":

            criticality_score = 40

        elif criticality == "Medium":

            criticality_score = 25

        else:

            criticality_score = 12


        # Overdue contribution

        overdue_score = min(
            max(request.daysOverdue, 0) * 2.2,
            30
        )


        # TSR contribution

        tsr_score = (
            18
            if request.tsrRisk
            else 0
        )


        # Block type contribution

        if block_type == "Power Block":

            hazard_score = 8

        elif block_type == "Traffic Block":

            hazard_score = 10

        else:

            hazard_score = 6


        # Final score

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


        # =====================================================
        # 15. PRIORITY CATEGORY
        # =====================================================

        if priority_score >= 85:

            priority_category = "CRITICAL"

        elif priority_score >= 70:

            priority_category = "HIGH"

        elif priority_score >= 50:

            priority_category = "MEDIUM"

        else:

            priority_category = "LOW"


        # =====================================================
        # 16. TASK TYPE
        # =====================================================

        if criticality in [
            "High",
            "Medium",
            "Critical"
        ]:

            task_type = (
                "Corrective Maintenance"
            )

        else:

            task_type = (
                "Preventive Maintenance"
            )


        # =====================================================
        # 17. SAFETY RISK
        # =====================================================
        #
        # Database constraint:
        #
        # safety_risk >= 1
        #
        # Normal maintenance = 1
        # TSR risk = 3
        #
        # =====================================================

        safety_risk = (
            3
            if request.tsrRisk
            else 1
        )


        # =====================================================
        # 18. DESCRIPTION
        # =====================================================

        description = (
            f"{request.work} | "
            f"Section: {request.section} | "
            f"Line: {request.line} | "
            f"Chainage: {request.chainage} | "
            f"Crew: {request.crew} | "
            f"Requested by: "
            f"{request.requestedBy}"
        )


        # =====================================================
        # 19. INSERT MAINTENANCE TASK
        # =====================================================

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
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                task_id,
                asset_id,
                department,
                task_type,
                description,
                date.today(),
                None,
                duration_minutes,
                max(
                    request.daysOverdue,
                    0
                ),
                safety_risk,
                "PENDING",
                priority_score,
                priority_category
            )
        )


        # =====================================================
        # 20. INSERT BLOCK REQUEST
        # =====================================================

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
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                request_id,
                task_id,
                team_id,
                corridor_id,
                planning_date,
                requested_start,
                requested_end,
                duration_minutes,
                block_type,
                "PENDING",
                date.today()
            )
        )


        # =====================================================
        # 21. COMMIT TRANSACTION
        # =====================================================

        conn.commit()


        # =====================================================
        # 22. RETURN SUCCESS
        # =====================================================

        return {
            "status": "success",

            "message": (
                "Block requisition created successfully"
            ),

            "request_id": request_id,

            "task_id": task_id,

            "team_id": team_id,

            "corridor_id": corridor_id,

            "asset_id": asset_id,

            "requested_date": str(
                planning_date
            ),

            "requested_start": str(
                requested_start
            ),

            "requested_end": str(
                requested_end
            ),

            "duration_min": duration_minutes,

            "priority_score": priority_score,

            "priority_category": (
                priority_category
            ),

            "safety_risk": safety_risk,

            "request_status": "PENDING"
        }


    # =====================================================
    # HTTP EXCEPTION
    # =====================================================

    except HTTPException:

        conn.rollback()

        raise


    # =====================================================
    # DATABASE / GENERAL EXCEPTION
    # =====================================================

    except Exception as e:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    # =====================================================
    # CLOSE CONNECTION
    # =====================================================

    finally:

        cursor.close()
        conn.close()