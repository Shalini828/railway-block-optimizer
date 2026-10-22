from types import SimpleNamespace
from datetime import datetime
import sys
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from auth.security import CurrentUser
from logic.optimization_eligibility import (
    OPTIMIZATION_ELIGIBLE_STATUS,
    commit_or_rollback,
    count_eligible_requests,
    lock_pending_requests,
    mark_request_optimized,
)
from routes import block_requests, optimization, optimized_plan
from routes.block_requests import BlockRequestCreate


class StatefulCursor:
    def __init__(self, connection):
        self.connection = connection
        self.rowcount = 0

    def execute(self, sql, params=()):
        if "SELECT request_id FROM block_requests" in sql:
            self.rows = [
                (request_id,)
                for request_id, status in self.connection.statuses.items()
                if status == OPTIMIZATION_ELIGIBLE_STATUS
            ]
        elif "INSERT INTO optimized_blocks" in sql or "INSERT INTO block_tasks" in sql:
            self.connection.plan_saved = True
        elif "UPDATE block_requests" in sql:
            if not self.connection.plan_saved:
                raise AssertionError("A request cannot be optimized before its plan is saved")
            request_id, expected_status = params
            if self.connection.statuses.get(request_id) == expected_status:
                self.connection.statuses[request_id] = "OPTIMIZED"
                self.rowcount = 1
            else:
                self.rowcount = 0
        else:
            raise AssertionError(f"Unexpected SQL in test: {sql}")

    def fetchall(self):
        return self.rows


class StatefulConnection:
    def __init__(self, statuses):
        self.statuses = dict(statuses)
        self.initial_statuses = dict(statuses)
        self.plan_saved = False
        self.initial_plan_saved = False
        self.commits = 0
        self.rollbacks = 0

    def cursor(self):
        return StatefulCursor(self)

    def commit(self):
        self.commits += 1
        self.initial_statuses = dict(self.statuses)
        self.initial_plan_saved = self.plan_saved

    def rollback(self):
        self.rollbacks += 1
        self.statuses = dict(self.initial_statuses)
        self.plan_saved = self.initial_plan_saved


class RequisitionInsertCursor:
    def __init__(self, connection):
        self.connection = connection
        self.calls = []
        self.row = None

    def execute(self, sql, params=()):
        self.calls.append((sql, params))
        if "SELECT team_id" in sql:
            self.row = ("TEAM-001",)
        elif "SELECT asset_id" in sql:
            self.row = ("AST-0001",)
        elif "MAX(requested_date)" in sql or "MAX(requested_end)" in sql:
            self.row = (None,)
        elif "SELECT task_id" in sql and "T-AUTO-%" in sql:
            self.row = None
        elif "SELECT request_id" in sql and "BR-AUTO-%" in sql:
            self.row = None
        elif "INSERT INTO maintenance_tasks" in sql:
            self.row = None
        elif "INSERT INTO block_requests" in sql:
            self.connection.inserted_request_status = params[9]
            self.connection.inserted_review_status = params[17]
            self.connection.returning_sql = sql
            self.row = (
                "BR-AUTO-0001",
                self.connection.returned_request_status,
                self.connection.returned_review_status,
                datetime(2026, 10, 22, 12, 0),
            )
        else:
            raise AssertionError(f"Unexpected requisition SQL in test: {sql}")

    def fetchone(self):
        return self.row

    def close(self):
        pass


class RequisitionInsertConnection:
    def __init__(self):
        self.test_cursor = RequisitionInsertCursor(self)
        self.inserted_request_status = None
        self.inserted_review_status = None
        self.returned_request_status = "PENDING"
        self.returned_review_status = "PENDING"
        self.returning_sql = ""
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self.test_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


class StatusCursor:
    def __init__(self, status_counts):
        self.status_counts = status_counts

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, _sql):
        pass

    def fetchall(self):
        return list(self.status_counts.items())


class StatusConnection:
    def __init__(self, status_counts):
        self.status_counts = status_counts
        self.closed = False

    def cursor(self):
        return StatusCursor(self.status_counts)

    def close(self):
        self.closed = True


class ApprovalCursor:
    def __init__(self):
        self.calls = []

    def execute(self, sql, params=()):
        self.calls.append((sql, params))

    def fetchone(self):
        return ("R-2", "PENDING", "DEPT-TMS")

    def close(self):
        pass


class ApprovalConnection:
    def __init__(self):
        self.test_cursor = ApprovalCursor()
        self.committed = False

    def cursor(self):
        return self.test_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        raise AssertionError("valid approval should not roll back")

    def close(self):
        pass


