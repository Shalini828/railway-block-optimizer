import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth import security
from main import app
from routes import auth


client = TestClient(app, raise_server_exceptions=False)
TEST_PASSWORD = "test-only-demo-password"


@pytest.fixture(autouse=True)
def reset_login_limiter():
    auth.FAILED_ATTEMPTS.clear()
    yield
    auth.FAILED_ATTEMPTS.clear()


@pytest.mark.parametrize("password", ["12345", "password123", "admin123", "password"])
def test_legacy_password_alternatives_are_rejected(password):
    response = client.post(
        "/auth/login", json={"role_id": "signal", "password": password}
    )

    assert response.status_code == 401


def test_configured_demo_password_authenticates_known_role():
    response = client.post(
        "/auth/login", json={"role_id": "signal", "password": TEST_PASSWORD}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role_id"] == "signal"
    assert "access_token" in data
    assert "permissions" in data


def test_documented_role_alias_resolves_to_canonical_role():
    response = client.post(
        "/auth/login", json={"role_id": "s&t", "password": TEST_PASSWORD}
    )

    assert response.status_code == 200
    assert response.json()["user"]["role_id"] == "signal"


@pytest.mark.parametrize(
    "payload",
    [
        {"password": TEST_PASSWORD},
        {"role_id": "", "password": TEST_PASSWORD},
        {"role_id": "unknown-role", "password": TEST_PASSWORD},
    ],
)
def test_missing_or_unknown_role_is_rejected(payload):
    response = client.post("/auth/login", json=payload)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid role or password"


def test_demo_login_fails_closed_without_configured_password(monkeypatch):
    monkeypatch.setattr(auth, "DEMO_PASSWORD", None)

    response = client.post(
        "/auth/login", json={"role_id": "admin", "password": TEST_PASSWORD}
    )

    assert response.status_code == 503


def test_login_limiter_uses_configurable_threshold(monkeypatch):
    monkeypatch.setattr(auth, "RATE_LIMIT_MAX_FAILURES", 2)
    payload = {"role_id": "signal", "password": "incorrect"}

    assert client.post("/auth/login", json=payload).status_code == 401
    assert client.post("/auth/login", json=payload).status_code == 401
    assert client.post("/auth/login", json=payload).status_code == 429


def test_jwt_secret_requires_configuration_outside_explicit_development():
    with pytest.raises(RuntimeError):
        security._resolve_jwt_secret("production", None)
    with pytest.raises(RuntimeError):
        security._resolve_jwt_secret("test", "   ")


def test_development_jwt_secret_can_be_generated_without_logging(capsys):
    secret = security._resolve_jwt_secret("development", None)

    assert len(secret) >= 32
    assert capsys.readouterr().out == ""
    assert capsys.readouterr().err == ""


def test_explicit_jwt_secret_is_used_unchanged():
    assert security._resolve_jwt_secret("production", "configured-key") == "configured-key"
