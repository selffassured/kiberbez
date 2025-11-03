import os
from dotenv import load_dotenv
load_dotenv()

MASTER_KEY_B64 = os.getenv("MASTER_KEY_B64")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@db:5432/fileshare")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
STORAGE_DIR = os.getenv("STORAGE_DIR", "/app/files")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")