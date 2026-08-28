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

# Optimization Workflow
Block Requests
      ↓
Priority Evaluation
      ↓
Compatible Request Grouping
      ↓
Train Conflict Detection
      ↓
Train Impact Calculation
      ↓
Block Duration Calculation
      ↓
Utilization Calculation
      ↓
Optimized Blocks
      ↓
PostgreSQL

## 3. Block Grouping

Compatible maintenance requests are grouped when:

- They belong to the same corridor.
- They occur on the same date.
- Their time windows overlap or are within the allowed consolidation gap.
- The combined block duration does not exceed the maximum block duration.

Current settings:

```python
MAX_BLOCK_DURATION = 240
MAX_CONSOLIDATION_GAP = 15

The maximum block duration is 4 hours, and requests can be consolidated when their gap is 15 minutes or less.

4. Train Conflict Detection

The optimizer checks whether a proposed maintenance block overlaps with scheduled trains on the same corridor and date.

Train Impact Scores
| Train Type | Impact Score |
| ---------- | -----------: |
| Express    |           40 |
| Passenger  |           25 |
| Freight    |           15 |
| Other      |           20 |

The final train impact score is capped at 100.

Detected train conflicts are stored in:
block_train_impact
Each conflict records the affected block, train, conflict type, and estimated delay.

5. Utilization Calculation

Block utilization is calculated using the actual occupied time of maintenance tasks rather than simply adding the duration of every task.

This prevents overlapping tasks from being counted multiple times.

Formula
Utilization (%) =
Actual Occupied Minutes
----------------------- × 100
Maximum Block Duration

The result is rounded to two decimal places and capped at 100%.

For example, if a block occupies 150 minutes:
150 / 240 × 100 = 62.5%
This provides a more realistic measurement of how efficiently each maintenance block is being used.

6. Optimization Output

The optimizer stores each generated block in:
optimized_blocks

Each Optimized Block Contains
Block ID
Corridor
Date
Start time
End time
Duration
Utilization percentage
Train impact score
Number of tasks

Task relationships are stored in:
block_tasks

Train conflicts are stored in:
block_train_impact

The optimizer also removes previous optimization results before inserting the newly generated blocks. This ensures that the database contains the latest optimization output.

7. Current Validation Results

The generated dataset currently contains:

103 assets
98 block requests
75 maintenance tasks
297 maintenance history records
83 defects
11 corridors
4 trains
3 teams
66 optimized blocks

Optimization Result
98 Block Requests
        ↓
66 Optimized Blocks

The optimizer successfully groups compatible requests into consolidated maintenance blocks.

Generated blocks can contain multiple tasks, with the current dataset producing blocks containing up to 4 tasks.

Database Validation

The optimized results were verified in PostgreSQL using the following tables:
optimized_blocks
block_tasks
block_train_impact

8. Running the Optimizer

The project uses a Python virtual environment for running the backend logic.

Activate the Virtual Environment

From the project directory:
.\venv\Scripts\activate

Run the Optimizer
python backend/logic/block_optimizer.py

The optimizer connects to PostgreSQL, reads pending block requests and train schedules, processes the requests, and stores the optimized results back into the database.

Successful Execution

A successful run ends with:

==============================================================
              OPTIMIZATION COMPLETE
==============================================================

9. Backend Structure
backend/
│
├── logic/
│   ├── block_optimizer.py
│   ├── conflict_detector.py
│   └── priority_engine.py
│
├── generate_assets.py
├── generate_blocks.py
├── generate_corridors.py
├── generate_data.py
├── generate_defects.py
├── generate_history.py
├── generate_tasks.py
├── test_connection.py
└── README.md

Main Responsibilities
Component	Responsibility
Data Generation	Creates and populates railway data
Block Optimizer	Groups requests and creates optimized blocks
Conflict Detection	Identifies conflicts with train schedules
Priority Engine	Handles task priority information
PostgreSQL	Stores input data and optimization results
10. Integration

The Data Layer and Logical Layer are designed to be consumed by the backend API.

The API layer can retrieve optimized railway block information from PostgreSQL using the following tables:

optimized_blocks
block_tasks
block_train_impact

The API can expose this information to the frontend for visualization and decision support.

Integration Flow
PostgreSQL
    ↓
Data Layer
    ↓
Logical Layer
    ↓
Optimized Blocks
    ↓
Backend API
    ↓
Frontend Dashboard

The current implementation therefore provides the data generation, database storage, optimization logic, train conflict detection, and utilization calculation required by the Railway Block Optimizer system.