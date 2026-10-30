"""
Authentication and Authorization Security Core.

Handles JWT token generation, verification, user extraction,
and permission dependencies.
"""

import os
import secrets
import logging
import math

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional, Set, Callable

import jwt
from dotenv import load_dotenv

from fastapi import (
    Request,
    HTTPException,
    Depends,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth.permissions import (
    ROLE_TABLE,
    ALL_EMERGENCY_GROUPS,
    REPORTABLE_GROUPS,
)


logger = logging.getLogger("auth.security")


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# JWT CONFIGURATION
# ============================================================

APP_ENV = (os.getenv("APP_ENV") or "production").strip().lower()


def _resolve_jwt_secret(app_env: str, configured_secret: Optional[str]) -> str:
    secret = (configured_secret or "").strip()
    if secret:
        return secret
    if app_env == "development":
        # Local development may use a process-local key. Set JWT_SECRET when
        # tokens need to survive restarts or be shared across workers.
        return secrets.token_urlsafe(32)
    raise RuntimeError("JWT_SECRET must be configured outside development mode")


JWT_SECRET = _resolve_jwt_secret(APP_ENV, os.getenv("JWT_SECRET"))


# Demo login is disabled unless an operator explicitly configures a password.
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD") or None


def _positive_int_setting(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    try:
        value = int(raw_value) if raw_value is not None else default
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a positive integer") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be a positive integer")
    return value


def _positive_float_setting(name: str, default: float) -> float:
    raw_value = os.getenv(name)
    try:
        value = float(raw_value) if raw_value is not None else default
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a positive finite number") from exc
    if not math.isfinite(value) or value <= 0:
        raise RuntimeError(f"{name} must be a positive finite number")
    return value


AUTH_RATE_LIMIT_MAX_FAILURES = _positive_int_setting(
    "AUTH_RATE_LIMIT_MAX_FAILURES", 5
)
AUTH_RATE_LIMIT_WINDOW_SECONDS = _positive_float_setting(
    "AUTH_RATE_LIMIT_WINDOW_SECONDS", 60.0
)

TOKEN_TTL_MINUTES = _positive_int_setting("TOKEN_TTL_MINUTES", 480)

RBAC_ENFORCE = (
    os.getenv("RBAC_ENFORCE", "true")
    .strip()
    .lower()
    in ("true", "1", "yes")
)

ENFORCE_CONTROLLER_REVIEW = (
    os.getenv("ENFORCE_CONTROLLER_REVIEW", "false")
    .strip()
    .lower()
    in ("true", "1", "yes")
)


def _warn_if_rbac_disabled() -> None:
    if not RBAC_ENFORCE:
        logger.critical(
            "RBAC_ENFORCE is false: role-based access control is in shadow "
            "mode and unauthorized requests will not be blocked."
        )


_warn_if_rbac_disabled()


# ============================================================
# HTTP BEARER AUTHENTICATION
# ============================================================

# This is important for Swagger/OpenAPI.
#
# FastAPI will now automatically generate:
#
# Authorize 🔒
#
# in Swagger UI.
#
# auto_error=False allows us to keep our own custom
# authentication error messages inside get_current_user().

bearer_scheme = HTTPBearer(
    auto_error=False
)


# ============================================================
# CURRENT USER
# ============================================================

@dataclass
class CurrentUser:
    role_id: str
    name: str
    title: str
    dept: Optional[str]
    scope: str
    system: str
    permissions: Set[str]
    # Optional individual database identity. Role-based demo login does not set it.
    user_id: Optional[str] = None


# ============================================================
# RBAC FORBIDDEN EXCEPTION
# ============================================================

class RBACForbiddenException(HTTPException):
    """Specific 403 exception conforming to RBAC JSON specification."""

    def __init__(
        self,
        required: str,
        role: str,
        detail: str = "Forbidden",
    ):
        super().__init__(
            status_code=403,
            detail=detail,
        )

        self.required = required
        self.role = role


# ============================================================
# CREATE ACCESS TOKEN
# ============================================================

def create_access_token(
    role_id: str,
    custom_ttl_minutes: Optional[int] = None,
) -> str:
    """
    Generate signed JWT token for a valid role.
    """

    role_data = ROLE_TABLE.get(role_id)

    if not role_data:
        raise ValueError(
            f"Unknown role: {role_id}"
        )

    if custom_ttl_minutes is not None and (
        isinstance(custom_ttl_minutes, bool)
        or not isinstance(custom_ttl_minutes, int)
        or custom_ttl_minutes <= 0
    ):
        raise ValueError("custom_ttl_minutes must be a positive integer")

    now = datetime.now(timezone.utc)

    ttl = (
        custom_ttl_minutes
        if custom_ttl_minutes is not None
        else TOKEN_TTL_MINUTES
    )

    exp = now + timedelta(
        minutes=ttl
    )

    payload = {
        "sub": role_id,
        "name": role_data["name"],
        "title": role_data["title"],
        "dept": role_data.get("dept"),
        "scope": role_data["scope"],
        "system": role_data["system"],
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm="HS256",
    )


# ============================================================
# DECODE ACCESS TOKEN
# ============================================================

def decode_access_token(token: str) -> dict:
    """
    Decode and validate access token signature and expiration.
    """

    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        ) from None


