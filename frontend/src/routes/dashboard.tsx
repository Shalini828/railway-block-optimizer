import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Gauge,
  Layers,
  TrainFront,
  Siren,
  RefreshCw,
  Map,
  Activity,
  AlertCircle,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Server,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Radio,
} from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Control Dashboard | IR-ABPS Central Operations" },
      {
        name: "description",
        content: "Unified COA + BDMS operations centre for the New Delhi – Varanasi corridor.",
      },
      {
        property: "og:title",
        content: "Control Dashboard | IR-ABPS",
      },
    ],
  }),

  component: DashboardPage,
});

interface DashboardKPIs {
  overall_asset_availability: number;
  scheduled_blocks: number;
  shadow_block_savings: number;
  punctuality_impact_index: number;
}

interface CorridorStatus {
  id: string;
  name: string;
  from: string;
  to: string;
  trains_running: number;
  window: string;
  traffic_intensity: number;
  tracks: string[];
}

interface UrgentRisk {
  id: string;
  title: string;
  severity: string;
  location: string;
  description: string;
  dept?: string;
}

interface TrainForecast {
  id: string;
  train: string;
  corridor: string;
  status: string;
  time: string;
}

interface RequisitionPipeline {
  pending_ai_scheduling: number;
  clustered_shadowed: number;
  approved: number;
  active: number;
  completed: number;
}

interface DashboardAnalytics {
  optimization_runs: number;
  blocks_generated: number;
  average_block_utilization: number;
  average_train_impact: number;
  total_optimized_block_minutes: number;
}

interface DashboardData {
  status: string;
  scope?: string;
  department?: string;
  department_kpis?: {
    asset_availability_percent: number;
    pending_tasks: number;
    critical_tasks_or_defects: number;
    blocks_this_week: number;
  };
  kpis: DashboardKPIs;
  corridor_status: CorridorStatus[];
  urgent_risks: UrgentRisk[];
  train_forecast: TrainForecast[];
  requisition_pipeline: RequisitionPipeline;
  analytics: DashboardAnalytics;
  last_updated: string;
}

