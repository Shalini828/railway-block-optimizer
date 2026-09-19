import os
import joblib
import sys
from typing import Dict, Any


# ============================================================
# MODEL PATHS
# ============================================================

BASE_DIR = os.path.dirname(__file__)

BACKEND_DIR = os.path.dirname(BASE_DIR)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

TRAFFIC_MODEL_PATH = os.path.join(
    BASE_DIR,
    "traffic_impact_model.pkl"
)

GOODS_MODEL_PATH = os.path.join(
    BASE_DIR,
    "goods_train_forecast_model.pkl"
)


# ============================================================
# IMPORT EXISTING SERVICES
# ============================================================

from ml.predict_service import predict_asset_risk
from ml.traffic_predict_service import predict_traffic_impact
from ml.goods_forecast_service import predict_goods_train_demand


# ============================================================
# OVERALL AI ASSESSMENT
# ============================================================

def get_overall_assessment(
    asset_risk_score: float,
    traffic_impact_score: float,
    goods_demand: float
) -> Dict[str, Any]:

    # --------------------------------------------------------
    # Asset risk
    # --------------------------------------------------------

    if asset_risk_score >= 85:
        asset_assessment = "CRITICAL"

    elif asset_risk_score >= 70:
        asset_assessment = "HIGH"

    elif asset_risk_score >= 50:
        asset_assessment = "MEDIUM"

    else:
        asset_assessment = "LOW"

    # --------------------------------------------------------
    # Traffic impact
    # --------------------------------------------------------

    if traffic_impact_score >= 80:
        traffic_assessment = "CRITICAL"

    elif traffic_impact_score >= 60:
        traffic_assessment = "HIGH"

    elif traffic_impact_score >= 35:
        traffic_assessment = "MEDIUM"

    else:
        traffic_assessment = "LOW"

    # --------------------------------------------------------
    # Goods demand
    # --------------------------------------------------------

    if goods_demand >= 40:
        goods_assessment = "VERY_HIGH"

    elif goods_demand >= 30:
        goods_assessment = "HIGH"

    elif goods_demand >= 15:
        goods_assessment = "MEDIUM"

    else:
        goods_assessment = "LOW"

    # --------------------------------------------------------
    # Combined pressure
    # --------------------------------------------------------

    pressure_score = (
        asset_risk_score * 0.35
        + traffic_impact_score * 0.40
        + min(goods_demand * 2, 100) * 0.25
    )

    pressure_score = round(
        min(100, max(0, pressure_score)),
        2
    )

    if pressure_score >= 80:
        overall_level = "CRITICAL"

    elif pressure_score >= 60:
        overall_level = "HIGH"

    elif pressure_score >= 35:
        overall_level = "MEDIUM"

    else:
        overall_level = "LOW"

    return {
        "overall_pressure_score": pressure_score,
        "overall_level": overall_level,
        "asset_assessment": asset_assessment,
        "traffic_assessment": traffic_assessment,
        "goods_assessment": goods_assessment
    }


