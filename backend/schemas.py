from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
import re


# ── Auth Schemas ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ── User Schemas ──────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


# ── Contact Schemas ───────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    full_name: str
    phone_number: str
    alternate_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_favorite: bool = False
    is_emergency: bool = False

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()

    @field_validator("phone_number")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)\+]", "", v)
        if not cleaned.isdigit() or len(cleaned) < 7:
            raise ValueError("Invalid phone number")
        return v.strip()


class ContactUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    alternate_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_emergency: Optional[bool] = None


class ContactOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone_number: str
    alternate_number: Optional[str]
    email: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    is_favorite: bool
    is_emergency: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedContacts(BaseModel):
    contacts: List[ContactOut]
    total: int
    page: int
    pages: int


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: List[str]


# ── Photo Schemas ─────────────────────────────────────────────────────────────

class PhotoOut(BaseModel):
    id: int
    user_id: int
    title: Optional[str]
    album: str
    file_path: str
    content_type: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Document Schemas ──────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: int
    user_id: int
    document_name: str
    category: str
    file_type: str
    content_type: str
    file_size: int
    tags: Optional[str]
    is_favorite: bool
    is_emergency: bool
    uploaded_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Security Schemas ────────────────────────────────────────────────────────────

class VaultLogOut(BaseModel):
    id: int
    action: str
    device_id: Optional[str]
    target_id: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class TrustedDeviceOut(BaseModel):
    id: int
    device_id: str
    device_name: Optional[str]
    browser_info: Optional[str]
    last_login_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
