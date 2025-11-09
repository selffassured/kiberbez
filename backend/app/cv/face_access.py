from fastapi import APIRouter, UploadFile, File
import cv2
import numpy as np
import face_recognition
import pickle
import os

router = APIRouter(prefix="/api/face", tags=["Face Recognition"])

ENC_FILE = "models/face_encodings.pkl"

@router.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    contents = await file.read()
    np_img = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    if not os.path.exists(ENC_FILE):
        return {"error": "Encoding database not found"}

    with open(ENC_FILE, "rb") as f:
        data = pickle.load(f)
    known_encodings = data["encodings"]
    known_names = data["names"]

    rgb = frame[:, :, ::-1]
    boxes = face_recognition.face_locations(rgb)
    encs = face_recognition.face_encodings(rgb, boxes)

    results = []
    for (top, right, bottom, left), enc in zip(boxes, encs):
        matches = face_recognition.compare_faces(known_encodings, enc, tolerance=0.5)
        name = "Unknown"
        if True in matches:
            idx = matches.index(True)
            name = known_names[idx]
        results.append({"name": name, "box": [left, top, right, bottom]})

    return {"faces": results}


