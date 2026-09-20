import sys
import os

sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)
import psycopg
from dotenv import load_dotenv

from ml.predict_service import predict_asset_risk
from ml.traffic_predict_service import predict_traffic_impact
from ml.goods_forecast_service import predict_goods_train_demand

load_dotenv()
# ==========================================
# SETTINGS
# ==========================================

MAX_BLOCK_DURATION = 240       # 4 hours
MAX_CONSOLIDATION_GAP = 15     # 15 minutes

# ==========================================
# AI OPTIMIZATION WEIGHTS
# ==========================================

WEIGHT_MAINTENANCE_PRIORITY = 0.25
WEIGHT_ASSET_RISK = 0.20
WEIGHT_UTILIZATION = 0.20
WEIGHT_TRAFFIC = 0.15
WEIGHT_GOODS = 0.10
WEIGHT_CONSOLIDATION = 0.10


# ==========================================
# DATABASE CONNECTION
# ==========================================

connection = psycopg.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD")
)

cursor = connection.cursor()


# ==========================================
# DEVELOPMENT RESET
# ==========================================

cursor.execute("""
    UPDATE block_requests
    SET request_status = 'PENDING'
    WHERE request_status = 'OPTIMIZED'
""")

connection.commit()

print("DEVELOPMENT: OPTIMIZED requests reset to PENDING")


# ==========================================
# GET BLOCK REQUESTS + PRIORITY
# ==========================================

cursor.execute("""
    SELECT
        br.request_id,
        br.task_id,
        br.team_id,
        br.corridor_id,
        br.requested_date,
        br.requested_start,
        br.requested_end,
        br.requested_duration_min,
        COALESCE(mt.priority_score, 0)
    FROM block_requests br

    LEFT JOIN maintenance_tasks mt
        ON br.task_id = mt.task_id

    WHERE br.request_status = 'PENDING'

    ORDER BY
        br.corridor_id,
        br.requested_date,
        mt.priority_score DESC,
        br.requested_start
""")

requests = cursor.fetchall()


# ==========================================
# GET BLOCK REQUESTS + PRIORITY
# ==========================================

cursor.execute("""
    SELECT
        br.request_id,
        br.task_id,
        br.team_id,
        br.corridor_id,
        br.requested_date,
        br.requested_start,
        br.requested_end,
        br.requested_duration_min,
        COALESCE(mt.priority_score, 0)
    FROM block_requests br

    LEFT JOIN maintenance_tasks mt
        ON br.task_id = mt.task_id

    WHERE br.request_status = 'PENDING'

    ORDER BY
        br.corridor_id,
        br.requested_date,
        mt.priority_score DESC,
        br.requested_start
""")

requests = cursor.fetchall()

# ==========================================
# DEBUG REQUEST STATUS
# ==========================================

cursor.execute("""
    SELECT request_status, COUNT(*)
    FROM block_requests
    GROUP BY request_status
    ORDER BY request_status
""")

request_status_counts = cursor.fetchall()

print()
print("REQUEST STATUS COUNTS:")
print("--------------------------------")

for status, count in request_status_counts:
    print(f"{status}: {count}")

print("--------------------------------")
print()


# ==========================================
# GET TRAINS
# ==========================================

cursor.execute("""
    SELECT
        train_id,
        train_number,
        train_name,
        train_type,
        corridor_id,
        travel_date,
        arrival_time,
        departure_time
    FROM trains
""")

trains = cursor.fetchall()


# ==========================================
# TIME FUNCTIONS
# ==========================================

def time_to_minutes(t):
    """
    Convert either a datetime.time object or a HH:MM string
    into minutes from midnight.
    """

    if isinstance(t, str):
        parts = t.split(":")

        hour = int(parts[0])
        minute = int(parts[1])

        return hour * 60 + minute

    return t.hour * 60 + t.minute

def minutes_to_time(minutes):

    minutes = minutes % (24 * 60)

    hour = minutes // 60
    minute = minutes % 60

    return f"{hour:02d}:{minute:02d}:00"



# ==========================================
# AI SCORING HELPERS
# ==========================================

def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def calculate_asset_risk_for_task(task_id):
    """
    Calculate AI asset risk for a maintenance task.
    """

    cursor.execute("""
        SELECT
            mt.asset_id,
            a.asset_id,
            a.criticality,
            a.health_score,
            a.failure_risk,
            a.installation_date,
            a.last_inspection_date
        FROM maintenance_tasks mt
        LEFT JOIN assets a
            ON mt.asset_id = a.asset_id
        WHERE mt.task_id = %s
    """, (task_id,))

    row = cursor.fetchone()

    if not row or not row[1]:
        return 0.0

    asset = {
        "asset_id": row[1],
        "criticality": row[2] or 3,
        "health_score": row[3] or 70,
        "failure_risk": row[4] or 30,
        "installation_date": row[5],
        "last_inspection_date": row[6],
    }

    cursor.execute("""
        SELECT
            severity,
            safety_impact,
            repeat_failure
        FROM defects
        WHERE asset_id = %s
    """, (row[1],))

    defect_rows = cursor.fetchall()

    defects = [
        {
            "severity": d[0],
            "safety_impact": d[1],
            "repeat_failure": d[2],
        }
        for d in defect_rows
    ]

    cursor.execute("""
        SELECT
            maintenance_type,
            failure_after_maintenance
        FROM maintenance_history
        WHERE asset_id = %s
    """, (row[1],))

    history_rows = cursor.fetchall()

    maintenance_history = [
        {
            "maintenance_type": h[0],
            "failure_after_maintenance": h[1],
        }
        for h in history_rows
    ]

    prediction = predict_asset_risk(
        asset=asset,
        defects=defects,
        maintenance_history=maintenance_history,
    )

    return safe_float(
        prediction.get("risk_score"),
        0.0
    )


