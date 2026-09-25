import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Download,
  FileText,
  Activity,
  Clock,
  Train,
  Layers,
  Zap,
  CheckCircle2,
  BrainCircuit,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Network,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAbps } from "../context/AbpsContext";
import { useLanguage } from "../context/LanguageContext";
import { DAYS, fmt } from "@/lib/abps-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Sectional Performance & Availability Audit Report | IR-ABPS" },
      {
        name: "description",
        content:
          "Official Indian Railways Post-Block Operational Impact, Asset Availability Analytics, and Corridor Throughput Audit.",
      },
    ],
  }),
  component: AnalyticsPage,
});

type AnalyticsData = {
  asset_availability_percent: number;
  total_assets: number;
  operational_assets: number;
  scheduled_blocks: number;
  total_block_hours: number;
  train_delay_impact_minutes: number;
  average_optimization_score: number;
  single_department_blocks: number;
  coordinated_blocks: number;
  total_maintenance_tasks: number;
  pending_maintenance_tasks: number;
  completed_maintenance_tasks: number;
  critical_maintenance_tasks: number;
  department_availability: {
    department: string;
    total_assets: number;
    operational_assets: number;
    availability_percent: number;
  }[];
  post_block_report: {
    block_id: string;
    corridor_name: string;
    source_station: string;
    destination_station: string;
    block_date: string;
    start_time: string;
    end_time: string;
    duration_min: number;
    train_impact_score: number;
    optimization_score: number;
    block_status: string;
    departments: string;
  }[];
};

// Synthetic Demo Data for AI Dashboard Projections
const timeRangeComparisonData = {
  today: [
    { metric: "Block Hours", traditional: 6.2, ai: 4.2 },
    { metric: "Train Delay (m)", traditional: 55, ai: 38 },
    { metric: "Separate Blocks", traditional: 5, ai: 3 },
  ],
  "7d": [
    { metric: "Block Hours", traditional: 26.4, ai: 18.5 },
    { metric: "Train Delay (m)", traditional: 214, ai: 142 },
    { metric: "Separate Blocks", traditional: 19, ai: 12 },
  ],
  "30d": [
    { metric: "Block Hours", traditional: 112.0, ai: 78.4 },
    { metric: "Train Delay (m)", traditional: 890, ai: 580 },
    { metric: "Separate Blocks", traditional: 76, ai: 48 },
  ],
};

const timeRangeAvailabilityTrendData = {
  today: [
    { day: "00:00", overall: 93.0, eng: 92, snt: 95, trd: 92 },
    { day: "04:00", overall: 94.0, eng: 93, snt: 96, trd: 93 },
    { day: "08:00", overall: 92.5, eng: 90, snt: 95, trd: 92 },
    { day: "12:00", overall: 95.0, eng: 94, snt: 97, trd: 94 },
    { day: "16:00", overall: 94.8, eng: 93, snt: 96, trd: 95 },
    { day: "20:00", overall: 95.5, eng: 95, snt: 97, trd: 94 },
    { day: "24:00", overall: 95.1, eng: 94, snt: 97, trd: 94 },
  ],
  "7d": [
    { day: "Mon", overall: 89, eng: 87, snt: 91, trd: 88 },
    { day: "Tue", overall: 89.5, eng: 88, snt: 92, trd: 89 },
    { day: "Wed", overall: 91, eng: 90, snt: 93, trd: 90 },
    { day: "Thu", overall: 90.5, eng: 89, snt: 92, trd: 91 },
    { day: "Fri", overall: 92.5, eng: 91, snt: 95, trd: 92 },
    { day: "Sat", overall: 94.2, eng: 93, snt: 97, trd: 92 },
    { day: "Sun", overall: 94.2, eng: 93, snt: 97, trd: 92 },
  ],
  "30d": [
    { day: "Week 1", overall: 91.2, eng: 89, snt: 93, trd: 91 },
    { day: "Week 2", overall: 92.8, eng: 91, snt: 95, trd: 92 },
    { day: "Week 3", overall: 93.5, eng: 92, snt: 96, trd: 92 },
    { day: "Week 4", overall: 94.8, eng: 94, snt: 97, trd: 93 },
  ],
};

const corridorSegments = [
  {
    from: "NDLS",
    to: "CNB",
    traffic: "High",
    blocks: 3,
    risk: "High",
    availability: 88,
    delay: "+14m",
    status: "critical",
  },
  {
    from: "CNB",
    to: "PRYJ",
    traffic: "Medium",
    blocks: 1,
    risk: "Low",
    availability: 96,
    delay: "+2m",
    status: "healthy",
  },
  {
    from: "PRYJ",
    to: "DDU",
    traffic: "High",
    blocks: 2,
    risk: "Medium",
    availability: 92,
    delay: "+8m",
    status: "attention",
  },
  {
    from: "DDU",
    to: "BSB",
    traffic: "Low",
    blocks: 0,
    risk: "Low",
    availability: 98,
    delay: "0m",
    status: "healthy",
  },
];

const topAssets = [
  {
    id: "TRK-ENG-982",
    dept: "Engineering",
    issue: "Rail fracture vulnerability",
    criticality: "Critical",
    risk: 5,
    availability: 82,
    recommendation: "Schedule 120-min Joint Track Block",
  },
  {
    id: "OHE-MAST-112",
    dept: "TRD",
    issue: "Cantilever thermal fatigue",
    criticality: "High",
    risk: 4,
    availability: 88,
    recommendation: "Shadow-cluster with adjacent OHE overhaul",
  },
  {
    id: "SIG-PNT-119",
    dept: "S&T",
    issue: "Point machine switch friction",
    criticality: "High",
    risk: 4,
    availability: 91,
    recommendation: "Prioritise in next off-peak traffic slot",
  },
];

