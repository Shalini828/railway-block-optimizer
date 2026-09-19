import os
import joblib
import pandas as pd


# =========================================================
# MODEL PATHS
# =========================================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "railway_risk_model.pkl"
)

THRESHOLD_PATH = os.path.join(
    os.path.dirname(__file__),
    "optimal_threshold.txt"
)


# =========================================================
# FEATURE COLUMNS
# =========================================================

FEATURE_COLUMNS = [
    "criticality",
    "health_score",
    "failure_risk",
    "asset_age_years",
    "days_since_inspection",
    "defect_count",
    "urgent_defect_count",
    "max_safety_impact",
    "repeat_failure",
    "maintenance_count",
    "corrective_maintenance_count",
    "previous_failure_count"
]


# =========================================================
# LOAD MODEL
# =========================================================

_model = None
_threshold = None


def get_model():
    global _model

    if _model is None:
        _model = joblib.load(MODEL_PATH)

    return _model


# =========================================================
# LOAD OPTIMAL THRESHOLD
# =========================================================

def get_threshold():
    global _threshold

    if _threshold is None:

        try:
            with open(
                THRESHOLD_PATH,
                "r"
            ) as f:

                _threshold = float(
                    f.read().strip()
                )

        except (
            FileNotFoundError,
            ValueError
        ):

            # Safe fallback if threshold file
            # is unavailable.
            _threshold = 0.5

    return _threshold


# =========================================================
# PRIORITY CATEGORY
# =========================================================

def get_priority_category(
    risk_score: float
) -> str:

    if risk_score >= 85:
        return "CRITICAL"

    elif risk_score >= 70:
        return "HIGH"

    elif risk_score >= 50:
        return "MEDIUM"

    else:
        return "LOW"


# =========================================================
# PREDICT ASSET RISK
# =========================================================

def predict_asset_risk(
    asset: dict,
    defects: list,
    maintenance_history: list
):

    model = get_model()

    threshold = get_threshold()

    # -----------------------------------------------------
    # Build feature values
    # -----------------------------------------------------

    from .features import build_asset_features

    features = build_asset_features(
        asset,
        defects,
        maintenance_history
    )

    # -----------------------------------------------------
    # Convert to DataFrame
    # -----------------------------------------------------

    feature_data = {
        column: [
            features.get(
                column,
                0
            )
        ]
        for column in FEATURE_COLUMNS
    }

    X = pd.DataFrame(
        feature_data,
        columns=FEATURE_COLUMNS
    )

    # -----------------------------------------------------
    # Probability prediction
    # -----------------------------------------------------

    probabilities = model.predict_proba(X)

    urgent_probability = float(
        probabilities[0][1]
    )

    # -----------------------------------------------------
    # Apply optimized threshold
    # -----------------------------------------------------

    urgent_prediction = int(
        urgent_probability >= threshold
    )

    # -----------------------------------------------------
    # Risk score
    # -----------------------------------------------------

    risk_score = round(
        urgent_probability * 100,
        2
    )

    priority_category = get_priority_category(
        risk_score
    )

    # -----------------------------------------------------
    # Return prediction
    # -----------------------------------------------------

    return {

        "asset_id":
            asset.get("asset_id"),

        "risk_probability":
            round(
                urgent_probability,
                6
            ),

        "risk_score":
            risk_score,

        "priority_category":
            priority_category,

        "urgent_maintenance_prediction":
            urgent_prediction,

        "decision_threshold":
            round(
                threshold,
                6
            ),

        "features":
            features
    }