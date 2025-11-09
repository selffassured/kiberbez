from fastapi import APIRouter, UploadFile, File
from ultralytics import YOLO
import cv2
import numpy as np

router = APIRouter(prefix="/api/detect", tags=["Object Detection"])

model = YOLO("yolov8n.pt")

@router.post("/animals")
async def detect_animals(file: UploadFile = File(...)):
    contents = await file.read()
    np_img = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    res = model(frame, imgsz=320)[0]
    detections = []

    for box in res.boxes:
        cls = int(box.cls[0])
        name = model.names[cls]
        if name in ("cat", "dog"):
            detections.append({
                "label": name,
                "confidence": float(box.conf[0]),
                "bbox": list(map(float, box.xyxy[0].tolist()))
            })

    return {"detections": detections}