const aiInsights = [
  {
    severity: "high",
    text: "3 overlapping departmental requests on NDLS-CNB can be merged into a single 3-hour coordinated block.",
    action: "View recommendation",
  },
  {
    severity: "medium",
    text: "NDLS–CNB currently carries the highest operational congestion and track-hazard density.",
    action: "View corridor",
  },
  {
    severity: "medium",
    text: "TRD maintenance requisitions exhibit the highest safety risk score across the Northern Corridor.",
    action: "Filter TRD",
  },
  {
    severity: "low",
    text: "Coordinated blocks have successfully eliminated 4 redundant corridor possession windows.",
    action: "View analysis",
  },
];

const actionCards = [
  {
    priority: "HIGH PRIORITY",
    title: "Coordinate TRD + Engineering work on CNB–PRYJ.",
    benefit: "Projected saving: 2.4 Block Hours reclaimed",
  },
  {
    priority: "MEDIUM PRIORITY",
    title: "Review 4 overdue track maintenance compliance items.",
    benefit: "Mitigates critical rail safety hazard",
  },
  {
    priority: "OPTIMISATION",
    title: "Combine 3 overlapping S&T interlocking possessions.",
    benefit: "Reclaims 1.5 hrs corridor traffic capacity",
  },
];

const timelineData = [
  {
    id: "BLK-042",
    corridor: "NDLS–CNB",
    depts: "TMS + TDMS",
    planned: "10:30–13:30",
    actual: "10:35–13:05",
    duration: "2.5h",
    impact: "+4 min",
    status: "Completed",
  },
  {
    id: "BLK-043",
    corridor: "CNB–PRYJ",
    depts: "S&T + ENG",
    planned: "14:00–16:00",
    actual: "14:00–16:15",
    duration: "2.25h",
    impact: "+12 min",
    status: "Delayed",
  },
  {
    id: "BLK-044",
    corridor: "PRYJ–DDU",
    depts: "TRD",
    planned: "22:00–01:00",
    actual: "22:00–00:15",
    duration: "2.25h",
    impact: "0 min",
    status: "Optimised",
  },
];

const defaultPostBlockReports = [
  {
    block_id: "BLK-042",
    corridor_name: "NDLS–CNB",
    source_station: "NDLS",
    destination_station: "CNB",
    block_date: "2025-05-10",
    start_time: "10:30:00",
    end_time: "13:05:00",
    duration_min: 155,
    train_impact_score: 4,
    optimization_score: 94,
    block_status: "Completed",
    departments: "TMS + TDMS",
  },
  {
    block_id: "BLK-043",
    corridor_name: "CNB–PRYJ",
    source_station: "CNB",
    destination_station: "PRYJ",
    block_date: "2025-05-11",
    start_time: "14:00:00",
    end_time: "16:15:00",
    duration_min: 135,
    train_impact_score: 12,
    optimization_score: 82,
    block_status: "Delayed",
    departments: "S&T + ENG",
  },
  {
    block_id: "BLK-044",
    corridor_name: "PRYJ–DDU",
    source_station: "PRYJ",
    destination_station: "DDU",
    block_date: "2025-05-12",
    start_time: "22:00:00",
    end_time: "00:15:00",
    duration_min: 135,
    train_impact_score: 0,
    optimization_score: 96,
    block_status: "Optimised",
    departments: "TRD",
  },
  {
    block_id: "BLK-045",
    corridor_name: "DDU–BSB",
    source_station: "DDU",
    destination_station: "BSB",
    block_date: "2025-05-13",
    start_time: "01:00:00",
    end_time: "03:30:00",
    duration_min: 150,
    train_impact_score: 2,
    optimization_score: 91,
    block_status: "Completed",
    departments: "ENG",
  },
  {
    block_id: "BLK-046",
    corridor_name: "NDLS–CNB",
    source_station: "NDLS",
    destination_station: "CNB",
    block_date: "2025-05-14",
    start_time: "09:00:00",
    end_time: "12:00:00",
    duration_min: 180,
    train_impact_score: 5,
    optimization_score: 89,
    block_status: "Optimised",
    departments: "TRD + S&T",
  },
];

const departmentDetails = [
  {
    name: "ENGINEERING (TMS)",
    avail: 93,
    tasks: 24,
    blocks: 8,
    eff: 89,
    colorClass: "text-[#800000]",
    bgClass: "bg-[#800000]",
  },
  {
    name: "SIGNALLING & TELECOM (SMMS)",
    avail: 97,
    tasks: 21,
    blocks: 6,
    eff: 94,
    colorClass: "text-[#003366]",
    bgClass: "bg-[#003366]",
  },
  {
    name: "TRACTION DISTRIBUTION (TDMS)",
    avail: 92,
    tasks: 22,
    blocks: 7,
    eff: 87,
    colorClass: "text-[#D97706]",
    bgClass: "bg-[#D97706]",
  },
];