def calculate_goods_impact(
    corridor_id,
    block_date,
    start_hour,
):
    """
    Get predicted goods traffic for this corridor/time.
    """

    previous_day_demand = 20.0

    cursor.execute("""
        SELECT expected_goods_trains
        FROM goods_train_forecast
        WHERE corridor_id = %s
          AND forecast_date < %s
        ORDER BY forecast_date DESC, forecast_id DESC
        LIMIT 1
    """, (
        corridor_id,
        block_date,
    ))

    previous_row = cursor.fetchone()

    if previous_row:
        previous_day_demand = safe_float(
            previous_row[0],
            20.0
        )

    cursor.execute("""
        SELECT traffic_level
        FROM corridors
        WHERE corridor_id = %s
    """, (corridor_id,))

    traffic_row = cursor.fetchone()

    traffic_level = (
        str(traffic_row[0]).upper()
        if traffic_row and traffic_row[0]
        else "MEDIUM"
    )

    traffic_pressure = {
        "LOW": 25,
        "MEDIUM": 50,
        "HIGH": 75,
        "VERY HIGH": 90,
        "CRITICAL": 100,
    }

    operational_pressure = traffic_pressure.get(
        traffic_level,
        50
    )

    industrial_demand = min(
        100,
        operational_pressure + 10
    )

    result = predict_goods_train_demand(
        day_of_week=block_date.weekday(),
        month=block_date.month,
        is_weekend=int(block_date.weekday() >= 5),
        festival_period=int(
            block_date.month in [9, 10, 11]
        ),
        operational_pressure=operational_pressure,
        industrial_demand=industrial_demand,
        previous_day_demand=previous_day_demand,
        corridor_id=corridor_id,
        commodity="COAL",
    )

    predicted_goods = safe_float(
        result.get("predicted_goods_train_demand"),
        0.0
    )

    return min(
        100,
        round(
            (predicted_goods / 60) * 100,
            2
        )
    )


def calculate_traffic_impact(
    duration,
    start_hour,
    passenger_trains,
    goods_trains,
    special_trains,
    express_trains,
    corridor_congestion,
    criticality,
    maintenance_priority,
):
    """
    Existing traffic ML model.
    """

    result = predict_traffic_impact(
        block_duration_min=int(duration),
        start_hour=int(start_hour),
        passenger_trains=int(passenger_trains),
        goods_trains=int(goods_trains),
        special_trains=int(special_trains),
        express_trains=int(express_trains),
        corridor_congestion=float(
            corridor_congestion
        ),
        criticality=int(criticality),
        maintenance_priority=float(
            maintenance_priority
        ),
    )

    return result


# ==========================================
# TRAIN CONFLICT DETECTION
# ==========================================

def get_train_conflicts(
    corridor,
    block_date,
    start_time,
    end_time
):

    conflicts = []

    block_start = time_to_minutes(start_time)
    block_end = time_to_minutes(end_time)


    for train in trains:

        (
            train_id,
            train_number,
            train_name,
            train_type,
            train_corridor,
            train_date,
            arrival,
            departure
        ) = train


        if train_corridor != corridor:
            continue

        if train_date != block_date:
            continue


        train_start = time_to_minutes(arrival)
        train_end = time_to_minutes(departure)


        if (
            block_start < train_end
            and train_start < block_end
        ):

            conflicts.append(
                {
                    "train_id": train_id,
                    "train_number": train_number,
                    "train_name": train_name,
                    "train_type": train_type
                }
            )


    return conflicts


# ==========================================
# CANDIDATE WINDOW GENERATOR
# ==========================================

def generate_candidate_windows(
    requested_start,
    requested_end,
    step_minutes=30,
    search_before_minutes=120,
    search_after_minutes=120
):
    """
    Generate alternative maintenance windows around
    the originally requested window.

    Example:
        Requested: 09:00 - 12:00

    Candidates:
        07:00 - 10:00
        07:30 - 10:30
        08:00 - 11:00
        ...
        11:00 - 14:00
        11:30 - 14:30
        12:00 - 15:00
    """

    start_minutes = time_to_minutes(
        requested_start
    )

    end_minutes = time_to_minutes(
        requested_end
    )

    duration = end_minutes - start_minutes

    if duration <= 0:
        duration += 24 * 60

    candidates = []

    search_start = (
        start_minutes
        - search_before_minutes
    )

    search_end = (
        start_minutes
        + search_after_minutes
    )

    current_start = search_start

    while current_start <= search_end:

        current_end = (
            current_start + duration
        )

        # Don't create windows longer than
        # the maximum allowed block duration.
        if duration <= MAX_BLOCK_DURATION:

            candidates.append(
                {
                    "start": minutes_to_time(
                        current_start
                    ),
                    "end": minutes_to_time(
                        current_end
                    ),
                    "duration": duration,
                }
            )

        current_start += step_minutes

    return candidates


