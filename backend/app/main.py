from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import Base, engine
from app.cv import detect_cnd, face_access, readmeter, sort_photos
from app.routes import auth, files, qr

app = FastAPI(title="Secure File Share")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    print("All tables created")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(qr.router)
app.include_router(face_access.router)
app.include_router(detect_cnd.router)
app.include_router(readmeter.router)
app.include_router(sort_photos.router)
app.include_router(auth.router)
app.include_router(files.router)


@app.get("/")
def root():
    return {"message": "Secure FileShare API is running 🚀"}
