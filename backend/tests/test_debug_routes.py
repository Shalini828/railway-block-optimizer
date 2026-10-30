"""Safe registration checks for removed database diagnostics and startup DDL."""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import main
from main import app


def test_database_debug_routes_are_not_registered():
    registered_paths = set(app.openapi().get("paths", {}))

    assert "/debug/migrate" not in registered_paths
    assert "/debug/db-user" not in registered_paths
    assert "/debug/db-connection" not in registered_paths
    assert not hasattr(main, "ensure_database_schema")
    assert all(handler.__name__ != "startup_event" for handler in app.router.on_startup)