function DashboardPage() {
  const { role, scope, dept } = useAbps();
  const { t } = useLanguage();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const MOCK_DATA: DashboardData = {
    status: "success",
    kpis: {
      overall_asset_availability: 94.6,
      scheduled_blocks: 12,
      shadow_block_savings: 18.5,
      punctuality_impact_index: 42,
    },
    corridor_status: [
      {
        id: "ndls-cnb",
        name: "New Delhi (NDLS) – Kanpur Central (CNB)",
        from: "New Delhi (NDLS)",
        to: "Kanpur (CNB)",
        trains_running: 3,
        window: "11:00 - 14:00",
        traffic_intensity: 87,
        tracks: ["Up Main", "Down Main", "Line 3 Up"],
      },
      {
        id: "cnb-ald",
        name: "Kanpur Central (CNB) – Prayagraj Jn (ALD)",
        from: "Kanpur (CNB)",
        to: "Prayagraj (ALD)",
        trains_running: 5,
        window: "14:00 - 17:00",
        traffic_intensity: 45,
        tracks: ["Up Main", "Down Main"],
      },
      {
        id: "ald-bsb",
        name: "Prayagraj Jn (ALD) – Varanasi Cantt (BSB)",
        from: "Prayagraj (ALD)",
        to: "Varanasi (BSB)",
        trains_running: 2,
        window: "23:00 - 04:00",
        traffic_intensity: 92,
        tracks: ["Up Main", "Down Main"],
      },
    ],
    urgent_risks: [
      {
        id: "TRK-ENG-982",
        title: "IMR Track Fracture Flaw",
        severity: "Critical",
        location: "NDLS-CNB Down Main (Km 142/6-8)",
        description: "USFD Class IMR flaw detected. TSR 30 kmph imposed pending emergency block clamp.",
        dept: "TMS",
      },
      {
        id: "SIG-PNT-119",
        title: "Point Machine Operating Lag",
        severity: "High",
        location: "DDU-BSB Up Main (Point 112A)",
        description: "Intermittent obstruction in reverse detection circuit during train crossover.",
        dept: "SMMS",
      },
      {
        id: "OHE-MAST-341",
        title: "OHE Cantilever Flashover",
        severity: "High",
        location: "NDLS-CNB Down Main (Mast 341/12)",
        description: "Severe soot deposition and pantograph flashover reported by Loco Pilot 12424.",
        dept: "TDMS",
      },
    ],
    train_forecast: [
      {
        id: "forecast-1",
        train: "12424 (RAJDHANI)",
        corridor: "NDLS - CNB",
        status: "On Time",
        time: "11:15",
      },
      {
        id: "forecast-2",
        train: "22436 (VANDE BHARAT)",
        corridor: "CNB - ALD",
        status: "Expected",
        time: "11:45",
      },
      {
        id: "forecast-3",
        train: "12560 (SHIV GANGA)",
        corridor: "ALD - BSB",
        status: "Delayed",
        time: "12:20",
      },
    ],
    requisition_pipeline: {
      pending_ai_scheduling: 7,
      clustered_shadowed: 3,
      approved: 2,
      active: 1,
      completed: 67,
    },

    analytics: {
      optimization_runs: 14,
      blocks_generated: 12,
      average_block_utilization: 88.4,
      average_train_impact: 1.2,
      total_optimized_block_minutes: 2480,
    },

    last_updated: new Date().toISOString(),
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch("/dashboard/kpis");
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const json: DashboardData = await res.json();
      setData(json);
      setError(false);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn("Dashboard API error, falling back to mock data:", err);
      setData(MOCK_DATA);
      setError(true);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (
    val: number | undefined,
    isPercent = false,
    isHours = false,
    isMins = false,
  ) => {
    if (val === undefined || val === null) return "0";
    const formatted = val % 1 === 0 ? val.toString() : val.toFixed(1);
    if (isPercent) return `${formatted}%`;
    if (isHours) return `${formatted} hrs`;
    if (isMins) return `${formatted} min`;
    return formatted;
  };

  const isDept = scope === "department" && !!dept;
  const deptKpis = data?.department_kpis;

  const kpis = data
    ? isDept
      ? [
          {
            label:
              dept === "TMS"
                ? t("Track Asset Availability", "ट्रैक परिसंपत्ति उपलब्धता")
                : dept === "SMMS"
                  ? t("Signal Asset Availability", "सिग्नल परिसंपत्ति उपलब्धता")
                  : t("OHE Asset Availability", "ओएचई परिसंपत्ति उपलब्धता"),
            value: formatNumber(
  deptKpis?.asset_availability_percent ?? 0,
  true
),
            note:
              dept === "TMS"
                ? t("P.Way Track, Rails & Turnouts", "पी.वे ट्रैक, रेल एवं टर्नआउट")
                : dept === "SMMS"
                  ? t("Point Machines, Interlocking & Relays", "पॉइंट मशीन, इंटरलॉकिंग एवं रिले")
                  : t("TRD Masts, Feeders & Transformers", "टीआरडी पोल, फीडर एवं ट्रांसफार्मर"),
            status: t("Department Certified", "विभाग प्रमाणित"),
            icon: Gauge,
            tone: "text-emerald-700 dark:text-emerald-400",
          },
          {
            label: `${t("Pending", "लंबित")} ${dept} ${t("Work", "कार्य")}`,
            value: `${deptKpis?.pending_tasks ?? (dept === "TMS" ? 4 : 3)} ${t("Tasks", "कार्य")}`,
            note: t("Awaiting AI Scheduling / Requisition", "एआई शेड्यूलिंग / मांग पत्र की प्रतीक्षा"),
            status: t("Departmental Backlog", "विभागीय बैकलॉग"),
            icon: Layers,
            tone: "text-[#003366] dark:text-sky-400",
          },
          {
            label: `${t("Critical", "गंभीर")} ${
              dept === "TMS"
                ? t("Track Defects", "ट्रैक दोष")
                : dept === "SMMS"
                  ? t("Signal Failures", "सिग्नल विफलताएं")
                  : t("OHE Defects", "ओएचई दोष")
            }`,
            value: `${deptKpis?.critical_tasks_or_defects ?? 2} ${t("Critical", "अति-महत्वपूर्ण")}`,
            note: t("Immediate Sectional Priority", "तत्काल अनुभागीय प्राथमिकता"),
            status: t("Priority Red Zone", "प्राथमिकता रेड जोन"),
            icon: AlertTriangle,
            tone: "text-red-700 dark:text-red-400",
          },
          {
            label: `${dept} ${t("Blocks This Week", "ब्लॉक इस सप्ताह")}`,
            value: `${deptKpis?.blocks_this_week ?? (dept === "TMS" ? 3 : 2)} / ${t("Wk", "सप्ताह")}`,
            note: t("Approved & Executing in Section", "अनुभाग में स्वीकृत एवं निष्पादित"),
            status: t("Operational Execution", "परिचालन निष्पादन"),
            icon: TrainFront,
            tone: "text-emerald-700 dark:text-emerald-400",
          },
        ]
      : [
          {
            label: "Asset Availability Index",
            value: formatNumber(data.kpis.overall_asset_availability, true),
            note: "Civil (TMS) + Signal (SMMS) + OHE (TDMS)",
            status: "Operational / Target Met",
            icon: Gauge,
            tone: "text-emerald-700 dark:text-emerald-400",
          },
          {
            label: "Active Megablocks",
            value: `${data.kpis.scheduled_blocks} / Wk`,
            note: "Sectional corridor block quota",
            status: "Under Coordination",
            icon: Layers,
            tone: "text-[#003366] dark:text-sky-400",
          },
          {
            label: "Shadow Window Savings",
            value: formatNumber(data.kpis.shadow_block_savings, false, true),
            note: "Recovered via AI bundling",
            status: "CRIS Optimization",
            icon: Clock,
            tone: "text-purple-700 dark:text-purple-400",
          },
          {
            label: "Punctuality Impact",
            value: formatNumber(data.kpis.punctuality_impact_index, false, false, true),
            note: "Express delay reduction saved",
            status: "COA Punctuality Positive",
            icon: TrainFront,
            tone: "text-emerald-700 dark:text-emerald-400",
          },
        ]
    : [];

  return (
    <>
      <PageHeader
        title={
          isDept
            ? dept === "TMS"
              ? t("Engineering (TMS) Operational Desk", "इंजीनियरिंग (टीएमएस) परिचालन डेस्क")
              : dept === "SMMS"
                ? t("Signal & Telecom (SMMS) Operational Desk", "सिग्नल एवं दूरसंचार (एसएमएमएस) परिचालन डेस्क")
                : t("Traction (TDMS) Operational Desk", "विद्युत कर्षण (टीडीएमएस) परिचालन डेस्क")
            : t("Central Executive Operations Desk", "केंद्रीय कार्यकारी परिचालन डेस्क")
        }
        subtitle={
          isDept
            ? `${role.title} · ${role.name} · ${t("Departmental Infrastructure Scrutiny", "विभागीय अवसंरचना संवीक्षा")} (${dept} · ${t("Division: PRYJ / NR", "मंडल: पीआरवाईजे / उ.रे.")})`
            : t(
                "National Corridor Monitoring & Automatic Block Planning Console (NCR Section: New Delhi – Kanpur – Prayagraj – Varanasi)",
                "राष्ट्रीय कॉरिडोर निगरानी एवं स्वचालित ब्लॉक नियोजन कंसोल (एनसीआर अनुभाग: नई दिल्ली – कानपुर – प्रयागराज – वाराणसी)"
              )
        }
        action={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="size-3" /> {lastRefreshed.toLocaleTimeString("en-IN", { hour12: false })} IST
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              disabled={isRefreshing}
              className="h-8 text-xs font-semibold border-slate-300 dark:border-slate-700"
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh Feed
            </Button>
          </div>
        }
      />

      {/* Top Banner & KPI Matrix */}
      <div className="grid gap-4 lg:grid-cols-4 mb-6">
        {/* CRIS Engine Quick Action Box */}
        <div className="lg:col-span-1">
          <Card className="h-full border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px]">
            <div className="bg-[#003366] p-3 text-white border-b-2 border-[#FF9933]">
              <div className="flex items-center gap-2">
                <BrainCircuit className="size-4 text-[#FF9933]" />
                <h2 className="text-xs font-bold uppercase tracking-wider">AI Block Planning</h2>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">CRIS Automatic Clustering Engine</p>
            </div>
            <CardContent className="p-3.5 flex flex-col justify-between h-[calc(100%-60px)]">
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Zero-conflict path verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Cross-departmental shadow bundling</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>COA train movement clearance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Sectional speed restriction safety check</span>
                </div>
              </div>

              <Button
                asChild
                className="mt-4 w-full h-8 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-[2px]"
              >
                <Link to="/optimizer">
                  <Zap className="mr-1.5 size-3.5 text-[#FF9933]" /> Launch Optimizer Engine
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Utilitarian KPI Metric Blocks */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-[2px]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 h-full">
              {kpis.map((k) => (
                <Card
                  key={k.label}
                  className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none flex flex-col justify-between p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {k.label}
                      </p>
                      <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                        {k.value}
                      </p>
                    </div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-[2px] border border-border">
                      <k.icon className={`size-5 ${k.tone}`} />
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {k.status}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{k.note}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Corridor Summary Quick Strip */}
      {data && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-[#003366] bg-slate-100 dark:bg-slate-900 px-4 py-2.5 rounded-[2px] text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Map className="size-4 text-[#003366] dark:text-sky-400" />
            <span className="text-slate-600 dark:text-slate-400 uppercase text-[10px]">Track Corridors:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{data.corridor_status.length} Active</span>
          </div>
          <div className="flex items-center gap-2">
            <TrainFront className="size-4 text-[#003366] dark:text-sky-400" />
            <span className="text-slate-600 dark:text-slate-400 uppercase text-[10px]">Express Movements:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {data.corridor_status.reduce((acc, c) => acc + c.trains_running, 0)} Trains Running
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            <span className="text-slate-600 dark:text-slate-400 uppercase text-[10px]">Safety Risks:</span>
            <span className="font-bold text-destructive">{data.urgent_risks.length} Defects Logged</span>
          </div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-purple-700 dark:text-purple-400" />
            <span className="text-slate-600 dark:text-slate-400 uppercase text-[10px]">Scheduling Queue:</span>
            <span className="font-bold text-purple-700 dark:text-purple-400">
              {data.requisition_pipeline.pending_ai_scheduling} Requisitions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
            <span className="text-slate-600 dark:text-slate-400 uppercase text-[10px]">Executed Blocks:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{data.requisition_pipeline.completed} Complete</span>
          </div>
        </div>
      )}

      {/* Corridor Status & Urgent Risk Radar */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* LIVE CORRIDOR STATUS */}
        <Card className="lg:col-span-2 border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
          <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
                <Activity className="size-4 text-[#003366] dark:text-sky-400" />
                Live Corridor Telemetry & Sectional Windows
              </CardTitle>
              <span className="text-[10px] font-bold text-slate-500 uppercase">COA Feed Synchronized</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : data?.corridor_status.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No corridor telemetry reported.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data?.corridor_status.map((c) => {
                  let intensityColor = "bg-emerald-600";
                  let statusLabel = "Normal Flow";
                  if (c.traffic_intensity > 40) {
                    intensityColor = "bg-blue-600";
                    statusLabel = "Moderate Traffic";
                  }
                  if (c.traffic_intensity > 70) {
                    intensityColor = "bg-amber-600";
                    statusLabel = "Congested Window";
                  }
                  if (c.traffic_intensity > 90) {
                    intensityColor = "bg-red-600";
                    statusLabel = "Capacity Strained";
                  }

                  return (
                    <div key={c.id} className="p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                              {c.name}
                            </h3>
                            {c.traffic_intensity > 70 && (
                              <Badge
                                variant="destructive"
                                className="h-4 px-1.5 text-[9px] uppercase font-bold"
                              >
                                Heavy Density
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {statusLabel}
                            </span>
                            <span>·</span>
                            <span>
                              <strong className="text-slate-900 dark:text-slate-100">{c.trains_running}</strong> trains in block section
                            </span>
                            <span>·</span>
                            <span>Available Block Window: <strong className="text-[#003366] dark:text-sky-400 font-mono">{c.window}</strong></span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {c.tracks.map((track) => (
                            <span
                              key={track}
                              className="rounded-[2px] border border-border bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                            >
                              {track}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                          <span>Sectional Occupancy Load</span>
                          <span className={c.traffic_intensity > 85 ? "text-destructive font-black" : "text-slate-700 dark:text-slate-300"}>
                            {c.traffic_intensity}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-[2px] bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full ${intensityColor}`}
                            style={{ width: `${c.traffic_intensity}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* URGENT SAFETY RISK RADAR */}
        <Card className="border-2 border-[#800000] bg-white dark:bg-slate-900 rounded-[2px] shadow-none flex flex-col justify-between">
          <CardHeader className="bg-[#800000] p-3.5 text-white border-b border-[#800000]">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-white">
              <ShieldAlert className="size-4 text-white" />
              Safety Board Risk Radar
            </CardTitle>
            <CardDescription className="text-[10px] text-red-100">
              Immediate Track & Signal Scrutiny Registry
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : data?.urgent_risks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active critical risks flagged.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data?.urgent_risks
                  .filter((r) => !isDept || r.dept === dept || (dept === "TMS" ? r.id.startsWith("TRK") : dept === "SMMS" ? (r.id.startsWith("SIG") || r.id.startsWith("SNT")) : r.id.startsWith("OHE")))
                  .sort((a, b) => {
                    const order: Record<string, number> = { Critical: 1, High: 2, Medium: 3, Low: 4 };
                    return (order[a.severity] || 5) - (order[b.severity] || 5);
                  })
                  .map((r) => {
                    let sevClass = "bg-amber-100 text-amber-900 border-amber-300";
                    if (r.severity === "Critical") {
                      sevClass = "bg-red-100 text-red-900 border-red-300 font-black";
                    }
                    if (r.severity === "High") {
                      sevClass = "bg-orange-100 text-orange-900 border-orange-300 font-bold";
                    }

                    return (
                      <div key={r.id} className="p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="size-3.5 text-[#800000] shrink-0" />
                            <p className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase">
                              {r.title}
                            </p>
                          </div>
                          <span className={`border px-1.5 py-0.5 text-[9px] uppercase rounded-[2px] ${sevClass}`}>
                            {r.severity}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                          {r.id} · {r.location}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-snug">
                          {r.description}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
          <div className="border-t border-border p-2.5 bg-slate-50 dark:bg-slate-900/60">
            <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold border-slate-300 dark:border-slate-700">
              <Link to="/requests">
                File Requisition for Rectification <ArrowRight className="ml-1.5 size-3" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Train Forecast & Requisition Pipeline */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* COA TRAIN PATH FORECAST */}
        <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
          <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
              <TrainFront className="size-4 text-[#003366] dark:text-sky-400" />
              COA Sectional Express Timetable (Live Corridor)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data?.train_forecast.map((t) => {
                  let badgeVariant = "bg-emerald-100 text-emerald-900 border-emerald-300";
                  if (t.status === "Delayed") {
                    badgeVariant = "bg-red-100 text-red-900 border-red-300";
                  }
                  if (t.status === "Expected") {
                    badgeVariant = "bg-blue-100 text-blue-900 border-blue-300";
                  }

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 px-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#003366] dark:text-sky-400">
                          {t.train}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t.corridor}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="size-3" /> Scheduled Path: {t.time} IST
                          </p>
                        </div>
                      </div>
                      <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase rounded-[2px] ${badgeVariant}`}>
                        {t.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* BDMS REQUISITION PIPELINE */}
        <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
          <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
              <Layers className="size-4 text-[#003366] dark:text-sky-400" />
              Requisition Lifecycle Status (BDMS Register)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {data && (
              <div className="space-y-3.5">
                {[
                  { key: "pending_ai_scheduling", label: "Pending AI Scheduling", color: "bg-purple-600" },
                  { key: "clustered_shadowed", label: "Clustered / Shadow Block Allocated", color: "bg-blue-600" },
                  { key: "approved", label: "Controller Approved", color: "bg-emerald-600" },
                  { key: "active", label: "Active Field Execution", color: "bg-amber-600" },
                  { key: "completed", label: "Completed & Certified", color: "bg-slate-600" },
                ].map((item) => {
                  const val = data.requisition_pipeline[item.key as keyof RequisitionPipeline];
                  const maxVal = Math.max(10, data.requisition_pipeline.completed, data.requisition_pipeline.pending_ai_scheduling);
                  const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));

                  return (
                    <div key={item.key} className="flex items-center gap-3 text-xs">
                      <span className="w-48 font-medium text-slate-700 dark:text-slate-300">
                        {item.label}
                      </span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-[2px] overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-10 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {val}
                      </span>
                    </div>
                  );
                })}

                <div className="pt-2 border-t border-border flex gap-2">
                  <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold">
                    <Link to="/planner">
                      Open Gantt Schedule <Calendar className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integrated Railway Systems Status Strip */}
      <Card className="border border-border bg-slate-100 dark:bg-slate-900 rounded-[2px] shadow-none">
        <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold uppercase text-[#003366] dark:text-sky-400 text-[11px]">
            <Server className="size-4" />
            CRIS Enterprise Interface Gateway:
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            {["COA (Operations)", "BDMS (Block Demand)", "TMS (Civil)", "SMMS (Signaling)", "TDMS (Electrical)", "FOIS (Freight)"].map((sys) => (
              <div key={sys} className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <span className="size-2 rounded-full bg-emerald-600"></span>
                <span>{sys}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
