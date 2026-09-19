"""
Authentication and Authorization Security Core.
Handles JWT token generation, verification, user extraction, and permission dependencies.
"""
import os
import sys
import time
import secrets
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional, Set, Callable

import jwt
from dotenv import load_dotenv
from fastapi import Request, Header, HTTPException, Depends
from fastapi.responses import JSONResponse

from auth.permissions import ROLE_TABLE, ALL_EMERGENCY_GROUPS, REPORTABLE_GROUPS

logger = logging.getLogger("auth.security")

# Load environment configuration
load_dotenv()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    JWT_SECRET = secrets.token_hex(32)
    print(
        "[WARNING] [RBAC] JWT_SECRET not configured in environment! "
        f"Generated ephemeral secret for development: {JWT_SECRET[:8]}...",
        file=sys.stderr,
    )

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "12345")
TOKEN_TTL_MINUTES = int(os.getenv("TOKEN_TTL_MINUTES", "480"))
RBAC_ENFORCE = os.getenv("RBAC_ENFORCE", "true").strip().lower() in ("true", "1", "yes")
ENFORCE_CONTROLLER_REVIEW = os.getenv("ENFORCE_CONTROLLER_REVIEW", "false").strip().lower() in ("true", "1", "yes")

if not RBAC_ENFORCE:
    print(
        "\n" + "=" * 70 + "\n"
        " [CRITICAL WARNING] RBAC_ENFORCE is set to FALSE!\n"
        " Role-based access control is running in SHADOW MODE (logging only).\n"
        " UNAUTHORIZED REQUESTS WILL NOT BE BLOCKED!\n" +
        "=" * 70 + "\n",
        file=sys.stderr,
    )


@dataclass
class CurrentUser:
    role_id: str
    name: str
    title: str
    dept: Optional[str]
    scope: str
    system: str
    permissions: Set[str]


class RBACForbiddenException(HTTPException):
    """Specific 403 exception conforming to §4 JSON specification."""
    def __init__(self, required: str, role: str, detail: str = "Forbidden"):
        super().__init__(status_code=403, detail=detail)
        self.required = required
        self.role = role


def create_access_token(role_id: str, custom_ttl_minutes: Optional[int] = None) -> str:
    """Generate signed JWT token for a valid role."""
    role_data = ROLE_TABLE.get(role_id)
    if not role_data:
        raise ValueError(f"Unknown role: {role_id}")

    now = datetime.now(timezone.utc)
    ttl = custom_ttl_minutes if custom_ttl_minutes is not None else TOKEN_TTL_MINUTES
    exp = now + timedelta(minutes=ttl)

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

    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Decode and validate access token signature and expiration."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")


def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> CurrentUser:
    """FastAPI dependency to extract and verify authenticated user from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header"
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'"
        )

    token = parts[1]
    payload = decode_access_token(token)

    role_id = payload.get("sub")
    if not role_id or role_id not in ROLE_TABLE:
        raise HTTPException(
            status_code=401,
            detail="Token subject does not correspond to a valid role"
        )

    role_info = ROLE_TABLE[role_id]
    return CurrentUser(
        role_id=role_id,
        name=role_info["name"],
        title=role_info["title"],
        dept=role_info.get("dept"),
        scope=role_info["scope"],
        system=role_info["system"],
        permissions=set(role_info["permissions"]),
    )


def require_permission(*perms: str) -> Callable:
    """Dependency factory requiring user to have ALL listed permissions."""
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        for perm in perms:
            if perm not in user.permissions:
                if not RBAC_ENFORCE:
                    logger.warning(
                        f"[RBAC-SHADOW] would deny role '{user.role_id}' for required permission '{perm}'"
                    )
                    continue
                raise RBACForbiddenException(
                    required=perm,
                    role=user.role_id,
                    detail=f"Permission '{perm}' required for this action",
                )
        return user

    return dependency


def require_any_permission(*perms: str) -> Callable:
    """Dependency factory requiring user to have AT LEAST ONE of the listed permissions."""
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if any(perm in user.permissions for perm in perms):
            return user

        if not RBAC_ENFORCE:
            logger.warning(
                f"[RBAC-SHADOW] would deny role '{user.role_id}' for any of permissions {perms}"
            )
            return user

        raise RBACForbiddenException(
            required=" | ".join(perms),
            role=user.role_id,
            detail=f"One of permissions {perms} required for this action",
        )

    return dependency


def assert_department_access(user: CurrentUser, dept_code: Optional[str]) -> None:
    """
    Object-level scoping check: verify that department-scoped users only access
    data belonging to their own department.
    """
    if user.scope == "network":
        return

    if not dept_code:
        raise RBACForbiddenException(
            required=f"department.{user.dept}",
            role=user.role_id,
            detail="Department specification required for departmental user",
        )

    clean_dept = dept_code.replace("DEPT-", "").upper()
    user_dept = (user.dept or "").upper()

    if clean_dept != user_dept:
        raise RBACForbiddenException(
            required=f"department.{user_dept}",
            role=user.role_id,
            detail=f"Cross-department access prohibited. User department '{user_dept}' cannot access '{clean_dept}'",
        )
