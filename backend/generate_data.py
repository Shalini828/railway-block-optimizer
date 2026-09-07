# pyrefly: ignore [missing-import]
import psycopg
# pyrefly: ignore [missing-import]
from faker import Faker

from db_config import DB_CONFIG

fake = Faker()

connection = psycopg.connect(**DB_CONFIG)
cursor = connection.cursor()

zones = [
    "Northern Railway",
    "Western Railway",
    "Southern Railway",
    "Eastern Railway",
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

print("5 divisions generated and inserted successfully!")