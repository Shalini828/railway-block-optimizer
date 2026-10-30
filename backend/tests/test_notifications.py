import os
import sys
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth.security import create_access_token
from main import app
from routes import notifications


client = TestClient(app, raise_server_exceptions=False)


def auth(role: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(role)}"}


def fake_connection(*, rows=(), updated=(1,)):
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    cursor.fetchall.return_value = list(rows)
    cursor.fetchone.return_value = updated
    return conn, cursor


def test_notification_route_requires_authentication(monkeypatch):
    connect = MagicMock()
    monkeypatch.setattr(notifications, "get_connection", connect)

    response = client.get("/notifications/")

    assert response.status_code == 401
    connect.assert_not_called()


def test_user_cannot_read_another_roles_notifications(monkeypatch):
    connect = MagicMock()
    monkeypatch.setattr(notifications, "get_connection", connect)

    response = client.get("/notifications/?user_id=signal", headers=auth("engineering"))

    assert response.status_code == 403
    connect.assert_not_called()


def test_user_read_is_scoped_to_authenticated_role(monkeypatch):
    conn, cursor = fake_connection()
    monkeypatch.setattr(notifications, "get_connection", lambda: conn)

    response = client.get("/notifications/", headers=auth("engineering"))

    assert response.status_code == 200
    assert response.json() == []
    assert "WHERE user_id = %s" in cursor.execute.call_args.args[0]
    assert cursor.execute.call_args.args[1] == ("engineering",)


def test_user_cannot_mark_another_users_notification_read(monkeypatch):
    conn, cursor = fake_connection(updated=None)
    monkeypatch.setattr(notifications, "get_connection", lambda: conn)

    response = client.patch("/notifications/42/read", headers=auth("engineering"))

    assert response.status_code == 404
    assert "notification_id = %s AND user_id = %s" in cursor.execute.call_args.args[0]
    assert cursor.execute.call_args.args[1] == (42, "engineering")
    conn.commit.assert_not_called()
    conn.rollback.assert_called_once()


def test_admin_manage_can_read_all_and_mark_notification(monkeypatch):
    conn, cursor = fake_connection()
    monkeypatch.setattr(notifications, "get_connection", lambda: conn)

    read_response = client.get("/notifications/", headers=auth("admin"))
    assert read_response.status_code == 200
    assert "WHERE user_id = %s" not in cursor.execute.call_args.args[0]

    update_response = client.patch("/notifications/42/read", headers=auth("admin"))
    assert update_response.status_code == 200
    assert "notification_id = %s AND user_id = %s" not in cursor.execute.call_args.args[0]
    assert cursor.execute.call_args.args[1] == (42,)
    conn.commit.assert_called_once()
