from fastapi import APIRouter, UploadFile, File
import cv2
import pytesseract
import numpy as np

router = APIRouter(prefix="/api/meter", tags=["Meter Reading"])

def preprocess(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR)
    g = cv2.medianBlur(g, 3)
    _, th = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return th

@router.post("/read")
async def read_meter(file: UploadFile = File(...)):
    contents = await file.read()
    np_img = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    proc = preprocess(img)
    config = "--psm 7 -c tessedit_char_whitelist=0123456789"
    text = pytesseract.image_to_string(proc, config=config)
    digits = ''.join(filter(str.isdigit, text))

    return {"detected_digits": digits or "none"}
