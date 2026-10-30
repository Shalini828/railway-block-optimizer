import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth import audit


def make_audit_connection():
    connection = MagicMock()
    cursor = MagicMock()
    connection.cursor.return_value.__enter__.return_value = cursor
    cursor.fetchall.return_value = []
    return connection, cursor


def test_audit_helpers_do_not_issue_runtime_ddl(monkeypatch):
    connection, cursor = make_audit_connection()
    monkeypatch.setattr(audit, "_get_audit_conn", lambda: connection)

    audit.record_audit("admin", "Officer", "POST", "/test", "TEST")
    audit.record_review_event("BLK-1", "admin", "Officer", "COA", "ADMIN_APPROVED")
    summary = audit.get_block_review_summary("BLK-1")
    history = audit.get_block_history("BLK-1")

    statements = [
        call.args[0].lstrip().upper().splitlines()[0]
        for call in cursor.execute.call_args_list
    ]
    assert statements == [
        "INSERT INTO AUDIT_LOG (",
        "INSERT INTO BLOCK_REVIEW_EVENTS (",
        "SELECT ACTOR_ROLE, ACTOR_NAME, ACTOR_DEPT, ACTION, NOTE, PAYLOAD, CREATED_AT",
        "SELECT EVENT_ID, BLOCK_ID, ACTOR_ROLE, ACTOR_NAME, ACTOR_DEPT, ACTION, NOTE, PAYLOAD, CREATED_AT",
    ]
    assert all(not statement.startswith(("CREATE", "ALTER", "DROP")) for statement in statements)
    assert summary["has_controller_endorsement"] is False
    assert history == []
    assert connection.commit.call_count == 2


def test_missing_audit_table_is_logged_without_exposing_database_error(monkeypatch, caplog):
    connection, cursor = make_audit_connection()
    cursor.execute.side_effect = RuntimeError("sensitive database connection detail")
    monkeypatch.setattr(audit, "_get_audit_conn", lambda: connection)

    audit.record_audit("admin", "Officer", "POST", "/test", "TEST")

    assert "Failed to record audit log (RuntimeError)" in caplog.text
    assert "sensitive database connection detail" not in caplog.text
    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()
