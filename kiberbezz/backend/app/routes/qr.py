from fastapi import APIRouter, Response
import qrcode
from io import BytesIO
from config import BASE_URL

router = APIRouter()

@router.get("/api/qr/{token}")
def get_qr(token: str):
    url = f"{BASE_URL}/f/{token}"
    img = qrcode.make(url)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")