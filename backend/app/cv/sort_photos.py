from fastapi import APIRouter

router = APIRouter(prefix="/api/sort", tags=["Photo Sorter"])

@router.get("/")
def sort_photos():
    return {"message": "Sort photos module is ready!"}

