from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
import psycopg
import os
from dotenv import load_dotenv

from auth.security import require_permission

load_dotenv()

router = APIRouter(
    prefix="/optimization",
    tags=["Optimization Recommendations"]
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

class WindowRecommendationRequest(BaseModel):
    corridor: str
    date: str
    start: str
    end: str
    block_id: str | None = None


# =========================================================
# RECOMMEND ALTERNATIVE WINDOWS
# =========================================================

@router.post("/recommend-windows", dependencies=[Depends(require_permission("optimizer.simulate"))])
def recommend_windows(request: WindowRecommendationRequest):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # =====================================================
        # 1. PARSE REQUESTED WINDOW
        # =====================================================

        requested_date = datetime.strptime(
            request.date,
            "%Y-%m-%d"
        ).date()

        requested_start = datetime.strptime(
            request.start,
            "%H:%M"
        ).time()

        requested_end = datetime.strptime(
            request.end,
            "%H:%M"
        ).time()

        start_dt = datetime.combine(
            requested_date,
            requested_start
        )

        end_dt = datetime.combine(
            requested_date,
            requested_end
        )

        duration_minutes = int(
            (end_dt - start_dt).total_seconds() / 60
        )

        if duration_minutes <= 0:
            return {
                "status": "error",
                "message": "End time must be after start time"
            }

        # =====================================================
        # 2. GET AI PRIORITY CONTEXT
        # =====================================================

        task_count = 0
        avg_ai_priority = 0.0
        high_priority_tasks = 0

        # -----------------------------------------------------
        # If block_id is available:
        # Use the ACTUAL maintenance tasks assigned to the
        # optimized block.
        #
        # optimized_blocks
        #       ↓
        # block_tasks
        #       ↓
        # maintenance_tasks
        #       ↓
        # AI priority_score / priority_category
        # -----------------------------------------------------

        if request.block_id:

            cursor.execute(
                """
                SELECT
                    COUNT(*) AS task_count,
                    COALESCE(
                        AVG(mt.priority_score),
                        0
                    ) AS avg_ai_priority,
                    COUNT(
                        CASE
                            WHEN mt.priority_category = 'HIGH'
                            THEN 1
                        END
                    ) AS high_priority_tasks
                FROM block_tasks bt
                JOIN maintenance_tasks mt
                    ON bt.task_id = mt.task_id
                WHERE bt.block_id = %s
                """,
                (request.block_id,)
            )

            row = cursor.fetchone()

            if row:
                task_count = row[0] or 0
                avg_ai_priority = float(row[1] or 0)
                high_priority_tasks = row[2] or 0

        # -----------------------------------------------------
        # Fallback:
        # If no block_id is provided or the block has no tasks,
        # find maintenance tasks associated with assets on
        # the requested corridor/date.
        # -----------------------------------------------------

        if task_count == 0:

            cursor.execute(
                """
                SELECT
                    COUNT(*) AS task_count,
                    COALESCE(
                        AVG(mt.priority_score),
                        0
                    ) AS avg_ai_priority,
                    COUNT(
                        CASE
                            WHEN mt.priority_category = 'HIGH'
                            THEN 1
                        END
                    ) AS high_priority_tasks
                FROM maintenance_tasks mt
                JOIN assets a
                    ON mt.asset_id = a.asset_id
                WHERE a.corridor_id = %s
                AND (
                    mt.due_date = %s
                    OR mt.created_date = %s
                )
                """,
                (
                    request.corridor,
                    requested_date,
                    requested_date
                )
            )

            row = cursor.fetchone()

            if row:
                task_count = row[0] or 0
                avg_ai_priority = float(row[1] or 0)
                high_priority_tasks = row[2] or 0

        # =====================================================
        # 3. AI PRIORITY BONUS
        # =====================================================

        ai_priority_bonus = min(
            20.0,
            avg_ai_priority * 0.20
        )

        high_priority_bonus = min(
            5.0,
            high_priority_tasks * 1.0
        )

        # =====================================================
        # 4. GENERATE CANDIDATE WINDOWS
        # =====================================================

        candidates = []

        # Search from 05:00 to 23:00

        search_start = datetime.combine(
            requested_date,
            datetime.strptime(
                "05:00",
                "%H:%M"
            ).time()
        )

        search_end = datetime.combine(
            requested_date,
            datetime.strptime(
                "23:00",
                "%H:%M"
            ).time()
        )

        current_start = search_start

        while current_start + timedelta(
            minutes=duration_minutes
        ) <= search_end:

            current_end = current_start + timedelta(
                minutes=duration_minutes
            )

            # =================================================
            # Don't recommend the exact same window
            # =================================================

            if not (
                current_start == start_dt
                and current_end == end_dt
            ):

                # =============================================
                # 5. COUNT TRAIN CONFLICTS
                # =============================================

                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM trains
                    WHERE corridor_id = %s
                    AND travel_date = %s
                    AND arrival_time < %s
                    AND departure_time > %s
                    """,
                    (
                        request.corridor,
                        requested_date,
                        current_end.time(),
                        current_start.time()
                    )
                )

                conflicts = cursor.fetchone()[0]

                # =============================================
                # 6. CALCULATE UTILIZATION
                # =============================================

                # Base utilization for an available window.
                utilization = 70.0

                if task_count > 0:
                    utilization = min(
                        100.0,
                        70.0 + (task_count * 8.0)
                    )

                # =============================================
                # 7. RISK LEVEL
                # =============================================

                if conflicts == 0:
                    risk = "LOW"

                elif conflicts <= 2:
                    risk = "MEDIUM"

                else:
                    risk = "HIGH"

                # =============================================
                # 8. SCORE CALCULATION
                # =============================================

                # Train conflict penalty
                conflict_penalty = conflicts * 20

                # Better utilization gets a bonus
                utilization_bonus = (
                    utilization * 0.25
                )

                # AI maintenance priority bonus
                ai_priority_bonus = min(
                    20.0,
                    avg_ai_priority * 0.20
                )

                # HIGH priority task bonus
                high_priority_bonus = min(
                    5.0,
                    high_priority_tasks * 1.0
                )

                # Final recommendation score
                score = (
                    100
                    - conflict_penalty
                    + utilization_bonus
                    + ai_priority_bonus
                    + high_priority_bonus
                )

                # Keep score within 0–100
                score = max(
                    0,
                    min(
                        100,
                        round(score, 2)
                    )
                )

                # =============================================
                # 9. STORE CANDIDATE
                # =============================================

                candidates.append({

                    "start":
                        current_start.strftime(
                            "%H:%M:%S"
                        ),

                    "end":
                        current_end.strftime(
                            "%H:%M:%S"
                        ),

                    "duration_minutes":
                        duration_minutes,

                    "train_conflicts":
                        conflicts,

                    "utilization_percent":
                        round(
                            utilization,
                            2
                        ),

                    "risk_level":
                        risk,

                    # AI information
                    "average_ai_priority":
                        round(
                            avg_ai_priority,
                            2
                        ),

                    "high_priority_tasks":
                        high_priority_tasks,

                    "ai_priority_bonus":
                        round(
                            ai_priority_bonus,
                            2
                        ),

                    "high_priority_bonus":
                        round(
                            high_priority_bonus,
                            2
                        ),

                    # Final score
                    "optimization_score":
                        score
                })

            # Move to next 30-minute window
            current_start += timedelta(
                minutes=30
            )

        # =====================================================
        # 10. SORT BEST WINDOWS FIRST
        # =====================================================

        candidates.sort(
            key=lambda x: (
                x["train_conflicts"],
                -x["optimization_score"]
            )
        )

        # Return top 5
        recommended_windows = candidates[:5]

        # =====================================================
        # 11. GENERATE RECOMMENDATION MESSAGE
        # =====================================================

        if recommended_windows:

            best = recommended_windows[0]

            recommendation = (
                f"Recommended alternative window is "
                f"{best['start']}–{best['end']} "
                f"with "
                f"{best['train_conflicts']} train conflicts "
                f"and an AI-assisted optimization score of "
                f"{best['optimization_score']}."
            )

        else:

            recommendation = (
                "No suitable alternative maintenance "
                "windows were found."
            )

        # =====================================================
        # 12. RETURN RESPONSE
        # =====================================================

        return {

            "status":
                "success",

            "requested_window": {

                "corridor":
                    request.corridor,

                "date":
                    str(requested_date),

                "start":
                    request.start,

                "end":
                    request.end,

                "duration_minutes":
                    duration_minutes
            },

            # ================================================
            # AI CONTEXT
            # ================================================

            "ai_context": {

                "block_id":
                    request.block_id,

                "maintenance_tasks":
                    task_count,

                "average_ai_priority":
                    round(
                        avg_ai_priority,
                        2
                    ),

                "high_priority_tasks":
                    high_priority_tasks,

                "ai_priority_bonus":
                    round(
                        ai_priority_bonus,
                        2
                    ),

                "high_priority_bonus":
                    round(
                        high_priority_bonus,
                        2
                    )
            },

            "recommendation":
                recommendation,

            "total_candidates_evaluated":
                len(candidates),

            "recommended_windows":
                recommended_windows
        }

    # =========================================================
    # ERROR HANDLING
    # =========================================================

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }

    # =========================================================
    # CLEANUP
    # =========================================================

    finally:

        cursor.close()
        conn.close()