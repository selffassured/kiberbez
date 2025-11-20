import os

from dotenv import load_dotenv

load_dotenv()

MASTER_KEY_B64 = os.getenv("MASTER_KEY_B64")
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@db:5432/files_db"
)
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
STORAGE_DIR = os.getenv("STORAGE_DIR", "/app/files")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
SECRET_KEY = "SUPER_SECRET_KEY"
