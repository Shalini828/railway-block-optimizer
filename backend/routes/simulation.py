from fastapi import APIRouter
from pydantic import BaseModel
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/optimization",
    tags=["Optimization Simulation"]
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
        password=os.getenv("DB_PASSWORD")
    )


# ============================================================
# REQUEST MODEL
# ============================================================

class SimulationRequest(BaseModel):

    corridor: str
    date: str
    start: str
    end: str

    # Optional:
    # If supplied, the simulator will use the tasks
    # currently assigned to this block.
    block_id: str | None = None


# ============================================================
# TIME FUNCTIONS
# ============================================================

def time_to_minutes(value):

    if hasattr(value, "hour"):

        return (
            value.hour * 60
            + value.minute
        )

    parts = str(value).split(":")

    return (
        int(parts[0]) * 60
        + int(parts[1])
    )


def minutes_to_string(minutes):

    minutes = minutes % 1440

    hour = minutes // 60
    minute = minutes % 60

    return f"{hour:02d}:{minute:02d}:00"


# ============================================================
# TRAIN IMPACT
# ============================================================

def calculate_train_impact(
    cursor,
    corridor,
    block_date,
    start_time,
    end_time
):

    cursor.execute(
        """
        SELECT
            train_id,
            train_number,
            train_name,
            train_type,
            arrival_time,
            departure_time
        FROM trains
        WHERE corridor_id = %s
          AND travel_date = %s
        """,
        (
            corridor,
            block_date
        )
    )

    trains = cursor.fetchall()

    block_start = time_to_minutes(start_time)
    block_end = time_to_minutes(end_time)

    conflicts = []

    impact_score = 0
    estimated_delay = 0

    for train in trains:

        (
            train_id,
            train_number,
            train_name,
            train_type,
            arrival,
            departure
        ) = train

        train_start = time_to_minutes(arrival)
        train_end = time_to_minutes(departure)

        # Handle overnight train
        if train_end < train_start:

            train_end += 1440

        # Handle overnight block
        actual_block_end = block_end

        if actual_block_end < block_start:

            actual_block_end += 1440

        # Overlap detection
        conflict = (
            block_start < train_end
            and train_start < actual_block_end
        )

        if not conflict:
            continue

        # Calculate overlap
        overlap_start = max(
            block_start,
            train_start
        )

        overlap_end = min(
            actual_block_end,
            train_end
        )

        overlap_minutes = max(
            0,
            overlap_end - overlap_start
        )

        # ----------------------------------------
        # IMPACT WEIGHT
        # ----------------------------------------

        if train_type == "EXPRESS":

            impact = 40
            delay = 10

        elif train_type == "PASSENGER":

            impact = 25
            delay = 5

        elif train_type == "FREIGHT":

            impact = 15
            delay = 5

        else:

            impact = 20
            delay = 5

        impact_score += impact

        # Increase delay when overlap is significant
        if overlap_minutes >= 30:

            estimated_delay += delay

        elif overlap_minutes > 0:

            estimated_delay += max(
                2,
                delay // 2
            )

        conflicts.append(
            {
                "train_id": train_id,
                "train_number": train_number,
                "train_name": train_name,
                "train_type": train_type,
                "overlap_minutes": overlap_minutes,
                "estimated_delay_minutes":
                    max(
                        2,
                        delay
                        if overlap_minutes >= 30
                        else delay // 2
                    )
            }
        )

    impact_score = min(
        impact_score,
        100
    )

    return (
        conflicts,
        impact_score,
        estimated_delay
    )


# ============================================================
# GET TASK INTERVALS
# ============================================================

def get_block_tasks(
    cursor,
    block_id
):

    cursor.execute(
        """
        SELECT
            bt.task_id,
            br.requested_start,
            br.requested_end,
            br.requested_duration_min
        FROM block_tasks bt

        LEFT JOIN block_requests br
            ON br.task_id = bt.task_id

        WHERE bt.block_id = %s
        """,
        (block_id,)
    )

    return cursor.fetchall()


# ============================================================
# MAINTENANCE UTILIZATION
# ============================================================

def calculate_utilization(
    cursor,
    block_id,
    new_start,
    new_end
):

    if not block_id:

        return {
            "utilization_percent": 0,
            "tasks_considered": 0
        }

    tasks = get_block_tasks(
        cursor,
        block_id
    )

    if not tasks:

        return {
            "utilization_percent": 0,
            "tasks_considered": 0
        }

    original_start = time_to_minutes(
        tasks[0][1]
    )

    simulated_start = time_to_minutes(
        new_start
    )

    shift = (
        simulated_start
        - original_start
    )

    intervals = []

    for task in tasks:

        task_start = time_to_minutes(
            task[1]
        )

        task_end = time_to_minutes(
            task[2]
        )

        if task_end < task_start:

            task_end += 1440

        # Move task together with the block
        task_start += shift
        task_end += shift

        intervals.append(
            (
                task_start,
                task_end
            )
        )

    intervals.sort()

    occupied_start = None
    occupied_end = None
    occupied_minutes = 0

    for start, end in intervals:

        if occupied_start is None:

            occupied_start = start
            occupied_end = end

        elif start <= occupied_end:

            occupied_end = max(
                occupied_end,
                end
            )

        else:

            occupied_minutes += (
                occupied_end
                - occupied_start
            )

            occupied_start = start
            occupied_end = end

    if occupied_start is not None:

        occupied_minutes += (
            occupied_end
            - occupied_start
        )

    block_start = time_to_minutes(
        new_start
    )

    block_end = time_to_minutes(
        new_end
    )

    if block_end < block_start:

        block_end += 1440

    block_duration = (
        block_end
        - block_start
    )

    if block_duration <= 0:

        utilization = 0

    else:

        utilization = (
            occupied_minutes
            / block_duration
        ) * 100

    utilization = round(
        min(utilization, 100),
        2
    )

    return {
        "utilization_percent": utilization,
        "tasks_considered": len(tasks)
    }


