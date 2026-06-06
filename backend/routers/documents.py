import uuid
import logging
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query, Header, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from jose import jwt, JWTError

from ..database import get_db
from ..models import Document, User, VaultLog
from ..schemas import DocumentOut
from ..auth import get_current_user
from ..config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

logger = logging.getLogger("documents")

DOCS_UPLOAD_DIR = Path("uploads/documents")
DOCS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

VALID_CATEGORIES = [
    "Identity Documents", "Education", "Medical", "Finance",
    "Travel", "Insurance", "Emergency", "Other",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def verify_vault_access(x_vault_token: Optional[str] = Header(None)) -> bool:
    if not x_vault_token:
        return False
    try:
        payload = jwt.decode(x_vault_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("vault") is True
    except JWTError:
        return False

def require_vault(x_vault_token: Optional[str] = Header(None)):
    if not verify_vault_access(x_vault_token):
        raise HTTPException(status_code=403, detail="Vault access locked. Please enter your PIN.")

def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"

def log_action(db, user_id, action, ip, target_id=None):
    log = VaultLog(user_id=user_id, action=action, ip_address=ip, target_id=target_id)
    db.add(log)
    db.commit()


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_vault)])
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    document_name: str = Form(...),
    category: str = Form("Other"),
    tags: Optional[str] = Form(None),
    is_emergency: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Read and validate size
    content = await file.read()
    size = len(content)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20 MB.")
    if size == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    # 3. Validate content type
    ct = file.content_type or "application/octet-stream"
    if ct not in ALLOWED_CONTENT_TYPES:
        # Fallback: trust the extension
        ct_map = {
            ".pdf": "application/pdf", ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
        }
        ct = ct_map.get(ext, ct)

    # 4. Save file with secure UUID name
    secure_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = DOCS_UPLOAD_DIR / secure_filename
    with open(file_path, "wb") as f:
        f.write(content)

    # 5. Determine file_type label
    file_type = ext.lstrip(".").upper()
    if file_type == "JPEG":
        file_type = "JPG"

    # 6. Validate category
    if category not in VALID_CATEGORIES:
        category = "Other"

    # 7. Save metadata
    doc = Document(
        user_id=current_user.id,
        document_name=document_name.strip()[:255],
        category=category,
        file_type=file_type,
        content_type=ct,
        file_size=size,
        file_path=str(file_path),
        tags=tags.strip()[:500] if tags else None,
        is_favorite=False,
        is_emergency=is_emergency,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    logger.info(f"[UPLOAD] user={current_user.id} doc={doc.id} name='{doc.document_name}' size={size}")
    log_action(db, current_user.id, "upload", get_client_ip(request), str(doc.id))
    return doc


# ── List / Search ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[DocumentOut])
def list_documents(
    request: Request,
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    emergency: Optional[bool] = Query(None),
    favorite: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_vault_token: Optional[str] = Header(None),
):
    # If not specifically asking for emergency documents, require vault token
    if emergency is not True:
        if not verify_vault_access(x_vault_token):
            raise HTTPException(status_code=403, detail="Vault access locked.")
    query = db.query(Document).filter(Document.user_id == current_user.id)

    if category and category != "All":
        query = query.filter(Document.category == category)

    if emergency is not None:
        query = query.filter(Document.is_emergency == emergency)

    if favorite is not None:
        query = query.filter(Document.is_favorite == favorite)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Document.document_name.ilike(like),
                Document.tags.ilike(like),
                Document.category.ilike(like),
            )
        )

    return query.order_by(Document.uploaded_at.desc()).all()


# ── Secure content streaming ─────────────────────────────────────────────────

@router.get("/{doc_id}/content")
def get_document_content(
    request: Request,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_vault_token: Optional[str] = Header(None),
):
    """Stream document content securely."""
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.is_emergency and not verify_vault_access(x_vault_token):
        raise HTTPException(status_code=403, detail="Vault access locked.")

    file_path = Path(doc.file_path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File is missing from server storage")

    logger.info(f"[DOWNLOAD] user={current_user.id} doc={doc.id}")
    log_action(db, current_user.id, "download", get_client_ip(request), str(doc.id))

    return FileResponse(
        path=file_path,
        media_type=doc.content_type,
        filename=f"{doc.document_name}.{doc.file_type.lower()}"
    )


# ── Toggle favorite ──────────────────────────────────────────────────────────

@router.patch("/{doc_id}/favorite", response_model=DocumentOut, dependencies=[Depends(require_vault)])
def toggle_favorite(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_favorite = not doc.is_favorite
    db.commit()
    db.refresh(doc)
    return doc


# ── Toggle emergency ─────────────────────────────────────────────────────────

@router.patch("/{doc_id}/emergency", response_model=DocumentOut, dependencies=[Depends(require_vault)])
def toggle_emergency(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_emergency = not doc.is_emergency
    db.commit()
    db.refresh(doc)
    return doc


# ── Replace (re-upload) ──────────────────────────────────────────────────────

@router.put("/{doc_id}", response_model=DocumentOut, dependencies=[Depends(require_vault)])
async def replace_document(
    request: Request,
    doc_id: int,
    file: UploadFile = File(...),
    document_name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{ext}'.")

    content = await file.read()
    size = len(content)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 20 MB.")

    # Delete old file
    old_path = Path(doc.file_path)
    if old_path.exists():
        try:
            old_path.unlink()
        except Exception:
            pass

    # Save new file
    secure_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = DOCS_UPLOAD_DIR / secure_filename
    with open(file_path, "wb") as f:
        f.write(content)

    file_type = ext.lstrip(".").upper()
    if file_type == "JPEG":
        file_type = "JPG"

    ct = file.content_type or "application/octet-stream"
    ct_map = {
        ".pdf": "application/pdf", ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
    }
    ct = ct_map.get(ext, ct)

    doc.file_path = str(file_path)
    doc.file_type = file_type
    doc.content_type = ct
    doc.file_size = size
    if document_name:
        doc.document_name = document_name.strip()[:255]
    if category and category in VALID_CATEGORIES:
        doc.category = category
    if tags is not None:
        doc.tags = tags.strip()[:500] if tags else None

    db.commit()
    db.refresh(doc)
    logger.info(f"[REPLACE] user={current_user.id} doc={doc.id}")
    log_action(db, current_user.id, "upload", get_client_ip(request), str(doc.id))
    return doc


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_vault)])
def delete_document(
    request: Request,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    logger.info(f"[DELETE] user={current_user.id} doc={doc.id} name='{doc.document_name}'")
    log_action(db, current_user.id, "delete", get_client_ip(request), str(doc.id))
    db.delete(doc)
    db.commit()


# ── Storage stats ─────────────────────────────────────────────────────────────

@router.get("/stats/usage", dependencies=[Depends(require_vault)])
def get_storage_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    total_size = sum(d.file_size for d in docs)
    by_category = {}
    for d in docs:
        by_category[d.category] = by_category.get(d.category, 0) + 1

    return {
        "total_documents": len(docs),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "by_category": by_category,
        "favorites": sum(1 for d in docs if d.is_favorite),
        "emergency": sum(1 for d in docs if d.is_emergency),
    }