class EmptyPlanCursor:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, _sql):
        pass

    def fetchall(self):
        return []

    def fetchone(self):
        return {"request_count": 0}


class EmptyPlanConnection:
    def cursor(self):
        return EmptyPlanCursor()

    def close(self):
        pass

    def rollback(self):
        pass


class OptimizationWorkflowTests(unittest.TestCase):
    def test_new_requisition_is_persisted_pending(self):
        connection = RequisitionInsertConnection()
        request = BlockRequestCreate(
            dept="TMS",
            assetId="AST-0001",
            work="Track inspection",
            section="NDLS-GZB",
            line="Down Main",
            chainage="KM 412/10",
            blockType="Traffic Block",
            duration=3,
            crew=8,
            criticality="High",
            daysOverdue=2,
            tsrRisk=True,
            requestedBy="Planning Officer",
        )
        user = CurrentUser(
            role_id="admin",
            name="Planning Officer",
            title="DRM Planning",
            dept=None,
            scope="network",
            system="BDMS",
            permissions={"requests.create"},
        )
        with patch.object(block_requests, "get_connection", return_value=connection), patch.object(
            block_requests, "resolve_section_id", return_value="SEC-1"
        ), patch.object(block_requests, "resolve_user_id", return_value="USER-1"):
            result = block_requests.create_block_request(request, user)

        self.assertEqual(connection.inserted_request_status, "PENDING")
        self.assertEqual(connection.inserted_review_status, "PENDING")
        self.assertIn("RETURNING request_id, request_status, review_status, created_at", connection.returning_sql)
        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)
        self.assertEqual(result["request_id"], "BR-AUTO-0001")
        self.assertEqual(result["request_status"], "PENDING")
        self.assertEqual(result["requisition"]["request_id"], "BR-AUTO-0001")
        self.assertEqual(result["requisition"]["request_status"], "PENDING")

    def test_requisition_insert_rolls_back_if_database_did_not_persist_pending(self):
        connection = RequisitionInsertConnection()
        connection.returned_request_status = "OPTIMIZED"
        request = BlockRequestCreate(
            dept="TMS", assetId="AST-0001", work="Track inspection",
            section="NDLS-GZB", line="Down Main", chainage="KM 412/10",
            blockType="Traffic Block", duration=3, crew=8,
            criticality="High", daysOverdue=2, tsrRisk=True,
            requestedBy="Planning Officer",
        )
        user = CurrentUser(
            role_id="admin", name="Planning Officer", title="DRM Planning",
            dept=None, scope="network", system="BDMS",
            permissions={"requests.create"},
        )
        with patch.object(block_requests, "get_connection", return_value=connection), patch.object(
            block_requests, "resolve_section_id", return_value="SEC-1"
        ), patch.object(block_requests, "resolve_user_id", return_value="USER-1"):
            with self.assertRaises(HTTPException) as caught:
                block_requests.create_block_request(request, user)

        self.assertEqual(caught.exception.status_code, 500)
        self.assertFalse(connection.committed)
        self.assertTrue(connection.rolled_back)

    def test_frontend_requisition_payload_matches_fastapi_model(self):
        payload = {
            "dept": "TMS",
            "assetId": "AST-TEST-01",
            "work": "Track inspection",
            "section": "C02",
            "line": "Down Main",
            "chainage": "KM 412/10",
            "blockType": "Traffic Block",
            "duration": 3,
            "crew": 8,
            "criticality": "High",
            "daysOverdue": 2,
            "tsrRisk": True,
            "requestedBy": "Planning Officer",
        }
        request = BlockRequestCreate(**payload)
        self.assertEqual(request.assetId, "AST-TEST-01")
        self.assertEqual(request.duration, 3)
        self.assertTrue(request.tsrRisk)

    def test_only_persisted_pending_requests_are_eligible(self):
        self.assertEqual(
            count_eligible_requests(
                {"PENDING": 2, "SUBMITTED": 7, "OPTIMIZED": 133, "CANCELLED": 8}
            ),
            2,
        )
        self.assertEqual(
            count_eligible_requests({"pending": 1, "PENDING_OPTIMIZATION": 9}), 1
        )

    def test_successful_transition_commits_and_cannot_repeat(self):
        connection = StatefulConnection({"R-1": "PENDING"})
        cursor = connection.cursor()
        with commit_or_rollback(connection):
            cursor.execute("INSERT INTO optimized_blocks VALUES (...) ")
            cursor.execute("INSERT INTO block_tasks VALUES (...) ")
            self.assertEqual(connection.statuses["R-1"], "PENDING")
            lock_pending_requests(cursor, {"R-1"})
            mark_request_optimized(cursor, "R-1")
        self.assertEqual(connection.statuses, {"R-1": "OPTIMIZED"})
        self.assertEqual(connection.commits, 1)
        self.assertEqual(connection.rollbacks, 0)
        lock_pending_requests(cursor, set())
        with self.assertRaisesRegex(RuntimeError, "no longer pending"):
            mark_request_optimized(cursor, "R-1")

    def test_failed_persistence_rolls_back_status_transition(self):
        connection = StatefulConnection({"R-1": "PENDING"})
        cursor = connection.cursor()
        with self.assertRaisesRegex(RuntimeError, "write failed"):
            with commit_or_rollback(connection):
                cursor.execute("INSERT INTO optimized_blocks VALUES (...) ")
                cursor.execute("INSERT INTO block_tasks VALUES (...) ")
                mark_request_optimized(cursor, "R-1")
                raise RuntimeError("write failed")
        self.assertEqual(connection.statuses, {"R-1": "PENDING"})
        self.assertEqual(connection.commits, 0)
        self.assertEqual(connection.rollbacks, 1)

    def test_cancelled_and_rejected_requests_are_not_eligible_or_optimized(self):
        connection = StatefulConnection(
            {"R-PENDING": "PENDING", "R-CANCELLED": "CANCELLED", "R-REJECTED": "REJECTED"}
        )
        cursor = connection.cursor()

        lock_pending_requests(cursor, {"R-PENDING"})
        self.assertEqual([row[0] for row in cursor.fetchall()], ["R-PENDING"])
        cursor.execute("INSERT INTO optimized_blocks VALUES (...) ")
        for request_id in ("R-CANCELLED", "R-REJECTED"):
            with self.assertRaisesRegex(RuntimeError, "no longer pending"):
                mark_request_optimized(cursor, request_id)

        self.assertEqual(
            connection.statuses,
            {"R-PENDING": "PENDING", "R-CANCELLED": "CANCELLED", "R-REJECTED": "REJECTED"},
        )

    def test_optimization_preserves_existing_optimized_cancelled_and_rejected_rows(self):
        initial = {
            "R-PENDING": "PENDING",
            "R-OPTIMIZED": "OPTIMIZED",
            "R-CANCELLED": "CANCELLED",
            "R-REJECTED": "REJECTED",
        }
        connection = StatefulConnection(initial)
        cursor = connection.cursor()

        lock_pending_requests(cursor, {"R-PENDING"})
        with commit_or_rollback(connection):
            cursor.execute("INSERT INTO optimized_blocks VALUES (...) ")
            mark_request_optimized(cursor, "R-PENDING")

        self.assertEqual(
            connection.statuses,
            {
                "R-PENDING": "OPTIMIZED",
                "R-OPTIMIZED": "OPTIMIZED",
                "R-CANCELLED": "CANCELLED",
                "R-REJECTED": "REJECTED",
            },
        )

    def test_no_eligible_requests_reports_counts_without_running_engine(self):
        connection = StatusConnection(
            {"OPTIMIZED": 133, "CANCELLED": 8, "REJECTED": 2}
        )
        with patch.object(optimization, "get_connection", return_value=connection), patch.object(
            optimization.importlib,
            "import_module",
            side_effect=AssertionError("engine must not run without eligible requests"),
        ):
            with self.assertRaises(HTTPException) as caught:
                optimization.run_optimization()
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(caught.exception.detail["code"], "NO_ELIGIBLE_DEMANDS")
        self.assertIn("OPTIMIZED: 133", caught.exception.detail["message"])
        self.assertIn("No statuses were changed", caught.exception.detail["message"])
        self.assertEqual(caught.exception.detail["pipeline"]["stages"][-1]["status"], "SKIPPED")
        self.assertTrue(connection.closed)

    def test_approval_keeps_request_pending_until_plan_is_created(self):
        connection = ApprovalConnection()
        user = CurrentUser(
            role_id="admin",
            name="Planning Officer",
            title="DRM Planning",
            dept=None,
            scope="network",
            system="BDMS",
            permissions={"requests.reject"},
        )
        with patch.object(block_requests, "get_connection", return_value=connection):
            result = block_requests.approve_block_request("R-2", user)
        update_sql = connection.test_cursor.calls[1][0]
        self.assertIn("review_status = 'APPROVED'", update_sql)
        self.assertNotIn("request_status", update_sql)
        self.assertEqual(result["request_status"], "PENDING")
        self.assertEqual(result["review_status"], "APPROVED")
        self.assertTrue(connection.committed)

    def test_optimizer_engine_failure_is_an_http_error(self):
        connection = StatusConnection({"PENDING": 1})
        with patch.object(optimization, "get_connection", return_value=connection), patch.object(
            optimization.importlib,
            "import_module",
            side_effect=RuntimeError("database write failed"),
        ):
            with self.assertRaises(HTTPException) as caught:
                optimization.run_optimization()
        self.assertEqual(caught.exception.status_code, 500)
        self.assertIn("database write failed", caught.exception.detail["message"])

    def test_successful_engine_result_is_returned_without_fallback(self):
        connection = StatusConnection({"PENDING": 1})
        block = {
            "block_id": "OPT-2026-10-22-ab12cd34-001",
            "duration": 90,
            "utilization": 75,
            "train_impact": 1,
            "train_conflicts": 0,
        }
        engine = SimpleNamespace(
            requests=[["R-3"]],
            optimized_blocks=[block],
            shadow_block_opportunities=[],
            pipeline_result={
                "stages": [
                    {"id": "BDMS_INGESTION", "status": "COMPLETED"},
                    {"id": "CRITICALITY_SCORING", "status": "COMPLETED"},
                    {"id": "SHADOW_CLUSTERING", "status": "COMPLETED"},
                    {"id": "CORRIDOR_MATCHING", "status": "COMPLETED"},
                    {"id": "MEGABLOCK_PERSISTENCE", "status": "COMPLETED", "transaction_committed": True},
                ],
                "metrics": {"downtime_saved_min": None, "train_delays_min": 0, "path_conflicts": 0},
                "warnings": [],
            },
        )
        prior_module = sys.modules.pop("logic.block_optimizer", None)
        try:
            with patch.object(optimization, "get_connection", return_value=connection), patch.object(
                optimization.importlib, "import_module", return_value=engine
            ):
                result = optimization.run_optimization()
        finally:
            if prior_module is not None:
                sys.modules["logic.block_optimizer"] = prior_module
        self.assertEqual(result["status"], "success")
        self.assertFalse(result["is_demo"])
        self.assertEqual(result["requests_processed"], 1)
        self.assertEqual(result["blocks"], [block])
        self.assertEqual(result["pipeline"]["stages"][-1]["transaction_committed"], True)

    def test_api_rejects_engine_success_without_committed_pipeline_evidence(self):
        connection = StatusConnection({"PENDING": 1})
        engine = SimpleNamespace(
            requests=[["R-4"]],
            optimized_blocks=[{"block_id": "B-1", "duration": 30, "utilization": 50, "train_impact": 0, "train_conflicts": 0}],
            shadow_block_opportunities=[],
        )
        prior_module = sys.modules.pop("logic.block_optimizer", None)
        try:
            with patch.object(optimization, "get_connection", return_value=connection), patch.object(
                optimization.importlib, "import_module", return_value=engine
            ):
                with self.assertRaises(HTTPException) as caught:
                    optimization.run_optimization()
        finally:
            if prior_module is not None:
                sys.modules["logic.block_optimizer"] = prior_module
        self.assertEqual(caught.exception.status_code, 500)
        self.assertIn("did not return verifiable stage results", caught.exception.detail["message"])

    def test_saved_plan_is_unavailable_when_postgres_is_unavailable(self):
        user = CurrentUser(
            role_id="admin",
            name="Planning Officer",
            title="DRM Planning",
            dept=None,
            scope="network",
            system="BDMS",
            permissions={"planner.view"},
        )
        with patch.object(optimized_plan, "get_connection", return_value=None):
            with self.assertRaises(HTTPException) as caught:
                optimized_plan.get_optimized_plan(user=user)
        self.assertEqual(caught.exception.status_code, 503)

    def test_empty_saved_plan_returns_an_actual_empty_list(self):
        user = CurrentUser(
            role_id="admin",
            name="Planning Officer",
            title="DRM Planning",
            dept=None,
            scope="network",
            system="BDMS",
            permissions={"planner.view"},
        )
        with patch.object(
            optimized_plan,
            "get_connection",
            side_effect=[EmptyPlanConnection(), None],
        ):
            result = optimized_plan.get_optimized_plan(user=user)
        self.assertEqual(result["blocks"], [])
        self.assertEqual(result["blocks_generated"], 0)
        self.assertFalse(result["is_demo"])


if __name__ == "__main__":
    unittest.main()
