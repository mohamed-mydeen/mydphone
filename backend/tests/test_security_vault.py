import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test in-memory SQLite DB
from sqlalchemy.pool import StaticPool
from backend.database import Base, get_db
from backend.models import User, Contact, Document, Photo, TrustedDevice
from backend.auth import hash_password, create_access_token, create_vault_token
from backend.main import app

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    # Clean tables
    db.query(Contact).delete()
    db.query(Document).delete()
    db.query(Photo).delete()
    db.query(TrustedDevice).delete()
    db.query(User).delete()
    db.commit()

    # Seed test user
    from backend.routers.security import hash_pin
    user = User(
        name="Security Tester",
        email="security@vault.com",
        password_hash=hash_password("SuperSecretPassword123!"),
        vault_pin_hash=hash_pin("123456"),
        token_version=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed contacts (1 normal, 1 emergency)
    c1 = Contact(
        user_id=user.id,
        full_name="Private Personal Doctor",
        phone_number="+15550001",
        email="doctor@private.com",
        is_emergency=False,
    )
    c2 = Contact(
        user_id=user.id,
        full_name="Hospital Emergency Hotline",
        phone_number="911",
        email="emergency@city.gov",
        is_emergency=True,
    )
    db.add(c1)
    db.add(c2)

    # Seed documents (1 normal, 1 emergency)
    d1 = Document(
        user_id=user.id,
        document_name="Tax Return 2025",
        category="Finance",
        file_type="PDF",
        content_type="application/pdf",
        file_size=1024,
        file_path="/tmp/tax.pdf",
        is_emergency=False,
    )
    d2 = Document(
        user_id=user.id,
        document_name="Blood Type and Allergy Card",
        category="Medical",
        file_type="PDF",
        content_type="application/pdf",
        file_size=512,
        file_path="/tmp/allergy.pdf",
        is_emergency=True,
    )
    db.add(d1)
    db.add(d2)

    db.commit()
    yield
    db.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


def test_scenario_1_login_and_unlock_vault(client):
    """1. A user logs in and unlocks the vault successfully."""
    # Step 1: Login
    login_res = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-primary"},
    )
    assert login_res.status_code == 200
    access_token = login_res.json()["access_token"]
    assert access_token is not None

    # Step 2: Register device
    dev_res = client.post(
        "/security/devices",
        json={
            "device_id": "device-primary",
            "device_name": "Test Laptop",
            "browser_info": "Chrome on Linux",
        },
        headers={"Authorization": f"Bearer {access_token}", "X-Device-Id": "device-primary"},
    )
    assert dev_res.status_code == 200

    # Step 3: Verify PIN to unlock vault
    pin_res = client.post(
        "/security/pin/verify",
        json={"pin": "123456", "timeout_minutes": 5},
        headers={"Authorization": f"Bearer {access_token}", "X-Device-Id": "device-primary"},
    )
    assert pin_res.status_code == 200
    vault_token = pin_res.json()["vault_token"]
    assert vault_token is not None

    # Step 4: Access sensitive vault contacts
    contacts_res = client.get(
        "/contacts/all",
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Vault-Token": vault_token,
            "X-Device-Id": "device-primary",
        },
    )
    assert contacts_res.status_code == 200
    data = contacts_res.json()
    assert len(data) == 2
    assert any(c["full_name"] == "Private Personal Doctor" for c in data)


def test_scenario_2_close_and_reopen_browser(client):
    """2. The user closes and reopens the browser (vault starts locked)."""
    login_res = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-primary"},
    )
    access_token = login_res.json()["access_token"]

    # Reopening browser preserves session login token, but vaultToken is null in memory
    contacts_res = client.get(
        "/contacts/all",
        headers={"Authorization": f"Bearer {access_token}", "X-Device-Id": "device-primary"},
    )
    assert contacts_res.status_code == 403
    assert "Vault access locked" in contacts_res.json()["detail"]


