import os
from pathlib import Path
from dotenv import load_dotenv


# backend folder
BACKEND_DIR = Path(__file__).resolve().parent

# Load backend/.env
load_dotenv(BACKEND_DIR / ".env")


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "railway_block_planning"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
    "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "2")),
}