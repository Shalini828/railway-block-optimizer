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
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Network,
  ArrowRight,
  ShieldCheck,
  LineChart as LineChartIcon,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
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
import { DAYS, fmt } from "@/lib/abps-data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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
      { title: "Post-Block Intelligence | IR-ABPS" },
      {
        name: "description",
        content:
          "Measure how AI-coordinated maintenance blocks improve asset availability, reduce disruption and optimise corridor capacity.",
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
    { metric: "Train Delay", traditional: 55, ai: 38 },
    { metric: "Separate Blocks", traditional: 5, ai: 3 },
  ],
  "7d": [
    { metric: "Block Hours", traditional: 26.4, ai: 18.5 },
    { metric: "Train Delay", traditional: 214, ai: 142 },
    { metric: "Separate Blocks", traditional: 19, ai: 12 },
  ],
  "30d": [
    { metric: "Block Hours", traditional: 112.0, ai: 78.4 },
    { metric: "Train Delay", traditional: 890, ai: 580 },
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
    to: "CBN",
    traffic: "High",
    blocks: 3,
    risk: "High",
    availability: 88,
    delay: "+14m",
    status: "critical",
  },
  {
    from: "CBN",
    to: "ALD",
    traffic: "Medium",
    blocks: 1,
    risk: "Low",
    availability: 96,
    delay: "+2m",
    status: "healthy",
  },
  {
    from: "ALD",
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
    issue: "Rail fracture risk",
    criticality: "Critical",
    risk: 5,
    availability: 82,
    recommendation: "Schedule coordinated block",
  },
  {
    id: "OHE-MAST-112",
    dept: "TRD",
    issue: "Thermal anomaly",
    criticality: "High",
    risk: 4,
    availability: 88,
    recommendation: "Cluster with adjacent OHE work",
  },
  {
    id: "SIG-PNT-119",
    dept: "S&T",
    issue: "Point machine failure",
    criticality: "High",
    risk: 4,
    availability: 91,
    recommendation: "Prioritise next window",
  },
];

const aiInsights = [
  {
    severity: "high",
    text: "3 overlapping maintenance requests can be merged into one 3-hour coordinated block.",
    action: "View recommendation",
  },
  {
    severity: "medium",
    text: "NDLS–CNB currently carries the highest operational exposure.",
    action: "View corridor",
  },
  {
    severity: "medium",
    text: "TRD maintenance requests show the highest average risk score.",
    action: "Filter TRD",
  },
  {
    severity: "low",
    text: "Coordinated blocks could reduce repeated corridor access windows.",
    action: "View analysis",
  },
];

const actionCards = [
  {
    priority: "HIGH PRIORITY",
    title: "Coordinate TRD + Engineering work on CBN–ALD.",
    benefit: "Potential saving: 2.4 block hours",
  },
  {
    priority: "MEDIUM PRIORITY",
    title: "Review 4 overdue maintenance requests.",
    benefit: "Prevents asset failure",
  },
  {
    priority: "OPTIMISATION",
    title: "Combine 3 overlapping work windows.",
    benefit: "Reclaims 1.5 hrs corridor capacity",
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
    corridor: "CBN–ALD",
    depts: "S&T + ENG",
    planned: "14:00–16:00",
    actual: "14:00–16:15",
    duration: "2.25h",
    impact: "+12 min",
    status: "Delayed",
  },
  {
    id: "BLK-044",
    corridor: "ALD–DDU",
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
    corridor_name: "CBN–ALD",
    source_station: "CBN",
    destination_station: "ALD",
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
    corridor_name: "ALD–DDU",
    source_station: "ALD",
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
    name: "ENGINEERING",
    avail: 93,
    tasks: 24,
    blocks: 8,
    eff: 89,
    colorClass: "text-eng",
    bgClass: "bg-eng",
  },
  {
    name: "S&T",
    avail: 97,
    tasks: 21,
    blocks: 6,
    eff: 94,
    colorClass: "text-snt",
    bgClass: "bg-snt",
  },
  {
    name: "TRD",
    avail: 92,
    tasks: 22,
    blocks: 7,
    eff: 87,
    colorClass: "text-trd",
    bgClass: "bg-trd",
  },
];

