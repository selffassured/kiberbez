from fastapi import APIRouter, UploadFile, File, HTTPException
from app.cv import readmeter
import cv2
import numpy as np
from ultralytics import YOLO
import tempfile

router = APIRouter()

# === OCR для счётчиков ===
@router.post("/api/ocr/meter")
async def recognize_meter(image: UploadFile = File(...)):
    """Распознаёт цифры с фото цифрового счётчика"""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await image.read())
            tmp_path = tmp.name
        digits = readmeter.ocr_digits(tmp_path)
        return {"digits": digits}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === YOLO детекция кошек и собак ===
@router.post("/api/detect/animals")
async def detect_animals(image: UploadFile = File(...)):
    """Определяет кошек и собак на изображении"""
    try:
        model = YOLO("yolov8n.pt")
        file_bytes = np.frombuffer(await image.read(), np.uint8)
        frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        res = model(frame, imgsz=320)[0]

        detected = []
        for box in res.boxes:
            cls = int(box.cls[0])
            name = model.names[cls]
            if name in ("cat", "dog"):
                detected.append({
                    "class": name,
                    "confidence": float(box.conf[0]),
                })

        return {"detected": detected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

