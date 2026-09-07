# RailWise Planner

You are an expert full-stack developer and AI systems architect specialized in mission-critical transportation logistics and Indian Railways operations.

Build a complete, fully functional, interactive web application for the hackathon problem statement:

"AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways (IR-ABPS)".

---

### 1. APPLICATION OBJECTIVE & ARCHITECTURE

Build a production-ready single-page web application (React, Tailwind CSS, Lucide-React icons, Recharts/Chart.js styling, client-side state/mock data engine) that eliminates decentralized, manual railway block planning by integrating:

- **TMS (Track Management System):** Engineering track defects, ultrasonic rail testing (USFD) flaws, tamping needs.

- **SMMS (Signalling Maintenance & Management System):** Point machine overhauls, signal relay replacements, interlock testing.

- **TDMS (Traction Distribution Management System):** OHE wire inspection, cantilever adjustments, power block isolations.

- **COA (Control Office Application):** Passenger train timetables, goods freight path forecasts, freight priority corridors.

- **BDMS (Block Demand & Management System):** Coordinated requisition and approvals.

---

### 2. USER ROLES & AUTHENTICATION (RBAC)

Provide a functional Auth Modal/Page with preset "1-Click Switch Role" buttons for testing:

1. **Chief Section Controller / DRM Planning (Admin):** Full approval authority, corridor configuration, AI optimization overrides, network-wide uptime analytics.

2. **Track Engineer (Engineering / TMS):** Submits and views track maintenance requisitions.

3. **Signal & Telecom Engineer (S&T / SMMS):** Submits and manages signaling/interlocking block requests.

4. **Traction Distribution Engineer (TRD / TDMS):** Requests power/traffic blocks for overhead equipment (OHE).

---

### 3. CORE FUNCTIONAL MODULES & SCREENS

#### A. Central Executive Dashboard (COA + Uptime Center)

- **KPI Cards:** Overall Asset Availability (%), Total Scheduled Blocks (Weekly/Monthly), Shadow Block Savings (Hours gained via joint work), Punctuality Impact Index (minutes of train delay saved).

- **Live Corridor Status Feed:** Visual depiction of railway sections (e.g., *New Delhi – Kanpur Section: Line 1/2/3 Up/Down*), indicating active trains, traffic intensity, and open maintenance corridors.

- **Urgent Risk Radar:** High-priority defects (e.g., IMR Track Fracture, Point Failure, OHE hot spot) requiring emergency blocks.

#### B. Multi-Department Data Ingestion & Request Portal (TMS, SMMS, TDMS)

- **Work Request Submission Form:** Department selector, Asset ID, Section/Chainage (e.g., KM 412/10 - 414/05), Block Type (Traffic Block, Power Block, Disconnection), Estimated Duration, Crew Size, Criticality Score (High/Medium/Low), Speed Restriction (TSR) risk if deferred.

- **Unified Departmental Ledger:** Tabbed view of incoming requisitions from TMS, SMMS, and TDMS with filters by status (`Pending AI Scheduling`, `Clustered / Shadowed`, `Approved`, `Active`, `Completed`).

#### C. AI Automatic Block Optimization Engine ("The Brain")

The frontend must feature a simulated AI Execution Engine button: **"Run IR-ABPS Optimization Engine"**:

- **Algorithms Implemented in Logic:**

  1. *Criticality Scoring:* `Score = f(Asset Deterioration, Safety Hazard, Speed Restriction Risk, Days Overdue)`

  2. *Shadow Maintenance Clustering:* Automatically clusters overlapping TMS, SMMS, and TDMS requests on the same section/line into a single combined "Mega Block" to eliminate redundant shutdowns.

  3. *Corridor Window Matching:* Identifies slack intervals between scheduled passenger timetables and goods train paths from the COA feed to schedule blocks without canceling Rajdhani/Vande Bharat/express trains.

- **AI Recommendation Drawer:** Displays AI-generated schedules, explanations (e.g., *"Merged OHE maintenance with Track tamping on Down Main Line KM 380-385; saved 140 minutes of operational track downtime"*), and expected train delays.

#### D. Visual Interactive Gantt & Corridor Timeline Planner

- Multi-horizon toggle: **Weekly Tactical Plan (7-Day 24h Grid)** vs. **Monthly Strategic Overhaul Plan (30-Day View)**.

- Color-coded by department: Engineering (Amber), S&T (Emerald), TRD (Sky Blue), Joint Coordinated Block (Violet), Passenger Train Windows (Slate).

- Interactive drag-and-drop or click-to-view details on scheduled blocks, with conflict warning indicators if a block breaches a freight corridor or scheduled express train path.

#### E. Conflict Resolution & Approval Workflow

- List of automated conflict detections (e.g., *"TRD requested power block during high-density freight corridor at 14:00"*).

- 1-Click AI Resolution button: *"Auto-shift by +45 mins to train gap window"* with before/after comparison.

- Chief Controller Approval / Sign-off panel with digital authorization stamp.

#### F. Analytics & Post-Block Operational Impact Report

- **Asset Uptime vs Downtime charts** (Track, Signal, OHE).

- **Efficiency Metric:** Single-department blocks vs Coordinated/Integrated shadow blocks.

- Export Schedule as PDF / CSV simulation download button.

---

### 4. TECHNICAL & UI DESIGN SPECIFICATIONS

- **UI Framework:** Clean modern dark/light mode dashboard inspired by IRCTC/Railways control rooms with a sleek Tailwind UI (Slate/Zinc neutral dark palette, Emerald green for safety/uptime, Amber for maintenance, Indigo/Sky for high-tech AI indicators).

- **State Management:** Fully functional client-side React state (`useState`, `useContext`) pre-populated with realistic Indian Railways mock data (stations like NDLS, CNB, ALD, DDU, BSB; asset IDs like TRK-ENG-982, SIG-AXLE-401, OHE-MAST-112).

- **Self-Contained Code:** Output clean, modular, and copy-pasteable React code with all sub-components, modal views, and mock data included in one cohesive deliverable.


Create all the pages necessary for the website and make it clean and all the pages should work and have working buttons and should lead to other working pages

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b9405552-0002-4319-9d36-94c248f96a1e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
