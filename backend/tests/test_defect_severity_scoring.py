import unittest
from decimal import Decimal
from unittest.mock import patch

from logic.scoring_engine import normalize_defect_severity
from ml.predict_service import heuristic_asset_risk, predict_asset_risk


class DefectSeverityScoringTests(unittest.TestCase):
    def test_supported_severity_categories_use_the_existing_model_scale(self):
        self.assertEqual(
            {
                label: normalize_defect_severity(label)
                for label in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
            },
            {"LOW": 1, "MEDIUM": 2, "HIGH": 4, "CRITICAL": 5},
        )
        self.assertEqual(normalize_defect_severity(" medium "), 2)

    def test_numeric_and_null_values_are_handled_explicitly(self):
        self.assertEqual(normalize_defect_severity(4), 4)
        self.assertEqual(normalize_defect_severity(Decimal("3")), 3)
        self.assertEqual(normalize_defect_severity("5"), 5)
        self.assertEqual(normalize_defect_severity(None), 0)

    def test_unknown_categories_raise_actionable_validation_error(self):
        with self.assertRaisesRegex(ValueError, "Unsupported defect severity 'URGENT'"):
            normalize_defect_severity("URGENT")
        with self.assertRaisesRegex(ValueError, "whole number from 0 to 5"):
            normalize_defect_severity(6)

    def test_asset_risk_heuristic_scores_medium_defect_without_float_conversion(self):
        result = heuristic_asset_risk(
            asset={"asset_id": "AST-0022", "criticality": 3, "health_score": 70, "failure_risk": 30},
            defects=[{"severity": "MEDIUM", "safety_impact": 2, "repeat_failure": True}],
            maintenance_history=[],
        )
        self.assertGreater(result["risk_score"], 0)
        self.assertEqual(result["risk_score"], 39.5)

    def test_asset_risk_heuristic_scores_each_supported_category(self):
        asset = {"asset_id": "AST-1", "criticality": 3, "health_score": 70, "failure_risk": 30}
        for category in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
            with self.subTest(category=category):
                result = heuristic_asset_risk(
                    asset,
                    [{"severity": category, "safety_impact": None}],
                    [],
                )
                self.assertGreaterEqual(result["risk_score"], 0)

    def test_all_nine_candidate_asset_risk_evaluations_accept_medium_severity(self):
        asset = {"asset_id": "AST-0022", "criticality": 3, "health_score": 70, "failure_risk": 30}
        defects = [{"severity": "MEDIUM", "safety_impact": 2, "repeat_failure": True}]
        with patch("ml.predict_service.get_model", return_value=None):
            results = [predict_asset_risk(asset, defects, []) for _ in range(9)]
        self.assertEqual(len(results), 9)
        self.assertTrue(all(result["risk_score"] > 0 for result in results))
        self.assertTrue(all(result["features"]["max_safety_impact"] == 2 for result in results))
        self.assertTrue(all(result["features"]["urgent_defect_count"] == 0 for result in results))


if __name__ == "__main__":
    unittest.main()
