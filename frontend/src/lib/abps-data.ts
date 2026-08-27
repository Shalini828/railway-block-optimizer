// IR-ABPS mock data engine: departments, requisitions, corridors, trains, AI optimizer.

export type Dept = "TMS" | "SMMS" | "TDMS";
export type RoleId = "admin" | "control" | "engineering" | "traction";

export type Role = {
  id: RoleId;
  name: string;
  title: string;
  dept: Dept | "COA";
  system: string;
};

export const ROLES: Role[] = [
  {
    id: "admin",
    name: "Senior Officer / DRM Planning",
    title: "ADMIN / SENIOR OFFICER",
    dept: "COA",
    system: "COA + BDMS (Full Authority)",
  },
  {
    id: "control",
    name: "Chief Controller",
    title: "CONTROL OFFICE",
    dept: "COA",
    system: "COA Live Monitoring",
  },
  {
    id: "engineering",
    name: "SSE / P.Way",
    title: "ENGINEERING TEAM",
    dept: "TMS",
    system: "TMS Requisition Portal",
  },
  {
    id: "traction",
    name: "SSE / TRD",
    title: "TRACTION TEAM",
    dept: "TDMS",
    system: "TDMS Isolation & Power",
  },
];

export const DEPT_LABEL: Record<Dept, string> = {
  TMS: "Engineering (TMS)",
  SMMS: "S&T (SMMS)",
  TDMS: "Traction (TDMS)",
};

export type Status =
  | "Pending AI Scheduling"
  | "Clustered / Shadowed"
  | "Approved"
  | "Active"
  | "Completed";

export type Requisition = {
  id: string;
  dept: Dept;
  assetId: string;
  work: string;
  section: string;
  line: string;
  chainage: string;
  blockType: "Traffic Block" | "Power Block" | "Disconnection";
  duration: number; // hours
  crew: number;
  criticality: "High" | "Medium" | "Low";
  daysOverdue: number;
  tsrRisk: boolean;
  status: Status;
  score?: number;
  slot?: { day: number; start: number; end: number }; // day 0..6, hours
  clusterId?: string;
  requestedBy: string;
};

export type Corridor = {
  id: string;
  name: string;
  lines: string[];
  intensity: number; // 0-100
  activeTrains: number;
  openWindow: string;
};

export const CORRIDORS: Corridor[] = [
  {
    id: "NDLS-CNB",
    name: "New Delhi (NDLS) – Kanpur (CNB)",
    lines: ["Up Main", "Down Main", "Line 3 Up"],
    intensity: 87,
    activeTrains: 34,
    openWindow: "11:00 – 14:00",
  },
  {
    id: "CNB-ALD",
    name: "Kanpur (CNB) – Prayagraj (ALD)",
    lines: ["Up Main", "Down Main"],
    intensity: 64,
    activeTrains: 21,
    openWindow: "10:30 – 13:30",
  },
  {
    id: "ALD-DDU",
    name: "Prayagraj (ALD) – Pt. DDU Jn (DDU)",
    lines: ["Up Main", "Down Main", "Freight Loop"],
    intensity: 78,
    activeTrains: 27,
    openWindow: "12:00 – 15:15",
  },
  {
    id: "DDU-BSB",
    name: "Pt. DDU Jn (DDU) – Varanasi (BSB)",
    lines: ["Up Main", "Down Main"],
    intensity: 41,
    activeTrains: 12,
    openWindow: "09:45 – 14:00",
  },
];

export type TrainPath = {
  no: string;
  name: string;
  section: string;
  line: string;
  day: number;
  start: number;
  end: number;
  kind: "Express" | "Premium" | "Freight";
};

export const TRAIN_PATHS: TrainPath[] = [
  { no: "12951", name: "Mumbai Rajdhani", section: "NDLS-CNB", line: "Down Main", day: 0, start: 17, end: 19, kind: "Premium" },
  { no: "22435", name: "Vande Bharat NDLS-BSB", section: "CNB-ALD", line: "Up Main", day: 2, start: 11, end: 12.5, kind: "Premium" },
  { no: "12801", name: "Purushottam Express", section: "ALD-DDU", line: "Down Main", day: 2, start: 14, end: 16, kind: "Express" },
  { no: "GDS-4412", name: "Coal Rake DDU-NDLS", section: "ALD-DDU", line: "Freight Loop", day: 3, start: 13, end: 17, kind: "Freight" },
  { no: "12559", name: "Shiv Ganga Express", section: "DDU-BSB", line: "Up Main", day: 3, start: 6, end: 8, kind: "Express" },
  { no: "GDS-7781", name: "Container Rake CNB", section: "NDLS-CNB", line: "Line 3 Up", day: 4, start: 15, end: 18, kind: "Freight" },
];

