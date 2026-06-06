from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import get_db
from ..models import User, VaultLog, TrustedDevice
from ..schemas import VaultLogOut, TrustedDeviceOut
from ..auth import get_current_user

router = APIRouter(prefix="/security", tags=["Security"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Schemas ──

class PinSetupRequest(BaseModel):
    pin: str

class PinVerifyRequest(BaseModel):
    pin: str

class PinResetRequest(BaseModel):
    password: str
    new_pin: str

class DeviceRegisterRequest(BaseModel):
    device_id: str
    device_name: str
    browser_info: str

# ── Helpers ──

def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin)

def verify_pin(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"

def log_vault_action(db: Session, user_id: int, action: str, ip: str, device_id: str = None, target_id: str = None):
    log = VaultLog(
        user_id=user_id,
        action=action,
        ip_address=ip,
        device_id=device_id,
        target_id=target_id
    )
    db.add(log)
    db.commit()


# ── PIN Endpoints ──

@router.get("/pin/status")
def get_pin_status(current_user: User = Depends(get_current_user)):
    """Check if the user has setup a vault PIN."""
    return {"has_pin": current_user.vault_pin_hash is not None}


@router.post("/pin/setup")
def setup_pin(
    payload: PinSetupRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.vault_pin_hash:
        raise HTTPException(status_code=400, detail="PIN is already set. Use reset to change it.")
    if not payload.pin.isdigit() or len(payload.pin) != 6:
        raise HTTPException(status_code=400, detail="PIN must be exactly 6 digits.")

    current_user.vault_pin_hash = hash_pin(payload.pin)
    db.commit()
    log_vault_action(db, current_user.id, "pin_setup", get_client_ip(request))
    return {"message": "PIN setup successfully"}


@router.post("/pin/verify")
def verify_vault_pin(
    payload: PinVerifyRequest,
    request: Request,
    device_id: Optional[str] = None, # passed via header or query
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.vault_pin_hash:
        raise HTTPException(status_code=400, detail="PIN not set up.")

    # Check lockout
    if current_user.vault_locked_until and current_user.vault_locked_until > datetime.utcnow():
        raise HTTPException(status_code=403, detail="Vault is temporarily locked due to too many failed attempts.")

    # Verify
    if not verify_pin(payload.pin, current_user.vault_pin_hash):
        current_user.failed_pin_attempts += 1
        if current_user.failed_pin_attempts >= 5:
            current_user.vault_locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
            log_vault_action(db, current_user.id, "vault_locked", get_client_ip(request), device_id)
            raise HTTPException(status_code=403, detail="Too many failed attempts. Vault locked for 15 minutes.")
        
        db.commit()
        log_vault_action(db, current_user.id, "pin_fail", get_client_ip(request), device_id)
        raise HTTPException(status_code=400, detail="Incorrect PIN.")

    # Success
    current_user.failed_pin_attempts = 0
    current_user.vault_locked_until = None
    db.commit()
    log_vault_action(db, current_user.id, "pin_success", get_client_ip(request), device_id)
    
    # Normally we would issue a short-lived signed JWT for the vault here,
    # but the frontend will just set a local state variable for "unlocked" and attach
    # the PIN in headers or just rely on state. 
    # For a strictly secure implementation, we return a short-lived token.
    from ..auth import create_access_token
    vault_token = create_access_token({"sub": str(current_user.id), "vault": True}, timedelta(minutes=15))
    return {"vault_token": vault_token}


@router.post("/pin/reset")
def reset_pin(
    payload: PinResetRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from ..auth import verify_password
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect account password.")
    
    if not payload.new_pin.isdigit() or len(payload.new_pin) != 6:
        raise HTTPException(status_code=400, detail="PIN must be exactly 6 digits.")

    current_user.vault_pin_hash = hash_pin(payload.new_pin)
    current_user.failed_pin_attempts = 0
    current_user.vault_locked_until = None
    db.commit()
    log_vault_action(db, current_user.id, "pin_reset", get_client_ip(request))
    return {"message": "PIN reset successfully"}


# ── Devices Endpoints ──

@router.post("/devices")
def register_device(
    payload: DeviceRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dev = db.query(TrustedDevice).filter(
        TrustedDevice.user_id == current_user.id,
        TrustedDevice.device_id == payload.device_id
    ).first()
    
    if dev:
        dev.last_login_at = datetime.utcnow()
    else:
        dev = TrustedDevice(
            user_id=current_user.id,
            device_id=payload.device_id,
            device_name=payload.device_name,
            browser_info=payload.browser_info
        )
        db.add(dev)
    db.commit()
    return {"message": "Device registered"}


@router.get("/devices", response_model=List[TrustedDeviceOut])
def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(TrustedDevice).filter(TrustedDevice.user_id == current_user.id).all()


@router.delete("/devices/{device_id}")
def remove_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dev = db.query(TrustedDevice).filter(
        TrustedDevice.user_id == current_user.id,
        TrustedDevice.device_id == device_id
    ).first()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(dev)
    db.commit()
    return {"message": "Device removed"}


@router.post("/logout-all")
def logout_all_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.token_version = getattr(current_user, "token_version", 1) + 1
    # also wipe trusted devices if desired, but usually we just invalidate JWTs
    db.commit()
    return {"message": "All devices logged out"}


# ── Logs Endpoint ──

@router.get("/logs", response_model=List[VaultLogOut])
def get_vault_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(VaultLog).filter(
        VaultLog.user_id == current_user.id
    ).order_by(VaultLog.timestamp.desc()).limit(100).all()
