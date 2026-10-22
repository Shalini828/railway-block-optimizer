
import os
import psycopg
from dotenv import load_dotenv

load_dotenv(".env")

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
                CASE
                    WHEN request_id LIKE 'BR-AUTO-%' THEN 'BR-AUTO'
                    WHEN request_id LIKE 'BR-CONFLICT-%' THEN 'BR-CONFLICT'
                    ELSE 'OTHER'
                END AS request_group,
                COUNT(*)
            FROM block_requests
            GROUP BY 1
            ORDER BY 1;
        """)

        for row in cur.fetchall():
            print(row)
finally:
    conn.close()
