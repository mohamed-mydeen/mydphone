import csv
import io
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database import get_db
from ..models import Contact, User
from ..schemas import (
    ContactCreate, ContactUpdate, ContactOut,
    PaginatedContacts, ImportResult,
)
from ..auth import get_current_user

router = APIRouter(prefix="/contacts", tags=["Contacts"])

ITEMS_PER_PAGE = 20


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_contact_or_404(contact_id: int, user: User, db: Session) -> Contact:
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.user_id == user.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


def _decode_csv(content: bytes) -> str:
    """Try multiple encodings gracefully."""
    for enc in ("utf-8-sig", "utf-8", "windows-1252", "latin-1"):
        try:
            return content.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    raise ValueError(
        "Could not read the file encoding. Please open in Excel/Sheets and Save As UTF-8 CSV."
    )


def _extract_row(row: dict) -> dict:
    """
    Supports both our native format AND Google Contacts export format.
    Always returns clean strings; missing values are None / False.
    """
    def g(*keys: str) -> str:
        for k in keys:
            v = str(row.get(k) or "").strip()
            if v:
                return v
        return ""

    # Name — native first, then build from Google's First/Middle/Last
    name = g("full_name")
    if not name:
        first  = g("First Name")
        middle = g("Middle Name")
        last   = g("Last Name")
        name   = " ".join(filter(None, [first, middle, last]))

    # Phone — native, then Google Phone 1/2/3
    phone  = g("phone_number", "Phone 1 - Value")
    phone2 = g("Phone 2 - Value")
    phone3 = g("Phone 3 - Value")

    # Alternate phone
    alt = g("alternate_number")
    if not alt:
        # Use whichever Google phone we didn't pick as primary
        alt = phone2 or phone3

    email   = g("email", "E-mail 1 - Value", "E-mail 2 - Value")
    address = g("address", "Address 1 - Formatted")
    notes   = g("notes", "Notes")

    is_fav  = g("is_favorite").lower()  in ("true", "1", "yes", "✓", "x")
    is_emer = g("is_emergency").lower() in ("true", "1", "yes", "✓", "x")

    return {
        "name":    name,
        "phone":   phone,
        "alt":     alt     or None,
        "email":   email   or None,
        "address": address or None,
        "notes":   notes   or None,
        "is_fav":  is_fav,
        "is_emer": is_emer,
    }


