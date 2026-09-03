from fastapi import APIRouter

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/kpis")
def get_dashboard_kpis():
    return {
        "status": "success",
        "kpis": {
            "overall_asset_availability": 94.6,
            "scheduled_blocks": 12,
            "shadow_block_savings": 18.5,
            "punctuality_impact_index": 42
        },
        "corridor_status": [
            {
                "id": "ndls-cnb",
                "name": "New Delhi (NDLS) - Kanpur (CNB)",
                "from": "New Delhi (NDLS)",
                "to": "Kanpur (CNB)",
                "trains_running": 3,
                "window": "11:00 - 14:00",
                "traffic_intensity": 87,
                "tracks": ["Up Main", "Down Main", "Line 3 Up"]
            },
            {
                "id": "cnb-ald",
                "name": "Kanpur (CNB) - Prayagraj (ALD)",
                "from": "Kanpur (CNB)",
                "to": "Prayagraj (ALD)",
                "trains_running": 5,
                "window": "14:00 - 17:00",
                "traffic_intensity": 45,
                "tracks": ["Up Main", "Down Main"]
            },
            {
                "id": "ald-bsb",
                "name": "Prayagraj (ALD) - Varanasi (BSB)",
                "from": "Prayagraj (ALD)",
                "to": "Varanasi (BSB)",
                "trains_running": 2,
                "window": "23:00 - 04:00",
                "traffic_intensity": 92,
                "tracks": ["Up Main", "Down Main"]
            }
        ],
        "urgent_risks": [
            {
                "id": "TRK-ENG-982",
                "title": "IMR Track Fracture",
                "severity": "Critical",
                "location": "NDLS-CNB Down Main",
                "description": "USFD Class IMR flaw. TSR 30 kmph imposed if defect >48h."
            },
            {
                "id": "SIG-PNT-119",
                "title": "Point Machine Failure",
                "severity": "High",
                "location": "DDU-BSB Up Main",
                "description": "Intermittent failure in reverse operation."
            },
            {
                "id": "OHE-MAST-341",
                "title": "OHE Hot Spot",
                "severity": "High",
                "location": "NDLS-CNB Down Main",
                "description": "Pantograph flashover reported by Loco Pilot."
            }
        ],
        "train_forecast": [
            {
                "id": "forecast-1",
                "train": "COA-001",
                "corridor": "NDLS - CNB",
                "status": "On Time",
                "time": "11:15"
            },
            {
                "id": "forecast-2",
                "train": "COA-002",
                "corridor": "CNB - ALD",
                "status": "Expected",
                "time": "11:45"
            },
            {
                "id": "forecast-3",
                "train": "COA-003",
                "corridor": "ALD - BSB",
                "status": "Delayed",
                "time": "12:20"
            }
        ],
        "requisition_pipeline": {
            "pending_ai_scheduling": 7,
            "clustered_shadowed": 3,
            "approved": 2,
            "active": 1,
            "completed": 67
        }
    }
