"""
Audit Trail and Workflow Review Event Helpers for IR-ABPS.
Audit tables must be provisioned by reviewed migrations. Runtime helpers never
create or alter schema; audit failures are logged without exposing DB details.
"""
import json
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("auth.audit")

def _get_audit_conn():
    """Get standalone psycopg connection for audit operations."""
    try:
        import psycopg
        from db_config import DB_CONFIG
        return psycopg.connect(**DB_CONFIG)
    except Exception as exc:
        logger.error(
            "Audit database connection failed (%s)", type(exc).__name__
        )
        return None


def record_audit(
    actor_role: Optional[str],
    actor_name: Optional[str],
    method: str,
    path: str,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    outcome: str = "SUCCESS",
    detail: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Record an administrative or operational event into audit_log.
    Exception-safe: swallows all DB errors.
    """
    conn = _get_audit_conn()
    if conn is None:
        return

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_log (
                    actor_role, actor_name, method, path, action,
                    target_type, target_id, outcome, detail
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    actor_role,
                    actor_name,
                    method,
                    path,
                    action,
                    target_type,
                    target_id,
                    outcome,
                    json.dumps(detail) if detail is not None else None,
                ),
            )
        conn.commit()
    except Exception as exc:
        logger.error("Failed to record audit log (%s)", type(exc).__name__)
        try:
            conn.rollback()
        except Exception:
            pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def record_review_event(
    block_id: str,
    actor_role: str,
    actor_name: Optional[str],
    actor_dept: Optional[str],
    action: str,
    note: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Record a human-in-the-loop review decision into block_review_events.
    Allowed action values:
      CONTROLLER_ENDORSED, CONTROLLER_RECOMMEND_REWORK, CONTROLLER_RECOMMEND_REJECT,
      CONTROLLER_SENT_REWORK, DEPT_CHANGE_REQUEST, DEPT_ACKNOWLEDGED,
      ADMIN_APPROVED, ADMIN_REJECTED, ADMIN_SENT_REWORK
    """
    conn = _get_audit_conn()
    if conn is None:
        return

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO block_review_events (
                    block_id, actor_role, actor_name, actor_dept, action, note, payload
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    block_id,
                    actor_role,
                    actor_name,
                    actor_dept,
                    action,
                    note,
                    json.dumps(payload) if payload is not None else None,
                ),
            )
        conn.commit()
    except Exception as exc:
        logger.error("Failed to record block review event (%s)", type(exc).__name__)
        try:
            conn.rollback()
        except Exception:
            pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_block_review_summary(block_id: str) -> Dict[str, Any]:
    """Retrieve review status summary for a block (controller decision, department change requests)."""
    conn = _get_audit_conn()
    if conn is None:
        return {
            "controller_decision": None,
            "controller_note": None,
            "controller_reviewed_at": None,
            "has_controller_endorsement": False,
            "open_change_requests": [],
            "acknowledgements": [],
        }

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT actor_role, actor_name, actor_dept, action, note, payload, created_at
                FROM block_review_events
                WHERE block_id = %s
                ORDER BY created_at ASC
                """,
                (block_id,),
            )
            rows = cur.fetchall()

        latest_controller = None
        open_change_requests = []
        acknowledgements = []

        for row in rows:
            actor_role, actor_name, actor_dept, action, note, payload, created_at = row
            ts_str = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)

            if action in (
                "CONTROLLER_ENDORSED",
                "CONTROLLER_RECOMMEND_REWORK",
                "CONTROLLER_RECOMMEND_REJECT",
                "CONTROLLER_SENT_REWORK",
            ):
                decision_label = action.replace("CONTROLLER_", "")
                latest_controller = {
                    "decision": decision_label,
                    "reviewer": actor_name,
                    "note": note,
                    "reviewed_at": ts_str,
                }

            elif action == "DEPT_CHANGE_REQUEST":
                open_change_requests.append({
                    "department": actor_dept,
                    "requested_by": actor_name,
                    "reason": note,
                    "payload": payload if isinstance(payload, dict) else (json.loads(payload) if payload else {}),
                    "created_at": ts_str,
                })

            elif action == "DEPT_ACKNOWLEDGED":
                acknowledgements.append({
                    "department": actor_dept,
                    "acknowledged_by": actor_name,
                    "created_at": ts_str,
                })

        has_endorsement = (
            latest_controller is not None
            and latest_controller.get("decision") == "ENDORSED"
        )

        return {
            "controller_decision": latest_controller.get("decision") if latest_controller else None,
            "controller_note": latest_controller.get("note") if latest_controller else None,
            "controller_reviewed_at": latest_controller.get("reviewed_at") if latest_controller else None,
            "has_controller_endorsement": has_endorsement,
            "open_change_requests": open_change_requests,
            "acknowledgements": acknowledgements,
        }
    except Exception as exc:
        logger.error("Failed to read block review summary (%s)", type(exc).__name__)
        return {
            "controller_decision": None,
            "controller_note": None,
            "controller_reviewed_at": None,
            "has_controller_endorsement": False,
            "open_change_requests": [],
            "acknowledgements": [],
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_block_history(block_id: str) -> List[Dict[str, Any]]:
    """Retrieve chronologically ordered review and authorization timeline for a block."""
    conn = _get_audit_conn()
    if conn is None:
        return []

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT event_id, block_id, actor_role, actor_name, actor_dept, action, note, payload, created_at
                FROM block_review_events
                WHERE block_id = %s
                ORDER BY created_at ASC
                """,
                (block_id,),
            )
            rows = cur.fetchall()

        events = []
        for row in rows:
            created_at = row[8]
            ts_str = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)
            payload_data = row[7]
            if isinstance(payload_data, str):
                try:
                    payload_data = json.loads(payload_data)
                except Exception:
                    pass

            events.append({
                "event_id": row[0],
                "block_id": row[1],
                "actor_role": row[2],
                "actor_name": row[3],
                "actor_dept": row[4],
                "action": row[5],
                "note": row[6],
                "payload": payload_data or {},
                "created_at": ts_str,
            })
        return events
    except Exception as exc:
        logger.error("Failed to query block history (%s)", type(exc).__name__)
        return []
    finally:
        try:
            conn.close()
        except Exception:
            pass
