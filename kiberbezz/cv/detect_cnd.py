"""
Запуск:
python detect_cats_dogs.py

Требует ultralytics (pip install ultralytics) и opencv-python.
"""
import cv2
from ultralytics import YOLO
import time

model = YOLO("yolov8n.pt")  # скачает модель при первом запуске

cap = cv2.VideoCapture(0)
prev = time.time()
while True:
    ret, frame = cap.read()
    if not ret:
        break
    res = model(frame, imgsz=320)[0]  # уменьшенный размер для fps
    for box in res.boxes:
        cls = int(box.cls[0])
        name = model.names[cls]
        if name in ("cat","dog"):
            x1,y1,x2,y2 = map(int, box.xyxy[0])
            cv2.rectangle(frame, (x1,y1),(x2,y2),(0,255,0),2)
            cv2.putText(frame, f"{name} {box.conf[0]:.2f}", (x1, y1-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,0,0),2)
    now = time.time()
    fps = 1/(now-prev) if now!=prev else 0
    prev = now
    cv2.putText(frame, f"FPS: {fps:.1f}", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255),2)
    cv2.imshow("detect", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break
cap.release()
cv2.destroyAllWindows()