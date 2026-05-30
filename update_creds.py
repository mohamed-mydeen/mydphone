import sys
from backend.database import SessionLocal
from backend.models import User
from backend.auth import hash_password

db = SessionLocal()
user = db.query(User).first()
if user:
    user.name = 'mydeen'
    user.email = 'mydeen@example.com'
    user.password_hash = hash_password('M@4262')
    db.commit()
    print('User updated to: mydeen@example.com / M@4262')
else:
    print('No user found!')
