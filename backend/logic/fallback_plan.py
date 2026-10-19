"""
High-fidelity Indian Railways optimized plan fallback dataset.
Provides realistic, multi-departmental megablocks, shadow clustering opportunities,
and AI intelligence reasons for seamless offline operation.
"""

FALLBACK_OPTIMIZED_BLOCKS = [
    {
        "block_id": "BLK-NDLS-001",
        "corridor_id": "C01",
        "corridor": "New Delhi - Kanpur (NDLS-CNB)",
        "block_date": "2026-09-01",
        "date": "2026-09-01",
        "start_time": "01:30:00",
        "start": "01:30",
        "end_time": "04:30:00",
        "end": "04:30",
        "duration_min": 180,
        "duration": 180,
        "utilization_percent": 88.5,
        "utilization": 88.5,
        "train_impact_score": 14.2,
        "train_impact": 14.2,
        "estimated_delay_min": 8,
        "estimated_delay": 8,
        "optimization_score": 93.4,
        "number_of_tasks": 2,
        "number_of_departments": 2,
        "maintenance_priority": 94.5,
        "asset_risk_score": 88.0,
        "traffic_impact_score": 14.2,
        "goods_impact_score": 18.0,
        "consolidation_score": 92.0,
        "train_conflicts": 0,
        "conflict_count": 0,
        "block_status": "OPTIMIZED",
        "ai_decision_confidence": {
            "overall": 0.94,
            "level": "HIGH",
            "score_gap": 18.5,
            "candidates_evaluated": 6
        },
        "ai_reasons": [
            "Clusters critical USFD flaw rectification (TMS) with cantilever repair (TDMS) on UP Main Line",
            "Zero passenger conflict window identified between NDLS Rajdhani and early morning departures",
            "Saves 75 minutes of redundant corridor possession via parallel multi-disciplinary execution"
        ],
        "ai_explanation": {
            "score": 93.4,
            "why_selected": [
                "Clusters critical USFD flaw rectification (TMS) with cantilever repair (TDMS) on UP Main Line",
                "Zero passenger conflict window identified between NDLS Rajdhani and early morning departures",
                "Saves 75 minutes of redundant corridor possession via parallel multi-disciplinary execution"
            ],
            "metrics": {
                "duration_min": 180,
                "utilization_percent": 88.5,
                "train_impact_score": 14.2,
                "number_of_tasks": 2,
                "number_of_departments": 2
            }
        },
        "reason": "Optimal overnight zero-conflict window combining P-Way rail renewal and OHE cantilever inspection.",
        "tasks": [
            {
                "task_id": "TSK-TMS-001",
                "department": "TMS",
                "task_type": "Corrective Maintenance",
                "description": "USFD flaw rectification – IMR rail fracture site (KM 42/12-14)",
                "estimated_duration_min": 180,
                "priority_score": 94.5
            },
            {
                "task_id": "TSK-TDMS-002",
                "department": "TDMS",
                "task_type": "Preventive Maintenance",
                "description": "OHE cantilever adjustment & isolator inspection",
                "estimated_duration_min": 120,
                "priority_score": 82.0
            }
        ],
        "conflicts": []
    },
    {
        "block_id": "BLK-CNB-002",
        "corridor_id": "C02",
        "corridor": "Kanpur - Prayagraj (CNB-PRYJ)",
        "block_date": "2026-09-01",
        "date": "2026-09-01",
        "start_time": "02:00:00",
        "start": "02:00",
        "end_time": "04:30:00",
        "end": "04:30",
        "duration_min": 150,
        "duration": 150,
        "utilization_percent": 84.0,
        "utilization": 84.0,
        "train_impact_score": 18.0,
        "train_impact": 18.0,
        "estimated_delay_min": 12,
        "estimated_delay": 12,
        "optimization_score": 87.8,
        "number_of_tasks": 2,
        "number_of_departments": 2,
        "maintenance_priority": 89.0,
        "asset_risk_score": 82.5,
        "traffic_impact_score": 18.0,
        "goods_impact_score": 24.0,
        "consolidation_score": 85.0,
        "train_conflicts": 0,
        "conflict_count": 0,
        "block_status": "OPTIMIZED",
        "ai_decision_confidence": {
            "overall": 0.89,
            "level": "HIGH",
            "score_gap": 12.2,
            "candidates_evaluated": 5
        },
        "ai_reasons": [
            "Integrates SMMS point machine overhaul with TMS turnout packing",
            "Freight train G-4102 regulated for 12 minutes on loop line with zero passenger detention",
            "Reduces corridor downtime by 60 minutes compared to sequential requests"
        ],
        "ai_explanation": {
            "score": 87.8,
            "why_selected": [
                "Integrates SMMS point machine overhaul with TMS turnout packing",
                "Freight train G-4102 regulated for 12 minutes on loop line with zero passenger detention",
                "Reduces corridor downtime by 60 minutes compared to sequential requests"
            ],
            "metrics": {
                "duration_min": 150,
                "utilization_percent": 84.0,
                "train_impact_score": 18.0,
                "number_of_tasks": 2,
                "number_of_departments": 2
            }
        },
        "reason": "Joint S&T and Engineering point-and-crossing maintenance window with automated freight regulation.",
        "tasks": [
            {
                "task_id": "TSK-SMMS-003",
                "department": "SMMS",
                "task_type": "Preventive Overhaul",
                "description": "Point Machine 112A electrical & mechanical overhaul",
                "estimated_duration_min": 120,
                "priority_score": 86.0
            },
            {
                "task_id": "TSK-TMS-005",
                "department": "TMS",
                "task_type": "Track Maintenance",
                "description": "Turnout sleeper packing and lead curve tamping",
                "estimated_duration_min": 150,
                "priority_score": 84.0
            }
        ],
        "conflicts": []
    },
    {
        "block_id": "BLK-PRYJ-003",
        "corridor_id": "C03",
        "corridor": "Prayagraj - Pt. Deen Dayal Upadhyaya (PRYJ-DDU)",
        "block_date": "2026-09-01",
        "date": "2026-09-01",
        "start_time": "01:00:00",
        "start": "01:00",
        "end_time": "04:30:00",
        "end": "04:30",
        "duration_min": 210,
        "duration": 210,
        "utilization_percent": 91.5,
        "utilization": 91.5,
        "train_impact_score": 12.0,
        "train_impact": 12.0,
        "estimated_delay_min": 0,
        "estimated_delay": 0,
        "optimization_score": 95.2,
        "number_of_tasks": 2,
        "number_of_departments": 2,
        "maintenance_priority": 96.0,
        "asset_risk_score": 91.0,
        "traffic_impact_score": 12.0,
        "goods_impact_score": 15.0,
        "consolidation_score": 94.0,
        "train_conflicts": 0,
        "conflict_count": 0,
        "block_status": "OPTIMIZED",
        "ai_decision_confidence": {
            "overall": 0.96,
            "level": "VERY HIGH",
            "score_gap": 22.4,
            "candidates_evaluated": 8
        },
        "ai_reasons": [
            "Deep screening machine ballast cleaning consolidated with OHE contact wire tensioning",
            "Clearance aligned with COA freight convoy schedule with zero detention to Vande Bharat paths",
            "Maximum cross-departmental labor utilization of 91.5%"
        ],
        "ai_explanation": {
            "score": 95.2,
            "why_selected": [
                "Deep screening machine ballast cleaning consolidated with OHE contact wire tensioning",
                "Clearance aligned with COA freight convoy schedule with zero detention to Vande Bharat paths",
                "Maximum cross-departmental labor utilization of 91.5%"
            ],
            "metrics": {
                "duration_min": 210,
                "utilization_percent": 91.5,
                "train_impact_score": 12.0,
                "number_of_tasks": 2,
                "number_of_departments": 2
            }
        },
        "reason": "High-capacity deep screening megablock with concurrent traction wire replacement.",
        "tasks": [
            {
                "task_id": "TSK-TMS-006",
                "department": "TMS",
                "task_type": "Mechanized Track Work",
                "description": "BCM deep screening and shoulder ballast cleaning (KM 188-190)",
                "estimated_duration_min": 210,
                "priority_score": 95.0
            },
            {
                "task_id": "TSK-TDMS-007",
                "department": "TDMS",
                "task_type": "Traction Wire Replacement",
                "description": "OHE contact wire section renewal & drop bracket testing",
                "estimated_duration_min": 180,
                "priority_score": 88.0
            }
        ],
        "conflicts": []
    },
    {
        "block_id": "BLK-GZB-004",
        "corridor_id": "C04",
        "corridor": "Ghaziabad - Moradabad (GZB-MB)",
        "block_date": "2026-09-01",
        "date": "2026-09-01",
        "start_time": "11:30:00",
        "start": "11:30",
        "end_time": "13:30:00",
        "end": "13:30",
        "duration_min": 120,
        "duration": 120,
        "utilization_percent": 79.0,
        "utilization": 79.0,
        "train_impact_score": 16.5,
        "train_impact": 16.5,
        "estimated_delay_min": 5,
        "estimated_delay": 5,
        "optimization_score": 83.5,
        "number_of_tasks": 1,
        "number_of_departments": 1,
        "maintenance_priority": 84.0,
        "asset_risk_score": 78.0,
        "traffic_impact_score": 16.5,
        "goods_impact_score": 18.0,
        "consolidation_score": 76.0,
        "train_conflicts": 0,
        "conflict_count": 0,
        "block_status": "OPTIMIZED",
        "ai_decision_confidence": {
            "overall": 0.86,
            "level": "HIGH",
            "score_gap": 9.5,
            "candidates_evaluated": 4
        },
        "ai_reasons": [
            "Mid-day window scheduled between passenger express services",
            "Switch Expansion Joint (SEJ) replacement completed without night illumination hazards"
        ],
        "ai_explanation": {
            "score": 83.5,
            "why_selected": [
                "Mid-day window scheduled between passenger express services",
                "Switch Expansion Joint (SEJ) replacement completed without night illumination hazards"
            ],
            "metrics": {
                "duration_min": 120,
                "utilization_percent": 79.0,
                "train_impact_score": 16.5,
                "number_of_tasks": 1,
                "number_of_departments": 1
            }
        },
        "reason": "Mid-day SEJ maintenance window fitted into natural traffic gap.",
        "tasks": [
            {
                "task_id": "TSK-TMS-008",
                "department": "TMS",
                "task_type": "Track Renewal",
                "description": "Switch Expansion Joint (SEJ) rail replacement & sleeper packing",
                "estimated_duration_min": 120,
                "priority_score": 84.0
            }
        ],
        "conflicts": []
    }
]

