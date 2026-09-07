// IR-ABPS Emergency Decision-Support Data Layer
// Advisory decision-support prototype data models & simulation state.

export type EmergencySeverity = "CRITICAL" | "HIGH" | "MEDIUM";

export interface EmergencyIncident {
  id: string;
  type: string;
  section: string;
  line: string;
  location: string;
  severity: EmergencySeverity;
  assetId: string;
  detectedTime: string; // e.g., "17:25"
  startedAt: Date;
  riskScore: number; // e.g., 94 / 100
  confidence: number; // e.g., 91%
  affectedCorridor: string; // e.g., "CNB → ALD"
  trainExposure: number; // e.g., 7 trains
  estimatedRestoration: string; // e.g., "2h 40m"
  etaRestoration: string; // e.g., "19:55"
  status: "ACTIVE" | "UNDER_REPAIR" | "RESOLVED" | "STANDBY";
  trafficStatus: "PROTECTED" | "STANDBY" | "NORMAL";
  controlNotified: boolean;
  fieldTeamDispatched: boolean;
  aiRecommendation: string;
  reblockRequired: boolean;
  description: string;
}

export interface ReblockOption {
  id: "A" | "B" | "C";
  name: string;
  badge?: string;
  isAiRecommended?: boolean;
  window: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationMinutes: number;
  trainImpact: string;
  trainImpactMinutes: number;
  affectedTrains: number;
  affectedRequests?: number;
  safety: "HIGH" | "VERY HIGH" | "CRITICAL";
  safetyScore: number; // 0-100
  operationalScore: number; // e.g., 91/100, 86/100, 95/100
  recommendationTag: string; // "BEST BALANCE" | "MAX BUFFER" | "AI RECOMMENDED"
  description: string;
  details: string[];
}

export interface TimelineEvent {
  id: string;
  time: string; // "17:24"
  timestamp: Date;
  iconType: "alert" | "risk" | "shield" | "broadcast" | "bot" | "user" | "check" | "tool" | "clock";
  title: string;
  detail: string;
  status: "completed" | "in-progress" | "pending";
}

export interface TrainImpactItem {
  trainNo: string;
  name: string;
  type: "Rajdhani" | "Vande Bharat" | "Superfast" | "Express" | "Freight";
  currentDelay: number; // minutes
  aiReblockDelay: number; // minutes
  savedDelay: number;
  priority: "High" | "Highest" | "Standard";
  status: "Projected Delay" | "On-Time Clearance" | "Minor Reschedule";
  section: string;
}

export interface CorridorNode {
  id: string;
  code: string;
  name: string;
  status: "Normal" | "CRITICAL" | "Restricted";
  trafficLevel: "Normal" | "High" | "Congested" | "Suspended";
  hasIncident: boolean;
  activeBlock: boolean;
  trainCount: number;
  risk: string; // e.g., "5/5" or "1/5"
  availability: string; // e.g., "0%" or "100%"
  incidentId?: string;
}

export interface ResourceItem {
  id: string;
  name: string;
  department: "Engineering" | "S&T" | "TRD" | "Safety" | "Medical" | "Operations";
  status: "Available" | "Occupied" | "Standby" | "Notified";
  unit: string;
  location: string;
  details: string;
}

export interface RestorationStage {
  step: number;
  name: string;
  status: "completed" | "current" | "pending";
  time?: string;
  description: string;
}

export interface ProtocolStep {
  step: number;
  title: string;
  description: string;
  status: "completed" | "current" | "pending";
}

export interface HistoricalEmergency {
  id: string;
  type: string;
  section: string;
  severity: EmergencySeverity;
  start: string;
  duration: string;
  trainImpact: string;
  resolution: string;
  status: "Resolved" | "Active";
}

// ----------------------------------------------------
// DEFAULT DEMO DATA
// ----------------------------------------------------