def test_scenario_3_refresh_page_while_unlocked(client):
    """3. The user refreshes the page while the vault is unlocked."""
    login_res = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-primary"},
    )
    access_token = login_res.json()["access_token"]

    # Unlock vault
    pin_res = client.post(
        "/security/pin/verify",
        json={"pin": "123456", "timeout_minutes": 5},
        headers={"Authorization": f"Bearer {access_token}", "X-Device-Id": "device-primary"},
    )
    assert pin_res.status_code == 200

    # On page refresh, frontend memory is cleared; requests are made without X-Vault-Token
    photos_res = client.get(
        "/photos",
        headers={"Authorization": f"Bearer {access_token}", "X-Device-Id": "device-primary"},
    )
    assert photos_res.status_code == 403
    assert "Vault access locked" in photos_res.json()["detail"]


def test_scenario_4_direct_navigation_without_unlock(client):
    """4. Direct navigation to Contacts, Documents, Photos, and Emergency routes without unlocking."""
    login_res = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-primary"},
    )
    access_token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {access_token}", "X-Device-Id": "device-primary"}

    # Contacts locked
    assert client.get("/contacts/all", headers=auth_headers).status_code == 403
    assert client.get("/contacts", headers=auth_headers).status_code == 403
    assert client.get("/contacts/export", headers=auth_headers).status_code == 403

    # Photos locked
    assert client.get("/photos", headers=auth_headers).status_code == 403

    # Non-emergency documents locked
    assert client.get("/documents", headers=auth_headers).status_code == 403

    # Emergency documents permitted
    emergency_docs = client.get("/documents?emergency=true", headers=auth_headers)
    assert emergency_docs.status_code == 200
    docs = emergency_docs.json()
    assert len(docs) == 1
    assert docs[0]["document_name"] == "Blood Type and Allergy Card"

    # Emergency contacts search permitted without vault token (returns ONLY emergency contacts)
    search_res = client.get("/contacts/search?q=Doctor", headers=auth_headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) == 0  # Private Personal Doctor is omitted because vault is locked!

    search_emergency = client.get("/contacts/search?q=Hospital", headers=auth_headers)
    assert search_emergency.status_code == 200
    assert len(search_emergency.json()) == 1
    assert search_emergency.json()[0]["full_name"] == "Hospital Emergency Hotline"


def test_scenario_5_idle_timeout_expires(client):
    """5. The user leaves the application idle for the configured timeout."""
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "security@vault.com").first()
    access_token = create_access_token({"sub": str(user.id), "tv": user.token_version})
    db.close()

    # Create an expired vault token
    expired_vault_token = create_vault_token(user, expires_delta=timedelta(minutes=-1))

    res = client.get(
        "/contacts/all",
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Vault-Token": expired_vault_token,
        },
    )
    assert res.status_code == 403
    assert "Vault access locked" in res.json()["detail"]


def test_scenario_6_user_interaction_before_timeout(client):
    """6. The user interacts with the application before the timeout expires."""
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "security@vault.com").first()
    access_token = create_access_token({"sub": str(user.id), "tv": user.token_version})
    # Valid 15 minute token
    valid_vault_token = create_vault_token(user, minutes=15)
    db.close()

    res = client.get(
        "/contacts/all",
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Vault-Token": valid_vault_token,
        },
    )
    assert res.status_code == 200


def test_scenario_7_expired_or_revoked_session(client):
    """7. An expired or revoked session attempts to access protected API endpoints."""
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "security@vault.com").first()
    # Token with old token_version
    revoked_access_token = create_access_token(
        {"sub": str(user.id), "tv": user.token_version - 1}
    )
    # Expired token
    expired_access_token = create_access_token(
        {"sub": str(user.id), "tv": user.token_version},
        expires_delta=timedelta(minutes=-5),
    )
    db.close()

    # Old token_version rejected
    res_revoked = client.get(
        "/profile", headers={"Authorization": f"Bearer {revoked_access_token}"}
    )
    assert res_revoked.status_code == 401

    # Expired token rejected
    res_expired = client.get(
        "/profile", headers={"Authorization": f"Bearer {expired_access_token}"}
    )
    assert res_expired.status_code == 401


