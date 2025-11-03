import databases, sqlalchemy
from config import DATABASE_URL
from models import metadata, files
database = databases.Database(DATABASE_URL)
engine = sqlalchemy.create_engine(DATABASE_URL.replace("+asyncpg", ""), future=True)
metadata.create_all(engine)