from sqlalchemy import (
    Table, Column, String, MetaData, LargeBinary, TIMESTAMP, Integer, BigInteger
)
metadata = MetaData()

files = Table(
    "files",
    metadata,
    Column("id", String, primary_key=True),
    Column("token", String, unique=True, nullable=False),
    Column("wrapped_key", LargeBinary, nullable=False),
    Column("filename", String),
    Column("size", BigInteger),
    Column("expiry", TIMESTAMP),
    Column("created_at", TIMESTAMP),
)