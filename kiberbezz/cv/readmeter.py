"""
Пример чтения цифрового дисплея счетчика.
pip install opencv-python pytesseract
tesseract-ocr должен быть установлен в системе.
"""
import cv2
import pytesseract
import numpy as np

def preprocess(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR)  # билинеаризация
    g = cv2.medianBlur(g, 3)  # удаление шума
    _, th = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(th > 0))
    if coords.size == 0:
        return th
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    (h,w) = th.shape[:2]
    M = cv2.getRotationMatrix2D((w//2,h//2), angle, 1.0)
    rotated = cv2.warpAffine(th, M, (w,h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated

def ocr_digits(img_path):
    img = cv2.imread(img_path)
    proc = preprocess(img)
    config = "--psm 7 -c tessedit_char_whitelist=0123456789"
    text = pytesseract.image_to_string(proc, config=config)
    return ''.join(filter(str.isdigit, text))

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python read_meter.py image.jpg")
    else:
        print(ocr_digits(sys.argv[1]))