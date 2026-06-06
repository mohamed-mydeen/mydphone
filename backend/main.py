from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .database import Base, engine, SessionLocal
from .routers import auth, contacts, profile, photos
from .config import settings
from .models import User
from .auth import hash_password

# Create tables
Base.metadata.create_all(bind=engine)


def seed_admin_user():
    """Create the admin user on startup if no users exist in the DB."""
    if not settings.SEED_EMAIL or not settings.SEED_PASSWORD:
        return
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.SEED_EMAIL.lower()).first()
        if not existing:
            user = User(
                name=settings.SEED_NAME or "Admin",
                email=settings.SEED_EMAIL.lower(),
                password_hash=hash_password(settings.SEED_PASSWORD),
            )
            db.add(user)
            db.commit()
            print(f"[Seed] Created admin user: {settings.SEED_EMAIL}")
        else:
            print(f"[Seed] Admin user already exists: {existing.email}")
    finally:
        db.close()


# Run seed before serving requests
seed_admin_user()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    description="Secure emergency contact management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow all Vercel preview deployments (any subdomain under *.vercel.app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://[a-zA-Z0-9\-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(profile.router)
app.include_router(photos.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