# ============================================================
# GET CURRENT USER
# ============================================================

def get_current_user(
    request: Request,
    credentials: Optional[
        HTTPAuthorizationCredentials
    ] = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Extract and verify authenticated user from the
    Authorization: Bearer <token> header.

    HTTPBearer is used instead of a plain Header dependency
    so FastAPI Swagger/OpenAPI can expose the Authorize button.
    """

    # --------------------------------------------------------
    # Missing authentication
    # --------------------------------------------------------

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
        )

    # --------------------------------------------------------
    # Verify authentication scheme
    # --------------------------------------------------------

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid Authorization header format. "
                "Expected 'Bearer <token>'"
            ),
        )

    # --------------------------------------------------------
    # Extract JWT
    # --------------------------------------------------------

    token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing bearer token",
        )

    # --------------------------------------------------------
    # Decode JWT
    # --------------------------------------------------------

    payload = decode_access_token(token)

    # --------------------------------------------------------
    # Extract role
    # --------------------------------------------------------

    role_id = payload.get("sub")

    if not role_id:
        raise HTTPException(
            status_code=401,
            detail="Token subject is missing",
        )

    if role_id not in ROLE_TABLE:
        raise HTTPException(
            status_code=401,
            detail=(
                "Token subject does not correspond "
                "to a valid role"
            ),
        )

    # --------------------------------------------------------
    # Build CurrentUser
    # --------------------------------------------------------

    role_info = ROLE_TABLE[role_id]

    return CurrentUser(
        role_id=role_id,
        name=role_info["name"],
        title=role_info["title"],
        dept=role_info.get("dept"),
        scope=role_info["scope"],
        system=role_info["system"],
        permissions=set(
            role_info["permissions"]
        ),
        user_id=payload.get("user_id"),
    )


# ============================================================
# REQUIRE PERMISSION
# ============================================================

def require_permission(
    *perms: str,
) -> Callable:
    """
    Dependency factory requiring user to have
    ALL listed permissions.
    """

    def dependency(
        user: CurrentUser = Depends(
            get_current_user
        ),
    ) -> CurrentUser:

        for perm in perms:

            if perm not in user.permissions:

                if not RBAC_ENFORCE:

                    logger.warning(
                        f"[RBAC-SHADOW] would deny role "
                        f"'{user.role_id}' for required "
                        f"permission '{perm}'"
                    )

                    continue

                raise RBACForbiddenException(
                    required=perm,
                    role=user.role_id,
                    detail=(
                        f"Permission '{perm}' "
                        "required for this action"
                    ),
                )

        return user

    return dependency


# ============================================================
# REQUIRE ANY PERMISSION
# ============================================================

def require_any_permission(
    *perms: str,
) -> Callable:
    """
    Dependency factory requiring user to have
    AT LEAST ONE of the listed permissions.
    """

    def dependency(
        user: CurrentUser = Depends(
            get_current_user
        ),
    ) -> CurrentUser:

        if any(
            perm in user.permissions
            for perm in perms
        ):
            return user

        if not RBAC_ENFORCE:

            logger.warning(
                f"[RBAC-SHADOW] would deny role "
                f"'{user.role_id}' for any of "
                f"permissions {perms}"
            )

            return user

        raise RBACForbiddenException(
            required=" | ".join(perms),
            role=user.role_id,
            detail=(
                f"One of permissions {perms} "
                "required for this action"
            ),
        )

    return dependency


# ============================================================
# DEPARTMENT ACCESS
# ============================================================

def assert_department_access(
    user: CurrentUser,
    dept_code: Optional[str],
) -> None:
    """
    Object-level scoping check.

    Verifies that department-scoped users only access
    data belonging to their own department.
    """

    # Network-level users can access all departments.
    if user.scope == "network":
        return

    # Department must be specified.
    if not dept_code:
        raise RBACForbiddenException(
            required=f"department.{user.dept}",
            role=user.role_id,
            detail=(
                "Department specification required "
                "for departmental user"
            ),
        )

    clean_dept = (
        dept_code
        .replace("DEPT-", "")
        .upper()
    )

    user_dept = (
        user.dept or ""
    ).upper()

    # Prevent cross-department access.
    if clean_dept != user_dept:
        raise RBACForbiddenException(
            required=f"department.{user_dept}",
            role=user.role_id,
            detail=(
                "Cross-department access prohibited. "
                f"User department '{user_dept}' "
                f"cannot access '{clean_dept}'"
            ),
        )