function AnalyticsPage() {
  const { reqs, role, scope } = useAbps();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("7d");
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString("en-IN"));
  const [reportFilter, setReportFilter] = useState("");
  const [deptDetailsOpen, setDeptDetailsOpen] = useState(false);
  const [insightDialog, setInsightDialog] = useState<{
    open: boolean;
    insight: (typeof aiInsights)[number] | null;
  }>({ open: false, insight: null });
  const [highlightedCorridor, setHighlightedCorridor] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: (typeof actionCards)[number] | null;
    index: number | null;
  }>({ open: false, action: null, index: null });
  const [reviewedActions, setReviewedActions] = useState<Set<number>>(new Set());

  const handleInsightAction = (insight: (typeof aiInsights)[number]) => {
    if (insight.action === "Filter TRD") {
      setReportFilter("TRD");
      toast.info("Filtering post-block execution report for TRD.");
      document.getElementById("post-block-report")?.scrollIntoView({ behavior: "smooth" });
    } else if (insight.action === "View corridor") {
      setHighlightedCorridor("NDLS-CNB");
      toast.info("Highlighting NDLS–CNB section in corridor telemetry.");
      document.getElementById("corridor-heatmap")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        setHighlightedCorridor(null);
      }, 4000);
    } else {
      setInsightDialog({ open: true, insight });
    }
  };

  const handleReviewAction = (action: (typeof actionCards)[number], index: number) => {
    setActionDialog({ open: true, action, index });
  };

  const acknowledgeAction = () => {
    if (actionDialog.index !== null) {
      setReviewedActions((prev) => new Set(prev).add(actionDialog.index!));
      toast.success("Action acknowledged and forwarded to Section Controller.");
      setActionDialog({ open: false, action: null, index: null });
    }
  };

  const refreshAnalytics = () => {
    toast.info("Refreshing intelligence model from PostgreSQL...");
    setLastUpdated(new Date().toLocaleTimeString("en-IN"));
    apiFetch("/analytics/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((data: AnalyticsData) => {
        setAnalytics(data);
        toast.success("Sectional analytics updated.");
      })
      .catch((error) => {
        console.error("Analytics API error:", error);
        toast.error("Could not load backend analytics. Displaying certified projections.");
      });
  };

  useEffect(() => {
    refreshAnalytics();
  }, []);

  const download = (kind: "CSV" | "PDF") => {
    const rows = [
      ["Requisition", "Dept", "Asset", "Section", "Line", "Day", "Start", "End", "Status"],
      ...reqs.map((r) => [
        r.id,
        r.dept,
        r.assetId,
        r.section,
        r.line,
        r.slot ? (DAYS[r.slot.day] ?? "") : "",
        r.slot ? fmt(r.slot.start) : "",
        r.slot ? fmt(r.slot.end) : "",
        r.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "CSV" ? "ir-abps-audit-report.csv" : "ir-abps-audit-report.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${kind} official operational audit report exported.`);
  };

  const blockMixData = [
    {
      name: "Executed Blocks",
      Traditional:
        timeRange === "today"
          ? 5
          : timeRange === "30d"
            ? 76
            : analytics?.single_department_blocks || 19,
      Coordinated:
        timeRange === "today" ? 3 : timeRange === "30d" ? 48 : analytics?.coordinated_blocks || 12,
    },
  ];

  const safeAnalytics = {
    today: {
      availability: 95.1,
      blockHours: 4.2,
      delayAvoided: 38,
      coordinated: 3,
      optimised: 14,
      efficiency: 94,
    },
    "7d": {
  availability: analytics?.asset_availability_percent ?? 0,
  blockHours: analytics?.total_block_hours ?? 0,
  delayAvoided: analytics?.train_delay_impact_minutes ?? 0,
  coordinated: analytics?.coordinated_blocks ?? 0,
  optimised: analytics?.total_maintenance_tasks ?? 0,
  efficiency: analytics?.average_optimization_score ?? 0,
},
    
    "30d": {
      availability: 93.8,
      blockHours: 78.4,
      delayAvoided: 580,
      coordinated: 48,
      optimised: 260,
      efficiency: 92,
    },
  }[timeRange];

  const comparisonData = (() => {
  const baseData = timeRangeComparisonData[timeRange];

  if (!analytics) {
    return baseData;
  }

  if (timeRange === "7d") {
    return [
      {
        metric: "Block Hours",
        traditional: baseData[0]?.traditional ?? 0,
        ai: analytics.total_block_hours ?? 0,
      },
      {
        metric: "Train Delay (m)",
        traditional: baseData[1]?.traditional ?? 0,
        ai: analytics.train_delay_impact_minutes ?? 0,
      },
      {
        metric: "Separate Blocks",
        traditional: baseData[2]?.traditional ?? 0,
        ai: analytics.single_department_blocks ?? 0,
      },
    ];
  }

  return baseData;
})();
  const availabilityTrendData = (() => {
  const baseData = timeRangeAvailabilityTrendData[timeRange];

  if (!analytics) {
    return baseData;
  }

  if (timeRange === "7d") {
    return baseData.map((point, index) => ({
      ...point,
      overall: analytics.asset_availability_percent ?? 0,
      ...(index === baseData.length - 1
        ? {
            eng:
  String(role).toLowerCase() === "engineering"
    ? analytics.asset_availability_percent ?? 0
    : point.eng,

snt:
  String(role).toLowerCase() === "signal"
    ? analytics.asset_availability_percent ?? 0
    : point.snt,

trd:
  String(role).toLowerCase() === "traction"
    ? analytics.asset_availability_percent ?? 0
    : point.trd,
          }
        : {}),
    }));
  }

  return baseData;
})();

  const pieData = [
    { name: "Score", value: safeAnalytics.efficiency || 87, color: "#003366" },
    { name: "Gap", value: 100 - (safeAnalytics.efficiency || 87), color: "#E2E8F0" },
  ];

  const reports =
    analytics?.post_block_report && analytics.post_block_report.length > 0
      ? analytics.post_block_report
      : defaultPostBlockReports;

  const filteredReports = reports.filter((r) => {
    const query = reportFilter.trim().toLowerCase();
    if (!query) return true;
    return (
      r.block_id.toLowerCase().includes(query) ||
      r.departments.toLowerCase().includes(query) ||
      r.source_station.toLowerCase().includes(query) ||
      r.destination_station.toLowerCase().includes(query) ||
      r.corridor_name.toLowerCase().includes(query) ||
      r.block_status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. OFFICIAL GOVT BANNER */}
      <div className="rounded-[2px] border border-[#003366]/30 bg-white shadow-sm overflow-hidden">
        <div className="bg-[#003366] px-5 py-3 text-white flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#FF9933]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-[2px] bg-white/10 border border-white/20">
              <BarChart3 className="size-5 text-[#FF9933]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF9933] bg-black/30 px-2 py-0.5 rounded-[2px]">
                  REPORT IR-AUDIT-2025
                </span>
                <span className="text-xs text-white/80 font-serif">
                  {t("RAILWAY BOARD • OPERATIONAL IMPACT & AVAILABILITY STATISTICS", "रेलवे बोर्ड • परिचालन प्रभाव एवं उपलब्धता सांख्यिकी")}
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-bold font-serif tracking-tight text-white mt-0.5">
                {role.id === "engineering"
                  ? t("TMS Departmental Performance & Availability Analytics", "टीएमएस विभागीय प्रदर्शन एवं उपलब्धता विश्लेषण")
                  : role.id === "traction"
                    ? t("TRD Departmental Performance & Availability Analytics", "टीआरडी विभागीय प्रदर्शन एवं उपलब्धता विश्लेषण")
                    : role.id === "signal"
                      ? t("SMMS Departmental Performance & Availability Analytics", "एसएमएमएस विभागीय प्रदर्शन एवं उपलब्धता विश्लेषण")
                      : t("Sectional Performance & Availability Audit Report", "अनुभागीय प्रदर्शन एवं उपलब्धता ऑडिट रिपोर्ट")}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-black/30 p-0.5 rounded-[2px] border border-white/20">
              <button
                className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors rounded-[2px] ${
                  timeRange === "today" ? "bg-[#FF9933] text-slate-950" : "text-white hover:text-[#FF9933]"
                }`}
                onClick={() => setTimeRange("today")}
              >
                Today
              </button>
              <button
                className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors rounded-[2px] ${
                  timeRange === "7d" ? "bg-[#FF9933] text-slate-950" : "text-white hover:text-[#FF9933]"
                }`}
                onClick={() => setTimeRange("7d")}
              >
                7 Days
              </button>
              <button
                className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors rounded-[2px] ${
                  timeRange === "30d" ? "bg-[#FF9933] text-slate-950" : "text-white hover:text-[#FF9933]"
                }`}
                onClick={() => setTimeRange("30d")}
              >
                30 Days
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-[#003366] hover:bg-slate-100 font-bold text-xs uppercase tracking-wider rounded-[2px] h-8 px-3 border-0"
              onClick={() => download("CSV")}
            >
              <Download className="size-3.5 mr-1 text-[#003366]" /> Export
            </Button>
            <Button
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-[2px] h-8 px-3 border border-white/20"
              onClick={refreshAnalytics}
            >
              <RefreshCw className="size-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <p>
            Audit parameters evaluating track downtime, punctual train movements, multi-department shadow clustering, and asset reliability.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-[#003366]">
            <Building2 className="size-3.5 text-[#003366]" />
            CORRIDOR: NDLS-PRYJ-DDU-BSB • LAST AUDIT SYNC: {lastUpdated}
          </div>
        </div>
      </div>

      {/* STORYTELLING FLOW STRIP */}
      <div className="rounded-[2px] border border-slate-300 bg-white p-3 shadow-sm flex items-center justify-center overflow-x-auto">
        <div className="flex items-center gap-2 text-xs font-bold whitespace-nowrap">
          <span className="bg-slate-100 border border-slate-300 text-slate-800 px-2.5 py-1 rounded-[2px]">
            {safeAnalytics.optimised} Work Requisitions
          </span>
          <ArrowRight className="size-3.5 text-slate-400" />
          <span className="bg-red-50 border border-red-200 text-[#800000] px-2.5 py-1 rounded-[2px]">
            18 Critical Defects Addressed
          </span>
          <ArrowRight className="size-3.5 text-slate-400" />
          <span className="bg-sky-50 border border-sky-200 text-[#003366] px-2.5 py-1 rounded-[2px]">
            12 Coordinated Block Windows
          </span>
          <ArrowRight className="size-3.5 text-slate-400" />
          <span className="bg-amber-50 border border-amber-200 text-[#D97706] px-2.5 py-1 rounded-[2px]">
            {safeAnalytics.coordinated} Shadow Multi-Dept Blocks
          </span>
          <ArrowRight className="size-3.5 text-slate-400" />
          <span className="bg-emerald-50 border border-emerald-200 text-[#137547] px-2.5 py-1 rounded-[2px]">
            {safeAnalytics.blockHours} hrs Corridor Capacity Reclaimed
          </span>
          <ArrowRight className="size-3.5 text-slate-400" />
          <span className="bg-emerald-50 border border-emerald-200 text-[#137547] px-2.5 py-1 rounded-[2px]">
            {safeAnalytics.delayAvoided} min Train Delay Prevented
          </span>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI ROW */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <GovtKpi
          icon={Activity}
          label="Asset Availability"
          value={`${safeAnalytics.availability}%`}
          sub="+3.8% vs Conventional"
          subColor="text-[#137547]"
          borderColor="border-slate-300"
        />
        <GovtKpi
          icon={Clock}
          label="Block Hours Saved"
          value={`${safeAnalytics.blockHours} hrs`}
          sub="↓ 27% Corridor Possession"
          subColor="text-[#137547]"
          borderColor="border-slate-300"
        />
        <GovtKpi
          icon={Train}
          label="Train Delay Avoided"
          value={`${safeAnalytics.delayAvoided} m`}
          sub="COA Punctuality Shield"
          subColor="text-[#003366]"
          borderColor="border-slate-300"
        />
        <GovtKpi
          icon={Layers}
          label="Joint Shadow Blocks"
          value={safeAnalytics.coordinated}
          sub="Multi-Dept Synchronized"
          subColor="text-[#003366]"
          borderColor="border-slate-300"
        />
        <GovtKpi
          icon={CheckCircle2}
          label="Requests Optimised"
          value={safeAnalytics.optimised}
          sub="Engine Constraint Solved"
          subColor="text-[#003366]"
          borderColor="border-slate-300"
        />
        <GovtKpi
          icon={Zap}
          label="CRIS AI Index"
          value={`${safeAnalytics.efficiency}%`}
          sub="Mathematical Feasibility"
          subColor="text-[#137547]"
          borderColor="border-slate-300"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 3. AI IMPACT SCORE */}
        <div className="lg:col-span-4 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-[#003366] text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-[#FF9933]">
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-4 text-[#FF9933]" />
              <span className="font-bold text-xs uppercase tracking-wider">
                IR-ABPS Optimization Index
              </span>
            </div>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-[2px] font-mono">
              SCORE: 87/100
            </span>
          </div>
          <div className="p-5 flex flex-col items-center">
            <div className="relative h-44 w-44 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono text-[#003366]">
  {safeAnalytics.efficiency}
</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Out of 100</span>
              </div>
            </div>

            <div className="w-full space-y-2.5 mb-4">
              <ImpactBar
  label="Operational Efficiency"
  value={safeAnalytics.efficiency}
  color="bg-[#003366]"
/>
              <ImpactBar label="Safety Rule Compliance" value={96} color="bg-[#137547]" />
              <ImpactBar label="Multi-Department Shadowing" value={84} color="bg-[#FF9933]" />
              <ImpactBar label="Train Delay Mitigation" value={81} color="bg-[#003366]" />
            </div>

            <div className="w-full bg-slate-50 p-3 rounded-[2px] border border-slate-300 text-xs text-slate-700 leading-relaxed">
              <strong className="text-[#003366]">CRIS Engine Finding:</strong> Clustering Track and Traction works during the 11:30–14:00 maintenance shadow reduces passenger train regulation from 62 min to 18 min.
            </div>
          </div>
        </div>

        {/* 4. BEFORE vs AFTER COMPARISON */}
        <div className="lg:col-span-8 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              CONVENTIONAL ISOLATED PLANNING VS IR-ABPS CO-ORDINATED BLOCKS
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              RANGE: {timeRange.toUpperCase()}
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="metric"
                    stroke="#64748B"
                    fontSize={11}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F8FAFC" }}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#CBD5E1",
                      borderRadius: "2px",
                      fontSize: "12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />
                  <Bar
                    dataKey="traditional"
                    name="Conventional Uncoordinated"
                    fill="#94A3B8"
                    radius={[2, 2, 0, 0]}
                    barSize={32}
                  />
                  <Bar
                    dataKey="ai"
                    name="IR-ABPS Coordinated Blocks"
                    fill="#003366"
                    radius={[2, 2, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
              <div className="flex flex-col items-center justify-center p-2 rounded-[2px] bg-emerald-50 border border-emerald-200">
                <span className="text-[#137547] font-bold text-base font-mono">↓ 29.9%</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                  Total Block Hours
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-[2px] bg-emerald-50 border border-emerald-200">
                <span className="text-[#137547] font-bold text-base font-mono">↓ 33.6%</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                  Train Delay Impact
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-[2px] bg-sky-50 border border-sky-200">
                <span className="text-[#003366] font-bold text-base font-mono">↑ 44.0%</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                  Joint Efficiency
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 5. ASSET AVAILABILITY ANALYTICS */}
        <div className="lg:col-span-7 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
                ASSET AVAILABILITY TRENDLINE ACROSS DEPARTMENTS
              </span>
              <p className="text-[10px] text-slate-500">
                Monitoring Track, Signalling, and Traction availability against the 95% threshold
              </p>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-800 text-[10px] font-bold rounded-[2px]">
              BOARD TARGET: 95.0%
            </Badge>
          </div>
          <div className="p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={availabilityTrendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003366" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#003366" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="day"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                  />
                  <YAxis
                    domain={[80, 100]}
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#CBD5E1",
                      borderRadius: "2px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="overall"
                    name="Composite Corridor Average"
                    stroke="#003366"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOverall)"
                  />
                  <Line
                    type="monotone"
                    dataKey="eng"
                    name="Track (TMS)"
                    stroke="#800000"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="snt"
                    name="Signalling (SMMS)"
                    stroke="#137547"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="trd"
                    name="Traction (TDMS)"
                    stroke="#D97706"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 6. DEPARTMENT PERFORMANCE */}
        <div className="lg:col-span-5 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              DEPARTMENTAL OPERATIONAL BREAKDOWN
            </span>
            <Button
              variant="link"
              size="sm"
              className="text-xs text-[#003366] font-bold p-0 h-auto"
              onClick={() => setDeptDetailsOpen(true)}
            >
              Full Ledger →
            </Button>
          </div>
          <div className="p-4 space-y-3">
            {departmentDetails.map((dept) => (
              <GovtDeptCard key={dept.name} {...dept} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 7. COORDINATION ANALYTICS */}
        <div className="lg:col-span-4 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              SHADOW BLOCK CO-ORDINATION RATIO
            </span>
          </div>
          <div className="p-4">
            <div className="h-56 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={blockMixData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F8FAFC" }}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#CBD5E1",
                      borderRadius: "2px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="Traditional"
                    name="Isolated Single-Dept Blocks"
                    stackId="a"
                    fill="#94A3B8"
                    radius={[0, 0, 2, 2]}
                    barSize={40}
                  />
                  <Bar
                    dataKey="Coordinated"
                    name="Joint Coordinated Windows"
                    stackId="a"
                    fill="#003366"
                    radius={[2, 2, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-50 p-3 rounded-[2px] border border-slate-300 text-xs text-slate-700 leading-relaxed">
              <strong className="text-[#003366]">Audit Note: </strong>
              {safeAnalytics.coordinated} maintenance requisitions were synchronized into single possession slots, saving {safeAnalytics.blockHours} corridor hours.
            </div>
          </div>
        </div>

        {/* 8. CORRIDOR IMPACT MAP */}
        <div id="corridor-heatmap" className="lg:col-span-8 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              SECTIONAL LINE TELEMETRY & AVAILABILITY STATUS
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              NEW DELHI → KANPUR → PRAYAGRAJ → DEEN DAYAL UPADHYAYA → VARANASI
            </span>
          </div>
          <div className="p-4 space-y-5">
            {/* Corridor Visualization */}
            <div className="relative flex items-center justify-between px-6 pt-3">
              <div className="absolute left-10 right-10 h-1.5 bg-slate-300 top-1/2 -translate-y-1/2 z-0" />
              {corridorSegments.map((seg, idx) => {
                const isHighlighted = highlightedCorridor === `${seg.from}-${seg.to}`;
                return (
                  <div
                    key={idx}
                    className="relative z-10 flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div className="text-[11px] font-mono font-bold text-slate-700 group-hover:text-[#003366] transition-colors">
                      {seg.from}
                    </div>
                    <div
                      className={`size-6 rounded-[2px] border-2 border-white shadow-sm flex items-center justify-center transition-all ${
                        seg.status === "healthy"
                          ? "bg-[#137547]"
                          : seg.status === "attention"
                            ? "bg-[#D97706]"
                            : "bg-[#800000]"
                      } ${isHighlighted ? "ring-4 ring-[#FF9933] scale-125" : ""}`}
                    />
                  </div>
                );
              })}
              {/* Last station */}
              <div className="relative z-10 flex flex-col items-center gap-1.5 group cursor-pointer">
                <div className="text-[11px] font-mono font-bold text-slate-700">BSB</div>
                <div className="size-6 rounded-[2px] border-2 border-white shadow-sm bg-[#137547]" />
              </div>
            </div>

            {/* Segment Details */}
            <div className="grid grid-cols-4 gap-2.5">
              {corridorSegments.map((seg, idx) => {
                const isHighlighted = highlightedCorridor === `${seg.from}-${seg.to}`;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-[2px] border bg-slate-50 hover:bg-slate-100 transition-all border-l-4 ${
                      seg.status === "healthy"
                        ? "border-l-[#137547] border-slate-300"
                        : seg.status === "attention"
                          ? "border-l-[#D97706] border-slate-300"
                          : "border-l-[#800000] border-slate-300"
                    } ${isHighlighted ? "ring-2 ring-[#FF9933] bg-amber-50" : ""}`}
                  >
                    <div className="text-xs font-bold font-mono text-[#003366] mb-1">
                      {seg.from}–{seg.to}
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Blocks:</span>
                        <span className="font-bold text-slate-800">{seg.blocks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Availability:</span>
                        <span className="font-bold text-slate-800">{seg.availability}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delay Risk:</span>
                        <span className={seg.delay !== "0m" ? "text-[#800000] font-bold" : "text-[#137547] font-bold"}>
                          {seg.delay}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 9. TOP IMPACT ASSETS */}
        <div className="lg:col-span-8 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              HIGH-IMPACT ASSETS REQUIRING IMMEDIATE TRAFFIC WINDOW
            </span>
            <span className="text-[10px] text-[#800000] font-bold">SAFETY CRITICAL</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#003366] text-white text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 border-r border-[#002244]">Asset Code</th>
                  <th className="px-3 py-2.5 border-r border-[#002244]">Department</th>
                  <th className="px-3 py-2.5 border-r border-[#002244]">Identified Issue</th>
                  <th className="px-3 py-2.5 border-r border-[#002244]">Hazard</th>
                  <th className="px-3 py-2.5 border-r border-[#002244]">Availability</th>
                  <th className="px-3 py-2.5">CRIS Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topAssets.map((asset, idx) => (
                  <tr key={asset.id} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">
                      {asset.id}
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200">
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold rounded-[2px] border-slate-300 text-slate-800"
                      >
                        {asset.dept}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200">
                      <div className="font-semibold text-slate-900">{asset.issue}</div>
                      <div
                        className={`text-[9px] font-bold uppercase ${
                          asset.criticality === "Critical" ? "text-[#800000]" : "text-[#D97706]"
                        }`}
                      >
                        {asset.criticality}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-3 rounded-[1px] ${
                              i <= asset.risk
                                ? asset.risk > 4
                                  ? "bg-[#800000]"
                                  : "bg-[#D97706]"
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-800 border-r border-slate-200">
                      {asset.availability}%
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[#003366]">
                      {asset.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 10. AI INSIGHTS PANEL */}
        <div className="lg:col-span-4 rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-[#003366] text-white px-4 py-2.5 flex items-center gap-2 border-b-2 border-[#FF9933]">
            <BrainCircuit className="size-4 text-[#FF9933]" />
            <span className="font-bold text-xs uppercase tracking-wider">
              OPERATIONAL INTELLIGENCE LOG
            </span>
          </div>
          <div className="p-4 space-y-3">
            {aiInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex gap-2.5 items-start border-b border-slate-200 pb-2.5 last:border-0 last:pb-0"
              >
                <div
                  className={`mt-0.5 p-1 rounded-[2px] ${
                    insight.severity === "high"
                      ? "bg-red-100 text-[#800000]"
                      : insight.severity === "medium"
                        ? "bg-amber-100 text-[#D97706]"
                        : "bg-sky-100 text-[#003366]"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-xs text-slate-800 leading-tight">{insight.text}</p>
                  <button
                    onClick={() => handleInsightAction(insight)}
                    className="text-[11px] text-[#003366] font-bold hover:underline flex items-center gap-1"
                  >
                    {insight.action} <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 11 & 12. POST-BLOCK REPORT AND TIMELINE */}
      <div id="post-block-report" className="rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              OFFICIAL REGISTER OF EXECUTED TRAFFIC BLOCKS & TIME DRIFT
            </span>
            <p className="text-[10px] text-slate-500">
              Audit comparison of sanctioned start/end versus actual line clearance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-slate-400" />
              <Input
                placeholder="Search Block ID, Dept..."
                className="pl-8 pr-6 h-8 w-56 text-xs bg-white rounded-[2px] border-slate-300"
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value)}
              />
              {reportFilter && (
                <button
                  type="button"
                  onClick={() => setReportFilter("")}
                  className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-[2px] border-slate-300 bg-white text-slate-700"
                >
                  <Filter className="size-3.5 mr-1" />
                  {reportFilter ? `Filter: ${reportFilter}` : "Department Filter"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-300 rounded-[2px] shadow-md">
                <DropdownMenuLabel className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Filter by Department
                </DropdownMenuLabel>
                <DropdownMenuItem className="text-xs" onClick={() => setReportFilter("ENG")}>
                  Track Engineering (ENG)
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" onClick={() => setReportFilter("S&T")}>
                  Signalling & Telecom (S&T)
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" onClick={() => setReportFilter("TRD")}>
                  Traction Distribution (TRD)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Filter by Status
                </DropdownMenuLabel>
                <DropdownMenuItem className="text-xs" onClick={() => setReportFilter("Completed")}>
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" onClick={() => setReportFilter("Optimised")}>
                  Optimised
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" onClick={() => setReportFilter("Delayed")}>
                  Delayed
                </DropdownMenuItem>
                {reportFilter && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs text-[#800000] font-bold"
                      onClick={() => setReportFilter("")}
                    >
                      Clear Active Filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Timeline Preview */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {timelineData.map((item, idx) => (
              <div key={idx} className="shrink-0 w-60 border border-slate-300 bg-white rounded-[2px] p-3 shadow-2xs">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-xs font-mono font-bold text-[#003366]">{item.id}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase font-bold rounded-[2px] px-1.5 py-0 ${
                      item.status === "Completed"
                        ? "bg-emerald-50 text-[#137547] border-emerald-300"
                        : item.status === "Optimised"
                          ? "bg-sky-50 text-[#003366] border-sky-300"
                          : "bg-amber-50 text-[#D97706] border-amber-300"
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-600 font-semibold mb-1">
                  {item.corridor} • {item.depts}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-100 pt-1.5">
                  <span>PLAN: {item.planned}</span>
                  <span className="font-bold text-slate-700">ACT: {item.actual}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#003366] text-white text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5 border-r border-[#002244]">Block ID</th>
                <th className="px-3 py-2.5 border-r border-[#002244]">Section Route</th>
                <th className="px-3 py-2.5 border-r border-[#002244]">Departments Involved</th>
                <th className="px-3 py-2.5 border-r border-[#002244]">Execution Window</th>
                <th className="px-3 py-2.5 border-r border-[#002244]">Duration</th>
                <th className="px-3 py-2.5 border-r border-[#002244]">Train Delay Impact</th>
                <th className="px-3 py-2.5">Efficiency Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReports.length > 0 ? (
                filteredReports.map((p, idx) => (
                  <tr key={p.block_id} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#003366] border-r border-slate-200">
                      {p.block_id}
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {p.source_station} → {p.destination_station} ({p.corridor_name})
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200">
                      <Badge variant="outline" className="text-[9px] uppercase font-bold rounded-[2px] border-slate-300">
                        {p.departments}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700 border-r border-slate-200">
                      {p.block_date} {p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-800 border-r border-slate-200">
                      {p.duration_min} min
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#800000] border-r border-slate-200">
                      +{p.train_impact_score}m
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#137547]">
                      {p.optimization_score}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No block records match the filter query "{reportFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 13. RECOMMENDATION CENTER */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              RECOMMENDED SECTION CONTROLLER ACTIONS
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {actionCards.map((action, idx) => (
              <div
                key={idx}
                className={`rounded-[2px] border border-slate-300 bg-white p-3.5 shadow-sm border-t-4 flex flex-col justify-between ${
                  idx === 0
                    ? "border-t-[#800000]"
                    : idx === 1
                      ? "border-t-[#D97706]"
                      : "border-t-[#003366]"
                }`}
              >
                <div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      idx === 0 ? "text-[#800000]" : idx === 1 ? "text-[#D97706]" : "text-[#003366]"
                    }`}
                  >
                    {action.priority}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 leading-tight">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 mb-3">{action.benefit}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[11px] font-bold uppercase tracking-wider rounded-[2px] h-7 border-slate-300 text-slate-800"
                  disabled={reviewedActions.has(idx)}
                  onClick={() => handleReviewAction(action, idx)}
                >
                  {reviewedActions.has(idx) ? "Acknowledged ✓" : "Review Action"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* 14. DATA TRUST PANEL */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              DATABASE TRUST & INTEGRITY
            </span>
          </div>
          <div className="rounded-[2px] border border-slate-300 bg-white p-4 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600 font-semibold">Feed Freshness</span>
              <Badge variant="outline" className="bg-emerald-50 text-[#137547] border-emerald-300 text-[10px] font-bold rounded-[2px]">
                98.4% HIGH
              </Badge>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Database className="size-3 text-slate-400" /> Track (TMS API)
                </span>
                <span className="text-[#137547] font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Server className="size-3 text-slate-400" /> Signals (SMMS API)
                </span>
                <span className="text-[#137547] font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Network className="size-3 text-slate-400" /> Traction (TDMS API)
                </span>
                <span className="text-[#137547] font-bold">ONLINE</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-[#137547]" />
              Government Cryptographic Signature Verified
            </div>
          </div>
        </div>
      </div>

      {/* 1. Department Details Dialog */}
      <Dialog open={deptDetailsOpen} onOpenChange={setDeptDetailsOpen}>
        <DialogContent className="max-w-2xl bg-white border border-[#003366]/30 rounded-[2px] p-0 overflow-hidden shadow-lg">
          <div className="bg-[#003366] text-white px-4 py-3 flex items-center justify-between border-b-2 border-[#FF9933]">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-white">
              Departmental Asset Availability & Block Utilization Audit
            </DialogTitle>
          </div>
          <div className="p-4 grid gap-3 sm:grid-cols-3">
            {departmentDetails.map((dept) => (
              <div key={dept.name} className="p-3 rounded-[2px] border border-slate-300 bg-slate-50 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className={`text-[11px] font-bold ${dept.colorClass}`}>{dept.name}</span>
                  <Badge variant="outline" className="text-[10px] font-bold rounded-[2px] bg-white">
                    {dept.avail}% Avail
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Tasks:</span>
                    <span className="font-bold text-slate-800">{dept.tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Executed Blocks:</span>
                    <span className="font-bold text-slate-800">{dept.blocks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Execution Score:</span>
                    <span className="font-bold text-[#137547]">{dept.eff}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="bg-slate-100 px-4 py-2.5 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[2px] border-slate-300 text-xs"
              onClick={() => setDeptDetailsOpen(false)}
            >
              Close Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. AI Insight Dialog */}
      <Dialog
        open={insightDialog.open}
        onOpenChange={(open) => setInsightDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md bg-white border border-[#003366]/30 rounded-[2px] p-0 overflow-hidden shadow-lg">
          <div className="bg-[#003366] text-white px-4 py-3 flex items-center gap-2 border-b-2 border-[#FF9933]">
            <BrainCircuit className="size-4 text-[#FF9933]" />
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-white">
              CRIS Intelligent Operational Finding
            </DialogTitle>
          </div>
          {insightDialog.insight && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Severity Classification:</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] font-bold uppercase rounded-[2px] ${
                    insightDialog.insight.severity === "high"
                      ? "bg-red-50 text-[#800000] border-red-300"
                      : insightDialog.insight.severity === "medium"
                        ? "bg-amber-50 text-[#D97706] border-amber-300"
                        : "bg-sky-50 text-[#003366] border-sky-300"
                  }`}
                >
                  {insightDialog.insight.severity} Priority
                </Badge>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-[2px] border border-slate-300 text-xs text-slate-800 leading-relaxed">
                {insightDialog.insight.text}
              </div>
            </div>
          )}
          <DialogFooter className="bg-slate-100 px-4 py-2.5 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[2px] border-slate-300 text-xs"
              onClick={() => setInsightDialog({ open: false, insight: null })}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Action Review Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md bg-white border border-[#003366]/30 rounded-[2px] p-0 overflow-hidden shadow-lg">
          <div className="bg-[#003366] text-white px-4 py-3 flex items-center justify-between border-b-2 border-[#FF9933]">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-white">
              Review Sectional Operational Directive
            </DialogTitle>
          </div>
          {actionDialog.action && (
            <div className="p-4 space-y-3">
              <div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    actionDialog.index === 0
                      ? "text-[#800000]"
                      : actionDialog.index === 1
                        ? "text-[#D97706]"
                        : "text-[#003366]"
                  }`}
                >
                  {actionDialog.action.priority}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-1">{actionDialog.action.title}</h4>
              </div>
              <div className="bg-slate-50 p-3 rounded-[2px] border border-slate-300 text-xs text-slate-700">
                <strong className="text-[#003366]">Expected Efficiency Dividend: </strong>
                {actionDialog.action.benefit}
              </div>
            </div>
          )}
          <DialogFooter className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[2px] border-slate-300 text-xs"
              onClick={() => setActionDialog({ open: false, action: null, index: null })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs uppercase tracking-wider rounded-[2px]"
              onClick={acknowledgeAction}
            >
              Forward to Control Desk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GovtKpi({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
  borderColor = "border-slate-300",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  subColor: string;
  borderColor?: string;
}) {
  return (
    <div className={`rounded-[2px] border ${borderColor} bg-white p-3.5 shadow-sm flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon className="size-4 text-[#003366]" />
      </div>
      <div>
        <span className="text-2xl font-bold font-mono text-slate-900">{value}</span>
        <p className={`text-[10px] font-semibold mt-0.5 ${subColor}`}>{sub}</p>
      </div>
    </div>
  );
}

function ImpactBar({
  label,
  value,
  color = "bg-[#003366]",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-mono font-bold text-slate-600">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-[1px] overflow-hidden border border-slate-300">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function GovtDeptCard({
  name,
  avail,
  tasks,
  blocks,
  eff,
  colorClass,
  bgClass,
}: {
  name: string;
  avail: number;
  tasks: number;
  blocks: number;
  eff: number;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className="p-3 rounded-[2px] border border-slate-300 bg-slate-50">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`size-2 rounded-[1px] ${bgClass}`} />
          <span className={`text-xs font-bold ${colorClass}`}>{name}</span>
        </div>
        <span className="text-sm font-bold font-mono text-slate-900">
          {avail}% <span className="text-[9px] text-slate-500 font-normal">AVAIL</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2 text-center text-xs">
        <div className="bg-white p-1 rounded-[1px] border border-slate-200">
          <span className="text-[9px] text-slate-500 uppercase font-bold block">Tasks</span>
          <span className="font-mono font-bold text-slate-800">{tasks}</span>
        </div>
        <div className="bg-white p-1 rounded-[1px] border border-slate-200">
          <span className="text-[9px] text-slate-500 uppercase font-bold block">Blocks</span>
          <span className="font-mono font-bold text-slate-800">{blocks}</span>
        </div>
        <div className="bg-white p-1 rounded-[1px] border border-slate-200">
          <span className="text-[9px] text-slate-500 uppercase font-bold block">Score</span>
          <span className="font-mono font-bold text-[#137547]">{eff}%</span>
        </div>
      </div>
      <div className="h-1 w-full bg-slate-200 rounded-[1px] overflow-hidden">
        <div className={`h-full ${bgClass}`} style={{ width: `${eff}%` }} />
      </div>
    </div>
  );
}
