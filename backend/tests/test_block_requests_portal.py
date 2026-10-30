import unittest
import os
import sys
from datetime import date
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth import security
from auth.security import CurrentUser, RBACForbiddenException
from routes import block_requests


def make_user(role_id="admin", permissions=None, user_id=None):
    return CurrentUser(
        role_id=role_id,
        name="Planning Officer",
        title="Officer",
        dept="TMS",
        scope="network" if role_id in {"admin", "control"} else "department",
        system="BDMS",
        permissions=set(permissions or ()),
        user_id=user_id,
    )


class Cursor:
    def __init__(self, row):
        self.row = row
        self.calls = []
        self.closed = False
        self.rowcount = 1

    def execute(self, sql, params=()):
        self.calls.append((sql, params))

    def fetchone(self):
        return self.row

    def fetchall(self):
        if self.calls and "FROM users" in self.calls[-1][0]:
            return getattr(self, "user_rows", [("USR-DB-ADMIN",)])
        return getattr(self, "rows", [])

    def close(self):
        self.closed = True


class Connection:
    def __init__(self, row, rowcount=1):
        self.test_cursor = Cursor(row)
        self.test_cursor.rowcount = rowcount
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self.test_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class ApprovalFailureCursor(Cursor):
    def __init__(self, row, error):
        super().__init__(row)
        self.error = error

    def execute(self, sql, params=()):
        super().execute(sql, params)
        if "UPDATE block_requests" in sql:
            raise self.error


class ApprovalFailureConnection(Connection):
    def __init__(self, row, error):
        super().__init__(row)
        self.test_cursor = ApprovalFailureCursor(row, error)


class CreationCursor(Cursor):
    def __init__(self, connection):
        super().__init__(None)
        self.connection = connection

    def execute(self, sql, params=()):
        self.calls.append((sql, params))
        if "SELECT team_id" in sql:
            self.row = (params[0],)
        elif "SELECT corridor_id, section_id" in sql:
            self.row = None
        elif "SELECT section_id" in sql and "FROM corridor_sections" in sql:
            self.row = ("SEC-C02-1",)
        elif "SELECT corridor_id FROM corridors" in sql:
            self.row = (params[0],)
        elif "SELECT asset_id" in sql:
            self.row = (params[0],)
        elif "MAX(requested_end)" in sql:
            self.row = (None,)
        elif "INSERT INTO block_requests" in sql:
            if self.connection.fail_request_insert:
                raise self.connection.request_insert_error or RuntimeError("sensitive database detail")
            self.row = (params[0], "PENDING", "PENDING", date.today())
        else:
            self.row = None


class CreationConnection:
    def __init__(self, fail_request_insert=False, request_insert_error=None):
        self.fail_request_insert = fail_request_insert
        self.request_insert_error = request_insert_error
        self.test_cursor = CreationCursor(self)
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self.test_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


def make_request(criticality="High", dept="TMS"):
    return block_requests.BlockRequestCreate(
        dept=dept, assetId="AST-0001", work="Track inspection",
        section="C02", line="Down", chainage="1/1",
        blockType="Traffic Block", duration=2, crew=2,
        criticality=criticality, daysOverdue=0, tsrRisk=False,
        requestedBy="forged@example.test",
    )


