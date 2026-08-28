from fastapi import APIRouter
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/optimized-plan",
    tags=["Optimized Plan"]
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


@router.get("/")
def get_optimized_plan():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM optimized_blocks
        ORDER BY 1
    """)

    rows = cursor.fetchall()

    # Get column names dynamically
    columns = [desc[0] for desc in cursor.description]

    cursor.close()
    conn.close()

    blocks = []

    for row in rows:
        block = {}

        for column, value in zip(columns, row):
            block[column] = str(value) if value is not None else None

        blocks.append(block)

    return {
        "status": "success",
        "block_count": len(blocks),
        "blocks": blocks
    }