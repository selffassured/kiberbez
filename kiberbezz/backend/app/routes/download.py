from fastapi import APIRouter, HTTPException, Response
from db import database
from models import files
from core.crypto import unwrap_key, decrypt_bytes
from core.storage import load_encrypted_file
import time
from utils.logger import logger

router = APIRouter()

@router.get("/f/{token}")
async def download(token: str):
    await database.connect()
    query = files.select().where(files.c.token == token)
    rec = await database.fetch_one(query)
    await database.disconnect()
    if not rec:
        raise HTTPException(404, "Not found")
    # verify expiry
    expiry_ts = rec["expiry"].timestamp() if rec["expiry"] else 0
    if expiry_ts < time.time():
        raise HTTPException(410, "Link expired")
    wrapped = rec["wrapped_key"]
    file_key = unwrap_key(wrapped)
    nonce, ciphertext = load_encrypted_file(rec["id"])
    plaintext = decrypt_bytes(nonce, ciphertext, file_key)
    logger.info(f"Download {rec['filename']} token {token}")
    headers = {"Content-Disposition": f'attachment; filename="{rec["filename"]}"'}
    return Response(content=plaintext, media_type="application/octet-stream", headers=headers)