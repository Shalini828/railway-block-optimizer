import os
import sys
from datetime import date, time

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth.security import create_access_token
from main import app
from routes import trains


client = TestClient(app, raise_server_exceptions=False)

HEADER = "train_number,train_name,train_type,corridor_id,travel_date,arrival_time,departure_time,direction,operational_priority"
VALID_ROW = "12952,Mumbai Rajdhani,EXPRESS,C01,2027-02-10,08:15,08:10,UP,5"
VALID_CSV = f"{HEADER}\n{VALID_ROW}\n"


class FakeCursor:
    def __init__(self, connection):
        self.connection = connection
        self.rows = []
        self.row = None
        self.insert_count = 0

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=()):
        normalized = " ".join(sql.split())
        self.connection.calls.append((normalized, params))
        self.rows = []
        self.row = None
        if normalized.startswith("SELECT corridor_id FROM corridors"):
            self.rows = [(corridor,) for corridor in params[0] if corridor in self.connection.corridors]
        elif normalized.startswith("SELECT train_id, train_number") and "FROM trains" in normalized:
            train_id, train_number, corridor_id, travel_date, direction, departure_time = params
            self.rows = [
                existing for existing in self.connection.trains
                if existing[0] == train_id
                or (
                    existing[1] == train_number
                    and existing[4] == corridor_id
                    and existing[5] == travel_date
                    and existing[8] == direction
                    and existing[7] == departure_time
                )
            ]
        elif normalized.startswith("INSERT INTO trains"):
            self.insert_count += 1
            if self.connection.fail_insert_at == self.insert_count:
                raise RuntimeError("simulated insert failure")
            self.connection.pending.append(tuple(params))

    def fetchall(self):
        return list(self.rows)

    def fetchone(self):
        return self.row


class FakeConnection:
    def __init__(self, *, corridors=("C01",), trains=(), fail_insert_at=None, fail_commit=False):
        self.corridors = set(corridors)
        self.trains = list(trains)
        self.pending = []
        self.calls = []
        self.fail_insert_at = fail_insert_at
        self.fail_commit = fail_commit
        self.commit_attempts = 0
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def cursor(self):
        return FakeCursor(self)

    def commit(self):
        self.commit_attempts += 1
        if self.fail_commit:
            raise RuntimeError("simulated commit failure")
        self.trains.extend(self.pending)
        self.pending.clear()
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1
        self.pending.clear()

    def close(self):
        self.closed = True


def headers(role="admin", filename="coa-weekly.csv"):
    return {
        "Authorization": f"Bearer {create_access_token(role)}",
        "Content-Type": "text/csv; charset=utf-8",
        "X-Source-Filename": filename,
        "X-Source-Reference": "COA circular COA/TT/2027/02",
    }


def install_db(monkeypatch, connection):
    audit_calls = []
    monkeypatch.setattr(trains, "get_connection", lambda: connection)
    monkeypatch.setattr(trains, "record_audit", lambda **event: audit_calls.append(event))
    return audit_calls


def test_valid_csv_import_inserts_for_existing_corridor_and_returns_provenance(monkeypatch):
    connection = FakeConnection()
    audit_calls = install_db(monkeypatch, connection)

    response = client.post("/trains/import", content=VALID_CSV, headers=headers())

    assert response.status_code == 200
    result = response.json()
    assert result["inserted"] == 1
    assert result["unchanged"] == 0
    assert result["rejected"] == 0
    assert result["time_zone"] == "Asia/Kolkata"
    assert len(result["sha256"]) == 64
    assert result["source_filename"] == "coa-weekly.csv"
    assert result["imported_at"]
    assert connection.commits == 1 and connection.rollbacks == 0
    assert len(connection.trains) == 1
    saved = connection.trains[0]
    assert saved[1:10] == (
        "12952", "Mumbai Rajdhani", "EXPRESS", "C01", date(2027, 2, 10),
        time(8, 15), time(8, 10), "UP", 5,
    )
    assert audit_calls[0]["action"] == "IMPORT_REGULAR_TRAIN_TIMETABLE"
    assert audit_calls[0]["detail"]["sha256"] == result["sha256"]
    assert audit_calls[0]["detail"]["source_reference"] == "COA circular COA/TT/2027/02"


@pytest.mark.parametrize(
    "csv_text,field",
    [
        (f"{HEADER}\n12952,Rajdhani,EXPRESS,C01,10/02/2027,08:15,08:10,UP,5\n", "travel_date"),
        (f"{HEADER}\n12952,Rajdhani,EXPRESS,C01,2027-02-10,25:15,08:10,UP,5\n", "arrival_time"),
        (f"{HEADER}\n12952,Rajdhani,EXPRESS,C01,2027-02-10,08:15,08:10,UP,6\n", "operational_priority"),
    ],
)
def test_invalid_date_time_and_priority_return_row_errors_without_db_access(monkeypatch, csv_text, field):
    connection = FakeConnection()
    install_db(monkeypatch, connection)

    response = client.post("/trains/import", content=csv_text, headers=headers())

    assert response.status_code == 422
    errors = response.json()["detail"]["errors"]
    assert any(error["field"] == field and error["row"] == 2 for error in errors)
    assert not connection.calls
    assert not connection.trains


