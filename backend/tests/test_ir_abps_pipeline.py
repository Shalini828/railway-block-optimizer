import unittest

from logic.ir_abps_pipeline import (
    InfeasibleOptimizationError,
    group_compatible_requests,
    require_timetable_availability,
    maintenance_windows_conflict,
    select_conflict_free_candidate,
    validate_optimizer_requests,
    validate_request_coverage,
)


def request(request_id, *, department="TMS", line="Down Main", chainage="KM 412/10 - 414/05", block_type="Traffic Block"):
    return {
        "request_id": request_id,
        "task_id": f"T-{request_id}",
        "team_id": "TEAM-1",
        "corridor_id": "C01",
        "requested_date": "2026-10-24",
        "requested_start": "09:00",
        "requested_end": "10:00",
        "requested_duration_min": 60,
        "request_status": "PENDING",
        "block_type": block_type,
        "department": department,
        "asset_id": "AST-1",
        "description": f"Line: {line} | Chainage: {chainage}",
        "section_id": "SEC-1",
        "corridor_exists": True,
        "asset_exists": True,
        "section_exists": True,
    }


class IrAbpsPipelineTests(unittest.TestCase):
    def test_ingestion_requires_pending_request_and_valid_relations(self):
        valid, excluded = validate_optimizer_requests([request("R-1")])
        self.assertEqual([row["request_id"] for row in valid], ["R-1"])
        self.assertEqual(excluded, [])

        invalid = request("R-2")
        invalid["request_status"] = "OPTIMIZED"
        valid, excluded = validate_optimizer_requests([invalid])
        self.assertEqual(valid, [])
        self.assertIn("not PENDING", excluded[0]["reason"])

    def test_same_scope_requests_cluster_across_departments(self):
        second = request("R-2", department="SMMS")
        second["team_id"] = "TEAM-2"
        groups = group_compatible_requests([
            request("R-1", department="TMS"),
            second,
        ])
        self.assertEqual(len(groups), 1)
        self.assertTrue(groups[0]["cross_department"])
        self.assertEqual(groups[0]["departments"], ["SMMS", "TMS"])

    def test_incompatible_track_scope_and_block_type_stay_separate(self):
        groups = group_compatible_requests([
            request("R-1"),
            request("R-2", line="Up Main"),
            request("R-3", block_type="Power Block"),
        ])
        self.assertEqual(len(groups), 3)

    def test_shared_team_overlapping_work_is_not_clustered(self):
        groups = group_compatible_requests([request("R-1"), request("R-2", department="SMMS")])
        self.assertEqual(len(groups), 2)

    def test_request_window_must_match_persisted_duration(self):
        invalid = request("R-1")
        invalid["requested_duration_min"] = 90
        valid, excluded = validate_optimizer_requests([invalid])
        self.assertEqual(valid, [])
        self.assertIn("does not match", excluded[0]["reason"])

    def test_missing_timetable_prevents_unverified_schedule(self):
        with self.assertRaises(InfeasibleOptimizationError) as caught:
            require_timetable_availability(0, 0, "C01", "2026-10-24")
        self.assertEqual(caught.exception.stage, "CORRIDOR_MATCHING")
        require_timetable_availability(1, 0, "C01", "2026-10-24")

    def test_candidate_must_be_conflict_free_and_verified(self):
        candidates = [
            {"start": "09:00", "score": 100, "conflict_check_status": "UNAVAILABLE", "conflict_count": 0},
            {"start": "10:00", "score": 99, "conflict_check_status": "VERIFIED", "conflict_count": 1},
            {"start": "11:00", "score": 50, "conflict_check_status": "VERIFIED", "conflict_count": 0},
        ]
        self.assertEqual(select_conflict_free_candidate(candidates)["start"], "11:00")
        self.assertIsNone(select_conflict_free_candidate(candidates[:2]))

    def test_coverage_detects_missing_unexpected_and_duplicate_requests(self):
        coverage = validate_request_coverage(["R-1", "R-2"], ["R-1", "R-1", "R-3"])
        self.assertEqual(coverage, {"missing": ["R-2"], "unexpected": ["R-3"], "duplicates": ["R-1"]})

    def test_same_track_and_chainage_blocks_cannot_overlap(self):
        first = {"corridor": "C01", "date": "2026-10-24", "line": "down main", "chainage_interval": (412010, 414005), "start_minutes": 540, "end_minutes": 600}
        overlapping = {**first, "start_minutes": 590, "end_minutes": 650}
        different_track = {**overlapping, "line": "up main"}
        non_overlapping_chainage = {**overlapping, "chainage_interval": (500000, 501000)}
        self.assertTrue(maintenance_windows_conflict(overlapping, first))
        self.assertFalse(maintenance_windows_conflict(different_track, first))
        self.assertFalse(maintenance_windows_conflict(non_overlapping_chainage, first))


if __name__ == "__main__":
    unittest.main()
