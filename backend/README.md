# Railway Block Optimizer — Backend

This backend contains the **Data Layer** and **Logical Layer** of the Railway Block Optimizer system.

## 1. Data Layer

The Data Layer generates and manages railway maintenance and operational data using PostgreSQL.

### Data generation scripts

- `generate_data.py` — generates base railway data
- `generate_assets.py` — generates railway assets
- `generate_tasks.py` — generates maintenance tasks
- `generate_blocks.py` — generates block requests
- `generate_corridors.py` — generates railway corridors
- `generate_defects.py` — generates asset defects
- `generate_history.py` — generates maintenance history

### Main database tables

| Table | Purpose |
|---|---|
| `assets` | Railway assets and resources |
| `block_requests` | Maintenance/block requests |
| `maintenance_tasks` | Maintenance task information |
| `maintenance_history` | Historical maintenance records |
| `defects` | Asset defect information |
| `corridors` | Railway corridors |
| `trains` | Train schedules |
| `teams` | Maintenance teams |
| `zones_divisions` | Railway zones and divisions |
| `goods_train_forecast` | Goods train forecast data |
| `optimized_blocks` | Generated optimized blocks |
| `block_tasks` | Block-to-task relationships |
| `block_train_impact` | Block-to-train conflict information |

## 2. Logical Layer

The logical layer processes pending block requests and creates optimized maintenance blocks.

### Main logic modules

```text
logic/
├── block_optimizer.py
├── conflict_detector.py
└── priority_engine.py