export const INITIAL_EMERGENCIES: EmergencyIncident[] = [
  {
    id: "SOS-CNB-001",
    type: "Track Fracture",
    section: "Kanpur (CNB) - Prayagraj (PRYJ)",
    line: "Line 1 (Up Main)",
    location: "CNB Outer – Line 1",
    severity: "CRITICAL",
    assetId: "TRK-ENG-982",
    detectedTime: "17:25",
    startedAt: new Date(Date.now() - 37 * 60000), // 37 mins ago
    riskScore: 94,
    confidence: 91,
    affectedCorridor: "CNB → ALD",
    trainExposure: 7,
    estimatedRestoration: "2h 40m",
    etaRestoration: "19:55",
    status: "ACTIVE",
    trafficStatus: "PROTECTED",
    controlNotified: true,
    fieldTeamDispatched: true,
    aiRecommendation: "RE-BLOCK REQUIRED",
    reblockRequired: true,
    description: "Multi-point fissure detected on Up Main rail head. Dynamic ultrasound track monitoring confirmed 14mm discontinuity.",
  },
  {
    id: "SOS-NDLS-002",
    type: "OHE Snapping",
    section: "New Delhi (NDLS) - Ghaziabad (GZB)",
    line: "Line 2 (Down Main)",
    location: "NDLS Outer KM 12/4",
    severity: "HIGH",
    assetId: "TRD-OHE-441",
    detectedTime: "17:05",
    startedAt: new Date(Date.now() - 55 * 60000),
    riskScore: 78,
    confidence: 88,
    affectedCorridor: "NDLS → GZB",
    trainExposure: 4,
    estimatedRestoration: "1h 15m",
    etaRestoration: "18:45",
    status: "UNDER_REPAIR",
    trafficStatus: "PROTECTED",
    controlNotified: true,
    fieldTeamDispatched: true,
    aiRecommendation: "SINGLE LINE WORKING",
    reblockRequired: false,
    description: "Catenary wire sag detected due to insulator failure. Traction isolation confirmed.",
  },
];

export const INCIDENT_TIMELINE: TimelineEvent[] = [
  {
    id: "t1",
    time: "17:24",
    timestamp: new Date(Date.now() - 38 * 60000),
    iconType: "alert",
    title: "Incident Detected",
    detail: "Track anomaly reported at CNB Outer Line 1 by axle counter & TMS telemetry.",
    status: "completed",
  },
  {
    id: "t2",
    time: "17:25",
    timestamp: new Date(Date.now() - 37 * 60000),
    iconType: "risk",
    title: "Risk Classified",
    detail: "AI Risk Assessment computed: 94/100 (CRITICAL). 7 passenger trains in direct exposure corridor.",
    status: "completed",
  },
  {
    id: "t3",
    time: "17:26",
    timestamp: new Date(Date.now() - 36 * 60000),
    iconType: "shield",
    title: "Traffic Protection Recommended",
    detail: "Decision support triggered protective signal hold. Automatic advisory sent to Section Controller.",
    status: "completed",
  },
  {
    id: "t4",
    time: "17:27",
    timestamp: new Date(Date.now() - 35 * 60000),
    iconType: "broadcast",
    title: "Control Notified",
    detail: "Central Operations Control (COA) & Dy. COM alerted via emergency telemetry broker.",
    status: "completed",
  },
  {
    id: "t5",
    time: "17:28",
    timestamp: new Date(Date.now() - 34 * 60000),
    iconType: "bot",
    title: "Re-Block Options Generated",
    detail: "IR-ABPS Brain evaluated 14 path permutations and generated 3 optimized candidate windows.",
    status: "completed",
  },
  {
    id: "t6",
    time: "17:29",
    timestamp: new Date(Date.now() - 33 * 60000),
    iconType: "user",
    title: "Awaiting Officer Approval",
    detail: "Option C (Coordinated Block) forwarded to Chief Controller for authorization.",
    status: "completed",
  },
  {
    id: "t7",
    time: "17:31",
    timestamp: new Date(Date.now() - 31 * 60000),
    iconType: "check",
    title: "Emergency Block Activated",
    detail: "Authorized block confirmed. Signals locked at DANGER. Track protection active on Line 1.",
    status: "completed",
  },
  {
    id: "t8",
    time: "18:45",
    timestamp: new Date(Date.now() + 15 * 60000),
    iconType: "tool",
    title: "Restoration in Progress",
    detail: "P.Way engineering crew ENG-04 on site. Rail replacement and flash butt welding active.",
    status: "in-progress",
  },
  {
    id: "t9",
    time: "19:55",
    timestamp: new Date(Date.now() + 85 * 60000),
    iconType: "clock",
    title: "Expected Clearance",
    detail: "Target ultrasonic inspection and speed clearance (20 km/h pilot before full track restore).",
    status: "pending",
  },
];

