import os
import secrets
import time
from datetime import datetime, timedelta
from mimetypes import guess_type
from urllib.parse import quote

from app.config import STORAGE_DIR
from app.core.crypto import (
    decrypt_bytes,
    encrypt_bytes,
    generate_file_key,
    unwrap_key,
    wrap_key,
)
from app.core.storage import load_encrypted_file, save_encrypted_file
from app.deps import get_db
from app.models import FileModel
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/")
async def get_files(db: Session = Depends(get_db)):
    files = db.query(FileModel).all()

    result = [
        {
            "id": file.id,
            "filename": file.filename,
            "token": file.token,
            "expiry": file.expiry,
            "created_at": file.created_at,
            "size": file.size,
            "type": file.type,
        }
        for file in files
    ]

    return {"files": result}


@router.post("/upload")
def upload_files(files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []

    for file in files:
        data = file.file.read()
        file_size = len(data)
        file_type = guess_type(file.filename)[0] or "application/octet-stream"

        file_key = generate_file_key()
        nonce, ciphertext = encrypt_bytes(data, file_key)
        wrapped = wrap_key(file_key)
        token = secrets.token_urlsafe(16)
        expiry = datetime.utcnow() + timedelta(hours=2)

        file_record = FileModel(
            filename=file.filename,
            token=token,
            expiry=expiry,
            wrapped_key=wrapped,
            size=file_size,
            type=file_type,
        )
        db.add(file_record)
        db.commit()
        db.refresh(file_record)

        save_encrypted_file(str(file_record.token), nonce, ciphertext)

        results.append(
            {
                "id": file_record.id,
                "filename": file.filename,
                "size": file_size,
                "type": file_type,
                "token": token,
                "expiry": expiry,
            }
        )

    return {"files": results}


@router.get("/{file_token}/download")
def download(file_token: str, db: Session = Depends(get_db)):
    rec = db.query(FileModel).filter(FileModel.token == file_token).first()

    if not rec:
        raise HTTPException(status_code=404, detail="Not found")

    if rec.expiry and rec.expiry.timestamp() < time.time():
        raise HTTPException(status_code=410, detail="Link expired")

    file_key = unwrap_key(rec.wrapped_key)
    nonce, ciphertext = load_encrypted_file(str(rec.token))
    plaintext = decrypt_bytes(nonce, ciphertext, file_key)

    filename_safe = quote(rec.filename)
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{filename_safe}"}
    return Response(
        content=plaintext, media_type="application/octet-stream", headers=headers
    )


@router.delete("/{file_token}")
async def delete_file(file_token: str, db: Session = Depends(get_db)):
    rec = db.query(FileModel).filter(FileModel.token == file_token).first()

    if not rec:
        raise HTTPException(status_code=404, detail="File not found")

    path = os.path.join(STORAGE_DIR, str(rec.id))

    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")

    db.delete(rec)
    db.commit()

    return {"status": "ok", "message": "File deleted"}