export const REQUISITIONS: Requisition[] = [
  {
    id: "REQ-TMS-1041",
    dept: "TMS",
    assetId: "TRK-ENG-982",
    work: "USFD flaw rectification – IMR rail fracture site",
    section: "NDLS-CNB",
    line: "Down Main",
    chainage: "KM 380/02 - 385/06",
    blockType: "Traffic Block",
    duration: 3,
    crew: 24,
    criticality: "High",
    daysOverdue: 11,
    tsrRisk: true,
    status: "Pending AI Scheduling",
    requestedBy: "SSE / P.Way / CNB",
  },
  {
    id: "REQ-TDMS-2210",
    dept: "TDMS",
    assetId: "OHE-MAST-112",
    work: "OHE cantilever adjustment + hot spot repair",
    section: "NDLS-CNB",
    line: "Down Main",
    chainage: "KM 381/04 - 384/00",
    blockType: "Power Block",
    duration: 2,
    crew: 12,
    criticality: "High",
    daysOverdue: 6,
    tsrRisk: false,
    status: "Pending AI Scheduling",
    requestedBy: "SSE / TRD / NDLS",
  },
  {
    id: "REQ-SMMS-3307",
    dept: "SMMS",
    assetId: "SIG-AXLE-401",
    work: "Axle counter + point machine overhaul",
    section: "NDLS-CNB",
    line: "Down Main",
    chainage: "KM 382/00 - 383/02",
    blockType: "Disconnection",
    duration: 2,
    crew: 8,
    criticality: "Medium",
    daysOverdue: 3,
    tsrRisk: false,
    status: "Pending AI Scheduling",
    requestedBy: "SSE / S&T / CNB",
  },
  {
    id: "REQ-TMS-1055",
    dept: "TMS",
    assetId: "TRK-ENG-1147",
    work: "Deep screening & tamping of ballast bed",
    section: "CNB-ALD",
    line: "Up Main",
    chainage: "KM 412/10 - 414/05",
    blockType: "Traffic Block",
    duration: 4,
    crew: 32,
    criticality: "Medium",
    daysOverdue: 14,
    tsrRisk: true,
    status: "Pending AI Scheduling",
    requestedBy: "SSE / P.Way / ALD",
  },
  {
    id: "REQ-SMMS-3355",
    dept: "SMMS",
    assetId: "SIG-RELAY-778",
    work: "Signal relay replacement & interlock testing",
    section: "CNB-ALD",
    line: "Up Main",
    chainage: "KM 413/00 - 413/08",
    blockType: "Disconnection",
    duration: 3,
    crew: 10,
    criticality: "High",
    daysOverdue: 9,
    tsrRisk: false,
    status: "Pending AI Scheduling",
    requestedBy: "SSE / S&T / ALD",
  },
  {
    id: "REQ-TDMS-2278",
    dept: "TDMS",
    assetId: "OHE-ISO-540",
    work: "Power block isolation for OHE wire inspection",
    section: "ALD-DDU",
    line: "Freight Loop",
    chainage: "KM 520/00 - 524/00",
    blockType: "Power Block",
    duration: 3,
    crew: 14,
    criticality: "Medium",
    daysOverdue: 2,
    tsrRisk: false,
    status: "Pending AI Scheduling",
    requestedBy: "SSE / TRD / ALD",
  },
  {
    id: "REQ-TMS-1090",
    dept: "TMS",
    assetId: "TRK-BRG-233",
    work: "Girder bridge bearing inspection",
    section: "ALD-DDU",
    line: "Down Main",
    chainage: "KM 528/04 - 528/09",
    blockType: "Traffic Block",
    duration: 2,
    crew: 18,
    criticality: "Low",
    daysOverdue: 1,
    tsrRisk: false,
    status: "Pending AI Scheduling",
    requestedBy: "SSE / Bridges / ALD",
  },
  {
    id: "REQ-SMMS-3401",
    dept: "SMMS",
    assetId: "SIG-PNT-119",
    work: "Point failure rectification (emergency)",
    section: "DDU-BSB",
    line: "Up Main",
    chainage: "KM 640/02 - 640/06",
    blockType: "Disconnection",
    duration: 1.5,
    crew: 6,
    criticality: "High",
    daysOverdue: 0,
    tsrRisk: true,
    status: "Active",
    slot: { day: 0, start: 11, end: 12.5 },
    requestedBy: "SSE / S&T / BSB",
  },
  {
    id: "REQ-TDMS-2299",
    dept: "TDMS",
    assetId: "OHE-MAST-341",
    work: "OHE mast replacement post-storm",
    section: "DDU-BSB",
    line: "Down Main",
    chainage: "KM 645/00 - 646/02",
    blockType: "Power Block",
    duration: 3,
    crew: 16,
    criticality: "High",
    daysOverdue: 4,
    tsrRisk: true,
    status: "Completed",
    slot: { day: 6, start: 10, end: 13 },
    requestedBy: "SSE / TRD / BSB",
  },
];

