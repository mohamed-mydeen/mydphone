from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserOut, ProfileUpdate
from ..auth import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name:
        current_user.name = payload.name.strip()

    if payload.email:
        taken = db.query(User).filter(
            User.email == payload.email, User.id != current_user.id
        ).first()
        if taken:
            raise HTTPException(status_code=409, detail="Email already in use")
        current_user.email = payload.email

    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(current_user)
    db.commit()
