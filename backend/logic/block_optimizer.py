import psycopg


# ==========================================
# SETTINGS
# ==========================================

MAX_BLOCK_DURATION = 240       # 4 hours
MAX_CONSOLIDATION_GAP = 15     # 15 minutes


# ==========================================
# DATABASE CONNECTION
# ==========================================

connection = psycopg.connect(
    host="localhost",
    port=5432,
    dbname="railway_block_planning",
    user="postgres",
    password="REDACTED"
)

cursor = connection.cursor()


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
        br.requested_start
""")

requests = cursor.fetchall()


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
    return t.hour * 60 + t.minute


def minutes_to_time(minutes):

    minutes = minutes % (24 * 60)

    hour = minutes // 60
    minute = minutes % 60

    return f"{hour:02d}:{minute:02d}:00"


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


# ==========================================
# CREATE OPTIMIZED BLOCKS
# ==========================================

optimized_blocks = []


block_number = 1


for group in groups:

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


    duration = (
        end_minutes - start_minutes
    )


    # ======================================
    # TRAIN CONFLICTS
    # ======================================

    train_conflicts = get_train_conflicts(
        corridor,
        block_date,
        start_time,
        end_time
    )


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
    / MAX_BLOCK_DURATION
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


    optimized_blocks.append(
        {
            "block_id": block_id,
            "corridor": corridor,
            "date": block_date,
            "start": start_time,
            "end": end_time,
            "duration": duration,
            "utilization": utilization,
            "train_impact": train_impact_score,
            "tasks": group["requests"],
            "train_conflicts": train_conflicts
        }
    )


    block_number += 1


# ==========================================
# DELETE PREVIOUS OPTIMIZATION
# ==========================================

cursor.execute(
    "DELETE FROM block_train_impact"
)

cursor.execute(
    "DELETE FROM block_tasks"
)

cursor.execute(
    "DELETE FROM optimized_blocks"
)


# ==========================================
# INSERT OPTIMIZED BLOCKS
# ==========================================

for block in optimized_blocks:

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
            number_of_tasks
        )
        VALUES
        (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s
        )
        """,
        (
            block["block_id"],
            block["corridor"],
            block["date"],
            block["start"],
            block["end"],
            block["duration"],
            block["utilization"],
            block["train_impact"],
            len(block["tasks"])
        )
    )


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
        f"{block['train_impact']}"
    )


print()
print("==============================================================")
print("              OPTIMIZATION COMPLETE")
print("==============================================================")

cursor.close()
connection.close()