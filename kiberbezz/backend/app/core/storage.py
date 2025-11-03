import os
from config import STORAGE_DIR

def save_encrypted_file(file_id: str, nonce: bytes, ciphertext: bytes) -> str:
    os.makedirs(STORAGE_DIR, exist_ok=True)
    path = os.path.join(STORAGE_DIR, file_id)
    with open(path, "wb") as f:
        f.write(nonce + ciphertext)
    return path

def load_encrypted_file(file_id: str) -> tuple[bytes, bytes]:
    path = os.path.join(STORAGE_DIR, file_id)
    with open(path, "rb") as f:
        data = f.read()
    return data[:12], data[12:]