
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

conn = psycopg.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)

try:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                request_id,
                task_id,
                corridor_id,
                requested_date,
                request_status,
                submitted_date
            FROM block_requests
            WHERE request_id LIKE 'BR-AUTO-%'
            ORDER BY request_id
            LIMIT 10;
        """)

        print("First 10 BR-AUTO records:")
        for row in cur.fetchall():
            print(row)

        cur.execute("""
            SELECT request_status, COUNT(*)
            FROM block_requests
            WHERE request_id LIKE 'BR-AUTO-%'
            GROUP BY request_status
            ORDER BY request_status;
        """)

        print("\nStatus summary:")
        for row in cur.fetchall():
            print(row)
finally:
    conn.close()
