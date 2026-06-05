import sys
from backend.database import SessionLocal
from backend.models import User
from backend.auth import hash_password

db = SessionLocal()
email = 'mohamedmydeen.sd@gmail.com'
password = 'myd@4262'

user = db.query(User).filter(User.email == email).first()
if not user:
    user = User(email=email, name='mydeen', password_hash=hash_password(password))
    db.add(user)
else:
    user.password_hash = hash_password(password)

db.commit()
print(f'User updated to: {email} / {password}')
