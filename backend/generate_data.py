import psycopg
from faker import Faker

fake = Faker()

# Connect to PostgreSQL
connection = psycopg.connect(
    host="localhost",
    port=5432,
    dbname="railway_block_planning",
    user="postgres",
    password="REDACTED"
)

cursor = connection.cursor()

zones = [
    "Northern Railway",
    "Western Railway",
    "Eastern Railway",
    "Southern Railway",
    "Central Railway"
]

for i, zone in enumerate(zones, start=2):
    division_name = f"Division {i}"
    headquarters = fake.city()

    cursor.execute(
        """
        INSERT INTO zones_divisions
        (division_id, zone_name, division_name, headquarters)
        VALUES (%s, %s, %s, %s)
        """,
        (i, zone, division_name, headquarters)
    )

connection.commit()

cursor.close()
connection.close()

print("✅ 5 divisions generated and inserted successfully!")