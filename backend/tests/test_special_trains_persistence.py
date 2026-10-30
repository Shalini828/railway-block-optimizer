from datetime import date, time
import os
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth.security import CurrentUser
from routes import special_trains as route


LIVE_ROW = (
    "SP-test", "12001", "Test Special", "Official notice", "FESTIVAL", "C01",
    date(2026, 11, 5), time(18), time(23), "UP", 80, "SCHEDULED",
    "NDLS", "BSB", "Planner", "2026-10-01T00:00:00Z", None,
)


class Cursor:
    def __init__(self, db):
        self.db = db
        self.row = None
        self.rows = []
        self.rowcount = 1

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=()):
        self.db.sql.append((sql, params))
        normalized = " ".join(sql.split())
        if self.db.fail_on and self.db.fail_on in normalized:
            raise RuntimeError("simulated database failure")
        self.row = None
        self.rows = []
        if "SELECT pg_advisory_xact_lock" in normalized:
            pass
        elif "SELECT special_id FROM special_train_services" in normalized:
            self.row = ("SP-existing",) if self.db.duplicate else None
        elif "SELECT train_number, corridor_id, service_date, direction" in normalized:
            self.row = self.db.prior
        elif normalized.startswith("INSERT INTO special_train_services"):
            self.row = LIVE_ROW
        elif normalized.startswith("UPDATE special_train_services"):
            self.row = self.db.updated_row
        elif normalized.startswith("SELECT") and "FROM special_train_services" in normalized:
            self.rows = [] if self.db.empty_list else [LIVE_ROW]

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class Connection:
    def __init__(self, *, duplicate=False, fail_on=None):
        self.duplicate = duplicate
        self.fail_on = fail_on
        self.prior = ("12001", "C01", date(2026, 11, 5), "UP")
        self.updated_row = LIVE_ROW
        self.empty_list = False
        self.sql = []
        self.commits = 0
        self.rollbacks = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_):
        if exc_type:
            self.rollbacks += 1
        else:
            self.commits += 1
        return False

    def cursor(self):
        return Cursor(self)


USER = CurrentUser("admin", "Planner", "Planner", None, "network", "test", set())


def create_payload(**overrides):
    values = {
        "train_number": "12001", "train_name": "Test Special", "special_type": "FESTIVAL",
        "corridor_id": "C01", "service_date": "2026-11-05", "arrival_time": "23:00",
        "departure_time": "18:00", "direction": "UP", "operational_priority": 4,
        "reason": "Official notice", "origin_station": "NDLS", "destination_station": "BSB",
    }
    values.update(overrides)
    return route.SpecialTrainCreateSchema(**values)


def setup_db(monkeypatch, db):
    monkeypatch.setattr(route, "_get_db_connection", lambda: db)
    monkeypatch.setattr(route, "record_audit", lambda **_: None)


def test_create_persists_live_columns_and_returns_committed_values(monkeypatch):
    db = Connection()
    setup_db(monkeypatch, db)
    result = route.create_special_train(create_payload(), USER)
    sql = " ".join(query for query, _ in db.sql)
    assert db.commits == 1 and db.rollbacks == 0
    assert result["created_count"] == 1
    assert result["special_trains"][0]["origin_station"] == "NDLS"
    assert result["special_trains"][0]["operational_priority"] == 4
    assert "service_date" in sql and "status" in sql and "event_name" in sql
    assert not any(name in sql for name in ("special_train_id,", "special_type", "active =", "expected_passengers", "reason ="))


def test_create_duplicate_identity_rejected_but_other_dates_are_distinct(monkeypatch):
    db = Connection(duplicate=True)
    setup_db(monkeypatch, db)
    with pytest.raises(HTTPException) as exc:
        route.create_special_train(create_payload(), USER)
    assert exc.value.status_code == 409
    assert db.rollbacks == 1 and db.commits == 0
    assert "2026-11-05" in exc.value.detail

    recurring_db = Connection()
    setup_db(monkeypatch, recurring_db)
    recurring = route.create_special_train(create_payload(service_date="2026-11-06"), USER)
    assert recurring["created_count"] == 1
    assert recurring_db.commits == 1


def test_create_database_error_rolls_back_and_does_not_claim_success(monkeypatch):
    db = Connection(fail_on="INSERT INTO special_train_services")
    setup_db(monkeypatch, db)
    with pytest.raises(HTTPException) as exc:
        route.create_special_train(create_payload(), USER)
    assert exc.value.status_code == 500
    assert db.rollbacks == 1 and db.commits == 0


def test_update_persists_all_supported_ui_fields(monkeypatch):
    db = Connection()
    setup_db(monkeypatch, db)
    payload = route.SpecialTrainUpdateSchema(
        train_number="12002", train_name="Updated", special_type="EVENT", corridor_id="C02",
        service_date="2026-11-06", arrival_time="22:00", departure_time="17:00", direction="DOWN",
        operational_priority=5, reason="Memo 2", origin_station="A", destination_station="B", active=False,
    )
    result = route.update_special_train("SP-test", payload, USER)
    update_sql, params = next((sql, params) for sql, params in db.sql if sql.startswith("UPDATE special_train_services"))
    for field in ("train_number", "train_name", "event_type", "corridor_id", "service_date", "arrival_time",
                  "departure_time", "direction", "operational_priority", "event_name", "origin_station",
                  "destination_station", "status", "updated_at"):
        assert field in update_sql
    assert "expected_passengers" not in update_sql and "active =" not in update_sql
    assert "status" in update_sql and "INACTIVE" in params
    assert db.commits == 1 and db.rollbacks == 0
    assert result["special_train"]["special_train_id"] == "SP-test"


def test_update_database_error_rolls_back(monkeypatch):
    db = Connection(fail_on="UPDATE special_train_services")
    setup_db(monkeypatch, db)
    with pytest.raises(HTTPException) as exc:
        route.update_special_train("SP-test", route.SpecialTrainUpdateSchema(train_name="Changed"), USER)
    assert exc.value.status_code == 500
    assert db.rollbacks == 1 and db.commits == 0


def test_toggle_uses_status_and_returns_persisted_row(monkeypatch):
    db = Connection()
    db.updated_row = LIVE_ROW[:11] + ("INACTIVE",) + LIVE_ROW[12:]
    setup_db(monkeypatch, db)
    result = route.toggle_special_train("SP-test", route.ActiveToggleSchema(active=False), USER)
    sql = next(sql for sql, _ in db.sql if sql.startswith("UPDATE special_train_services"))
    assert "SET status = %s" in sql and "active" not in sql
    assert result["special_train"]["active"] is False
    assert db.commits == 1 and db.rollbacks == 0


def test_toggle_database_error_rolls_back(monkeypatch):
    db = Connection(fail_on="UPDATE special_train_services")
    setup_db(monkeypatch, db)
    with pytest.raises(HTTPException) as exc:
        route.toggle_special_train("SP-test", route.ActiveToggleSchema(active=False), USER)
    assert exc.value.status_code == 500
    assert db.rollbacks == 1 and db.commits == 0


def test_unsupported_passenger_field_is_rejected_explicitly():
    values = create_payload().model_dump()
    values["expected_passengers"] = 500
    with pytest.raises(Exception):
        route.SpecialTrainCreateSchema(**values)


def test_list_returns_empty_database_result_without_seed_fallback(monkeypatch):
    db = Connection()
    setup_db(monkeypatch, db)
    db.empty_list = True
    result = route.get_special_trains(corridor_id=None, from_date=None, to_date=None, active=None, user=USER)
    assert result["total_count"] == 0
    assert result["special_trains"] == []
    assert db.commits == 1
