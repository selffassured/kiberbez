"""
Создание базы дескрипторов и распознавание в реальном времени.
pip install face_recognition opencv-python
"""
import face_recognition
import cv2
import pickle
import os
import time

ENC_FILE = "models/face_encodings.pkl"

def build_database(folder_with_people):
    known_encodings = []
    known_names = []
    for name in os.listdir(folder_with_people):
        person_dir = os.path.join(folder_with_people, name)
        if not os.path.isdir(person_dir):
            continue
        for fname in os.listdir(person_dir):
            path = os.path.join(person_dir, fname)
            img = face_recognition.load_image_file(path)
            encs = face_recognition.face_encodings(img)
            if encs:
                known_encodings.append(encs[0])
                known_names.append(name)
    os.makedirs("models", exist_ok=True)
    with open(ENC_FILE, "wb") as f:
        pickle.dump({"encodings": known_encodings, "names": known_names}, f)
    print("DB built:", len(known_names), "faces")

def recognize_live():
    with open(ENC_FILE, "rb") as f:
        data = pickle.load(f)
    known_encodings = data["encodings"]
    known_names = data["names"]
    cap = cv2.VideoCapture(0)
    while True:
        ret, frame = cap.read()
        if not ret: break
        small = cv2.resize(frame, (0,0), fx=0.5, fy=0.5)
        rgb = small[:,:,::-1]
        boxes = face_recognition.face_locations(rgb)
        encs = face_recognition.face_encodings(rgb, boxes)
        for (top,right,bottom,left), enc in zip(boxes, encs):
            matches = face_recognition.compare_faces(known_encodings, enc, tolerance=0.5)
            name = "Unknown"
            if True in matches:
                idx = matches.index(True)
                name = known_names[idx]
            # масштабируем координаты обратно
            top*=2; right*=2; bottom*=2; left*=2
            cv2.rectangle(frame, (left, top), (right, bottom), (0,255,0), 2)
            cv2.putText(frame, name, (left, top-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,0,0), 2)
        cv2.imshow("face", frame)
        if cv2.waitKey(1) & 0xFF == 27:
            break
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 2 and sys.argv[1] == "build":
        build_database("faces_dataset")  # структура faces_dataset/<name>/*.jpg
    else:
        recognize_live()
