import psycopg
import random
from datetime import date, time, timedelta

from db_config import DB_CONFIG


# ============================================================
# SETTINGS
# ============================================================

random.seed(42)

TRAIN_TYPES = [
    "EXPRESS",
    "PASSENGER",
    "FREIGHT"
]

DIRECTIONS = [
    "UP",
    "DOWN"
]


# ============================================================
# DATABASE CONNECTION
# ============================================================

connection = psycopg.connect(**DB_CONFIG)
cursor = connection.cursor()


# ============================================================
# GET EXISTING MAINTENANCE WINDOWS
# ============================================================

cursor.execute("""
    SELECT DISTINCT
        corridor_id,
        requested_date,
        requested_start,
        requested_end
    FROM block_requests
    ORDER BY
        requested_date,
        corridor_id,
        requested_start
""")

windows = cursor.fetchall()


if not windows:
    print("No maintenance windows found!")
    cursor.close()
    connection.close()
    exit()


# ============================================================
# DELETE OLD TRAIN DATA
# ============================================================

cursor.execute("DELETE FROM block_train_impact")
cursor.execute("DELETE FROM trains")


# ============================================================
# CREATE TRAINS
# ============================================================

train_number = 1


for corridor_id, travel_date, start_time, end_time in windows:

    start_minutes = (
        start_time.hour * 60
        + start_time.minute
    )

    end_minutes = (
        end_time.hour * 60
        + end_time.minute
    )


    # --------------------------------------------------------
    # CREATE A TRAIN THAT OVERLAPS THE MAINTENANCE WINDOW
    # --------------------------------------------------------

    overlap_start = max(
        0,
        start_minutes - 20
    )

    overlap_end = min(
        23 * 60 + 59,
        end_minutes + 20
    )


    # Avoid midnight crossing for generated train
    if overlap_end <= overlap_start:
        continue


    train_type = random.choice(TRAIN_TYPES)
    direction = random.choice(DIRECTIONS)

    operational_priority = random.randint(1, 5)


    arrival_hour = overlap_start // 60
    arrival_minute = overlap_start % 60

    departure_hour = overlap_end // 60
    departure_minute = overlap_end % 60


    train_id = f"TR-{train_number:04d}"

    train_number_text = f"{12000 + train_number}"

    train_name = (
        f"{train_type.title()} "
        f"{corridor_id} Service"
    )


    cursor.execute("""
        INSERT INTO trains
        (
            train_id,
            train_number,
            train_name,
            train_type,
            corridor_id,
            travel_date,
            arrival_time,
            departure_time,
            direction,
            operational_priority
        )
        VALUES
        (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
    """, (
        train_id,
        train_number_text,
        train_name,
        train_type,
        corridor_id,
        travel_date,
        time(
            arrival_hour,
            arrival_minute
        ),
        time(
            departure_hour,
            departure_minute
        ),
        direction,
        operational_priority
    ))


    train_number += 1


# ============================================================
# SAVE
# ============================================================

connection.commit()


# ============================================================
# DISPLAY RESULT
# ============================================================

cursor.execute("""
    SELECT COUNT(*)
    FROM trains
""")

train_count = cursor.fetchone()[0]


print()
print("=" * 65)
print("              TRAIN DATA GENERATOR")
print("=" * 65)
print()

print(
    f"Maintenance windows used : {len(windows)}"
)

print(
    f"Trains generated          : {train_count}"
)

print()

print("Train data successfully inserted into PostgreSQL.")

print()
print("=" * 65)


cursor.close()
connection.close()