# ==========================================
# AI CANDIDATE WINDOW SCORING
# ==========================================

def score_candidate_window(
    corridor,
    block_date,
    candidate,
    group,
    maintenance_priority,
    utilization
):
    """
    Evaluate one candidate maintenance window
    using the existing AI/ML services.
    """

    candidate_start = candidate["start"]
    candidate_end = candidate["end"]
    duration = candidate["duration"]

    # --------------------------------------
    # Train conflicts
    # --------------------------------------

    conflicts = get_train_conflicts(
        corridor,
        block_date,
        candidate_start,
        candidate_end
    )

    passenger_trains = 0
    goods_trains = 0
    special_trains = 0
    express_trains = 0

    for train in conflicts:

        train_type = str(
            train.get("train_type", "")
        ).upper()

        if train_type == "EXPRESS":

            express_trains += 1
            passenger_trains += 1

        elif train_type in (
            "PASSENGER",
            "MAIL",
            "SUPERFAST"
        ):

            passenger_trains += 1

        elif train_type in (
            "FREIGHT",
            "GOODS"
        ):

            goods_trains += 1

        elif train_type in (
            "SPECIAL",
            "FESTIVAL"
        ):

            special_trains += 1

        else:

            passenger_trains += 1

    # --------------------------------------
    # Asset risk
    # --------------------------------------

    asset_risks = []

    for request in group["requests"]:

        task_id = request[1]

        try:

            risk = calculate_asset_risk_for_task(
                task_id
            )

            asset_risks.append(risk)

        except Exception as exc:

            print(
                "CANDIDATE ASSET RISK ERROR:",
                task_id,
                exc
            )

    asset_risk_score = (
        max(asset_risks)
        if asset_risks
        else 0
    )

    # --------------------------------------
    # Corridor traffic
    # --------------------------------------

    cursor.execute("""
        SELECT traffic_level
        FROM corridors
        WHERE corridor_id = %s
    """, (corridor,))

    corridor_row = cursor.fetchone()

    traffic_level = (
        str(corridor_row[0]).upper()
        if corridor_row and corridor_row[0]
        else "MEDIUM"
    )

    traffic_map = {
        "LOW": 25,
        "MEDIUM": 50,
        "HIGH": 75,
        "VERY HIGH": 90,
        "CRITICAL": 100
    }

    corridor_congestion = traffic_map.get(
        traffic_level,
        50
    )

    # --------------------------------------
    # Traffic ML
    # --------------------------------------

    try:

        traffic_prediction = predict_traffic_impact(
            block_duration_min=int(duration),
            start_hour=int(
                str(candidate_start)[:2]
            ),
            passenger_trains=passenger_trains,
            goods_trains=goods_trains,
            special_trains=special_trains,
            express_trains=express_trains,
            corridor_congestion=corridor_congestion,
            criticality=3,
            maintenance_priority=float(
                maintenance_priority
            )
        )

        traffic_impact = safe_float(
            traffic_prediction.get(
                "traffic_impact_score",
                traffic_prediction.get(
                    "impact_score",
                    0
                )
            ),
            0
        )

    except Exception as exc:

        print(
            "CANDIDATE TRAFFIC ML ERROR:",
            exc
        )

        traffic_impact = 0

    # --------------------------------------
    # Goods ML
    # --------------------------------------

    try:

        goods_impact = calculate_goods_impact(
            corridor_id=corridor,
            block_date=block_date,
            start_hour=int(
                str(candidate_start)[:2]
            )
        )

    except Exception as exc:

        print(
            "CANDIDATE GOODS ML ERROR:",
            exc
        )

        goods_impact = 0

    # --------------------------------------
    # Conflict penalty
    # --------------------------------------

    conflict_penalty = min(
        100,
        len(conflicts) * 20
    )

    # --------------------------------------
    # Consolidation
    # --------------------------------------

    number_of_tasks = len(
        group["requests"]
    )

    consolidation_score = min(
        100,
        number_of_tasks * 25
    )

    # --------------------------------------
    # Final candidate score
    # --------------------------------------

    candidate_score = (
        maintenance_priority
        * WEIGHT_MAINTENANCE_PRIORITY

        +

        asset_risk_score
        * WEIGHT_ASSET_RISK

        +

        utilization
        * WEIGHT_UTILIZATION

        +

        (100 - traffic_impact)
        * WEIGHT_TRAFFIC

        +

        (100 - goods_impact)
        * WEIGHT_GOODS

        +

        consolidation_score
        * WEIGHT_CONSOLIDATION

        -

        conflict_penalty
    )

    candidate_score = round(
        max(
            0,
            min(
                candidate_score,
                100
            )
        ),
        2
    )

    return {
        "start": candidate_start,
        "end": candidate_end,
        "duration": duration,

        "score": candidate_score,

        "asset_risk": round(
            asset_risk_score,
            2
        ),

        "traffic_impact": round(
            traffic_impact,
            2
        ),

        "goods_impact": round(
            goods_impact,
            2
        ),

        "conflicts": conflicts,

        "conflict_count": len(
            conflicts
        ),

        "utilization": utilization,

        "consolidation_score":
            consolidation_score
    }