def test_scenario_8_logout_and_browser_back(client):
    """8. A user logs out and attempts to reuse old session / back button."""
    login_res = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-logout-test"},
    )
    token = login_res.json()["access_token"]

    # Register device
    client.post(
        "/security/devices",
        json={
            "device_id": "device-logout-test",
            "device_name": "Test Device",
            "browser_info": "Firefox",
        },
        headers={"Authorization": f"Bearer {token}", "X-Device-Id": "device-logout-test"},
    )

    # Logout
    logout_res = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {token}", "X-Device-Id": "device-logout-test"},
    )
    assert logout_res.status_code == 204

    # Back button / reusing old session
    reused_res = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token}", "X-Device-Id": "device-logout-test"},
    )
    assert reused_res.status_code == 401


def test_scenario_9_revoked_trusted_device(client):
    """9. A revoked trusted device attempts to reuse an old session."""
    # Login device A and device B
    login_a = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-a"},
    )
    token_a = login_a.json()["access_token"]

    login_b = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-b"},
    )
    token_b = login_b.json()["access_token"]

    # Register both devices
    client.post(
        "/security/devices",
        json={"device_id": "device-a", "device_name": "Device A", "browser_info": "Chrome"},
        headers={"Authorization": f"Bearer {token_a}", "X-Device-Id": "device-a"},
    )
    client.post(
        "/security/devices",
        json={"device_id": "device-b", "device_name": "Device B", "browser_info": "Safari"},
        headers={"Authorization": f"Bearer {token_b}", "X-Device-Id": "device-b"},
    )

    # Device A revokes Device B
    revoke_res = client.delete(
        "/security/devices/device-b",
        headers={"Authorization": f"Bearer {token_a}", "X-Device-Id": "device-a"},
    )
    assert revoke_res.status_code == 200

    # Device B attempts to access endpoints
    dev_b_access = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token_b}", "X-Device-Id": "device-b"},
    )
    assert dev_b_access.status_code == 401
    assert "Device access has been revoked" in dev_b_access.json()["detail"]


def test_scenario_10_vault_locked_during_request(client):
    """10. The vault is locked while a background request is in progress."""
    login_res = client.post(
        "/auth/login",
        json={"email": "security@vault.com", "password": "SuperSecretPassword123!"},
        headers={"X-Device-Id": "device-primary"},
    )
    access_token = login_res.json()["access_token"]

    # Request without vault token simulates token lock
    res = client.get(
        "/documents",
        headers={"Authorization": f"Bearer {access_token}", "X-Device-Id": "device-primary"},
    )
    assert res.status_code == 403
    assert "Vault access locked" in res.json()["detail"]


def test_scenario_11_fail_secure_closed(client):
    """11. The application fails securely closed on malformed auth/vault tokens."""
    # Malformed token
    res1 = client.get("/contacts/all", headers={"Authorization": "Bearer not-a-valid-jwt"})
    assert res1.status_code == 401

    # Fake vault token signed with wrong key or forged
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "security@vault.com").first()
    valid_access_token = create_access_token({"sub": str(user.id), "tv": user.token_version})
    db.close()

    res2 = client.get(
        "/contacts/all",
        headers={
            "Authorization": f"Bearer {valid_access_token}",
            "X-Vault-Token": "forged.token.payload",
        },
    )
    assert res2.status_code == 403


def test_scenario_12_stale_storage_data_ignored(client):
    """12. Browser storage contains stale unlocked-state data from an earlier session."""
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "security@vault.com").first()
    # Simulate user changing token_version (e.g. logout all)
    stale_vault_token = create_vault_token(user, minutes=5)
    user.token_version += 1
    db.commit()
    fresh_access_token = create_access_token({"sub": str(user.id), "tv": user.token_version})
    db.close()

    # Reusing stale vault token with newer token_version must fail
    res = client.get(
        "/contacts/all",
        headers={
            "Authorization": f"Bearer {fresh_access_token}",
            "X-Vault-Token": stale_vault_token,
        },
    )
    assert res.status_code == 403
    assert "Vault access locked" in res.json()["detail"]


def test_security_headers_enforced(client):
    """Verify security headers: Cache-Control: no-store, X-Frame-Options, etc."""
    res = client.get("/health")
    assert res.status_code == 200
    assert "no-store" in res.headers.get("Cache-Control", "")
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
