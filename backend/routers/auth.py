from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from ..models import User, TrustedDevice
    from ..schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
    from ..auth import hash_password, verify_password, create_access_token, decode_token
except (ImportError, ValueError):
    from database import get_db
    from models import User, TrustedDevice
    from schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
    from auth import hash_password, verify_password, create_access_token, decode_token
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Registration is disabled since this is a private instance
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Registration is disabled. This is a private instance.",
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    device_id = request.headers.get("x-device-id")
    token_payload = {
        "sub": str(user.id),
        "tv": getattr(user, "token_version", 1),
    }
    if device_id:
        token_payload["did"] = device_id

    token = create_access_token(token_payload)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: Session = Depends(get_db)):
    # Invalidate session on server by incrementing token_version and removing device
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            raw_token = auth_header.split(" ", 1)[1]
            payload = decode_token(raw_token)
            user_id = payload.get("sub")
            device_id = payload.get("did") or request.headers.get("x-device-id")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user:
                    user.token_version = getattr(user, "token_version", 1) + 1
                if device_id:
                    dev = db.query(TrustedDevice).filter(
                        TrustedDevice.user_id == int(user_id),
                        TrustedDevice.device_id == device_id,
                    ).first()
                    if dev:
                        db.delete(dev)
                db.commit()
        except Exception:
            pass
    return

