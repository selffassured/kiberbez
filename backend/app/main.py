from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import upload, download, qr
from app.cv import face_access, detect_cnd, readmeter, sort_photos

app = FastAPI(title="Secure File Share")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Регистрация маршрутов
app.include_router(upload.router)
app.include_router(download.router)
app.include_router(qr.router)

# Новые CV API
app.include_router(face_access.router)
app.include_router(detect_cnd.router)
app.include_router(readmeter.router)
app.include_router(sort_photos.router)

@app.get("/")
def root():
    return {"message": "Secure FileShare API is running 🚀"}
