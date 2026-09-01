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

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # -------------------------------------------------
        # Parse requested window
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

        if duration_minutes <= 0:
            return {
                "status": "error",
                "message": "End time must be after start time"
            }

        # -------------------------------------------------
        # Generate candidate windows
        # -------------------------------------------------

        candidates = []

        # Search from 05:00 to 23:00
        search_start = datetime.combine(
            requested_date,
            datetime.strptime("05:00", "%H:%M").time()
        )

        search_end = datetime.combine(
            requested_date,
            datetime.strptime("23:00", "%H:%M").time()
        )

        current_start = search_start

        while current_start + timedelta(
            minutes=duration_minutes
        ) <= search_end:

            current_end = current_start + timedelta(
                minutes=duration_minutes
            )

            # Don't recommend the exact same window
            if not (
                current_start == start_dt
                and current_end == end_dt
            ):

                # -------------------------------------------------
                # Count train conflicts
                # -------------------------------------------------

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

                # -------------------------------------------------
                # Calculate utilization
                # -------------------------------------------------

                utilization = 100.0

                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM maintenance_tasks
                    WHERE corridor_id = %s
                    AND task_date = %s
                    """,
                    (
                        request.corridor,
                        requested_date
                    )
                )

                task_count = cursor.fetchone()[0]

                if task_count > 0:
                    utilization = min(
                        100.0,
                        70.0 + (task_count * 8.0)
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
                # Score calculation
                # -------------------------------------------------

                conflict_penalty = conflicts * 20
                utilization_bonus = utilization * 0.25

                score = (
                    100
                    - conflict_penalty
                    + utilization_bonus
                )

                score = max(
                    0,
                    min(100, round(score, 2))
                )

                candidates.append({
                    "start": current_start.strftime("%H:%M:%S"),
                    "end": current_end.strftime("%H:%M:%S"),
                    "duration_minutes": duration_minutes,
                    "train_conflicts": conflicts,
                    "utilization_percent": round(
                        utilization,
                        2
                    ),
                    "risk_level": risk,
                    "optimization_score": score
                })

            # Move by 30 minutes
            current_start += timedelta(minutes=30)

        # -------------------------------------------------
        # Sort best windows first
        # -------------------------------------------------

        candidates.sort(
            key=lambda x: (
                x["train_conflicts"],
                -x["optimization_score"]
            )
        )

        # Return top 5
        recommended_windows = candidates[:5]

        # -------------------------------------------------
        # Generate recommendation message
        # -------------------------------------------------

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

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        cursor.close()
        conn.close()