from sqlalchemy import Column, DateTime, Integer, LargeBinary, String
from sqlalchemy.sql import func

from app.core.db import Base


class FileModel(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    wrapped_key = Column(LargeBinary, nullable=False)
    size = Column(Integer, nullable=True)
    expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    type = Column(String, nullable=True)
    face_encoding = Column(LargeBinary, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