export const AI_REBLOCK_OPTIONS: ReblockOption[] = [
  {
    id: "A",
    name: "OPTION A — MINIMUM DISRUPTION",
    window: "18:10 – 19:40",
    startTime: "18:10",
    endTime: "19:40",
    duration: "1h 30m",
    durationMinutes: 90,
    trainImpact: "+8 min",
    trainImpactMinutes: 8,
    affectedTrains: 3,
    safety: "HIGH",
    safetyScore: 92,
    operationalScore: 91,
    recommendationTag: "BEST BALANCE",
    description: "Tightly packed work window fitted between Rajdhani clusters with minimal passenger headway loss.",
    details: [
      "Fits between Train 12301 and Train 12424 with regulated headway.",
      "Requires high-speed track welding team.",
      "Buffer contingency: 15 min.",
    ],
  },
  {
    id: "B",
    name: "OPTION B — MAXIMUM SAFETY BUFFER",
    window: "18:00 – 20:00",
    startTime: "18:00",
    endTime: "20:00",
    duration: "2h",
    durationMinutes: 120,
    trainImpact: "+19 min",
    trainImpactMinutes: 19,
    affectedTrains: 5,
    safety: "VERY HIGH",
    safetyScore: 98,
    operationalScore: 86,
    recommendationTag: "MAX SAFETY BUFFER",
    description: "Extended conservative clearance window providing maximum margin for complex rail restoration.",
    details: [
      "Provides full 40-minute post-weld ultrasonic testing buffer.",
      "Holds 2 additional freight movements at CNB loop line.",
      "Zero probability of overrun into prime night passenger slots.",
    ],
  },
  {
    id: "C",
    name: "OPTION C — COORDINATED BLOCK",
    window: "18:20 – 20:00",
    startTime: "18:20",
    endTime: "20:00",
    duration: "1h 40m",
    durationMinutes: 100,
    trainImpact: "+5 min",
    trainImpactMinutes: 5,
    affectedTrains: 3,
    affectedRequests: 3,
    safety: "HIGH",
    safetyScore: 95,
    operationalScore: 95,
    isAiRecommended: true,
    recommendationTag: "AI RECOMMENDED",
    description: "Bundles emergency track fracture repair with 2 pending S&T point maintenance tasks and overhead TRD inspection.",
    details: [
      "Bundles 3 separate engineering requests into a single unified corridor block.",
      "Dynamic loop line routing prevents Rajdhani express holds.",
      "Net corridor delay savings: 23 minutes compared to separate ad-hoc blocks.",
      "Safety margin: High track insulation and dual-line interlocking safeguards.",
    ],
  },
];

export const CORRIDOR_NODES: CorridorNode[] = [
  {
    id: "c1",
    code: "NDLS",
    name: "New Delhi",
    status: "Normal",
    trafficLevel: "Normal",
    hasIncident: false,
    activeBlock: false,
    trainCount: 18,
    risk: "1/5",
    availability: "98%",
  },
  {
    id: "c2",
    code: "CNB",
    name: "Kanpur Central",
    status: "CRITICAL",
    trafficLevel: "Suspended",
    hasIncident: true,
    activeBlock: true,
    trainCount: 7,
    risk: "5/5",
    availability: "42%",
    incidentId: "SOS-CNB-001",
  },
  {
    id: "c3",
    code: "ALD",
    name: "Prayagraj (ALD)",
    status: "Restricted",
    trafficLevel: "Congested",
    hasIncident: false,
    activeBlock: false,
    trainCount: 12,
    risk: "3/5",
    availability: "81%",
  },
  {
    id: "c4",
    code: "DDU",
    name: "Pt. Deen Dayal Upadhyaya",
    status: "Normal",
    trafficLevel: "Normal",
    hasIncident: false,
    activeBlock: false,
    trainCount: 15,
    risk: "1/5",
    availability: "95%",
  },
  {
    id: "c5",
    code: "BSB",
    name: "Varanasi",
    status: "Normal",
    trafficLevel: "Normal",
    hasIncident: false,
    activeBlock: false,
    trainCount: 9,
    risk: "1/5",
    availability: "99%",
  },
];

