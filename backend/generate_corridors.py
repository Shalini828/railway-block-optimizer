# pyrefly: ignore [missing-import]
import psycopg
import random

from db_config import DB_CONFIG

connection = psycopg.connect(**DB_CONFIG)
cursor = connection.cursor()

stations = [
    ("Delhi", "Ghaziabad"),
    ("Ghaziabad", "Meerut"),
    ("Delhi", "Panipat"),
    ("Panipat", "Ambala"),
    ("Mumbai", "Thane"),
    ("Thane", "Nashik"),
    ("Chennai", "Arakkonam"),
    ("Kolkata", "Howrah"),
    ("Bhopal", "Itarsi"),
    ("Pune", "Lonavala")
]

traffic_levels = ["LOW", "MEDIUM", "HIGH"]

for i, (source, destination) in enumerate(stations, start=2):
    corridor_id = f"C{i:02d}"

    # divisions currently generated are 2-6
    division_id = random.randint(2, 6)

    corridor_name = f"{source}-{destination} Main Corridor"

    distance_km = round(random.uniform(20, 180), 2)

    traffic_level = random.choice(traffic_levels)

    max_block_duration = random.choice([60, 90, 120, 180])

    cursor.execute(
        """
        INSERT INTO corridors
        (
            corridor_id,
            division_id,
            corridor_name,
            source_station,
            destination_station,
            distance_km,
            traffic_level,
            electrified,
            max_block_duration_min
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            corridor_id,
            division_id,
            corridor_name,
            source,
            destination,
            distance_km,
            traffic_level,
            True,
            max_block_duration
        )
    )

connection.commit()

cursor.close()
connection.close()

print("10 corridors generated and inserted successfully!")