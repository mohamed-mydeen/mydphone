from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Header, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
try:
    from .database import get_db
    from .models import User, TrustedDevice
    from .config import settings
except (ImportError, ValueError):
    from database import get_db
    from models import User, TrustedDevice
    from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_vault_token(
    user: User,
    minutes: int = 5,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a cryptographically signed, short-lived token for vault unlock."""
    if expires_delta is not None:
        expire = datetime.utcnow() + expires_delta
    else:
        minutes = max(1, min(60, minutes))
        expire = datetime.utcnow() + timedelta(minutes=minutes)
    payload = {
        "sub": str(user.id),
        "vault": True,
        "tv": getattr(user, "token_version", 1),
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_vault_token(token: Optional[str], current_user: User) -> bool:
    """Verify that a vault token is valid, unexpired, and belongs to current_user."""
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("vault") is not True:
            return False
        if str(payload.get("sub")) != str(current_user.id):
            return False
        if payload.get("tv", 1) != getattr(current_user, "token_version", 1):
            return False
        return True
    except JWTError:
        return False


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    token_version: Optional[int] = payload.get("tv", 1)
    
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    if getattr(user, "token_version", 1) != token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    # Check device validity if device is bound or header sent
    # Allow registering a new device via POST /security/devices
    is_device_registration = request.url.path.endswith("/security/devices") and request.method == "POST"
    device_id = payload.get("did") or request.headers.get("x-device-id")
    if device_id and not is_device_registration:
        user_devices = db.query(TrustedDevice).filter(TrustedDevice.user_id == user.id).all()
        # If user has devices registered, ensure this device is among them
        if user_devices and not any(d.device_id == device_id for d in user_devices):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Device access has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
    return user


def require_vault(
    x_vault_token: Optional[str] = Header(None),
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that ensures the user's vault is currently unlocked with a valid vault token."""
    if not verify_vault_token(x_vault_token, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vault access locked. Please enter your PIN.",
        )
    return current_user

