
import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

connection = psycopg.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
    dbname=os.getenv("DB_NAME", "railway_block_planning"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", ""),
)

print("Connected to PostgreSQL successfully!")

connection.close()
