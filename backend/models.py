from sqlalchemy import (
    Column, Integer, String, Boolean, Text,
    DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Security upgrades
    vault_pin_hash = Column(String(255), nullable=True)
    vault_locked_until = Column(DateTime, nullable=True)
    failed_pin_attempts = Column(Integer, default=0, nullable=False)
    token_version = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime, server_default=func.now())

    contacts = relationship("Contact", back_populates="owner", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="owner", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    vault_logs = relationship("VaultLog", back_populates="owner", cascade="all, delete-orphan")
    trusted_devices = relationship("TrustedDevice", back_populates="owner", cascade="all, delete-orphan")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    full_name = Column(String(150), nullable=False, index=True)
    phone_number = Column(String(30), nullable=False, index=True)
    alternate_number = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False)
    is_emergency = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="contacts")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    album = Column(String(50), nullable=False, index=True, default="Personal")
    file_path = Column(String(500), nullable=False)
    content_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)  # in bytes
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="photos")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_name = Column(String(255), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True, default="Other")
    file_type = Column(String(20), nullable=False)  # pdf, jpg, png, webp
    content_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    file_path = Column(String(500), nullable=False)  # internal secure path
    tags = Column(String(500), nullable=True)  # comma-separated tags
    is_favorite = Column(Boolean, default=False, nullable=False)
    is_emergency = Column(Boolean, default=False, nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="documents")


class VaultLog(Base):
    __tablename__ = "vault_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # upload, download, delete, login, pin_fail, pin_success
    device_id = Column(String(255), nullable=True)
    target_id = Column(String(255), nullable=True) # e.g. document_id or "Vault"
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="vault_logs")


class TrustedDevice(Base):
    __tablename__ = "trusted_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(String(255), nullable=False, index=True)
    device_name = Column(String(255), nullable=True)
    browser_info = Column(String(255), nullable=True)
    last_login_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="trusted_devices")