# ==========================================
# GROUP COMPATIBLE REQUESTS
# ==========================================

groups = []

for request in requests:

    (
        request_id,
        task_id,
        team_id,
        corridor_id,
        request_date,
        request_start,
        request_end,
        duration,
        priority
    ) = request


    start = time_to_minutes(request_start)
    end = time_to_minutes(request_end)


    placed = False


    for group in groups:

        # Same corridor
        if group["corridor"] != corridor_id:
            continue

        # Same date
        if group["date"] != request_date:
            continue


        group_start = time_to_minutes(
            group["start"]
        )

        group_end = time_to_minutes(
            group["end"]
        )


        # Distance between request and group

        if start > group_end:

            gap = start - group_end

        elif group_start > end:

            gap = group_start - end

        else:

            gap = 0


        # New combined window

        combined_start = min(
            group_start,
            start
        )

        combined_end = max(
            group_end,
            end
        )


        combined_duration = (
            combined_end - combined_start
        )


        # ----------------------------------
        # CONSOLIDATION CONDITIONS
        # ----------------------------------

        if (
            gap <= MAX_CONSOLIDATION_GAP
            and combined_duration <= MAX_BLOCK_DURATION
        ):

            group["start"] = min(
                group["start"],
                request_start
            )

            group["end"] = max(
                group["end"],
                request_end
            )

            group["requests"].append(request)

            placed = True

            break


    # --------------------------------------
    # CREATE NEW GROUP
    # --------------------------------------

    if not placed:

        groups.append(
            {
                "corridor": corridor_id,
                "date": request_date,
                "start": request_start,
                "end": request_end,
                "requests": [request]
            }
        )

print("GROUPS CREATED:", len(groups))



# ==========================================
# AI EXPLAINABILITY
# ==========================================

def build_window_explanation(
    best_candidate,
    candidate_results,
    requested_start,
    requested_end,
    number_of_tasks,
    maintenance_priority,
    asset_risk_score,
    utilization,
    traffic_impact_score,
    goods_impact_score,
):
    """
    Build a human-readable explanation for why the AI
    selected the final maintenance window.

    This is decision-support metadata only. It does not
    change the optimization score or railway operations.
    """

    original_start_minutes = time_to_minutes(requested_start)

    ranked_candidates = sorted(
        candidate_results,
        key=lambda item: (
            item["score"],
            -item["conflict_count"],
            -abs(
                time_to_minutes(item["start"])
                - original_start_minutes
            )
        ),
        reverse=True,
    )

    requested_candidate = min(
        candidate_results,
        key=lambda item: abs(
            time_to_minutes(item["start"])
            - original_start_minutes
        )
    )

    score_delta = round(
        best_candidate["score"]
        - requested_candidate["score"],
        2,
    )

    reasons = []

    if best_candidate["conflict_count"] == 0:
        reasons.append(
            "No train conflicts in the selected window"
        )
    else:
        reasons.append(
            f"Selected with {best_candidate['conflict_count']} train conflict(s)"
        )

    if utilization >= 80:
        reasons.append(
            f"High block utilization ({utilization:.2f}%)"
        )

    if traffic_impact_score < 30:
        reasons.append(
            f"Low predicted traffic impact ({traffic_impact_score:.2f})"
        )
    else:
        reasons.append(
            f"Traffic impact considered ({traffic_impact_score:.2f})"
        )

    if goods_impact_score < 30:
        reasons.append(
            f"Low predicted goods impact ({goods_impact_score:.2f})"
        )
    else:
        reasons.append(
            f"Goods traffic impact considered ({goods_impact_score:.2f})"
        )

    if asset_risk_score >= 70:
        reasons.append(
            f"High-risk asset prioritized ({asset_risk_score:.2f})"
        )
    elif asset_risk_score > 0:
        reasons.append(
            f"Asset risk included in scoring ({asset_risk_score:.2f})"
        )

    if maintenance_priority >= 80:
        reasons.append(
            f"High-priority maintenance included ({maintenance_priority:.2f})"
        )
    else:
        reasons.append(
            f"Maintenance priority included ({maintenance_priority:.2f})"
        )

    if number_of_tasks >= 2:
        reasons.append(
            f"{number_of_tasks} maintenance tasks consolidated"
        )

    if score_delta > 0:
        reasons.append(
            f"AI score improved by {score_delta:.2f} over the requested window"
        )
    elif score_delta == 0:
        reasons.append(
            "Selected window ties the requested window on AI score"
        )

    alternatives = []

    for candidate in ranked_candidates:

        if candidate is best_candidate:
            continue

        alternatives.append(
            {
                "start": str(candidate["start"])[:5],
                "end": str(candidate["end"])[:5],
                "score": round(candidate["score"], 2),
                "conflicts": candidate["conflict_count"],
                "traffic_impact": round(
                    candidate["traffic_impact"],
                    2
                ),
                "goods_impact": round(
                    candidate["goods_impact"],
                    2
                ),
            }
        )

        if len(alternatives) >= 3:
            break

    return {
        "selected_window": (
            f"{str(best_candidate['start'])[:5]}-"
            f"{str(best_candidate['end'])[:5]}"
        ),
        "requested_window": (
            f"{str(requested_start)[:5]}-"
            f"{str(requested_end)[:5]}"
        ),
        "candidate_count": len(candidate_results),
        "selected_score": round(
            best_candidate["score"],
            2
        ),
        "requested_window_score": round(
            requested_candidate["score"],
            2
        ),
        "score_delta_vs_requested": score_delta,
        "reasons": reasons,
        "alternatives": alternatives,
        "factors": {
            "maintenance_priority": round(
                maintenance_priority,
                2
            ),
            "asset_risk": round(
                asset_risk_score,
                2
            ),
            "utilization": round(
                utilization,
                2
            ),
            "traffic_impact": round(
                traffic_impact_score,
                2
            ),
            "goods_impact": round(
                goods_impact_score,
                2
            ),
            "train_conflicts": best_candidate[
                "conflict_count"
            ],
            "consolidated_tasks": number_of_tasks,
        },
    }

