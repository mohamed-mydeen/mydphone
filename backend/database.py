from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_is_tidb   = "tidbcloud" in settings.DATABASE_URL

# SQLite needs check_same_thread=False; TiDB needs SSL
_connect_args = {}
if _is_sqlite:
    _connect_args = {"check_same_thread": False}
elif _is_tidb:
    _connect_args = {"ssl": {"ssl_mode": "VERIFY_IDENTITY"}}

_engine_kwargs = {"connect_args": _connect_args}
if not _is_sqlite:
    _engine_kwargs.update({"pool_pre_ping": True, "pool_recycle": 3600})

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
