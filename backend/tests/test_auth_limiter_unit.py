import os
import sys

import pytest
from fastapi import HTTPException, Request

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routes import auth


def make_request(ip="127.0.0.1"):
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/auth/login",
            "raw_path": b"/auth/login",
            "query_string": b"",
            "headers": [],
            "client": (ip, 12345),
            "server": ("testserver", 80),
        }
    )


@pytest.fixture(autouse=True)
def reset_limiter():
    auth.FAILED_ATTEMPTS.clear()
    auth.OVERFLOW_FAILED_ATTEMPTS.clear()
    yield
    auth.FAILED_ATTEMPTS.clear()
    auth.OVERFLOW_FAILED_ATTEMPTS.clear()


def test_pruning_removes_expired_keys_and_preserves_active_failures(monkeypatch):
    monkeypatch.setattr(auth, "RATE_LIMIT_WINDOW_SECONDS", 60)
    auth.FAILED_ATTEMPTS.update({"expired": [1.0], "active": [99.0, 99.5]})
    auth.OVERFLOW_FAILED_ATTEMPTS.update({0: [1.0], 1: [99.5]})

    auth.prune_failed_attempts(100.0)

    assert "expired" not in auth.FAILED_ATTEMPTS
    assert auth.FAILED_ATTEMPTS["active"] == [99.0, 99.5]
    assert 0 not in auth.OVERFLOW_FAILED_ATTEMPTS
    assert auth.OVERFLOW_FAILED_ATTEMPTS[1] == [99.5]


def test_active_failures_still_trigger_existing_threshold(monkeypatch):
    monkeypatch.setattr(auth, "DEMO_PASSWORD", "unit-test-password")
    monkeypatch.setattr(auth, "RATE_LIMIT_MAX_FAILURES", 2)
    monkeypatch.setattr(auth, "RATE_LIMIT_WINDOW_SECONDS", 60)
    payload = auth.LoginRequest(role_id="admin", password="wrong")

    for _ in range(2):
        with pytest.raises(HTTPException) as exc_info:
            auth.login(payload, make_request())
        assert exc_info.value.status_code == 401

    with pytest.raises(HTTPException) as exc_info:
        auth.login(payload, make_request())
    assert exc_info.value.status_code == 429
    assert "1 minute" not in exc_info.value.detail


def test_overflow_keys_use_bounded_buckets_without_evicting_active_keys(monkeypatch):
    monkeypatch.setattr(auth, "DEMO_PASSWORD", "unit-test-password")
    monkeypatch.setattr(auth, "MAX_FAILED_ATTEMPT_KEYS", 3)
    monkeypatch.setattr(auth, "OVERFLOW_BUCKET_COUNT", 1)
    monkeypatch.setattr(auth, "RATE_LIMIT_MAX_FAILURES", 2)
    monkeypatch.setattr(auth, "RATE_LIMIT_WINDOW_SECONDS", 60)
    auth.FAILED_ATTEMPTS["existing-key"] = [auth.time.time()]
    auth.FAILED_ATTEMPTS["another-existing-key"] = [auth.time.time()]
    active_primary_buckets = {key: list(value) for key, value in auth.FAILED_ATTEMPTS.items()}

    for ip in ("10.0.0.2", "10.0.0.3"):
        with pytest.raises(HTTPException) as exc_info:
            auth.login(
                auth.LoginRequest(role_id="invalid-role", password="wrong"),
                make_request(ip),
            )
        assert exc_info.value.status_code == 401

    assert len(auth.FAILED_ATTEMPTS) == 2
    assert dict(auth.FAILED_ATTEMPTS) == active_primary_buckets
    assert len(auth.OVERFLOW_FAILED_ATTEMPTS) == 1
    assert len(auth.OVERFLOW_FAILED_ATTEMPTS[0]) == 2

    with pytest.raises(HTTPException) as exc_info:
        auth.login(
            auth.LoginRequest(role_id="invalid-role", password="wrong"),
            make_request("10.0.0.4"),
        )
    assert exc_info.value.status_code == 429
    assert "1 minute" not in exc_info.value.detail
    assert len(auth.FAILED_ATTEMPTS) == 2

    monkeypatch.setattr(auth, "create_access_token", lambda _role_id: "unit-test-token")
    result = auth.login(
        auth.LoginRequest(role_id="admin", password="unit-test-password"),
        make_request("10.0.0.2"),
    )
    assert result["access_token"] == "unit-test-token"
    assert len(auth.FAILED_ATTEMPTS) == 2
