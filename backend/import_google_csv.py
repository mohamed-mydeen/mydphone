import csv
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "."))

from backend.database import SessionLocal
from backend.models import User, Contact

def import_csv(file_path):
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        print("No user found in the database. Please register an account first.")
        db.close()
        return

    print(f"Importing contacts for user: {user.name} ({user.email})")
    
    contacts_to_add = []
    
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse Name
            first = row.get('First Name', '').strip()
            middle = row.get('Middle Name', '').strip()
            last = row.get('Last Name', '').strip()
            
            full_name = " ".join(filter(None, [first, middle, last]))
            
            # Parse Phones
            phone1 = row.get('Phone 1 - Value', '').strip()
            phone2 = row.get('Phone 2 - Value', '').strip()
            phone3 = row.get('Phone 3 - Value', '').strip()
            
            # Use the first available phone number as primary
            primary_phone = phone1 or phone2 or phone3
            
            # If no primary phone and no name, skip
            if not primary_phone and not full_name:
                continue
                
            # If no name but we have a phone, use phone as name
            if not full_name:
                full_name = primary_phone
                
            # Alternate number
            alt_phone = None
            if primary_phone == phone1:
                alt_phone = phone2 or phone3
            elif primary_phone == phone2:
                alt_phone = phone3
                
            # Email
            email = row.get('E-mail 1 - Value', '').strip()
            
            # Notes
            notes = row.get('Notes', '').strip()
            
            # Address
            address = row.get('Address 1 - Formatted', '').strip()
            
            # Create contact
            contact = Contact(
                user_id=user.id,
                full_name=full_name,
                phone_number=primary_phone,
                alternate_number=alt_phone if alt_phone else None,
                email=email if email else None,
                notes=notes if notes else None,
                address=address if address else None,
            )
            contacts_to_add.append(contact)
            
    if contacts_to_add:
        db.bulk_save_objects(contacts_to_add)
        db.commit()
        print(f"Successfully imported {len(contacts_to_add)} contacts!")
    else:
        print("No valid contacts found to import.")
        
    db.close()

if __name__ == "__main__":
    csv_path = r"d:\Client\phone book\contacts (1).csv"
    import_csv(csv_path)