export type RiskItem = {
  id: string;
  kind: string;
  asset: string;
  section: string;
  severity: "Critical" | "High" | "Elevated";
  detail: string;
};

export const RISK_RADAR: RiskItem[] = [
  {
    id: "RSK-01",
    kind: "IMR Track Fracture",
    asset: "TRK-ENG-982",
    section: "NDLS-CNB Down Main",
    severity: "Critical",
    detail: "USFD Class IMR flaw. TSR 30 kmph imposed if block deferred >48h.",
  },
  {
    id: "RSK-02",
    kind: "Point Machine Failure",
    asset: "SIG-PNT-119",
    section: "DDU-BSB Up Main",
    severity: "High",
    detail: "Repeated non-setting of points; 3 detentions logged in 24h.",
  },
  {
    id: "RSK-03",
    kind: "OHE Hot Spot",
    asset: "OHE-MAST-112",
    section: "NDLS-CNB Down Main",
    severity: "High",
    detail: "Thermovision flagged 118°C at dropper. Risk of wire snap.",
  },
  {
    id: "RSK-04",
    kind: "Ballast Deterioration",
    asset: "TRK-ENG-1147",
    section: "CNB-ALD Up Main",
    severity: "Elevated",
    detail: "TRC run shows unevenness beyond 7mm limit over 1.9 km.",
  },
];

export type Conflict = {
  id: string;
  reqIds: string[];
  message: string;
  suggestion: string;
  shiftMins: number;
  before: string;
  after: string;
  resolved: boolean;
};

export type AiPlanItem = {
  clusterId: string;
  section: string;
  line: string;
  depts: Dept[];
  reqIds: string[];
  day: number;
  start: number;
  end: number;
  savedMinutes: number;
  explanation: string;
  expectedDelay: number;
};

export function criticalityScore(r: Requisition): number {
  const crit = r.criticality === "High" ? 40 : r.criticality === "Medium" ? 25 : 12;
  const overdue = Math.min(r.daysOverdue * 2.2, 30);
  const tsr = r.tsrRisk ? 18 : 0;
  const hazard = r.blockType === "Power Block" ? 8 : r.blockType === "Traffic Block" ? 10 : 6;
  return Math.round(Math.min(crit + overdue + tsr + hazard, 100));
}

function corridorWindow(section: string): { day: number; start: number } {
  const c = CORRIDORS.find((x) => x.id === section);
  const base = c ? parseFloat(c.openWindow.slice(0, 2)) : 11;
  const day = CORRIDORS.findIndex((x) => x.id === section) + 1;
  return { day: Math.max(0, day), start: base };
}

function clashesWithTrain(section: string, line: string, day: number, start: number, end: number) {
  return TRAIN_PATHS.find(
    (t) =>
      t.section === section &&
      t.line === line &&
      t.day === day &&
      start < t.end &&
      end > t.start,
  );
}

