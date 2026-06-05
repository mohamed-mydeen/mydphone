from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Optional

# Resolve .env from this file's directory — works regardless of launch CWD
_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./emergency_vault.db"
    SECRET_KEY: str = "change-this-to-a-very-long-random-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://mydphone.vercel.app",
        "https://mydphone-kfdwt8no1-mohamed-mydeen-shahabudeen-ms-projects.vercel.app",
    ]
    APP_NAME: str = "Emergency Contact Vault"
    # Auto-seed: set these via environment variables on your deployment platform (Render/etc.)
    # NEVER hardcode credentials here — use env vars only
    SEED_EMAIL: Optional[str] = None
    SEED_PASSWORD: Optional[str] = None
    SEED_NAME: Optional[str] = None

    class Config:
        env_file = str(_ENV_FILE)
        case_sensitive = True


settings = Settings()
