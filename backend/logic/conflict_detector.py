import psycopg
import os
from dotenv import load_dotenv

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
# GET BLOCK REQUESTS
# ==========================================

cursor.execute("""
    SELECT
        request_id,
        task_id,
        team_id,
        corridor_id,
        requested_date,
        requested_start,
        requested_end
    FROM block_requests
    WHERE request_status = 'PENDING'
    ORDER BY corridor_id, requested_date, requested_start
""")

blocks = cursor.fetchall()


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
# TIME CONVERSION
# ==========================================

def time_to_minutes(t):
    return t.hour * 60 + t.minute


def times_overlap(start1, end1, start2, end2):

    start1 = time_to_minutes(start1)
    end1 = time_to_minutes(end1)

    start2 = time_to_minutes(start2)
    end2 = time_to_minutes(end2)

    return (
        start1 < end2
        and start2 < end1
    )


# ==========================================
# CONFLICT STORAGE
# ==========================================

conflicts = []


# ==========================================
# 1. MAINTENANCE vs MAINTENANCE
# ==========================================

for i in range(len(blocks)):

    block_a = blocks[i]

    (
        request_a,
        task_a,
        team_a,
        corridor_a,
        date_a,
        start_a,
        end_a
    ) = block_a


    for j in range(i + 1, len(blocks)):

        block_b = blocks[j]

        (
            request_b,
            task_b,
            team_b,
            corridor_b,
            date_b,
            start_b,
            end_b
        ) = block_b


        # Same corridor
        if corridor_a != corridor_b:
            continue

        # Same date
        if date_a != date_b:
            continue

        # Check overlap
        if times_overlap(
            start_a,
            end_a,
            start_b,
            end_b
        ):

            conflicts.append({
                "type": "MAINTENANCE_MAINTENANCE",
                "severity": "HIGH",
                "corridor": corridor_a,
                "date": date_a,
                "request_a": request_a,
                "task_a": task_a,
                "request_b": request_b,
                "task_b": task_b,
                "time_a": f"{start_a} - {end_a}",
                "time_b": f"{start_b} - {end_b}"
            })


# ==========================================
# 2. MAINTENANCE vs TRAIN
# ==========================================

for block in blocks:

    (
        request_id,
        task_id,
        team_id,
        block_corridor,
        block_date,
        block_start,
        block_end
    ) = block


    for train in trains:

        (
            train_id,
            train_number,
            train_name,
            train_type,
            train_corridor,
            train_date,
            train_arrival,
            train_departure
        ) = train


        # Same corridor
        if block_corridor != train_corridor:
            continue

        # Same date
        if block_date != train_date:
            continue

        # Check overlap
        if times_overlap(
            block_start,
            block_end,
            train_arrival,
            train_departure
        ):

            # Severity based on train type

            if train_type == "EXPRESS":
                severity = "CRITICAL"

            elif train_type == "PASSENGER":
                severity = "HIGH"

            elif train_type == "FREIGHT":
                severity = "MEDIUM"

            else:
                severity = "HIGH"


            conflicts.append({
                "type": "MAINTENANCE_TRAIN",
                "severity": severity,
                "corridor": block_corridor,
                "date": block_date,
                "request_id": request_id,
                "task_id": task_id,
                "train_id": train_id,
                "train_number": train_number,
                "train_name": train_name,
                "train_type": train_type,
                "block_time": f"{block_start} - {block_end}",
                "train_time": (
                    f"{train_arrival} - "
                    f"{train_departure}"
                )
            })


# ==========================================
# SUMMARY
# ==========================================

maintenance_conflicts = sum(
    1 for c in conflicts
    if c["type"] == "MAINTENANCE_MAINTENANCE"
)

train_conflicts = sum(
    1 for c in conflicts
    if c["type"] == "MAINTENANCE_TRAIN"
)


# ==========================================
# DISPLAY
# ==========================================

print()
print("================================================")
print("          UNIFIED CONFLICT DETECTOR V3")
print("================================================")
print()

print(f"Block requests checked : {len(blocks)}")
print(f"Trains checked         : {len(trains)}")
print()

print("-----------------------------------------------")
print(f"Maintenance conflicts  : {maintenance_conflicts}")
print(f"Train conflicts        : {train_conflicts}")
print(f"TOTAL conflicts        : {len(conflicts)}")
print("-----------------------------------------------")
print()


# ==========================================
# SHOW FIRST 20 CONFLICTS
# ==========================================

print("FIRST 20 DETECTED CONFLICTS")
print()


for index, conflict in enumerate(
    conflicts[:20],
    start=1
):

    print(f"Conflict #{index}")

    print(
        f"  Type     : {conflict['type']}"
    )

    print(
        f"  Severity : {conflict['severity']}"
    )

    print(
        f"  Corridor : {conflict['corridor']}"
    )

    print(
        f"  Date     : {conflict['date']}"
    )


    if conflict["type"] == "MAINTENANCE_MAINTENANCE":

        print(
            f"  Request A: {conflict['request_a']}"
        )
        print(
            f"  Task A   : {conflict['task_a']}"
        )
        print(
            f"  Time A   : {conflict['time_a']}"
        )
        print(
            f"  Request B: {conflict['request_b']}"
        )
        print(
            f"  Task B   : {conflict['task_b']}"
        )
        print(
            f"  Time B   : {conflict['time_b']}"
        )
    else:
        print(
            f"  Block    : {conflict['request_id']}"
        )
        print(
            f"  Task     : {conflict['task_id']}"
        )
        print(
            f"  Block time: {conflict['block_time']}"
        )
        print(
            f"  Train    : "
            f"{conflict['train_number']} "
            f"({conflict['train_name']})"
        )
        print(
            f"  Train type: {conflict['train_type']}"
        )
        print(
            f"  Train time: {conflict['train_time']}"
        )
    print("-" * 48)


# ==========================================
# CONFLICT SUMMARY BY TYPE
# ==========================================

print()
print("================================================")
print("              CONFLICT SUMMARY")
print("================================================")

severity_count = {
    "CRITICAL": 0,
    "HIGH": 0,
    "MEDIUM": 0,
    "LOW": 0
}


for conflict in conflicts:
    severity = conflict["severity"]
    severity_count[severity] += 1

for severity, count in severity_count.items():

    if count > 0:
        print(
            f"{severity:<10} {count} conflicts"
        )
print()
print("================================================")
print("Unified conflict detection complete.")
print("================================================")


cursor.close()
connection.close()