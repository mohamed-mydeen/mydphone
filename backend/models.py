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
    created_at = Column(DateTime, server_default=func.now())

    contacts = relationship("Contact", back_populates="owner", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="owner", cascade="all, delete-orphan")


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
