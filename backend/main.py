from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg
import sys

sys.path.append("backend")

from db_config import DB_CONFIG

app = FastAPI(title="RailWise AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "RailWise AI API is running"
    }


@app.get("/api/maintenance-tasks")
def get_maintenance_tasks():

    connection = psycopg.connect(**DB_CONFIG)
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            task_id,
            asset_id,
            department,
            task_type,
            description,
            due_date,
            estimated_duration_min,
            overdue_days,
            safety_risk,
            priority_score,
            priority_category,
            task_status
        FROM maintenance_tasks
        ORDER BY priority_score DESC NULLS LAST
    """)

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "task_id": row[0],
            "asset_id": row[1],
            "department": row[2],
            "task_type": row[3],
            "description": row[4],
            "due_date": str(row[5]) if row[5] else None,
            "estimated_duration_min": row[6],
            "overdue_days": row[7],
            "safety_risk": row[8],
            "ai_priority_score": float(row[9]) if row[9] is not None else 0,
            "priority_category": row[10],
            "task_status": row[11]
        }
        for row in rows
    ]