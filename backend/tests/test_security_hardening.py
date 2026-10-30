import os
import sys

import jwt
import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth import security


def test_rbac_shadow_mode_warning_uses_logger(monkeypatch, caplog):
    monkeypatch.setattr(security, "RBAC_ENFORCE", False)

    with caplog.at_level("CRITICAL", logger="auth.security"):
        security._warn_if_rbac_disabled()

    assert "RBAC_ENFORCE is false" in caplog.text
    assert "unauthorized requests will not be blocked" in caplog.text


def test_invalid_jwt_details_are_not_exposed_to_clients():
    with pytest.raises(HTTPException) as exc_info:
        security.decode_access_token("not-a-valid-jwt")

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid authentication token"
    assert "segments" not in exc_info.value.detail.lower()


@pytest.mark.parametrize("configured_ttl", ["0", "-1", "1.5", "invalid", ""])
def test_token_ttl_configuration_rejects_non_positive_or_non_integer_values(
    monkeypatch, configured_ttl
):
    monkeypatch.setenv("TOKEN_TTL_MINUTES", configured_ttl)

    with pytest.raises(RuntimeError, match="TOKEN_TTL_MINUTES"):
        security._positive_int_setting("TOKEN_TTL_MINUTES", 480)


def test_token_ttl_configuration_accepts_positive_integer(monkeypatch):
    monkeypatch.setenv("TOKEN_TTL_MINUTES", "25")

    assert security._positive_int_setting("TOKEN_TTL_MINUTES", 480) == 25
    assert security.TOKEN_TTL_MINUTES > 0


@pytest.mark.parametrize("configured_window", ["nan", "inf", "+inf", "-inf"])
def test_rate_limit_window_rejects_non_finite_values(monkeypatch, configured_window):
    monkeypatch.setenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", configured_window)

    with pytest.raises(RuntimeError, match="positive finite number"):
        security._positive_float_setting("AUTH_RATE_LIMIT_WINDOW_SECONDS", 60.0)


def test_rate_limit_window_accepts_positive_finite_value(monkeypatch):
    monkeypatch.setenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "45.5")

    assert security._positive_float_setting("AUTH_RATE_LIMIT_WINDOW_SECONDS", 60.0) == 45.5


@pytest.mark.parametrize("custom_ttl", [0, -1, 1.5, True])
def test_custom_token_ttl_requires_positive_integer(custom_ttl):
    with pytest.raises(ValueError, match="positive integer"):
        security.create_access_token("admin", custom_ttl_minutes=custom_ttl)


def test_custom_token_ttl_accepts_positive_integer():
    token = security.create_access_token("admin", custom_ttl_minutes=5)

    assert jwt.decode(
        token, security.JWT_SECRET, algorithms=["HS256"]
    )["exp"] > 0


def test_configured_secret_behavior_remains_fail_closed():
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        security._resolve_jwt_secret("production", None)

    assert security._resolve_jwt_secret("development", None)
    assert security._resolve_jwt_secret("production", "configured") == "configured"
