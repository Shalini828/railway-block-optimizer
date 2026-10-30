"""
Authentication Routes for IR-ABPS.
Provides /auth/login, /auth/me, and /auth/logout endpoints.
"""
import hmac
import hashlib
import time
from collections import defaultdict
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel, Field

from auth.permissions import ROLE_TABLE, REPORTABLE_GROUPS, resolve_role
from auth.security import (
    AUTH_RATE_LIMIT_MAX_FAILURES,
    AUTH_RATE_LIMIT_WINDOW_SECONDS,
    DEMO_PASSWORD,
    TOKEN_TTL_MINUTES,
    CurrentUser,
    create_access_token,
    get_current_user,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

# Process-local limiter: configured per (role_id, client_ip). It is not shared
# across workers or instances; use a gateway/shared store for distributed limits.
FAILED_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
OVERFLOW_FAILED_ATTEMPTS: Dict[int, List[float]] = {}
RATE_LIMIT_MAX_FAILURES = AUTH_RATE_LIMIT_MAX_FAILURES
RATE_LIMIT_WINDOW_SECONDS = AUTH_RATE_LIMIT_WINDOW_SECONDS
MAX_FAILED_ATTEMPT_KEYS = 4096
OVERFLOW_BUCKET_COUNT = 256


def prune_failed_attempts(now: float) -> None:
    """Drop expired timestamps from primary and bounded overflow buckets."""
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    for buckets in (FAILED_ATTEMPTS, OVERFLOW_FAILED_ATTEMPTS):
        for key, attempts in list(buckets.items()):
            recent = [attempt for attempt in attempts if attempt > cutoff]
            if recent:
                buckets[key] = recent
            else:
                buckets.pop(key, None)


def overflow_bucket_for(rate_key: str) -> int:
    """Map overflow identities to a fixed set of deterministic buckets."""
    digest = hashlib.sha256(rate_key.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % OVERFLOW_BUCKET_COUNT


class LoginRequest(BaseModel):
    role_id: Optional[str] = Field(default=None, max_length=80)
    role: Optional[str] = Field(default=None, max_length=80)
    email: Optional[str] = Field(default=None, max_length=80)
    password: str = Field(max_length=1024)


class UserProfileResponse(BaseModel):
    role_id: str
    name: str
    title: str
    dept: Optional[str]
    scope: str
    system: str
    reportable_emergency_groups: List[str]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfileResponse
    permissions: List[str]


@router.post("/login", response_model=LoginResponse)
def login(request_body: LoginRequest, request: Request):
    """
    Authenticate a configured demo password for a known in-memory role.
    """
    if not DEMO_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo login is not configured",
        )

    input_role = request_body.role_id or request_body.role or request_body.email
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    normalized_input = input_role.strip() if input_role else ""
    role_id = resolve_role(normalized_input) if normalized_input else ""
    role_info = ROLE_TABLE.get(role_id)
    known_role_ids = {info["role_id"] for info in ROLE_TABLE.values()}
    if not role_info or role_info["role_id"] not in known_role_ids:
        role_info = None
        role_id = normalized_input.lower()
    elif role_info:
        # Aliases are accepted, but tokens and responses use canonical IDs.
        role_id = role_info["role_id"]

    rate_key = f"{role_id}:{client_ip}"

    # Sweep stale entries so arbitrary invalid role/IP combinations cannot
    # leave expired buckets in memory indefinitely.
    prune_failed_attempts(now)
    recent_failures = FAILED_ATTEMPTS.get(rate_key, [])

    if len(recent_failures) >= RATE_LIMIT_MAX_FAILURES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
        )

    # Compare the single configured credential in constant time. Do not trim or
    # otherwise normalize passwords: the configured value is the exact secret.
    password_valid = hmac.compare_digest(
        request_body.password.encode("utf-8"), DEMO_PASSWORD.encode("utf-8")
    )

    if role_info is None or not password_valid:
        primary_key_limit = max(0, MAX_FAILED_ATTEMPT_KEYS - OVERFLOW_BUCKET_COUNT)
        if rate_key in FAILED_ATTEMPTS or len(FAILED_ATTEMPTS) < primary_key_limit:
            FAILED_ATTEMPTS.setdefault(rate_key, []).append(now)
        else:
            # Keep primary buckets for active identities; overflow identities
            # share a bounded hash bucket rather than consuming map capacity.
            overflow_key = overflow_bucket_for(rate_key)
            overflow_failures = OVERFLOW_FAILED_ATTEMPTS.get(overflow_key, [])
            if len(overflow_failures) >= RATE_LIMIT_MAX_FAILURES:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed login attempts. Please try again later.",
                )
            OVERFLOW_FAILED_ATTEMPTS.setdefault(overflow_key, []).append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid role or password",
        )

    # Clear failure count on success
    FAILED_ATTEMPTS.pop(rate_key, None)

    token = create_access_token(role_id)
    reportable_groups = sorted(list(REPORTABLE_GROUPS.get(role_id, set())))

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": TOKEN_TTL_MINUTES * 60,
        "user": {
            "role_id": role_info["role_id"],
            "name": role_info["name"],
            "title": role_info["title"],
            "dept": role_info.get("dept"),
            "scope": role_info["scope"],
            "system": role_info["system"],
            "reportable_emergency_groups": reportable_groups,
        },
        "permissions": sorted(list(role_info["permissions"])),
    }


@router.get("/me")
def get_me(user: CurrentUser = Depends(get_current_user)):
    """Return currently authenticated officer profile and granted permissions."""
    reportable_groups = sorted(list(REPORTABLE_GROUPS.get(user.role_id, set())))
    return {
        "user": {
            "role_id": user.role_id,
            "name": user.name,
            "title": user.title,
            "dept": user.dept,
            "scope": user.scope,
            "system": user.system,
            "reportable_emergency_groups": reportable_groups,
        },
        "permissions": sorted(list(user.permissions)),
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: CurrentUser = Depends(get_current_user)):
    """
    Stateless JWT logout endpoint.
    Allows frontend to make a clean API sign-out call and records audit event.
    """
    return None
