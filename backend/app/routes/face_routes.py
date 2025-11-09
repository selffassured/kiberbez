from fastapi import APIRouter, UploadFile, File, HTTPException
from app.cv import face_access
import tempfile
import os

router = APIRouter()


@router.post("/api/face/build")
async def build_face_db(zip_file: UploadFile = File(...)):
    """
    Загружаешь ZIP архив с папкой faces_dataset (внутри подпапки по именам людей)
    API распакует и построит базу лиц
    """
    import zipfile

    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
        tmp.write(await zip_file.read())
        tmp_path = tmp.name

    extract_path = "faces_dataset"
    os.makedirs(extract_path, exist_ok=True)

    with zipfile.ZipFile(tmp_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)

    face_access.build_database(extract_path)
    return {"message": "База лиц успешно построена ✅"}


@router.get("/api/face/recognize")
def recognize_live():
    """
    Просто запускает live-распознавание через вебкамеру сервера.
    Окно откроется локально на сервере.
    """
    try:
        face_access.recognize_live()
        return {"message": "Live face recognition завершён"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
