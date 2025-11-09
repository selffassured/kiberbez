from fastapi import APIRouter, UploadFile, HTTPException
from app.db import database
from app.models import files
from app.core.crypto import generate_file_key, encrypt_bytes, wrap_key
from app.core.storage import save_encrypted_file
from datetime import datetime, timedelta
import secrets

router = APIRouter()

@router.post("/api/upload")
async def upload_file(file: UploadFile):
    data = await file.read()
    file_key = generate_file_key()
    encrypted = encrypt_bytes(data, file_key)
    wrapped = wrap_key(file_key)
    token = secrets.token_urlsafe(16)
    expiry = datetime.utcnow() + timedelta(hours=2)

    query = files.insert().values(
        filename=file.filename,
        token=token,
        expiry=expiry,
        wrapped_key=wrapped
    )
    file_id = await database.execute(query)
    save_encrypted_file(file_id, b"", encrypted)
    return {"token": token, "expiry": expiry}