export const TRAIN_IMPACT_DATA: TrainImpactItem[] = [
  {
    trainNo: "12301",
    name: "Howrah Rajdhani Express",
    type: "Rajdhani",
    currentDelay: 18,
    aiReblockDelay: 5,
    savedDelay: 13,
    priority: "Highest",
    status: "Minor Reschedule",
    section: "CNB → ALD",
  },
  {
    trainNo: "12424",
    name: "Dibrugarh Rajdhani",
    type: "Rajdhani",
    currentDelay: 7,
    aiReblockDelay: 2,
    savedDelay: 5,
    priority: "Highest",
    status: "On-Time Clearance",
    section: "NDLS → CNB",
  },
  {
    trainNo: "12560",
    name: "Shiv Ganga Express",
    type: "Superfast",
    currentDelay: 12,
    aiReblockDelay: 1,
    savedDelay: 11,
    priority: "High",
    status: "On-Time Clearance",
    section: "CNB Outer",
  },
  {
    trainNo: "22415",
    name: "Vande Bharat Express",
    type: "Vande Bharat",
    currentDelay: 9,
    aiReblockDelay: 0,
    savedDelay: 9,
    priority: "Highest",
    status: "On-Time Clearance",
    section: "ALD Limits",
  },
  {
    trainNo: "12802",
    name: "Purushottam Express",
    type: "Superfast",
    currentDelay: 14,
    aiReblockDelay: 3,
    savedDelay: 11,
    priority: "High",
    status: "Projected Delay",
    section: "CNB → ALD",
  },
  {
    trainNo: "12452",
    name: "Shram Shakti Express",
    type: "Express",
    currentDelay: 6,
    aiReblockDelay: 0,
    savedDelay: 6,
    priority: "Standard",
    status: "On-Time Clearance",
    section: "CNB Yard",
  },
  {
    trainNo: "14218",
    name: "Unchahar Express",
    type: "Express",
    currentDelay: 11,
    aiReblockDelay: 2,
    savedDelay: 9,
    priority: "Standard",
    status: "Minor Reschedule",
    section: "CNB Outer",
  },
];

export const RESPONSE_RESOURCES: ResourceItem[] = [
  {
    id: "res-eng",
    name: "Engineering Team",
    department: "Engineering",
    status: "Available",
    unit: "Unit ENG-04 (P.Way Special)",
    location: "CNB Yard Depot",
    details: "Equipped with rail cutting kit, hydraulic jacks, flash-butt welding generator.",
  },
  {
    id: "res-snt",
    name: "S&T Team",
    department: "S&T",
    status: "Available",
    unit: "Signals Unit Alpha-1",
    location: "CNB Relay Room",
    details: "Point machine calibrator and axle counter diagnostic gear standing by.",
  },
  {
    id: "res-trd",
    name: "TRD Team",
    department: "TRD",
    status: "Occupied",
    unit: "TRD Beta at GZB (Unit Delta en-route)",
    location: "Section KM 431",
    details: "1 tower wagon attending minor catenary vibration; backup crew standing by.",
  },
  {
    id: "res-art",
    name: "ART (Accident Relief Train)",
    department: "Safety",
    status: "Standby",
    unit: "Class-A ART & 140T Crane",
    location: "CNB Stabling Yard",
    details: "Steam warmed, loco pilot assigned, ready for 15-minute emergency roll-out.",
  },
  {
    id: "res-med",
    name: "Medical Emergency Unit",
    department: "Medical",
    status: "Available",
    unit: "Divisional Hospital Quick Response",
    location: "Railway Hospital CNB",
    details: "Trauma van on standby, emergency medical officer notified.",
  },
  {
    id: "res-ctrl",
    name: "Control Room",
    department: "Operations",
    status: "Notified",
    unit: "Chief Train Controller / Dy. COM",
    location: "Prayagraj Division HQ",
    details: "Live teleconference established; priority block override channel open.",
  },
];

export const RESTORATION_STAGES: RestorationStage[] = [
  { step: 1, name: "INCIDENT", status: "completed", time: "17:24", description: "Anomaly detected via acoustic track monitors" },
  { step: 2, name: "PROTECTION", status: "completed", time: "17:26", description: "Signals placed at DANGER; section locked" },
  { step: 3, name: "RESPONSE", status: "completed", time: "17:34", description: "Field gang ENG-04 arrived at site" },
  { step: 4, name: "REPAIR", status: "current", time: "18:45", description: "Rail piece cutting and insertion in progress" },
  { step: 5, name: "INSPECTION", status: "pending", time: "19:25", description: "Ultrasonic weld integrity scan & rail alignment" },
  { step: 6, name: "CLEARANCE", status: "pending", time: "19:40", description: "SSE/P.Way safety sign-off & pilot train run" },
  { step: 7, name: "RESTORED", status: "pending", time: "19:55", description: "Line released to central train control" },
];

