from fastapi import FastAPI
from routes import upload, download, qr
from db import database
app = FastAPI(title="Secure FileShare")

app.include_router(upload.router)
app.include_router(qr.router)
app.include_router(download.router)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()