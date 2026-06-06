import os
import uuid
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import Photo, User
from ..schemas import PhotoOut
from ..auth import get_current_user

router = APIRouter(prefix="/photos", tags=["Photos"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    album: str = Form("Personal"),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Read bytes and check size
    content = await file.read()
    size = len(content)
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10 MB."
        )

    # 3. Save file securely
    secure_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / secure_filename
    with open(file_path, "wb") as f:
        f.write(content)

    # 4. Save metadata to database
    photo = Photo(
        user_id=current_user.id,
        title=title,
        album=album,
        file_path=str(file_path),
        content_type=file.content_type or "application/octet-stream",
        size=size
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.get("", response_model=List[PhotoOut])
def list_photos(
    album: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Photo).filter(Photo.user_id == current_user.id)
    
    if album and album != "All":
        query = query.filter(Photo.album == album)
        
    if q:
        like = f"%{q}%"
        query = query.filter(Photo.title.ilike(like))
        
    # Order by newest first
    return query.order_by(Photo.created_at.desc()).all()


@router.get("/{photo_id}/content")
def get_photo_content(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Secure endpoint to stream the photo content. Only the owner can access it.
    """
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    file_path = Path(photo.file_path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File is missing from server storage")
        
    return FileResponse(
        path=file_path,
        media_type=photo.content_type,
        filename=Path(photo.file_path).name
    )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    # Remove physical file
    file_path = Path(photo.file_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass # Ignore if we can't delete the file, but we'll still delete the DB record
            
    db.delete(photo)
    db.commit()