def test_missing_csv_columns_are_rejected_before_database_access(monkeypatch):
    connection = FakeConnection()
    install_db(monkeypatch, connection)
    response = client.post(
        "/trains/import",
        content="train_number,corridor_id\n12952,C01\n",
        headers=headers(),
    )
    assert response.status_code == 422
    assert "Missing required column" in response.json()["detail"]["errors"][0]["message"]
    assert not connection.calls


def test_unknown_corridor_is_rejected_before_any_insert(monkeypatch):
    connection = FakeConnection(corridors=("C01",))
    install_db(monkeypatch, connection)
    csv_text = VALID_CSV.replace(",C01,", ",C99,")

    response = client.post("/trains/import", content=csv_text, headers=headers())

    assert response.status_code == 422
    assert response.json()["detail"]["errors"][0]["field"] == "corridor_id"
    assert not any(sql.startswith("INSERT INTO trains") for sql, _ in connection.calls)
    assert connection.rollbacks == 1 and not connection.trains


def test_duplicate_identity_and_duplicate_train_ids_in_one_csv_are_rejected(monkeypatch):
    connection = FakeConnection()
    install_db(monkeypatch, connection)
    duplicate_csv = f"{HEADER}\n{VALID_ROW}\n{VALID_ROW}\n"

    response = client.post("/trains/import", content=duplicate_csv, headers=headers())

    assert response.status_code == 422
    errors = response.json()["detail"]["errors"]
    assert any(error["field"] == "train_number" and error["row"] == 3 for error in errors)
    assert not connection.calls


def test_exact_reimport_is_reported_unchanged(monkeypatch):
    connection = FakeConnection()
    install_db(monkeypatch, connection)

    first = client.post("/trains/import", content=VALID_CSV, headers=headers())
    second = client.post("/trains/import", content=VALID_CSV, headers=headers())

    assert first.status_code == second.status_code == 200
    assert second.json()["inserted"] == 0
    assert second.json()["unchanged"] == 1
    assert len(connection.trains) == 1
    assert connection.commits == 2


def test_existing_identity_with_changed_schedule_is_rejected(monkeypatch):
    connection = FakeConnection()
    install_db(monkeypatch, connection)
    assert client.post("/trains/import", content=VALID_CSV, headers=headers()).status_code == 200
    changed = VALID_CSV.replace("08:15", "08:16")

    response = client.post("/trains/import", content=changed, headers=headers())

    assert response.status_code == 409
    assert response.json()["detail"]["errors"][0]["row"] == 2
    assert len(connection.trains) == 1
    assert connection.rollbacks == 1


def test_import_requires_trains_edit_permission(monkeypatch):
    connection = FakeConnection()
    install_db(monkeypatch, connection)
    response = client.post("/trains/import", content=VALID_CSV, headers=headers("engineering"))
    assert response.status_code == 403
    assert not connection.calls


def test_unauthenticated_import_is_rejected(monkeypatch):
    connection = FakeConnection()
    install_db(monkeypatch, connection)
    request_headers = headers()
    request_headers.pop("Authorization")
    response = client.post("/trains/import", content=VALID_CSV, headers=request_headers)
    assert response.status_code == 401
    assert not connection.calls


def test_invalid_row_in_batch_prevents_any_partial_write(monkeypatch):
    connection = FakeConnection()
    install_db(monkeypatch, connection)
    invalid_batch = f"{HEADER}\n{VALID_ROW}\n12953,Other,MAIL,C01,2027-02-30,08:15,08:10,UP,4\n"

    response = client.post("/trains/import", content=invalid_batch, headers=headers())

    assert response.status_code == 422
    assert not connection.calls
    assert not connection.trains and not connection.pending


def test_insert_failure_rolls_back_entire_batch(monkeypatch):
    connection = FakeConnection(fail_insert_at=2)
    install_db(monkeypatch, connection)
    second = "12953,Other,MAIL,C01,2027-02-10,09:15,09:10,DOWN,4"
    csv_text = f"{HEADER}\n{VALID_ROW}\n{second}\n"

    response = client.post("/trains/import", content=csv_text, headers=headers())

    assert response.status_code == 500
    assert connection.commits == 0 and connection.rollbacks == 1
    assert not connection.trains and not connection.pending


def test_commit_failure_does_not_return_success_and_rolls_back(monkeypatch):
    connection = FakeConnection(fail_commit=True)
    install_db(monkeypatch, connection)

    response = client.post("/trains/import", content=VALID_CSV, headers=headers())

    assert response.status_code == 500
    assert connection.commit_attempts == 1
    assert connection.commits == 0 and connection.rollbacks == 1
    assert not connection.trains and not connection.pending


def test_generated_id_is_stable_and_existing_id_collision_is_rejected(monkeypatch):
    identity = ("12952", "C01", date(2027, 2, 10), "UP", time(8, 10))
    stable_id = trains._stable_train_id(identity)
    assert stable_id == trains._stable_train_id(identity)
    assert len(stable_id) == 30

    collision_row = (
        stable_id, "77777", "Different Run", "MAIL", "C01", date(2027, 2, 10),
        time(7, 0), time(6, 55), "DOWN", 3,
    )
    connection = FakeConnection(trains=(collision_row,))
    install_db(monkeypatch, connection)

    response = client.post("/trains/import", content=VALID_CSV, headers=headers())

    assert response.status_code == 409
    assert connection.trains == [collision_row]
    assert not any(sql.startswith("INSERT INTO trains") for sql, _ in connection.calls)
