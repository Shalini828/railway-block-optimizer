import psycopg
import random

connection = psycopg.connect(
    host="localhost",
    port=5432,
    dbname="railway_block_planning",
    user="postgres",
    password="REDACTED"
)

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
    division_id = random.randint(1, 6)

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

print("✅ 10 corridors generated and inserted successfully!")