# ============================================================
# UNIFIED BLOCK INTELLIGENCE
# ============================================================
def analyze_block(
    asset,
    defects,
    maintenance_history,
    traffic_inputs,
    goods_inputs
):
    # -----------------------------------------
    # 1. ASSET RISK
    # -----------------------------------------
    asset_result = predict_asset_risk(
        asset=asset,
        defects=defects,
        maintenance_history=maintenance_history
    )

    asset_risk_score = float(
        asset_result["risk_score"]
    )

    # -----------------------------------------
    # 2. TRAFFIC IMPACT
    # -----------------------------------------
    traffic_result = predict_traffic_impact(
        block_duration_min=int(
            traffic_inputs["block_duration_min"]
        ),
        start_hour=int(
            traffic_inputs["start_hour"]
        ),
        passenger_trains=int(
            traffic_inputs["passenger_trains"]
        ),
        goods_trains=int(
            traffic_inputs["goods_trains"]
        ),
        special_trains=int(
            traffic_inputs["special_trains"]
        ),
        express_trains=int(
            traffic_inputs["express_trains"]
        ),
        corridor_congestion=float(
            traffic_inputs["corridor_congestion"]
        ),
        criticality=int(
            traffic_inputs["criticality"]
        ),
        maintenance_priority=float(
            traffic_inputs["maintenance_priority"]
        )
    )

    traffic_score = float(
        traffic_result["traffic_impact_score"]
    )

    # -----------------------------------------
    # 3. GOODS TRAIN DEMAND
    # -----------------------------------------
    goods_result = predict_goods_train_demand(
        day_of_week=int(
            goods_inputs["day_of_week"]
        ),
        month=int(
            goods_inputs["month"]
        ),
        is_weekend=int(
            goods_inputs["is_weekend"]
        ),
        festival_period=int(
            goods_inputs["festival_period"]
        ),
        operational_pressure=float(
            goods_inputs["operational_pressure"]
        ),
        industrial_demand=float(
            goods_inputs["industrial_demand"]
        ),
        previous_day_demand=float(
            goods_inputs["previous_day_demand"]
        ),
        corridor_id=str(
            goods_inputs["corridor_id"]
        ),
        commodity=str(
            goods_inputs["commodity"]
        )
    )

    goods_demand = float(
        goods_result["predicted_goods_train_demand"]
    )

    # -----------------------------------------
    # 4. OVERALL ASSESSMENT
    # -----------------------------------------
    overall = get_overall_assessment(
        asset_risk_score,
        traffic_score,
        goods_demand
    )

    return {
        "asset_risk": asset_result,
        "traffic_impact": traffic_result,
        "goods_demand": goods_result,
        "overall_assessment": overall
    }

# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    # Simple synthetic asset for testing
    test_asset = {
        "asset_id": "AST-0001",
        "criticality": 3,
        "health_score": 88.81,
        "failure_risk": 29.2,
        "installation_date": "2016-01-01",
        "last_inspection_date": "2026-02-01"
    }

    result = analyze_block(

        asset=test_asset,

        defects=[],

        maintenance_history=[],

        block_duration_min=120,

        start_hour=18,

        passenger_trains=8,

        goods_trains=4,

        special_trains=1,

        express_trains=3,

        corridor_congestion=70,

        criticality=4,

        maintenance_priority=80,

        forecast_day_of_week=2,

        forecast_month=10,

        forecast_is_weekend=0,

        forecast_festival_period=1,

        forecast_operational_pressure=70,

        forecast_industrial_demand=85,

        forecast_previous_day_demand=25,

        forecast_corridor_id="C09",

        forecast_commodity="COAL"
    )

    print("=" * 70)
    print("UNIFIED BLOCK AI INTELLIGENCE")
    print("=" * 70)

    print("\nASSET RISK")
    print(
        "Risk Score:",
        result["asset_risk"]["risk_score"]
    )

    print(
        "Priority:",
        result["asset_risk"]["priority_category"]
    )

    print("\nTRAFFIC IMPACT")
    print(
        "Impact Score:",
        result["traffic_impact"]["traffic_impact_score"]
    )

    print(
        "Level:",
        result["traffic_impact"]["disruption_level"]
    )

    print("\nGOODS DEMAND")
    print(
        "Predicted Demand:",
        result["goods_demand"][
            "predicted_goods_train_demand"
        ]
    )

    print(
        "Level:",
        result["goods_demand"]["demand_level"]
    )

    print("\nOVERALL ASSESSMENT")

    print(
        "Pressure Score:",
        result["overall_assessment"][
            "overall_pressure_score"
        ]
    )

    print(
        "Overall Level:",
        result["overall_assessment"][
            "overall_level"
        ]
    )

    print(
        "Asset:",
        result["overall_assessment"][
            "asset_assessment"
        ]
    )

    print(
        "Traffic:",
        result["overall_assessment"][
            "traffic_assessment"
        ]
    )

    print(
        "Goods:",
        result["overall_assessment"][
            "goods_assessment"
        ]
    )