class BlockRequestPortalTests(unittest.TestCase):
    def test_list_query_maps_live_columns_to_existing_response_fields(self):
        connection = Connection(None)
        connection.test_cursor.rows = [(
            "BR-1", "TASK-1", "AST-1", "ENG-01", "C02",
            date(2026, 10, 24), "09:00", "11:00", 120, "Traffic Block",
            "PENDING", date(2026, 10, 24), "USER-1", "TMS", "C02",
            4, 3, "Track inspection", "PENDING", None, None, None,
            date(2026, 10, 24), None,
        )]
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.get_block_requests(make_user())

        sql = connection.test_cursor.calls[0][0]
        self.assertIn("br.created_by AS requested_by", sql)
        self.assertIn("mt.department AS department_id", sql)
        self.assertIn("mt.description AS description", sql)
        self.assertIn("br.submitted_date AS created_at", sql)
        for missing_column in (
            "br.requested_by", "br.department_id", "br.section_id", "br.description",
            "br.created_at", "br.updated_at",
        ):
            self.assertNotIn(missing_column, sql)
        self.assertEqual(result[0]["requested_by"], "USER-1")
        self.assertEqual(result[0]["department_id"], "TMS")
        self.assertEqual(result[0]["description"], "Track inspection")
        self.assertEqual(result[0]["created_at"], "2026-10-24")
        self.assertIsNone(result[0]["updated_at"])

    def test_department_user_is_denied_when_request_has_no_matching_task(self):
        connection = Connection(("R-1", "PENDING", "PENDING", None, None))
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertRaises(RBACForbiddenException):
                block_requests.cancel_block_request(
                    "R-1", make_user("engineering", {"requests.cancel"})
                )

        self.assertEqual(len(connection.test_cursor.calls), 1)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)

    def test_invalid_criticality_is_rejected(self):
        for value in ("Urgent", "", "  "):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                block_requests.BlockRequestCreate(
                    dept="TMS", assetId="AST-1", work="Track inspection",
                    section="C02", line="Down", chainage="1/1",
                    blockType="Traffic Block", duration=2, crew=2,
                    criticality=value, daysOverdue=0, tsrRisk=False,
                    requestedBy="untrusted display value",
                )
            with self.subTest(update_value=value), self.assertRaises(ValidationError):
                block_requests.BlockRequestUpdate(criticality=value)

    def test_update_model_normalizes_valid_criticality_before_handler_writes(self):
        payload = block_requests.BlockRequestUpdate(criticality="HIGH")
        self.assertEqual(payload.criticality, "High")
        self.assertEqual(block_requests.criticality_to_level(payload.criticality), 4)

    def test_criticality_casing_is_normalized_for_create_and_update(self):
        for value, expected in (("high", "High"), ("HIGH", "High"), ("High", "High")):
            with self.subTest(value=value):
                self.assertEqual(make_request(value).criticality, expected)
                self.assertEqual(block_requests.BlockRequestUpdate(criticality=value).criticality, expected)

    def test_requester_id_is_not_inferred_from_display_identity(self):
        user = make_user()
        self.assertIsNone(block_requests.resolve_user_id(None, user))

    def test_generated_ids_have_distinct_concurrency_safe_suffixes(self):
        task_id, request_id = block_requests.generate_requisition_ids()
        self.assertRegex(task_id, r"^T-AUTO-[0-9A-F]{22}$")
        self.assertRegex(request_id, r"^BR-AUTO-[0-9A-F]{22}$")
        self.assertEqual(task_id.removeprefix("T-AUTO-"), request_id.removeprefix("BR-AUTO-"))

    def test_creation_ignores_client_identity_and_commits_both_records(self):
        connection = CreationConnection()
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.create_block_request(make_request("hIgH"), make_user())

        task_insert = next(sql for sql, _ in connection.test_cursor.calls if "INSERT INTO maintenance_tasks" in sql)
        request_insert = next(sql for sql, _ in connection.test_cursor.calls if "INSERT INTO block_requests" in sql)
        task_insert_params = next(
            params for sql, params in connection.test_cursor.calls
            if "INSERT INTO maintenance_tasks" in sql
        )
        self.assertTrue(task_insert)
        self.assertTrue(request_insert)
        self.assertIsNone(result["requested_by"])
        self.assertEqual(result["request_status"], "PENDING")
        self.assertEqual(result["team_id"], "ENG-01")
        request_insert_params = next(
            params for sql, params in connection.test_cursor.calls
            if "INSERT INTO block_requests" in sql
        )
        self.assertEqual(request_insert_params[12], 4)
        self.assertEqual(request_insert_params[11], None)
        self.assertIn("created_by", request_insert)
        self.assertIn("RETURNING request_id, request_status, review_status, submitted_date", request_insert)
        self.assertEqual(task_insert.count("%s"), len(task_insert_params))
        self.assertEqual(request_insert.count("%s"), len(request_insert_params))
        for absent_column in ("requested_by", "department_id", "section_id", "description", "created_at", "updated_at"):
            self.assertNotIn(absent_column, request_insert)
        self.assertEqual(result["created_at"], date.today().isoformat())
        self.assertEqual(result["requisition"]["created_at"], date.today().isoformat())
        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)
        self.assertTrue(connection.test_cursor.closed)
        self.assertTrue(connection.closed)

    def test_create_maps_department_aliases_to_live_team_ids(self):
        cases = (
            ("TMS", "ENG-01", "DEPT-TMS"),
            ("ENGINEERING", "ENG-01", "DEPT-TMS"),
            ("SMMS", "SNT-01", "DEPT-SMMS"),
            ("S&T", "SNT-01", "DEPT-SMMS"),
            ("TDMS", "TRD-01", "DEPT-TDMS"),
            ("TRD", "TRD-01", "DEPT-TDMS"),
        )
        for department, expected_team, expected_department_id in cases:
            with self.subTest(department=department):
                connection = CreationConnection()
                user = make_user("engineering") if department == "ENGINEERING" else make_user()
                with patch.object(block_requests, "get_connection", return_value=connection):
                    result = block_requests.create_block_request(make_request(dept=department), user)

                team_lookup = next(
                    params for sql, params in connection.test_cursor.calls
                    if "SELECT team_id" in sql
                )
                task_insert = next(
                    params for sql, params in connection.test_cursor.calls
                    if "INSERT INTO maintenance_tasks" in sql
                )
                request_insert = next(
                    params for sql, params in connection.test_cursor.calls
                    if "INSERT INTO block_requests" in sql
                )
                self.assertEqual(team_lookup, (expected_team,))
                self.assertEqual(task_insert[2], expected_department_id.removeprefix("DEPT-"))
                self.assertEqual(request_insert[2], expected_team)
                self.assertEqual(result["team_id"], expected_team)
                self.assertEqual(result["department_id"], expected_department_id)
                self.assertTrue(connection.committed)

    def test_create_corridor_section_lookup_uses_live_schema_columns(self):
        connection = CreationConnection()
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.create_block_request(make_request(), make_user())

        section_queries = [
            (sql, params)
            for sql, params in connection.test_cursor.calls
            if "FROM corridor_sections" in sql
        ]
        self.assertEqual(len(section_queries), 2)
        first_sql, first_params = section_queries[0]
        helper_sql, helper_params = section_queries[1]
        for sql in (first_sql, helper_sql):
            self.assertNotIn("section_code", sql)
            self.assertIn("section_id", sql)
            self.assertIn("section_name", sql)
        self.assertEqual(first_params, ("C02", "C02"))
        self.assertEqual(helper_params, ("C02", "C02", "C02"))
        self.assertEqual(result["section_id"], "SEC-C02-1")
        self.assertTrue(connection.committed)

    def test_creation_rolls_back_and_hides_database_error(self):
        connection = CreationConnection(fail_request_insert=True)
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertRaises(HTTPException) as caught:
                block_requests.create_block_request(make_request(), make_user())

        self.assertEqual(caught.exception.status_code, 500)
        self.assertNotIn("sensitive", caught.exception.detail)
        self.assertFalse(connection.committed)
        self.assertTrue(connection.rolled_back)
        self.assertTrue(connection.test_cursor.closed)
        self.assertTrue(connection.closed)

    def test_creation_logs_safe_database_diagnostics_and_rolls_back(self):
        class Diagnostic:
            message_primary = "foreign key failed for value 'private-id'"

        class DatabaseError(Exception):
            sqlstate = "23503"
            diag = Diagnostic()

        connection = CreationConnection(
            fail_request_insert=True,
            request_insert_error=DatabaseError("raw detail with credentials"),
        )
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertLogs(block_requests.__name__, level="ERROR") as captured:
                with self.assertRaises(HTTPException) as caught:
                    block_requests.create_block_request(make_request(), make_user())

        self.assertEqual(caught.exception.status_code, 500)
        self.assertEqual(
            caught.exception.detail,
            "Unable to save the requisition. Please retry or contact support.",
        )
        self.assertIn("exception_class=DatabaseError", captured.output[0])
        self.assertIn("sqlstate=23503", captured.output[0])
        self.assertIn("foreign key failed for value '[redacted]'", captured.output[0])
        self.assertNotIn("private-id", captured.output[0])
        self.assertNotIn("raw detail", captured.output[0])
        self.assertFalse(connection.committed)
        self.assertTrue(connection.rolled_back)

    def test_approval_dependency_rejects_role_without_existing_permission(self):
        route = next(
            route for route in block_requests.router.routes
            if getattr(route, "path", "").endswith("/{request_id}/approve")
        )
        dependency = route.dependencies[0].dependency
        with patch.object(security, "RBAC_ENFORCE", True):
            with self.assertRaises(RBACForbiddenException):
                dependency(make_user("planner", {"planner.review"}))
            self.assertEqual(
                dependency(make_user("admin", {"planner.approve"})).role_id,
                "admin",
            )

    def test_rework_uses_existing_control_rework_permission(self):
        route = next(
            route for route in block_requests.router.routes
            if getattr(route, "path", "").endswith("/{request_id}/rework")
        )
        dependency = route.dependencies[0].dependency
        with patch.object(security, "RBAC_ENFORCE", True):
            self.assertEqual(
                dependency(make_user("control", {"planner.rework"})).role_id,
                "control",
            )

    def test_approve_rejects_terminal_request_without_updating(self):
        connection = Connection(("R-1", "REJECTED", "PENDING", "TMS", "TASK-1"))
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertRaises(HTTPException) as caught:
                block_requests.approve_block_request("R-1", make_user("admin", {"requests.reject"}))

        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(len(connection.test_cursor.calls), 1)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)
        self.assertTrue(connection.test_cursor.closed)
        self.assertTrue(connection.closed)

    def test_approval_updates_review_state_and_keeps_request_pending(self):
        connection = Connection((
            "BR-AUTO-0022", "PENDING", "PENDING", "ENGINEERING", "T-AUTO-22",
        ))
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.approve_block_request(
                "BR-AUTO-0022", make_user("admin", {"planner.approve"}, "USR-TEST-1")
            )

        load_sql = connection.test_cursor.calls[0][0]
        reviewer_sql, reviewer_params = connection.test_cursor.calls[1]
        update_sql, update_params = connection.test_cursor.calls[2]
        self.assertIn("LEFT JOIN maintenance_tasks", load_sql)
        self.assertIn("FOR UPDATE OF br", load_sql)
        self.assertIn("FROM users", reviewer_sql)
        self.assertIn("role = %s AND active IS TRUE", reviewer_sql)
        self.assertEqual(reviewer_params, ("SYSTEM_ADMIN",))
        self.assertIn("review_status = 'APPROVED'", update_sql)
        self.assertIn("reviewed_by = %s", update_sql)
        self.assertIn("reviewed_at = CURRENT_TIMESTAMP", update_sql)
        self.assertNotIn("SET\n                request_status", update_sql)
        self.assertEqual(update_params, ("USR-DB-ADMIN", "BR-AUTO-0022"))
        self.assertNotIn("Planning Officer", update_params)
        self.assertEqual(result["request_status"], "PENDING")
        self.assertEqual(result["review_status"], "APPROVED")
        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)

    def test_approval_logs_safe_database_error_and_rolls_back(self):
        class Diagnostic:
            message_primary = 'column "reviewed_by" does not exist for value \'private\''

        class UndefinedColumn(Exception):
            sqlstate = "42703"
            diag = Diagnostic()

        connection = ApprovalFailureConnection(
            ("BR-AUTO-0022", "PENDING", "PENDING", "ENGINEERING", "T-AUTO-22"),
            UndefinedColumn("raw sensitive database detail"),
        )
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertLogs(block_requests.__name__, level="ERROR") as captured:
                with self.assertRaises(HTTPException) as caught:
                    block_requests.approve_block_request(
                        "BR-AUTO-0022", make_user("admin", {"planner.approve"}, "USR-TEST-1")
                    )

        self.assertEqual(caught.exception.status_code, 500)
        self.assertEqual(caught.exception.detail, "Unable to approve the requisition.")
        self.assertIn("exception_class=UndefinedColumn", captured.output[0])
        self.assertIn("sqlstate=42703", captured.output[0])
        self.assertIn('column "reviewed_by" does not exist', captured.output[0])
        self.assertNotIn("private", captured.output[0])
        self.assertNotIn("raw sensitive", captured.output[0])
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)
        self.assertTrue(connection.test_cursor.closed)
        self.assertTrue(connection.closed)

    def test_rework_allows_an_already_approved_pending_request(self):
        connection = Connection(("R-1", "PENDING", "APPROVED", "TMS", "TASK-1"))
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.rework_block_request(
                "R-1", make_user("control", {"planner.rework"}, "USR-TEST-2")
            )

        update_sql, update_params = connection.test_cursor.calls[1]
        self.assertIn("COALESCE(review_status, 'PENDING') = %s", update_sql)
        self.assertEqual(update_params[0], "USR-TEST-2")
        self.assertNotIn("Planning Officer", update_params)
        self.assertEqual(update_params[-1], "APPROVED")
        self.assertEqual(result["review_status"], "REWORK")
        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)

    def test_rework_conflicts_if_review_state_changes_after_read(self):
        connection = Connection(("R-1", "PENDING", "PENDING", "TMS", "TASK-1"), rowcount=0)
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertRaises(HTTPException) as caught:
                block_requests.rework_block_request(
                    "R-1", make_user("control", {"planner.rework"}, "USR-TEST-5")
                )

        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(len(connection.test_cursor.calls), 2)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)

    def test_department_user_can_reject_same_department_request(self):
        connection = Connection(("R-1", "PENDING", "PENDING", "TMS", "TASK-1"))
        payload = block_requests.BlockRequestReject(reason="Track work unsafe")
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.reject_block_request(
                "R-1", payload, make_user("engineering", {"planner.reject"}, "USR-TEST-3")
            )

        self.assertEqual(result["request_status"], "REJECTED")
        self.assertEqual(len(connection.test_cursor.calls), 2)
        self.assertIn("mt.department", connection.test_cursor.calls[0][0])
        self.assertEqual(connection.test_cursor.calls[1][1][-2], "USR-TEST-3")
        self.assertNotIn("Planning Officer", connection.test_cursor.calls[1][1])
        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)

    def test_department_user_cannot_reject_other_department_request(self):
        connection = Connection(("R-1", "PENDING", "PENDING", "TDMS", "TASK-1"))
        payload = block_requests.BlockRequestReject(reason="Track work unsafe")
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertRaises(RBACForbiddenException):
                block_requests.reject_block_request(
                    "R-1", payload, make_user("engineering", {"planner.reject"}, "USR-TEST-6")
                )

        self.assertEqual(len(connection.test_cursor.calls), 1)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)

    def test_network_user_can_reject_request_from_any_department(self):
        connection = Connection(("R-1", "PENDING", "PENDING", "TDMS", "TASK-1"))
        payload = block_requests.BlockRequestReject(reason="Network safety decision")
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.reject_block_request(
                "R-1", payload, make_user("admin", {"planner.reject"}, "USR-TEST-4")
            )

        self.assertEqual(result["request_status"], "REJECTED")
        self.assertEqual(len(connection.test_cursor.calls), 2)
        self.assertIn("request_status = 'PENDING'", connection.test_cursor.calls[1][0])
        self.assertEqual(connection.test_cursor.calls[1][1][-2:], ("USR-TEST-4", "R-1"))
        self.assertNotIn("Planning Officer", connection.test_cursor.calls[1][1])
        self.assertTrue(connection.committed)

    def test_approval_requires_exactly_one_active_role_principal(self):
        for matches in ([], [("USR-DB-ADMIN",), ("USR-OTHER",)]):
            connection = Connection(("R-1", "PENDING", "PENDING", "TMS", "TASK-1"))
            connection.test_cursor.user_rows = matches
            with self.subTest(matches=matches), patch.object(block_requests, "get_connection", return_value=connection):
                with self.assertRaises(HTTPException) as caught:
                    block_requests.approve_block_request(
                        "R-1", make_user("admin", {"planner.approve"})
                    )
                self.assertEqual(caught.exception.status_code, 409)
                self.assertIn("exactly one active database reviewer", caught.exception.detail)
                self.assertFalse(any("UPDATE block_requests" in sql for sql, _ in connection.test_cursor.calls))
                self.assertTrue(connection.rolled_back)

    def test_edit_conflicts_if_review_state_changes_after_read(self):
        connection = Connection(("R-1", "PENDING", "PENDING", "TMS", "TASK-1"), rowcount=0)
        payload = block_requests.BlockRequestUpdate(work="Revised work", blockType="Traffic Block")
        with patch.object(block_requests, "get_connection", return_value=connection):
            with self.assertRaises(HTTPException) as caught:
                block_requests.update_block_request(
                    "R-1", payload, make_user("engineering", {"requests.edit"})
                )

        self.assertEqual(caught.exception.status_code, 409)
        update_sql, update_params = connection.test_cursor.calls[1]
        self.assertIn("request_status = 'PENDING'", update_sql)
        self.assertIn("COALESCE(review_status, 'PENDING')", update_sql)
        self.assertNotIn("department_id", update_sql)
        self.assertEqual(update_params[-2:], ["R-1", "PENDING"])
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)


if __name__ == "__main__":
    unittest.main()
