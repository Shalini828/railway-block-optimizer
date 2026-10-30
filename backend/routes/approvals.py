"""Compatibility approval endpoint for optimized blocks.

The canonical approval workflow lives in ``routes.optimized_plan``. This
endpoint is retained for existing clients, with the same permissions, actor
identity, approval policy, and best-effort audit behavior.
"""

from typing import Literal

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from auth.security import CurrentUser, get_current_user, require_permission
from auth.audit import record_audit, record_review_event
from db_config import DB_CONFIG
from routes.optimized_plan import check_controller_review_gate


router = APIRouter(prefix="/approvals", tags=["Approvals"])


class ApprovalRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    block_id: str = Field(min_length=1, max_length=30)
    action: Literal["APPROVE", "REJECT"]
    comments: str | None = Field(default=None, max_length=2000)
    # Kept as an ignored compatibility field. Actor identity is token-derived.
    performed_by: str | None = Field(default=None, max_length=150)

    @field_validator("action", mode="before")
    @classmethod
    def normalize_action(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value


def get_connection():
    """Open a database connection or report service unavailability."""
    try:
        return psycopg.connect(**DB_CONFIG)
    except psycopg.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Approval service is temporarily unavailable",
        ) from exc


@router.post("/")
def process_approval(
    request: ApprovalRequest,
    user: CurrentUser = Depends(get_current_user),
):
    # The legacy endpoint accepts both actions in one request, so enforce the
    # permission corresponding to the validated action before connecting.
    permission = "planner.approve" if request.action == "APPROVE" else "planner.reject"
    require_permission(permission)(user)

    actor = f"{user.name} ({user.title})"
    new_status = "APPROVED" if request.action == "APPROVE" else "REJECTED"
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT block_id, block_status
                FROM optimized_blocks
                WHERE block_id = %s
                FOR UPDATE
                """,
                (request.block_id,),
            )
            block = cursor.fetchone()
            if not block:
                raise HTTPException(status_code=404, detail="Optimized block not found")

            if request.action == "APPROVE":
                if block[1] == "APPROVED":
                    raise HTTPException(status_code=400, detail="Block is already approved")
                has_endorsement = check_controller_review_gate(request.block_id)
            else:
                has_endorsement = False

            cursor.execute(
                """
                UPDATE optimized_blocks
                SET block_status = %s,
                    approved_by = %s,
                    approved_at = CURRENT_TIMESTAMP
                WHERE block_id = %s
                """,
                (new_status, actor, request.block_id),
            )
            if cursor.rowcount != 1:
                raise HTTPException(status_code=404, detail="Optimized block not found")

            cursor.execute(
                """
                INSERT INTO block_approval_history
                    (block_id, action, performed_by, comments)
                VALUES (%s, %s, %s, %s)
                """,
                (request.block_id, request.action, actor, request.comments),
            )

            cursor.execute(
                """
                INSERT INTO notifications
                    (user_id, notification_type, title, message, entity_type, entity_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    "USR-006",
                    "BLOCK_APPROVAL",
                    f"Block {new_status}",
                    f"Block {request.block_id} has been {new_status.lower()} by {actor}.",
                    "OPTIMIZED_BLOCK",
                    request.block_id,
                ),
            )

        conn.commit()

        if request.action == "APPROVE":
            override_flag = not has_endorsement
            record_review_event(
                block_id=request.block_id,
                actor_role=user.role_id,
                actor_name=user.name,
                actor_dept=user.dept,
                action="ADMIN_APPROVED",
                note="Final block authorization approved",
                payload={"override_without_review": override_flag},
            )
            audit_action = "BLOCK_APPROVE"
            audit_detail = {"override_without_review": override_flag}
        else:
            record_review_event(
                block_id=request.block_id,
                actor_role=user.role_id,
                actor_name=user.name,
                actor_dept=user.dept,
                action="ADMIN_REJECTED",
                note="Final authorization rejected",
            )
            audit_action = "BLOCK_REJECT"
            audit_detail = None

        record_audit(
            actor_role=user.role_id,
            actor_name=user.name,
            method="POST",
            path="/approvals/",
            action=audit_action,
            target_type="block",
            target_id=request.block_id,
            outcome="SUCCESS",
            detail=audit_detail,
        )

        return {
            "status": "success",
            "message": f"Block {new_status.lower()} successfully",
            "block_id": request.block_id,
            "block_status": new_status,
        }
    except HTTPException:
        conn.rollback()
        raise
    except psycopg.Error as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Approval could not be persisted",
        ) from exc
    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Approval could not be persisted",
        ) from exc
    finally:
        conn.close()
