import os
import sys
from unittest.mock import MagicMock

import psycopg
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth.security import create_access_token
from main import app
from routes import approvals, optimized_plan


client = TestClient(app, raise_server_exceptions=False)


def auth(role: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(role)}"}


def fake_connection():
    connection = MagicMock()
    cursor = MagicMock()
    connection.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchone.return_value = ("BLK-1", "PENDING")
    cursor.rowcount = 1
    return connection, cursor


@pytest.fixture
def mock_workflow_audit(monkeypatch):
    gate = MagicMock(return_value=True)
    review_event = MagicMock()
    audit_event = MagicMock()
    monkeypatch.setattr(approvals, "check_controller_review_gate", gate)
    monkeypatch.setattr(approvals, "record_review_event", review_event)
    monkeypatch.setattr(approvals, "record_audit", audit_event)
    return gate, review_event, audit_event


def test_approval_rejects_unauthenticated_request(monkeypatch):
    connect = MagicMock()
    monkeypatch.setattr(approvals, "get_connection", connect)

    response = client.post("/approvals/", json={"block_id": "BLK-1", "action": "APPROVE"})

    assert response.status_code == 401
    connect.assert_not_called()


def test_approval_rejects_user_without_action_permission(monkeypatch):
    connect = MagicMock()
    monkeypatch.setattr(approvals, "get_connection", connect)

    response = client.post(
        "/approvals/",
        json={"block_id": "BLK-1", "action": "APPROVE"},
        headers=auth("control"),
    )

    assert response.status_code == 403
    connect.assert_not_called()


def test_approval_returns_service_unavailable_when_database_is_down(monkeypatch):
    monkeypatch.setattr(
        approvals.psycopg,
        "connect",
        MagicMock(side_effect=psycopg.OperationalError("database unavailable")),
    )

    response = client.post(
        "/approvals/",
        json={"block_id": "BLK-1", "action": "APPROVE"},
        headers=auth("admin"),
    )

    assert response.status_code == 503


def test_approval_write_failure_rolls_back_and_does_not_report_success(
    monkeypatch, mock_workflow_audit
):
    connection, cursor = fake_connection()
    cursor.execute.side_effect = [None, None, psycopg.OperationalError("write failed")]
    monkeypatch.setattr(approvals, "get_connection", lambda: connection)

    response = client.post(
        "/approvals/",
        json={
            "block_id": "BLK-1",
            "action": "APPROVE",
            "performed_by": "Untrusted Actor",
        },
        headers=auth("admin"),
    )

    assert response.status_code == 500
    assert response.json()["detail"] != "write failed"
    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()
    assert cursor.execute.call_args_list[1].args[1][1] != "Untrusted Actor"


def test_approval_persists_history_notification_and_returns_success(
    monkeypatch, mock_workflow_audit
):
    gate, review_event, audit_event = mock_workflow_audit
    connection, cursor = fake_connection()
    monkeypatch.setattr(approvals, "get_connection", lambda: connection)

    response = client.post(
        "/approvals/",
        json={"block_id": "BLK-1", "action": "APPROVE", "comments": "Reviewed"},
        headers=auth("admin"),
    )

    assert response.status_code == 200
    assert response.json()["block_status"] == "APPROVED"
    connection.commit.assert_called_once()
    connection.rollback.assert_not_called()
    assert cursor.execute.call_count == 4
    assert cursor.execute.call_args_list[1].args[1][1] == (
        "Senior Officer / DRM Planning (ADMIN / SENIOR OFFICER)"
    )
    gate.assert_called_once_with("BLK-1")
    review_event.assert_called_once()
    assert review_event.call_args.kwargs["action"] == "ADMIN_APPROVED"
    audit_event.assert_called_once()
    assert audit_event.call_args.kwargs["action"] == "BLOCK_APPROVE"
    assert audit_event.call_args.kwargs["path"] == "/approvals/"


def test_approval_enforces_shared_controller_review_gate(monkeypatch):
    connection, cursor = fake_connection()
    monkeypatch.setattr(approvals, "get_connection", lambda: connection)
    monkeypatch.setattr(approvals, "check_controller_review_gate", optimized_plan.check_controller_review_gate)
    monkeypatch.setattr(optimized_plan, "ENFORCE_CONTROLLER_REVIEW", True)
    monkeypatch.setattr(
        optimized_plan,
        "get_block_review_summary",
        lambda _block_id: {"has_controller_endorsement": False},
    )
    monkeypatch.setattr(approvals, "record_review_event", MagicMock())
    monkeypatch.setattr(approvals, "record_audit", MagicMock())

    response = client.post(
        "/approvals/",
        json={"block_id": "BLK-1", "action": "APPROVE"},
        headers=auth("admin"),
    )

    assert response.status_code == 409
    assert len(cursor.execute.call_args_list) == 1
    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()


def test_approval_rejects_already_approved_block(monkeypatch, mock_workflow_audit):
    connection, cursor = fake_connection()
    cursor.fetchone.return_value = ("BLK-1", "APPROVED")
    monkeypatch.setattr(approvals, "get_connection", lambda: connection)

    response = client.post(
        "/approvals/",
        json={"block_id": "BLK-1", "action": "APPROVE"},
        headers=auth("admin"),
    )

    assert response.status_code == 400
    assert len(cursor.execute.call_args_list) == 1
    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()


def test_rejection_uses_canonical_audit_events(monkeypatch, mock_workflow_audit):
    _gate, review_event, audit_event = mock_workflow_audit
    connection, _cursor = fake_connection()
    monkeypatch.setattr(approvals, "get_connection", lambda: connection)

    response = client.post(
        "/approvals/",
        json={"block_id": "BLK-1", "action": "REJECT", "comments": "Unsafe"},
        headers=auth("admin"),
    )

    assert response.status_code == 200
    assert response.json()["block_status"] == "REJECTED"
    connection.commit.assert_called_once()
    review_event.assert_called_once()
    assert review_event.call_args.kwargs["action"] == "ADMIN_REJECTED"
    audit_event.assert_called_once()
    assert audit_event.call_args.kwargs["action"] == "BLOCK_REJECT"


def test_invalid_action_is_rejected_before_database_access(monkeypatch):
    connect = MagicMock()
    monkeypatch.setattr(approvals, "get_connection", connect)

    response = client.post(
        "/approvals/",
        json={"block_id": "BLK-1", "action": "DELETE"},
        headers=auth("admin"),
    )

    assert response.status_code == 422
    connect.assert_not_called()
