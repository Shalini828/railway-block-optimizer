from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta
import psycopg
import os
from dotenv import load_dotenv

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

@router.post("/recommend-windows")
def recommend_windows(request: WindowRecommendationRequest):

    conn = None
    cursor = None

    try:
        # -------------------------------------------------
        # Open database connection
        # -------------------------------------------------

        conn = get_connection()
        cursor = conn.cursor()

        # -------------------------------------------------
        # Parse requested date and time
        # -------------------------------------------------

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

        # -------------------------------------------------
        # Validate duration
        # -------------------------------------------------

        if duration_minutes <= 0:
            return {
                "status": "error",
                "message": "End time must be after start time"
            }

        # -------------------------------------------------
        # Generate candidate windows
        # -------------------------------------------------

        candidates = []

        # Search between 05:00 and 23:00
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

        while (
            current_start
            + timedelta(minutes=duration_minutes)
            <= search_end
        ):

            current_end = (
                current_start
                + timedelta(minutes=duration_minutes)
            )

            # -------------------------------------------------
            # Don't recommend the exact same requested window
            # -------------------------------------------------

            if not (
                current_start == start_dt
                and current_end == end_dt
            ):

                # -------------------------------------------------
                # Count train conflicts
                #
                # A train conflicts when:
                #
                # arrival_time < candidate_end
                # AND
                # departure_time > candidate_start
                # -------------------------------------------------

                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM public.trains
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

                # -------------------------------------------------
                # Calculate utilization
                #
                # We cannot use maintenance_tasks here because
                # that table does not contain corridor_id or
                # task_date.
                #
                # Instead, estimate window utilization from
                # train conflicts.
                # -------------------------------------------------

                if conflicts == 0:
                    utilization = 100.0
                elif conflicts == 1:
                    utilization = 80.0
                elif conflicts == 2:
                    utilization = 60.0
                elif conflicts == 3:
                    utilization = 40.0
                else:
                    utilization = max(
                        20.0,
                        100.0 - (conflicts * 15.0)
                    )

                # -------------------------------------------------
                # Risk calculation
                # -------------------------------------------------

                if conflicts == 0:
                    risk = "LOW"

                elif conflicts <= 2:
                    risk = "MEDIUM"

                else:
                    risk = "HIGH"

                # -------------------------------------------------
                # Optimization score
                #
                # Fewer conflicts = better score
                # Higher utilization = better score
                # -------------------------------------------------

                conflict_penalty = conflicts * 25

                utilization_bonus = (
                    utilization * 0.20
                )

                score = (
                    80
                    - conflict_penalty
                    + utilization_bonus
                )

                score = max(
                    0,
                    min(
                        100,
                        round(score, 2)
                    )
                )

                # -------------------------------------------------
                # Add candidate
                # -------------------------------------------------

                candidates.append(
                    {
                        "start": current_start.strftime(
                            "%H:%M:%S"
                        ),

                        "end": current_end.strftime(
                            "%H:%M:%S"
                        ),

                        "duration_minutes": duration_minutes,

                        "train_conflicts": conflicts,

                        "utilization_percent": round(
                            utilization,
                            2
                        ),

                        "risk_level": risk,

                        "optimization_score": score
                    }
                )

            # -------------------------------------------------
            # Move to next candidate by 30 minutes
            # -------------------------------------------------

            current_start += timedelta(
                minutes=30
            )

        # =================================================
        # SORT CANDIDATES
        # =================================================

        candidates.sort(
            key=lambda x: (
                x["train_conflicts"],
                -x["optimization_score"]
            )
        )

        # =================================================
        # TOP 5 RECOMMENDATIONS
        # =================================================

        recommended_windows = candidates[:5]

        # =================================================
        # RECOMMENDATION MESSAGE
        # =================================================

        if recommended_windows:

            best = recommended_windows[0]

            recommendation = (
                f"Best alternative window is "
                f"{best['start']}–{best['end']} with "
                f"{best['train_conflicts']} train conflicts "
                f"and an optimization score of "
                f"{best['optimization_score']}."
            )

        else:

            recommendation = (
                "No suitable alternative maintenance "
                "windows were found."
            )

        # =================================================
        # RESPONSE
        # =================================================

        return {
            "status": "success",

            "requested_window": {
                "corridor": request.corridor,
                "date": str(requested_date),
                "start": request.start,
                "end": request.end,
                "duration_minutes": duration_minutes
            },

            "recommendation": recommendation,

            "total_candidates_evaluated": len(
                candidates
            ),

            "recommended_windows":
                recommended_windows
        }

    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }

    # =====================================================
    # CLOSE DATABASE
    # =====================================================

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()