# ==========================================
# CREATE OPTIMIZED BLOCKS
# ==========================================


optimized_blocks = []


block_number = 1


for group in groups:

    print("PROCESSING GROUP:", group["corridor"], group["date"])

    corridor = group["corridor"]
    block_date = group["date"]

    start_time = group["start"]
    end_time = group["end"]

    start_minutes = time_to_minutes(
        start_time
    )

    end_minutes = time_to_minutes(
        end_time
    )

    duration = end_minutes - start_minutes

    if duration < 0:
        duration += 1440

    # ======================================
    # CANDIDATE WINDOW OPTIMIZATION
    # ======================================

    candidate_windows = generate_candidate_windows(
        requested_start=start_time,
        requested_end=end_time,
        step_minutes=30,
        search_before_minutes=120,
        search_after_minutes=120
    )

    print()
    print(
        "CANDIDATE WINDOWS:",
        corridor,
        block_date
    )

    # ======================================
    # AI CANDIDATE WINDOW OPTIMIZATION
    # ======================================

    # Calculate maintenance priority before evaluating
    # candidate windows. The same group priority is used
    # for every candidate.
    maintenance_priority = max(
        [
            safe_float(request[8], 0)
            for request in group["requests"]
        ],
        default=0
    )

    # Normalize priority to the 0-100 range because the
    # multi-objective score expects percentage-like values.
    maintenance_priority = max(
        0,
        min(
            maintenance_priority,
            100
        )
    )

    # Calculate the actual task occupancy once.
    # This value is used by every candidate window.
    number_of_tasks = len(
        group["requests"]
    )

    task_intervals = []

    for request in group["requests"]:

        request_start = time_to_minutes(
            request[5]
        )

        request_end = time_to_minutes(
            request[6]
        )

        if request_end < request_start:
            request_end += 1440

        task_intervals.append(
            (
                request_start,
                request_end
            )
        )

    task_intervals.sort()

    occupied_start = None
    occupied_end = None
    occupied_minutes = 0

    for interval_start, interval_end in task_intervals:

        if occupied_start is None:

            occupied_start = interval_start
            occupied_end = interval_end

        elif interval_start <= occupied_end:

            occupied_end = max(
                occupied_end,
                interval_end
            )

        else:

            occupied_minutes += (
                occupied_end - occupied_start
            )

            occupied_start = interval_start
            occupied_end = interval_end

    if occupied_start is not None:

        occupied_minutes += (
            occupied_end - occupied_start
        )

    candidate_results = []

    print()
    print(
        "CANDIDATE WINDOWS:",
        corridor,
        block_date
    )

    for candidate in candidate_windows:

        candidate_duration = candidate["duration"]

        if candidate_duration <= 0:
            continue

        candidate_utilization = round(
            min(
                (
                    occupied_minutes
                    / candidate_duration
                ) * 100,
                100
            ),
            2
        )

        try:

            result = score_candidate_window(
                corridor=corridor,
                block_date=block_date,
                candidate=candidate,
                group=group,
                maintenance_priority=maintenance_priority,
                utilization=candidate_utilization
            )

        except Exception as exc:

            print(
                "CANDIDATE SCORING ERROR:",
                exc
            )

            continue

        candidate_results.append(
            result
        )

        print(
            f"  {str(result['start'])[:5]}-"
            f"{str(result['end'])[:5]} "
            f"| conflicts={result['conflict_count']} "
            f"| traffic={result['traffic_impact']} "
            f"| goods={result['goods_impact']} "
            f"| utilization={result['utilization']} "
            f"| AI score={result['score']}"
        )

    # ======================================
    # SELECT HIGHEST AI SCORE
    # ======================================

    if not candidate_results:

        print(
            "NO FEASIBLE CANDIDATE:",
            corridor,
            block_date
        )

        continue

    # Higher AI score is better.
    # If scores are tied:
    #   1. fewer train conflicts
    #   2. closer to requested start time
    original_start_minutes = time_to_minutes(
        start_time
    )

    def candidate_sort_key(result):

        candidate_start_minutes = time_to_minutes(
            result["start"]
        )

        distance_from_requested = abs(
            candidate_start_minutes
            - original_start_minutes
        )

        return (
            result["score"],
            -result["conflict_count"],
            -distance_from_requested
        )

    best_candidate = max(
        candidate_results,
        key=candidate_sort_key
    )

    # ======================================
    # APPLY AI RECOMMENDATION
    # ======================================

    start_time = best_candidate["start"]
    end_time = best_candidate["end"]
    duration = best_candidate["duration"]

    train_conflicts = best_candidate["conflicts"]

    # Candidate-specific values are preserved so the
    # final block score exactly matches the selected
    # candidate rather than recalculating a different
    # score later.
    utilization = best_candidate["utilization"]

    traffic_impact_score = (
        best_candidate["traffic_impact"]
    )

    goods_impact_score = (
        best_candidate["goods_impact"]
    )

    candidate_optimization_score = (
        best_candidate["score"]
    )

    # ======================================
    # BUILD AI EXPLANATION
    # ======================================

    ai_explanation = build_window_explanation(
        best_candidate=best_candidate,
        candidate_results=candidate_results,
        requested_start=group["start"],
        requested_end=group["end"],
        number_of_tasks=len(group["requests"]),
        maintenance_priority=maintenance_priority,
        asset_risk_score=best_candidate.get(
            "asset_risk",
            0
        ),
        utilization=best_candidate.get(
            "utilization",
            0
        ),
        traffic_impact_score=best_candidate.get(
            "traffic_impact",
            0
        ),
        goods_impact_score=best_candidate.get(
            "goods_impact",
            0
        ),
    )

    print()
    print(
        "AI SELECTED WINDOW:",
        str(start_time)[:5],
        "-",
        str(end_time)[:5]
    )

    print(
        "AI SCORE:",
        candidate_optimization_score
    )

    print(
        "TRAIN CONFLICTS:",
        len(train_conflicts)
    )

    print(
        "TRAFFIC IMPACT:",
        traffic_impact_score
    )

    print(
        "GOODS IMPACT:",
        goods_impact_score
    )

    print()
    print("WHY THIS WINDOW?")
    print("--------------------------------------")

    for reason in ai_explanation["reasons"]:
        print("✓", reason)

    print(
        "Candidates evaluated:",
        ai_explanation["candidate_count"]
    )

    print(
        "Requested window score:",
        ai_explanation["requested_window_score"]
    )

    print(
        "Selected window score:",
        ai_explanation["selected_score"]
    )

    print(
        "Score improvement:",
        ai_explanation["score_delta_vs_requested"]
    )

    print("Top alternatives:")

    for alternative in ai_explanation["alternatives"]:
        print(
            f"  {alternative['start']}-"
            f"{alternative['end']} "
            f"| score={alternative['score']} "
            f"| conflicts={alternative['conflicts']} "
            f"| traffic={alternative['traffic_impact']} "
            f"| goods={alternative['goods_impact']}"
        )

    print("--------------------------------------")

    # ======================================
    # TRAIN IMPACT SCORE
    # ======================================

    train_impact_score = 0

    for train in train_conflicts:

        if train["train_type"] == "EXPRESS":

            train_impact_score += 40

        elif train["train_type"] == "PASSENGER":

            train_impact_score += 25

        elif train["train_type"] == "FREIGHT":

            train_impact_score += 15

        else:

            train_impact_score += 20


    train_impact_score = min(
        train_impact_score,
        100
    )


    # ======================================
    # MAINTENANCE UTILIZATION
    # ======================================

    number_of_tasks = len(
        group["requests"]
    )


    # Calculate actual occupied time
    # instead of blindly summing overlapping
    # task durations.

    intervals = []

    for request in group["requests"]:

        request_start = time_to_minutes(
            request[5]
        )

        request_end = time_to_minutes(
            request[6]
        )

        # Handle overnight requests
        if request_end < request_start:
            request_end += 1440

        intervals.append(
            (
                request_start,
                request_end
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
                occupied_end - occupied_start
            )

            occupied_start = start
            occupied_end = end


    if occupied_start is not None:

        occupied_minutes += (
            occupied_end - occupied_start
        )


    if duration > 0:

        utilization = (
            occupied_minutes
            / duration
        ) * 100

    else:

        utilization = 0


    utilization = round(
        min(utilization, 100),
        2
    )


    # ======================================
    # BLOCK ID
    # ======================================

    block_id = (
        f"OPT-{block_date}-"
        f"{block_number:03d}"
    )


   # ======================================
    # ======================================
    # AI / ML INTELLIGENCE
    # ======================================

    # --------------------------------------
    # Maintenance priority
    # --------------------------------------

    maintenance_priority = max(
        [
            safe_float(request[8], 0)
            for request in group["requests"]
        ],
        default=0
    )

    # --------------------------------------
    # Asset risk
    # --------------------------------------

    asset_risks = []

    for request in group["requests"]:
        task_id = request[1]

        try:
            risk = calculate_asset_risk_for_task(task_id)
            asset_risks.append(risk)

        except Exception as exc:
            print(
                "ASSET RISK ERROR:",
                task_id,
                exc
            )

    if asset_risks:
        asset_risk_score = max(asset_risks)
    else:
        asset_risk_score = 0

    # --------------------------------------
    # Train counts
    # --------------------------------------

    passenger_trains = 0
    goods_trains = 0
    special_trains = 0
    express_trains = 0

    for train in train_conflicts:
        train_type = str(
            train["train_type"]
        ).upper()

        if train_type == "EXPRESS":
            express_trains += 1
            passenger_trains += 1

        elif train_type in (
            "PASSENGER",
            "MAIL",
            "SUPERFAST",
        ):
            passenger_trains += 1

        elif train_type in (
            "FREIGHT",
            "GOODS",
        ):
            goods_trains += 1

        elif train_type in (
            "SPECIAL",
            "FESTIVAL",
        ):
            special_trains += 1

        else:
            passenger_trains += 1

    # --------------------------------------
    # Corridor congestion
    # --------------------------------------

    cursor.execute(
        """
        SELECT traffic_level
        FROM corridors
        WHERE corridor_id = %s
        """,
        (corridor,)
    )

    corridor_row = cursor.fetchone()

    traffic_level = (
        str(corridor_row[0]).upper()
        if corridor_row and corridor_row[0]
        else "MEDIUM"
    )

    traffic_map = {
        "LOW": 25,
        "MEDIUM": 50,
        "HIGH": 75,
        "VERY HIGH": 90,
        "CRITICAL": 100,
    }

    corridor_congestion = traffic_map.get(
        traffic_level,
        50
    )

    # --------------------------------------
    # Traffic ML
    # --------------------------------------

    try:
        traffic_prediction = calculate_traffic_impact(
            duration=duration,
            start_hour=int(str(start_time)[:2]),
            passenger_trains=passenger_trains,
            goods_trains=goods_trains,
            special_trains=special_trains,
            express_trains=express_trains,
            corridor_congestion=corridor_congestion,
            criticality=max(
                [
                    safe_float(
                        request[8],
                        0
                    )
                    for request in group["requests"]
                ],
                default=3
            ),
            maintenance_priority=maintenance_priority,
        )

        traffic_impact_score = safe_float(
            traffic_prediction.get(
                "traffic_impact_score",
                traffic_prediction.get(
                    "impact_score",
                    0
                )
            ),
            0
        )

    except Exception as exc:
        print(
            "TRAFFIC ML ERROR:",
            exc
        )

        traffic_prediction = {}
        traffic_impact_score = 0

    # --------------------------------------
    # Goods ML
    # --------------------------------------

    try:
        goods_impact_score = calculate_goods_impact(
            corridor_id=corridor,
            block_date=block_date,
            start_hour=int(str(start_time)[:2]),
        )

    except Exception as exc:
        print(
            "GOODS ML ERROR:",
            exc
        )

        goods_impact_score = 0

    # --------------------------------------
    # Consolidation benefit
    # --------------------------------------

    consolidation_score = min(
        100,
        number_of_tasks * 25
    )

    # --------------------------------------
    # AI optimization score
    # --------------------------------------

    # Keep the persisted block score consistent with the
    # candidate score used to select the window.
    conflict_penalty = min(
        100,
        len(train_conflicts) * 20
    )

    optimization_score = (
        maintenance_priority
        * WEIGHT_MAINTENANCE_PRIORITY
        +
        asset_risk_score
        * WEIGHT_ASSET_RISK
        +
        utilization
        * WEIGHT_UTILIZATION
        +
        (
            100 - traffic_impact_score
        )
        * WEIGHT_TRAFFIC
        +
        (
            100 - goods_impact_score
        )
        * WEIGHT_GOODS
        +
        consolidation_score
        * WEIGHT_CONSOLIDATION
        -
        conflict_penalty
    )

    optimization_score = round(
        max(
            0,
            min(
                optimization_score,
                100
            )
        ),
        2
    )

    # --------------------------------------
    # Explanation
    # --------------------------------------

    reasons = list(
        ai_explanation["reasons"]
    )

    optimized_blocks.append(
        {
            "block_id": block_id,
            "corridor": corridor,
            "date": block_date,
            "start": start_time,
            "end": end_time,
            "duration": duration,

            "utilization": utilization,

            "maintenance_priority": round(
                maintenance_priority,
                2
            ),

            "asset_risk_score": round(
                asset_risk_score,
                2
            ),

            "traffic_impact_score": round(
                traffic_impact_score,
                2
            ),

            "goods_impact_score": round(
                goods_impact_score,
                2
            ),

            "consolidation_score": round(
                consolidation_score,
                2
            ),

            "optimization_score": optimization_score,

            "tasks": group["requests"],

            "train_conflicts": train_conflicts,

            "ai_reasons": reasons,

            "ai_explanation": ai_explanation,

            "traffic_prediction": traffic_prediction,

            "reason": (
                f"AI scored this {duration}-minute block "
                f"at {optimization_score}/100 using "
                f"maintenance priority, asset risk, "
                f"traffic impact, goods demand, "
                f"utilization and consolidation."
            ),
        }
    )

    block_number += 1

# ==========================================
# DELETE PREVIOUS OPTIMIZATION
# ==========================================

# Do not wipe the existing optimized plan.
# New optimized blocks are persisted alongside existing blocks.
# ==========================================
# INSERT OPTIMIZED BLOCKS
# ==========================================
for block in optimized_blocks:

    department_count = 0

    if block["tasks"]:

        task_ids = [
            request[1]
            for request in block["tasks"]
        ]

        cursor.execute(
            """
            SELECT COUNT(DISTINCT department)
            FROM maintenance_tasks
            WHERE task_id = ANY(%s)
            """,
            (task_ids,)
        )

        department_count = cursor.fetchone()[0]
        print("DEPARTMENT COUNT:", department_count)

    print(
        "BEFORE INSERT:",
        block["block_id"],
        "CORRIDOR =", block["corridor"],
        "DATE =", block["date"],
        "START =", block["start"],
        "END =", block["end"],
        "DURATION =", block["duration"],
        "UTILIZATION =", block["utilization"],
        "TRAIN IMPACT =", block.get(
            "traffic_impact_score",
            0
        ),
        "TASKS =", len(block["tasks"]),
        "DEPARTMENTS =", department_count
    )

    cursor.execute(
        """
        INSERT INTO optimized_blocks
        (
            block_id,
            corridor_id,
            block_date,
            start_time,
            end_time,
            duration_min,
            utilization_percent,
            train_impact_score,
            optimization_score,
            number_of_tasks,
            number_of_departments
        )
        VALUES
        (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (block_id) DO UPDATE SET
        corridor_id = EXCLUDED.corridor_id,
        block_date = EXCLUDED.block_date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        duration_min = EXCLUDED.duration_min,
        utilization_percent = EXCLUDED.utilization_percent,
        train_impact_score = EXCLUDED.train_impact_score,
        optimization_score = EXCLUDED.optimization_score,
        number_of_tasks = EXCLUDED.number_of_tasks,
        number_of_departments = EXCLUDED.number_of_departments;
        """,
        (
            block["block_id"],
            block["corridor"],
            block["date"],
            block["start"],
            block["end"],
            block["duration"],
            block["utilization"],
            block.get(
                "traffic_impact_score",
                0
            ),
            block["optimization_score"],
            len(block["tasks"]),
            department_count
        )
    )

    print("OPTIMIZED BLOCK INSERTED:", block["block_id"])


    # ======================================
    # BLOCK ↔ TASK
    # ======================================

    for request in block["tasks"]:

        task_id = request[1]

        cursor.execute(
            """
            INSERT INTO block_tasks
            (
                block_id,
                task_id
            )
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                block["block_id"],
                task_id
            )
        )
    cursor.execute(
    """
    UPDATE optimized_blocks ob
    SET number_of_departments = (
        SELECT COUNT(DISTINCT mt.department)
        FROM block_tasks bt
        JOIN maintenance_tasks mt
            ON bt.task_id = mt.task_id
        WHERE bt.block_id = ob.block_id
    )
    WHERE ob.block_id = %s
    """,
    (block["block_id"],)
)


    # ======================================
    # BLOCK ↔ TRAIN
    # ======================================

    for train in block["train_conflicts"]:

        cursor.execute(
            """
            INSERT INTO block_train_impact
            (
                block_id,
                train_id,
                impact_type,
                estimated_delay_min
            )
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                block["block_id"],
                train["train_id"],
                "SCHEDULE_CONFLICT",
                5
            )
        )