def _is_valid_phone(raw: str) -> bool:
    """Accept any number that has at least 6 digits after stripping formatting."""
    digits = re.sub(r"[^\d]", "", raw)
    return len(digits) >= 6


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedContacts)
def list_contacts(
    page: int = Query(1, ge=1),
    favorite: Optional[bool] = None,
    emergency: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Contact).filter(Contact.user_id == current_user.id)
    if favorite is not None:
        q = q.filter(Contact.is_favorite == favorite)
    if emergency is not None:
        q = q.filter(Contact.is_emergency == emergency)
    q = q.order_by(Contact.full_name)
    total = q.count()
    contacts = q.offset((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).all()
    return PaginatedContacts(
        contacts=contacts,
        total=total,
        page=page,
        pages=max(1, -(-total // ITEMS_PER_PAGE)),
    )

@router.get("/all", response_model=list[ContactOut])
def get_all_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all contacts for the user.
    Also automatically cleans up any exact duplicate contacts to maintain a clean database.
    """
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).order_by(Contact.full_name).all()
    
    seen = set()
    to_delete = []
    unique_contacts = []
    
    for c in contacts:
        name_key = c.full_name.strip().lower() if c.full_name else ""
        phone_key = c.phone_number.replace(" ", "").replace("-", "").replace("+", "") if c.phone_number else ""
        k = (name_key, phone_key)
        
        if k in seen:
            to_delete.append(c)
        else:
            seen.add(k)
            unique_contacts.append(c)
            
    if to_delete:
        for d in to_delete:
            db.delete(d)
        db.commit()
        
    return unique_contacts


@router.get("/search", response_model=list[ContactOut])
def search_contacts(
    q: str = Query(..., min_length=1),
    emergency_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    like = f"%{q}%"
    query = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        or_(
            Contact.full_name.ilike(like),
            Contact.phone_number.ilike(like),
            Contact.email.ilike(like),
        ),
    )
    if emergency_only:
        query = query.filter(Contact.is_emergency == True)
    return query.order_by(Contact.full_name).limit(50).all()


@router.get("/export")
def export_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contacts = (
        db.query(Contact)
        .filter(Contact.user_id == current_user.id)
        .order_by(Contact.full_name)
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "full_name", "phone_number", "alternate_number",
        "email", "address", "notes", "is_favorite", "is_emergency",
    ])
    for c in contacts:
        writer.writerow([
            c.full_name, c.phone_number, c.alternate_number or "",
            c.email or "", c.address or "", c.notes or "",
            c.is_favorite, c.is_emergency,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


@router.post("/import", response_model=ImportResult, status_code=status.HTTP_200_OK)
async def import_contacts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── 1. Validate file extension ────────────────────────────────────────────
    fname = (file.filename or "").lower()
    if not fname.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    # ── 2. Read bytes ─────────────────────────────────────────────────────────
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    # ── 3. Decode to text ─────────────────────────────────────────────────────
    try:
        text = _decode_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── 4. Parse CSV structure ────────────────────────────────────────────────
    try:
        reader = csv.DictReader(io.StringIO(text))
        # Force header detection
        fieldnames = reader.fieldnames
        if not fieldnames:
            raise ValueError("CSV file is empty or has no header row.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV structure: {e}")

    imported = 0
    skipped  = 0
    errors: list[str] = []

    # ── 5. Process each row — fully isolated per row ──────────────────────────
    for i, row in enumerate(reader, start=2):
        # Skip completely blank rows
        if not any(str(v).strip() for v in row.values()):
            continue

        try:
            d = _extract_row(row)
        except Exception as e:
            errors.append(f"Row {i}: Could not read row — {e}")
            skipped += 1
            continue

        name  = d["name"]
        phone = d["phone"]

        # Validate name
        if not name:
            errors.append(f"Row {i}: Skipped — no name found.")
            skipped += 1
            continue

        # Validate phone
        if not phone:
            errors.append(f"Row {i} ({name}): Skipped — no phone number found.")
            skipped += 1
            continue

        if not _is_valid_phone(phone):
            errors.append(f"Row {i} ({name}): Skipped — '{phone}' is not a valid phone number.")
            skipped += 1
            continue

        # Validate email loosely (don't crash, just drop)
        email = d["email"]
        if email and "@" not in email:
            email = None

        # Duplicate check — by phone number (most reliable)
        try:
            exists = db.query(Contact).filter(
                Contact.user_id == current_user.id,
                Contact.phone_number == phone[:30],
            ).first()
            if exists:
                errors.append(f"Row {i} ({name}): Skipped — phone {phone} already exists ({exists.full_name}).")
                skipped += 1
                continue
        except Exception as e:
            errors.append(f"Row {i} ({name}): DB lookup error — {e}")
            skipped += 1
            continue

        # Save — wrapped so one bad row never kills everything
        try:
            contact = Contact(
                user_id=current_user.id,
                full_name=name[:150],
                phone_number=phone[:30],
                alternate_number=d["alt"][:30] if d["alt"] else None,
                email=email[:255] if email else None,
                address=d["address"],
                notes=d["notes"],
                is_favorite=d["is_fav"],
                is_emergency=d["is_emer"],
            )
            db.add(contact)
            db.flush()   # catch DB errors now, before commit
            imported += 1
        except Exception as e:
            db.rollback()
            errors.append(f"Row {i} ({name}): Save error — {e}")
            skipped += 1
            continue

    # ── 6. Final commit ───────────────────────────────────────────────────────
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Final save failed after processing {imported} contacts: {e}"
        )

    return ImportResult(imported=imported, skipped=skipped, errors=errors[:50])


@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_contact_or_404(contact_id, current_user, db)


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_contact(
    payload: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        or_(Contact.full_name == payload.full_name, Contact.phone_number == payload.phone_number)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="A contact with this name or phone number already exists.")

    contact = Contact(user_id=current_user.id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = _get_contact_or_404(contact_id, current_user, db)

    check_name  = payload.full_name    if payload.full_name    is not None else contact.full_name
    check_phone = payload.phone_number if payload.phone_number is not None else contact.phone_number

    existing = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        or_(Contact.full_name == check_name, Contact.phone_number == check_phone),
        Contact.id != contact_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="A contact with this name or phone number already exists.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = _get_contact_or_404(contact_id, current_user, db)
    db.delete(contact)
    db.commit()