# ============================================================
# OPTIMIZATION SCORE
# ============================================================

def calculate_optimization_score(
    utilization,
    train_impact,
    train_conflicts,
    duration
):

    # Maintenance efficiency
    utilization_component = (
        utilization
    )

    # Train safety
    train_component = (
        100 - train_impact
    )

    # Conflict penalty
    conflict_penalty = min(
        len(train_conflicts) * 10,
        30
    )

    # Very long blocks receive a small penalty
    duration_penalty = 0

    if duration > 240:

        duration_penalty = min(
            (duration - 240) * 0.05,
            10
        )

    score = (
        utilization_component * 0.5
        +
        train_component * 0.5
        -
        conflict_penalty
        -
        duration_penalty
    )

    return round(
        max(
            0,
            min(score, 100)
        ),
        2
    )


# ============================================================
# RISK LEVEL
# ============================================================

def calculate_risk(
    train_impact,
    train_conflicts,
    estimated_delay
):

    if (
        train_impact >= 60
        or estimated_delay >= 20
        or len(train_conflicts) >= 3
    ):

        return "HIGH"

    if (
        train_impact >= 25
        or estimated_delay > 0
        or len(train_conflicts) > 0
    ):

        return "MEDIUM"

    return "LOW"


# ============================================================
# WHAT-IF SIMULATION
# ============================================================

@router.post("/simulate")
def simulate_optimization(
    request: SimulationRequest
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ====================================================
        # VALIDATE TIME
        # ====================================================

        start_minutes = time_to_minutes(
            request.start
        )

        end_minutes = time_to_minutes(
            request.end
        )

        if end_minutes < start_minutes:

            end_minutes += 1440

        duration = (
            end_minutes
            - start_minutes
        )

        if duration <= 0:

            return {
                "status": "error",
                "message":
                    "Simulation end time must be after start time"
            }

        # ====================================================
        # TRAIN ANALYSIS
        # ====================================================

        (
            conflicts,
            train_impact,
            estimated_delay
        ) = calculate_train_impact(
            cursor,
            request.corridor,
            request.date,
            request.start,
            request.end
        )

        # ====================================================
        # MAINTENANCE UTILIZATION
        # ====================================================

        utilization_data = calculate_utilization(
            cursor,
            request.block_id,
            request.start,
            request.end
        )

        utilization = (
            utilization_data[
                "utilization_percent"
            ]
        )

        tasks_considered = (
            utilization_data[
                "tasks_considered"
            ]
        )

        # ====================================================
        # OPTIMIZATION SCORE
        # ====================================================

        optimization_score = (
            calculate_optimization_score(
                utilization,
                train_impact,
                conflicts,
                duration
            )
        )

        # ====================================================
        # RISK
        # ====================================================

        risk_level = calculate_risk(
            train_impact,
            conflicts,
            estimated_delay
        )

        # ====================================================
        # EXPLANATION
        # ====================================================

        explanation = []

        if len(conflicts) == 0:

            explanation.append(
                "No train schedule conflicts detected"
            )

        else:

            explanation.append(
                f"{len(conflicts)} train conflict(s) detected"
            )

        if utilization >= 90:

            explanation.append(
                "High maintenance utilization"
            )

        elif utilization >= 70:

            explanation.append(
                "Good maintenance utilization"
            )

        elif tasks_considered > 0:

            explanation.append(
                "Low maintenance utilization in this window"
            )

        if estimated_delay == 0:

            explanation.append(
                "No estimated train delay"
            )

        else:

            explanation.append(
                f"Estimated train delay: "
                f"{estimated_delay} minutes"
            )

        if risk_level == "LOW":

            recommendation = (
                "This window is operationally safe "
                "and suitable for maintenance."
            )

        elif risk_level == "MEDIUM":

            recommendation = (
                "This window is usable but should "
                "be reviewed for operational impact."
            )

        else:

            recommendation = (
                "Avoid this window if possible. "
                "Significant operational impact detected."
            )

        # ====================================================
        # RESPONSE
        # ====================================================

        return {

            "status": "success",

            "simulation": {

                "corridor":
                    request.corridor,

                "date":
                    request.date,

                "start":
                    request.start,

                "end":
                    request.end,

                "duration_minutes":
                    duration
            },

            "results": {

                "utilization_percent":
                    utilization,

                "train_impact_score":
                    train_impact,

                "train_conflicts":
                    len(conflicts),

                "estimated_delay_minutes":
                    estimated_delay,

                "optimization_score":
                    optimization_score,

                "risk_level":
                    risk_level,

                "tasks_considered":
                    tasks_considered
            },

            "conflicts":
                conflicts,

            "explanation":
                explanation,

            "recommendation":
                recommendation,

            "database_modified":
                False
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        cursor.close()
        conn.close()