FALLBACK_SHADOW_OPPORTUNITIES = [
    {
        "opportunity_id": "SHD-001",
        "corridor_id": "C01",
        "corridor": "New Delhi - Kanpur (NDLS-CNB)",
        "date": "2026-09-01",
        "primary_block_id": "BLK-NDLS-001",
        "department": "TRD (TDMS)",
        "base_tasks": ["TSK-TMS-001"],
        "candidate_tasks": ["TSK-TDMS-002"],
        "base_window": {"start": "01:30", "end": "04:30"},
        "candidate_window": {"start": "01:45", "end": "04:15"},
        "shadow_window_start": "01:45",
        "shadow_window_end": "04:15",
        "shadow_duration_min": 150,
        "gap_minutes": 15,
        "combined_duration_minutes": 180,
        "shadow_score": 92.5,
        "efficiency_gain_percent": 38.5,
        "description": "Parallel OHE isolations conducted under protection of TMS deep tamping block without incurring extra line possession.",
        "reason": "Parallel OHE isolations conducted under protection of TMS deep tamping block without incurring extra line possession.",
        "reasons": [
            "Shares physical line possession on UP Main Line",
            "Eliminates 150 min of separate traction power block requirement"
        ]
    },
    {
        "opportunity_id": "SHD-002",
        "corridor_id": "C02",
        "corridor": "Kanpur - Prayagraj (CNB-PRYJ)",
        "date": "2026-09-01",
        "primary_block_id": "BLK-CNB-002",
        "department": "S&T (SMMS)",
        "base_tasks": ["TSK-TMS-003"],
        "candidate_tasks": ["TSK-SMMS-004"],
        "base_window": {"start": "02:00", "end": "04:30"},
        "candidate_window": {"start": "02:15", "end": "04:00"},
        "shadow_window_start": "02:15",
        "shadow_window_end": "04:00",
        "shadow_duration_min": 105,
        "gap_minutes": 15,
        "combined_duration_minutes": 150,
        "shadow_score": 89.0,
        "efficiency_gain_percent": 42.0,
        "description": "Axle counter sensor calibration performed within scheduled point machine maintenance window.",
        "reason": "Axle counter sensor calibration performed within scheduled point machine maintenance window.",
        "reasons": [
            "Zero additional train detention",
            "Coordinated inter-departmental safety protocol"
        ]
    }
]