# ==========================================
# SAVE
# ==========================================

# MARK PROCESSED REQUESTS AS OPTIMIZED
for block in optimized_blocks:
    for request in block["tasks"]:
        request_id = request[0]

        cursor.execute(
            """
            UPDATE block_requests
            SET request_status = 'OPTIMIZED'
            WHERE request_id = %s
            """,
            (request_id,)
        )
connection.commit()


# ==========================================
# DISPLAY
# ==========================================

print()
print("==============================================================")
print("                 BLOCK OPTIMIZER V2")
print("==============================================================")
print()

print(
    f"Requests processed : {len(requests)}"
)

print(
    f"Blocks generated   : {len(optimized_blocks)}"
)

print()

print(
    f"{'BLOCK':<25}"
    f"{'CORRIDOR':<10}"
    f"{'TIME':<20}"
    f"{'TASKS':<8}"
    f"{'UTIL':<8}"
    f"TRAIN IMPACT"
)

print("-" * 90)


for block in optimized_blocks:

    print(
        f"{block['block_id']:<25}"
        f"{block['corridor']:<10}"
        f"{str(block['start'])[:5]}-"
        f"{str(block['end'])[:5]:<14}"
        f"{len(block['tasks']):<8}"
        f"{block['utilization']:<8}"
        f"{block.get('traffic_impact_score', 0)}"
    )


# ==========================================
# FINAL AI EXPLANATION SUMMARY
# ==========================================

print()
print("==============================================================")
print("                 AI EXPLAINABILITY")
print("==============================================================")

for block in optimized_blocks:

    explanation = block.get(
        "ai_explanation",
        {}
    )

    print()
    print(
        f"{block['block_id']} | "
        f"{block['corridor']} | "
        f"{explanation.get('selected_window', 'N/A')}"
    )

    print(
        f"AI SCORE: "
        f"{explanation.get('selected_score', block.get('optimization_score', 0))}"
    )

    print("WHY:")

    for reason in explanation.get(
        "reasons",
        []
    ):
        print("  ✓", reason)

    alternatives = explanation.get(
        "alternatives",
        []
    )

    if alternatives:
        print("ALTERNATIVES:")

        for alternative in alternatives:
            print(
                f"  {alternative['start']}-"
                f"{alternative['end']} "
                f"| score={alternative['score']} "
                f"| conflicts={alternative['conflicts']}"
            )

print()
print("==============================================================")
print("              OPTIMIZATION COMPLETE")
print("==============================================================")

cursor.close()
connection.close()
