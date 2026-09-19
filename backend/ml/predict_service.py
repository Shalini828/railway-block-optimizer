import os

import joblib

from .features import (
    build_asset_features,
    features_to_dataframe,
)


# ============================================================
# MODEL PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_FILE = os.path.join(
    BASE_DIR,
    "railway_risk_model.pkl"
)


# ============================================================
# LOAD MODEL
# ============================================================

_model = None


def get_model():
    """
    Load the trained Random Forest model once
    and reuse it for future predictions.
    """

    global _model

    if _model is None:
        if not os.path.exists(MODEL_FILE):
            raise FileNotFoundError(
                f"Trained model not found: {MODEL_FILE}"
            )

        _model = joblib.load(
            MODEL_FILE
        )

    return _model


# ============================================================
# PRIORITY CATEGORY
# ============================================================

def get_priority_category(
    risk_percentage
):
    """
    Convert ML risk probability into
    a priority category.
    """

    if risk_percentage >= 80:
        return "CRITICAL"

    if risk_percentage >= 60:
        return "HIGH"

    if risk_percentage >= 40:
        return "MEDIUM"

    return "LOW"


# ============================================================
# PREDICT ONE ASSET
# ============================================================

def predict_asset_risk(
    asset,
    defects=None,
    maintenance_history=None,
):
    """
    Predict urgent maintenance risk for one
    railway asset.

    Returns a dictionary containing:

    - risk_probability
    - risk_score
    - priority_category
    - prediction
    - features
    """

    # --------------------------------------------------------
    # 1. BUILD FEATURES
    # --------------------------------------------------------

    features = build_asset_features(
        asset=asset,
        defects=defects,
        maintenance_history=maintenance_history,
    )

    # --------------------------------------------------------
    # 2. CONVERT TO MODEL INPUT
    # --------------------------------------------------------

    input_data = features_to_dataframe(
        features
    )

    # --------------------------------------------------------
    # 3. LOAD MODEL
    # --------------------------------------------------------

    model = get_model()

    # --------------------------------------------------------
    # 4. PREDICT
    # --------------------------------------------------------

    prediction = int(
        model.predict(
            input_data
        )[0]
    )

    probability = float(
        model.predict_proba(
            input_data
        )[0][1]
    )

    risk_percentage = round(
        probability * 100,
        2
    )

    # --------------------------------------------------------
    # 5. PRIORITY
    # --------------------------------------------------------

    priority = get_priority_category(
        risk_percentage
    )

    # --------------------------------------------------------
    # 6. RETURN RESULT
    # --------------------------------------------------------

    return {
        "asset_id": asset.get(
            "asset_id"
        ),
        "risk_probability": probability,
        "risk_score": risk_percentage,
        "priority_category": priority,
        "urgent_maintenance_prediction": prediction,
        "features": features,
    }