function AnalyticsPage() {
  const { reqs } = useAbps();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d">("7d");
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString());
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
      toast.info("Filtering post-block report for TRD department.");
      document.getElementById("post-block-report")?.scrollIntoView({ behavior: "smooth" });
    } else if (insight.action === "View corridor") {
      setHighlightedCorridor("NDLS-CBN");
      toast.info("Highlighting NDLS–CBN corridor segment.");
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
      toast.success("Action acknowledged and scheduled.");
      setActionDialog({ open: false, action: null, index: null });
    }
  };

  const [showDepartmentDetails, setShowDepartmentDetails] = useState(false);

  const refreshAnalytics = () => {
    toast.info("Refreshing intelligence model...");
    setLastUpdated(new Date().toLocaleTimeString());
    fetch("http://127.0.0.1:8000/analytics/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((data: AnalyticsData) => {
        setAnalytics(data);
        toast.success("Intelligence dashboard updated.");
      })
      .catch((error) => {
        console.error("Analytics API error:", error);
        toast.error("Could not load analytics. Displaying projections.");
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
    a.download = kind === "CSV" ? "ir-abps-schedule.csv" : "ir-abps-schedule.pdf.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${kind} operational report exported.`);
  };

  const blockMixData = [
    {
      name: "Blocks Executed",
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
      availability: analytics?.asset_availability_percent || 94.2,
      blockHours: analytics?.total_block_hours || 18.5,
      delayAvoided: analytics?.train_delay_impact_minutes || 142,
      coordinated: analytics?.coordinated_blocks || 12,
      optimised: analytics?.total_maintenance_tasks || 67,
      efficiency: analytics?.average_optimization_score || 91,
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

  const comparisonData = timeRangeComparisonData[timeRange];
  const availabilityTrendData = timeRangeAvailabilityTrendData[timeRange];



  const pieData = [
    { name: "Score", value: safeAnalytics.efficiency || 87, color: "var(--joint)" },
    { name: "Remaining", value: 100 - (safeAnalytics.efficiency || 87), color: "var(--border)" },
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
      {/* 1. HERO SECTION */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-safe animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-safe">
              System Operational
            </span>
            <span className="text-muted-foreground text-xs px-2">•</span>
            <span className="flex items-center gap-1 text-xs text-joint font-medium bg-joint/10 px-2 py-0.5 rounded-full">
              <BrainCircuit className="size-3" />
              IR-ABPS Intelligence: Monitoring
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Post-Block Intelligence & Operational Impact
          </h1>
          <p className="text-muted-foreground text-sm">
            Measure how AI-coordinated maintenance blocks improve asset availability, reduce
            disruption and optimise corridor capacity.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-xs text-muted-foreground">Last updated: {lastUpdated}</div>
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
            <Button
              variant={timeRange === "today" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs cursor-pointer"
              onClick={() => {
                setTimeRange("today");
                setLastUpdated(new Date().toLocaleTimeString());
                toast.info("Viewing today's operational analytics");
              }}
            >
              Today
            </Button>
            <Button
              variant={timeRange === "7d" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs cursor-pointer"
              onClick={() => {
                setTimeRange("7d");
                setLastUpdated(new Date().toLocaleTimeString());
                toast.info("Viewing 7-day operational analytics");
              }}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === "30d" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs cursor-pointer"
              onClick={() => {
                setTimeRange("30d");
                setLastUpdated(new Date().toLocaleTimeString());
                toast.info("Viewing 30-day operational analytics");
              }}
            >
              30 Days
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => download("CSV")}>
              <Download className="size-4 mr-2" /> Export
            </Button>
            <Button size="sm" onClick={refreshAnalytics}>
              <RefreshCw className="size-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* STORYTELLING FLOW */}
      <div className="flex items-center justify-center py-2 overflow-hidden">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs font-medium text-muted-foreground">
          <Badge variant="outline" className="bg-background/50">
            {safeAnalytics.optimised} Requests
          </Badge>
          <ArrowRight className="size-3 text-muted" />
          <Badge variant="outline" className="bg-warn/10 text-warn border-warn/20">
            18 High-risk Assets
          </Badge>
          <ArrowRight className="size-3 text-muted" />
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            12 Optimised Windows
          </Badge>
          <ArrowRight className="size-3 text-muted" />
          <Badge variant="outline" className="bg-joint/10 text-joint border-joint/20">
            {safeAnalytics.coordinated} Coordinated Blocks
          </Badge>
          <ArrowRight className="size-3 text-muted" />
          <Badge variant="outline" className="bg-safe/10 text-safe border-safe/20">
            {safeAnalytics.blockHours} hrs Saved
          </Badge>
          <ArrowRight className="size-3 text-muted" />
          <Badge variant="outline" className="bg-safe/10 text-safe border-safe/20">
            {safeAnalytics.delayAvoided} min Delay Avoided
          </Badge>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI ROW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          icon={Activity}
          label="Asset Availability"
          value={`${safeAnalytics.availability}%`}
          sub="+3.8% vs baseline"
          subColor="text-safe"
        />
        <Kpi
          icon={Clock}
          label="Block Hours Saved"
          value={`${safeAnalytics.blockHours} hrs`}
          sub="↓ 27% vs conventional"
          subColor="text-safe"
        />
        <Kpi
          icon={Train}
          label="Delay Avoided"
          value={`${safeAnalytics.delayAvoided} min`}
          sub="Estimated delay prevented"
          subColor="text-muted-foreground"
        />
        <Kpi
          icon={Layers}
          label="Shadow Blocks"
          value={safeAnalytics.coordinated}
          sub="Multi-department blocks"
          subColor="text-joint"
        />
        <Kpi
          icon={CheckCircle2}
          label="Requests Optimised"
          value={safeAnalytics.optimised}
          sub="AI-prioritised requests"
          subColor="text-primary"
        />
        <Kpi
          icon={Zap}
          label="AI Efficiency"
          value={`${safeAnalytics.efficiency}%`}
          sub="Constraint satisfaction"
          subColor="text-primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 3. AI IMPACT SCORE */}
        <Card className="lg:col-span-4 border-joint/20 shadow-[0_0_20px_-10px_var(--color-joint)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="size-5 text-joint" />
              IR-ABPS Impact Score
            </CardTitle>
            <CardDescription>Overall AI decision-support rating</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative h-48 w-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={70}
                    outerRadius={85}
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
                <span className="text-4xl font-bold text-joint">87</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>

            <div className="w-full space-y-3 mb-6">
              <ImpactBar label="Operational Efficiency" value={92} />
              <ImpactBar label="Safety Preservation" value={96} color="bg-safe" />
              <ImpactBar label="Coordination Efficiency" value={84} color="bg-joint" />
              <ImpactBar label="Delay Reduction" value={81} color="bg-primary" />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground leading-relaxed border border-border/50">
              <strong className="text-foreground">AI Insight:</strong> IR-ABPS improved operational
              efficiency by clustering overlapping maintenance requests into coordinated windows
              while preserving passenger movement constraints.
            </div>
          </CardContent>
        </Card>

        {/* 4. BEFORE vs AFTER COMPARISON */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-lg">Traditional Planning vs IR-ABPS</CardTitle>
            <CardDescription>
              Comparative analysis of key operational metrics (Projected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="metric"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar
                    dataKey="traditional"
                    name="Traditional Planning"
                    fill="var(--muted-foreground)"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                  <Bar
                    dataKey="ai"
                    name="IR-ABPS Coordinated"
                    fill="var(--joint)"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-safe/10 border border-safe/20">
                <span className="text-safe font-semibold text-lg">↓ 29.9%</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Block Hours
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-safe/10 border border-safe/20">
                <span className="text-safe font-semibold text-lg">↓ 33.6%</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Train Delay
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-joint/10 border border-joint/20">
                <span className="text-joint font-semibold text-lg">↑ 44.0%</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Coordination Eff.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 5. ASSET AVAILABILITY ANALYTICS */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Asset Availability Trend</CardTitle>
              <CardDescription>
                {timeRange === "today"
                  ? "Today's 24-hour network-wide availability by department"
                  : timeRange === "30d"
                    ? "30-day network-wide availability by department"
                    : "7-day network-wide availability by department"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-background">
              Target: 95%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={availabilityTrendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="day"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[80, 100]}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="overall"
                    name="Overall"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOverall)"
                  />
                  <Line
                    type="monotone"
                    dataKey="eng"
                    name="Engineering"
                    stroke="var(--eng)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="snt"
                    name="S&T"
                    stroke="var(--snt)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="trd"
                    name="TRD"
                    stroke="var(--trd)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 6. DEPARTMENT PERFORMANCE */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-lg">Departmental Operational Performance</CardTitle>
            <CardDescription>Availability and execution metrics</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {departmentDetails.map((dept) => (
              <DeptCard key={dept.name} {...dept} />
            ))}
            <Button
              variant="link"
              className="w-full text-sm text-primary mt-2"
              onClick={() => setDeptDetailsOpen(true)}
            >
              View department details →
            </Button>
          </CardContent>
        </Card>
      </div>

      {showDepartmentDetails && (
  <Card className="mt-6 border-primary/30 bg-card">
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>Department Operational Details</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            window.history.pushState({}, "", "/analytics");
            setShowDepartmentDetails(false);
          }}
        >
          Close
        </Button>
      </CardTitle>

      <CardDescription>
        Detailed maintenance and optimization performance by department.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            name: "ENGINEERING",
            availability: 95,
            tasks: 24,
            blocks: 8,
            efficiency: 89,
          },
          {
            name: "S&T",
            availability: 97,
            tasks: 21,
            blocks: 6,
            efficiency: 94,
          },
          {
            name: "TRD",
            availability: 92,
            tasks: 22,
            blocks: 7,
            efficiency: 87,
          },
        ].map((department) => (
          <Card key={department.name} className="bg-background/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {department.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Asset Availability
                </span>
                <span className="font-semibold text-emerald-400">
                  {department.availability}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Maintenance Tasks
                </span>
                <span>{department.tasks}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Optimized Blocks
                </span>
                <span>{department.blocks}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Coordination Efficiency
                </span>
                <span className="font-semibold text-emerald-400">
                  {department.efficiency}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </CardContent>
  </Card>
)}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 7. COORDINATION ANALYTICS */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Coordination Efficiency</CardTitle>
            <CardDescription>Shadow block clustering</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={blockMixData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="Traditional"
                    stackId="a"
                    fill="var(--muted-foreground)"
                    radius={[0, 0, 4, 4]}
                    barSize={50}
                  />
                  <Bar
                    dataKey="Coordinated"
                    stackId="a"
                    fill="var(--joint)"
                    radius={[4, 4, 0, 0]}
                    barSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-joint/10 p-4 rounded-lg border border-joint/20 text-sm">
              <span className="font-semibold text-joint">Insight: </span>
              {safeAnalytics.coordinated} maintenance requests were clustered into coordinated
              windows, eliminating redundant access periods.
            </div>
          </CardContent>
        </Card>

        {/* 8. CORRIDOR IMPACT MAP */}
        <Card id="corridor-heatmap" className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-lg">Corridor Operational Heatmap</CardTitle>
            <CardDescription>New Delhi → Prayagraj → Varanasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-8 py-4">
              {/* Corridor Visualization */}
              <div className="relative flex items-center justify-between px-6">
                <div className="absolute left-10 right-10 h-1 bg-border top-1/2 -translate-y-1/2 z-0"></div>
                {corridorSegments.map((seg, idx) => {
                  const isHighlighted = highlightedCorridor === `${seg.from}-${seg.to}`;
                  return (
                    <div
                      key={idx}
                      className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                        {seg.from}
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-4 border-background shadow-md flex items-center justify-center transition-all
                        ${seg.status === "healthy" ? "bg-safe" : seg.status === "attention" ? "bg-warn" : "bg-destructive"}
                        ${isHighlighted ? "ring-4 ring-joint scale-110" : ""}`}
                      ></div>
                    </div>
                  );
                })}
                {/* Last station */}
                <div className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                    BSB
                  </div>
                  <div className="w-6 h-6 rounded-full border-4 border-background shadow-md bg-safe"></div>
                </div>
              </div>

              {/* Segment Details */}
              <div className="grid grid-cols-4 gap-2">
                {corridorSegments.map((seg, idx) => {
                  const isHighlighted = highlightedCorridor === `${seg.from}-${seg.to}`;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border bg-background/50 hover:bg-muted/50 transition-all border-l-4 
                      ${seg.status === "healthy" ? "border-l-safe" : seg.status === "attention" ? "border-l-warn" : "border-l-destructive"}
                      ${isHighlighted ? "ring-2 ring-joint bg-joint/10" : ""}`}
                    >
                      <div className="text-xs font-semibold mb-2">
                        {seg.from}–{seg.to}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Blocks:</span>{" "}
                          <span>{seg.blocks}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Avail:</span>{" "}
                          <span>{seg.availability}%</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Delay Risk:</span>{" "}
                          <span className={seg.delay !== "0m" ? "text-warn" : ""}>{seg.delay}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 9. TOP IMPACT ASSETS */}
        <Card className="lg:col-span-8 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Top Assets Requiring Attention</CardTitle>
            <CardDescription>High-risk infrastructure items prioritized by AI</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Issue / Criticality</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>AI Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium text-xs">{asset.id}</TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={
                          asset.dept === "Engineering"
                            ? "text-eng border-eng/30"
                            : asset.dept === "TRD"
                              ? "text-trd border-trd/30"
                              : "text-snt border-snt/30"
                        }
                      >
                        {asset.dept}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{asset.issue}</div>
                      <div
                        className={`text-[10px] uppercase ${asset.criticality === "Critical" ? "text-destructive" : "text-warn"}`}
                      >
                        {asset.criticality}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-3 rounded-sm ${i <= asset.risk ? (asset.risk > 4 ? "bg-destructive" : "bg-warn") : "bg-muted"}`}
                          ></div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{asset.availability}%</TableCell>
                    <TableCell className="text-xs text-primary font-medium">
                      {asset.recommendation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* 10. AI INSIGHTS PANEL */}
        <Card className="lg:col-span-4 bg-gradient-to-br from-card to-joint/5 border-joint/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="size-5 text-joint" />
              AI Operational Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex gap-3 items-start border-b border-border/50 pb-3 last:border-0 last:pb-0"
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-md ${
                    insight.severity === "high"
                      ? "bg-destructive/10 text-destructive"
                      : insight.severity === "medium"
                        ? "bg-warn/10 text-warn"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm leading-tight">{insight.text}</p>
                  <button
                    onClick={() => handleInsightAction(insight)}
                    className="text-xs text-joint font-medium hover:underline flex items-center gap-1"
                  >
                    {insight.action} <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 11 & 12. POST-BLOCK REPORT AND TIMELINE */}
      <Card id="post-block-report">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
          <div>
            <CardTitle className="text-lg">Executed Block Performance & Report</CardTitle>
            <CardDescription>
              Comprehensive log of planned vs actual block execution
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search blocks..."
                className="pl-8 pr-7 h-9 w-64 text-sm"
                value={reportFilter}
                onChange={(e) => setReportFilter(e.target.value)}
              />
              {reportFilter && (
                <button
                  type="button"
                  onClick={() => setReportFilter("")}
                  className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={reportFilter ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 cursor-pointer"
                >
                  <Filter className="size-4 mr-2" />
                  {reportFilter ? `Filter: ${reportFilter}` : "Filter"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-md">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                  Filter by Department
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setReportFilter("ENG");
                    toast.info("Filtering by Engineering (ENG)");
                  }}
                >
                  Engineering (ENG)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setReportFilter("S&T");
                    toast.info("Filtering by Signalling & Telecom (S&T)");
                  }}
                >
                  Signalling &amp; Telecom (S&amp;T)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setReportFilter("TRD");
                    toast.info("Filtering by Traction Distribution (TRD)");
                  }}
                >
                  Traction Distribution (TRD)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                  Filter by Status
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setReportFilter("Completed");
                    toast.info("Filtering by Completed status");
                  }}
                >
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setReportFilter("Optimised");
                    toast.info("Filtering by Optimised status");
                  }}
                >
                  Optimised
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setReportFilter("Delayed");
                    toast.info("Filtering by Delayed status");
                  }}
                >
                  Delayed
                </DropdownMenuItem>
                {reportFilter && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive font-medium cursor-pointer"
                      onClick={() => {
                        setReportFilter("");
                        toast.info("Cleared filters");
                      }}
                    >
                      Clear Active Filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Timeline Preview */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {timelineData.map((item, idx) => (
              <div key={idx} className="flex-shrink-0 w-64 border rounded-lg p-3 bg-muted/20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold">{item.id}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 px-1.5 ${
                      item.status === "Completed"
                        ? "bg-safe/10 text-safe border-safe/20"
                        : item.status === "Optimised"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-warn/10 text-warn border-warn/20"
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  {item.corridor} • {item.depts}
                </div>
                <div className="flex justify-between text-[11px] mt-2">
                  <span>
                    <span className="text-muted-foreground">Est:</span> {item.planned}
                  </span>
                  <span>
                    <span className="text-muted-foreground">Act:</span> {item.actual}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Block ID</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Train Impact</TableHead>
                <TableHead>Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length > 0 ? (
                filteredReports.map((p) => (
                  <TableRow key={p.block_id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-medium">{p.block_id}</TableCell>
                    <TableCell className="text-xs">
                      {p.source_station} → {p.destination_station}
                    </TableCell>
                    <TableCell className="text-xs">{p.departments}</TableCell>
                    <TableCell className="text-xs">
                      {p.block_date} {p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)}
                    </TableCell>
                    <TableCell className="text-xs">{p.duration_min} min</TableCell>
                    <TableCell className="text-xs text-warn">{p.train_impact_score}</TableCell>
                    <TableCell className="text-xs text-safe">{p.optimization_score}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No blocks found matching "{reportFilter}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 13. RECOMMENDATION CENTER */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Recommended Next Actions</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {actionCards.map((action, idx) => (
              <Card
                key={idx}
                className={`border-t-4 ${
                  idx === 0
                    ? "border-t-destructive"
                    : idx === 1
                      ? "border-t-warn"
                      : "border-t-primary"
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div
                    className={`text-[10px] font-bold tracking-wider mb-1 ${
                      idx === 0 ? "text-destructive" : idx === 1 ? "text-warn" : "text-primary"
                    }`}
                  >
                    {action.priority}
                  </div>
                  <CardTitle className="text-sm leading-tight">{action.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground mb-3">{action.benefit}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-8"
                    disabled={reviewedActions.has(idx)}
                    onClick={() => handleReviewAction(action, idx)}
                  >
                    {reviewedActions.has(idx) ? "Reviewed ✓" : "Review Action"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 14. DATA TRUST PANEL */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Analytics Confidence</h3>
          <Card className="bg-background">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data Freshness</span>
                <Badge variant="outline" className="bg-safe/10 text-safe border-safe/20">
                  98% High
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Database className="size-3 text-muted-foreground" /> TMS API
                  </span>
                  <span className="text-safe">Connected</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Server className="size-3 text-muted-foreground" /> SMMS API
                  </span>
                  <span className="text-safe">Connected</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Network className="size-3 text-muted-foreground" /> TDMS API
                  </span>
                  <span className="text-safe">Connected</span>
                </div>
              </div>
              <div className="pt-3 border-t text-[10px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3" />
                Sources validated • Last sync: 2 min ago
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 1. Department Details Dialog */}
      <Dialog open={deptDetailsOpen} onOpenChange={setDeptDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Departmental Operational Performance</DialogTitle>
            <DialogDescription>
              Detailed breakdown of asset availability, scheduled maintenance tasks, and execution
              efficiency by department.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-3">
            {departmentDetails.map((dept) => (
              <div key={dept.name} className="p-4 rounded-lg border bg-card/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${dept.colorClass}`}>{dept.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {dept.avail}% Avail
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Tasks:</span>
                    <span className="font-semibold">{dept.tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Executed Blocks:</span>
                    <span className="font-semibold">{dept.blocks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Efficiency Rating:</span>
                    <span className="font-semibold">{dept.eff}%</span>
                  </div>
                </div>
                <Progress value={dept.eff} indicatorClassName={dept.bgClass} className="h-1.5" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. AI Insight Dialog */}
      <Dialog
        open={insightDialog.open}
        onOpenChange={(open) => setInsightDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="size-5 text-joint" />
              AI Operational Insight
            </DialogTitle>
            <DialogDescription>
              Intelligent recommendation generated by IR-ABPS reasoning engine.
            </DialogDescription>
          </DialogHeader>
          {insightDialog.insight && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Severity Level:</span>
                <Badge
                  variant="outline"
                  className={
                    insightDialog.insight.severity === "high"
                      ? "bg-destructive/10 text-destructive border-destructive/20 uppercase text-[10px]"
                      : insightDialog.insight.severity === "medium"
                        ? "bg-warn/10 text-warn border-warn/20 uppercase text-[10px]"
                        : "bg-primary/10 text-primary border-primary/20 uppercase text-[10px]"
                  }
                >
                  {insightDialog.insight.severity} priority
                </Badge>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg border text-sm leading-relaxed">
                {insightDialog.insight.text}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInsightDialog({ open: false, insight: null })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Action Review Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Recommended Action</DialogTitle>
            <DialogDescription>
              Evaluate and confirm proposed maintenance coordination action.
            </DialogDescription>
          </DialogHeader>
          {actionDialog.action && (
            <div className="space-y-4 py-2">
              <div>
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase ${
                    actionDialog.index === 0
                      ? "text-destructive"
                      : actionDialog.index === 1
                        ? "text-warn"
                        : "text-primary"
                  }`}
                >
                  {actionDialog.action.priority}
                </span>
                <h4 className="text-base font-semibold mt-1">{actionDialog.action.title}</h4>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg border text-xs text-muted-foreground">
                <strong className="text-foreground">Expected Benefit: </strong>
                {actionDialog.action.benefit}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null, index: null })}
            >
              Dismiss
            </Button>
            <Button onClick={acknowledgeAction}>Acknowledge & Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponents
function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  subColor: string;
}) {
  return (
    <Card className="hover:border-primary/30 transition-colors shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="p-2 bg-muted rounded-md">
            <Icon className="size-4 text-primary" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          <span className={`text-xs font-medium ${subColor}`}>{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ImpactBar({
  label,
  value,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} indicatorClassName={color} className="h-1.5 bg-muted" />
    </div>
  );
}

function DeptCard({
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
    <div className="p-4 rounded-lg border bg-background/50 hover:bg-card transition-colors">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${bgClass}`}></div>
          <span className={`text-sm font-bold tracking-wide ${colorClass}`}>{name}</span>
        </div>
        <span className="text-lg font-semibold">
          {avail}% <span className="text-[10px] text-muted-foreground font-normal">Avail</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground">Tasks</span>
          <span className="text-sm font-medium">{tasks}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground">Blocks</span>
          <span className="text-sm font-medium">{blocks}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground">Efficiency</span>
          <span className="text-sm font-medium">{eff}%</span>
        </div>
      </div>
      <Progress value={eff} indicatorClassName={bgClass} className="h-1" />
    </div>
  );
}
