import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
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
        pages=max(1, -(-total // ITEMS_PER_PAGE)),  # ceiling div
    )


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
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    text = content.decode("utf-8-sig")  # handle BOM
    reader = csv.DictReader(io.StringIO(text))

    imported, skipped = 0, 0
    errors = []

    for i, row in enumerate(reader, start=2):
        name = row.get("full_name", "").strip()
        phone = row.get("phone_number", "").strip()
        alt_phone = row.get("alternate_number", "").strip() or None
        email = row.get("email", "").strip() or None
        address = row.get("address", "").strip() or None
        notes = row.get("notes", "").strip() or None
        is_fav = str(row.get("is_favorite", "")).lower() in ("true", "1", "yes")
        is_emer = str(row.get("is_emergency", "")).lower() in ("true", "1", "yes")

        # Fallback to Google Contacts format if native headers are missing
        if not name and not phone:
            first = row.get("First Name", "").strip()
            middle = row.get("Middle Name", "").strip()
            last = row.get("Last Name", "").strip()
            name = " ".join(filter(None, [first, middle, last]))

            phone1 = row.get("Phone 1 - Value", "").strip()
            phone2 = row.get("Phone 2 - Value", "").strip()
            phone3 = row.get("Phone 3 - Value", "").strip()
            phone = phone1 or phone2 or phone3
            
            if phone == phone1:
                alt_phone = phone2 or phone3
            elif phone == phone2:
                alt_phone = phone3

            email = email or row.get("E-mail 1 - Value", "").strip() or None
            notes = notes or row.get("Notes", "").strip() or None
            address = address or row.get("Address 1 - Formatted", "").strip() or None

        # We require a real name. Do not fallback to phone number.
        if not name or not phone:
            errors.append(f"Row {i}: Contact must have a valid Name and Phone Number")
            skipped += 1
            continue

        contact = Contact(
            user_id=current_user.id,
            full_name=name,
            phone_number=phone,
            alternate_number=alt_phone,
            email=email,
            address=address,
            notes=notes,
            is_favorite=is_fav,
            is_emergency=is_emer,
        )
        db.add(contact)
        imported += 1

    db.commit()
    return ImportResult(imported=imported, skipped=skipped, errors=errors[:20])


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
