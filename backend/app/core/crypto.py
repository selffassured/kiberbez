import os, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MASTER_KEY_B64 = os.getenv("MASTER_KEY_B64")
if not MASTER_KEY_B64:
    # генерируем временный ключ (только dev!). В prod указать MASTER_KEY_B64 в .env
    import base64, os
    MASTER_KEY_B64 = base64.b64encode(os.urandom(32)).decode()

MASTER_KEY = base64.b64decode(MASTER_KEY_B64)

def generate_file_key() -> bytes:
    return AESGCM.generate_key(bit_length=256)

def encrypt_bytes(plaintext: bytes, key: bytes) -> tuple[bytes, bytes]:
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext, None)
    return nonce, ct

def decrypt_bytes(nonce: bytes, ciphertext: bytes, key: bytes) -> bytes:
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)

def wrap_key(file_key: bytes) -> bytes:
    aesgcm = AESGCM(MASTER_KEY)
    nonce = os.urandom(12)
    wrapped = aesgcm.encrypt(nonce, file_key, None)
    return nonce + wrapped

def unwrap_key(wrapped: bytes) -> bytes:
    nonce = wrapped[:12]
    ciphertext = wrapped[12:]
    aesgcm = AESGCM(MASTER_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None)