export const PROTOCOL_STEPS: ProtocolStep[] = [
  { step: 1, title: "Verify affected section", description: "Confirm track kilometer, line assignment and asset tag.", status: "completed" },
  { step: 2, title: "Confirm incident severity", description: "Validate telemetry with local station master or field sensor.", status: "completed" },
  { step: 3, title: "Protect affected traffic", description: "Place signals to DANGER and trigger protective speed regulation.", status: "completed" },
  { step: 4, title: "Notify control", description: "Broadcast high-priority advisory to Chief Controller and COA.", status: "completed" },
  { step: 5, title: "Generate re-block options", description: "Invoke IR-ABPS optimizer for multi-criteria train re-routing.", status: "completed" },
  { step: 6, title: "Review train impact", description: "Inspect passenger delay vs. safety buffer trade-offs.", status: "completed" },
  { step: 7, title: "Obtain authorized approval", description: "Authorized officer reviews & signs off the chosen emergency window.", status: "current" },
  { step: 8, title: "Dispatch field response", description: "Activate engineering, S&T and traction repair crews.", status: "pending" },
  { step: 9, title: "Monitor restoration", description: "Track milestone progression and real-time repair stages.", status: "pending" },
  { step: 10, title: "Close incident", description: "Execute ultrasonic audit, release block and export post-incident report.", status: "pending" },
];

export const RESPONSE_PERFORMANCE_METRICS = {
  detectionToAssessment: "1m 12s",
  assessmentToRecommendation: "38s",
  recommendationToApproval: "2m 04s",
  approvalToProtection: "47s",
  totalResponse: "4m 41s",
  target: "< 5 min",
  status: "Within target",
  isCompliant: true,
};

export const EMERGENCY_HISTORY_DATA: HistoricalEmergency[] = [
  {
    id: "SOS-CNB-001",
    type: "Track Fracture",
    section: "CNB Outer – Line 1",
    severity: "CRITICAL",
    start: "17:25 (Today)",
    duration: "2h 30m (Est.)",
    trainImpact: "+8 min (Optimized)",
    resolution: "AI Re-Block in progress",
    status: "Active",
  },
  {
    id: "SOS-NDLS-002",
    type: "OHE Snapping",
    section: "NDLS - GZB Down Main",
    severity: "HIGH",
    start: "17:05 (Today)",
    duration: "1h 40m",
    trainImpact: "+12 min",
    resolution: "TRD crew dispatched",
    status: "Active",
  },
  {
    id: "SOS-PRYJ-089",
    type: "Point Machine Failure",
    section: "Prayagraj West Yard",
    severity: "HIGH",
    start: "Yesterday 14:10",
    duration: "52m",
    trainImpact: "+4 min",
    resolution: "Coordinated S&T window",
    status: "Resolved",
  },
  {
    id: "SOS-DDU-044",
    type: "Track Obstruction",
    section: "DDU Yard Loop 3",
    severity: "MEDIUM",
    start: "Yesterday 09:20",
    duration: "35m",
    trainImpact: "+0 min",
    resolution: "Debris removed; line audited",
    status: "Resolved",
  },
  {
    id: "SOS-GZB-012",
    type: "Signal Lamp Failure",
    section: "GZB Interlocking 14",
    severity: "MEDIUM",
    start: "03 Sep 21:15",
    duration: "28m",
    trainImpact: "+2 min",
    resolution: "Bulb unit swapped",
    status: "Resolved",
  },
  {
    id: "SOS-BSB-007",
    type: "Bridge Sensor Alarm",
    section: "Ganga Bridge Up Line",
    severity: "CRITICAL",
    start: "01 Sep 11:30",
    duration: "3h 10m",
    trainImpact: "+18 min",
    resolution: "Structural survey cleared",
    status: "Resolved",
  },
];

export const SECTIONS_LIST = [
  "New Delhi (NDLS) - Ghaziabad (GZB)",
  "Ghaziabad (GZB) - Kanpur (CNB)",
  "Kanpur (CNB) - Prayagraj (PRYJ)",
  "Prayagraj (PRYJ) - Varanasi (BSB)",
  "CNB Outer – Line 1",
  "CNB Outer – Line 2",
  "NDLS Station Limits",
  "PRYJ Yard & Approaches",
];

export const EMERGENCY_TYPES_LIST = [
  { value: "Track Fracture", group: "Track / Civil" },
  { value: "Rail Weld Failure", group: "Track / Civil" },
  { value: "OHE Snapping", group: "Traction (TRD)" },
  { value: "Power Tripping (TSS)", group: "Traction (TRD)" },
  { value: "Point Machine Failure", group: "Signal & Telecom (S&T)" },
  { value: "Axle Counter Disturbance", group: "Signal & Telecom (S&T)" },
  { value: "Track Circuit Failure", group: "Signal & Telecom (S&T)" },
  { value: "Bridge/Structure Alarm", group: "Engineering" },
  { value: "Obstruction on Track", group: "Operations" },
  { value: "Other Critical Hazard", group: "General" },
];
