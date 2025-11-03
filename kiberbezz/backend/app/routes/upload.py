from fastapi import APIRouter, UploadFile, Form, HTTPException
from uuid import uuid4
import time, base64
from core.crypto import generate_file_key, encrypt_bytes, wrap_key
from core.storage import save_encrypted_file
from db import database
from models import files
from utils.logger import logger
from config import BASE_URL
import sqlalchemy

router = APIRouter()

@router.post("/api/upload")
async def upload(file: UploadFile, ttl_seconds: int = Form(3600)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    file_key = generate_file_key()
    nonce, ciphertext = encrypt_bytes(content, file_key)
    file_id = str(uuid4())
    save_encrypted_file(file_id, nonce, ciphertext)
    wrapped = wrap_key(file_key)
    token = str(uuid4())
    expiry = int(time.time()) + int(ttl_seconds)
    query = files.insert().values(
        id=file_id,
        token=token,
        wrapped_key=wrapped,
        filename=file.filename,
        size=len(content),
        expiry=sqlalchemy.sql.text(f"to_timestamp({expiry})"),
    )
    await database.connect()
    await database.execute(query)
    await database.disconnect()
    download_url = f"{BASE_URL}/f/{token}"
    logger.info(f"Uploaded file {file.filename} as {file_id}, token {token}")
    # return url and token; QR endpoint available at /api/qr/{token}
    return {"token": token, "download_url": download_url}