export function runOptimizer(reqs: Requisition[]): {
  plan: AiPlanItem[];
  conflicts: Conflict[];
  updated: Requisition[];
} {
  const pending = reqs.filter((r) => r.status === "Pending AI Scheduling");
  const scored = pending
    .map((r) => ({ ...r, score: criticalityScore(r) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const groups = new Map<string, Requisition[]>();
  for (const r of scored) {
    const key = `${r.section}::${r.line}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const plan: AiPlanItem[] = [];
  const conflicts: Conflict[] = [];
  const updated = [...reqs];
  let idx = 0;

  for (const [key, items] of groups) {
    idx += 1;
    const head = items[0];
    if (!head) continue;
    const clusterId = `MB-${String(idx).padStart(2, "0")}`;
    const section = key.split("::")[0] ?? "";
    const line = key.split("::")[1] ?? "";
    const win = corridorWindow(section);
    const maxDur = Math.max(...items.map((i) => i.duration));
    const sumDur = items.reduce((s, i) => s + i.duration, 0);
    let start = win.start;
    let end = start + maxDur;
    const day = win.day % 7;

    const clash = clashesWithTrain(section, line, day, start, end);
    if (clash) {
      const shifted = clash.end;
      conflicts.push({
        id: `CFL-${clusterId}`,
        reqIds: items.map((i) => i.id),
        message: `${DEPT_LABEL[head.dept]} block on ${section} ${line} overlaps ${clash.kind === "Freight" ? "high-density freight path" : "scheduled express path"} ${clash.no} (${clash.name}) at ${fmt(clash.start)}.`,
        suggestion: `Auto-shift by +${Math.round((shifted - start) * 60)} mins to next train gap window`,
        shiftMins: Math.round((shifted - start) * 60),
        before: `${fmt(start)} – ${fmt(end)} (conflicts with ${clash.no})`,
        after: `${fmt(shifted)} – ${fmt(shifted + maxDur)} (clear corridor)`,
        resolved: false,
      });
      start = shifted;
      end = start + maxDur;
    }

    const savedMinutes = items.length > 1 ? Math.round((sumDur - maxDur) * 60) : 0;
    const depts = Array.from(new Set(items.map((i) => i.dept)));
    plan.push({
      clusterId,
      section,
      line,
      depts,
      reqIds: items.map((i) => i.id),
      day,
      start,
      end,
      savedMinutes,
      expectedDelay: Math.max(0, Math.round(maxDur * 4 - (clash ? 0 : 6))),
      explanation:
        items.length > 1
          ? `Merged ${depts.map((d) => DEPT_LABEL[d]).join(" + ")} works into a single Mega Block on ${line} (${head.chainage.split(" - ")[0]} onwards); saved ${savedMinutes} minutes of operational track downtime and ${items.length - 1} redundant shutdown(s).`
          : `Scheduled standalone ${DEPT_LABEL[head.dept]} block in the ${section} slack window; no passenger path cancelled.`,
    });

    for (const it of items) {
      const i = updated.findIndex((u) => u.id === it.id);
      const cur = updated[i];
      if (!cur) continue;
      updated[i] = {
        ...cur,
        score: it.score ?? criticalityScore(cur),
        clusterId,
        slot: { day, start, end },
        status: items.length > 1 ? "Clustered / Shadowed" : "Approved",
      };
    }
  }

  return { plan, conflicts, updated };
}

export function fmt(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const UPTIME_SERIES = [
  { week: "W-05", track: 94.2, signal: 96.1, ohe: 95.0 },
  { week: "W-04", track: 95.1, signal: 96.6, ohe: 95.4 },
  { week: "W-03", track: 95.8, signal: 97.0, ohe: 96.2 },
  { week: "W-02", track: 96.6, signal: 97.4, ohe: 96.9 },
  { week: "W-01", track: 97.4, signal: 98.0, ohe: 97.6 },
  { week: "Now", track: 98.1, signal: 98.6, ohe: 98.2 },
];

export const BLOCK_MIX = [
  { month: "Apr", single: 42, coordinated: 8 },
  { month: "May", single: 38, coordinated: 14 },
  { month: "Jun", single: 31, coordinated: 21 },
  { month: "Jul", single: 24, coordinated: 29 },
  { month: "Aug", single: 18, coordinated: 36 },
];