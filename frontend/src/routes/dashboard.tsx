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
  ShieldAlert
} from "lucide-react";

import { PageHeader } from "@/components/AppShell";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Control Dashboard | IR-ABPS" },
      {
        name: "description",
        content:
          "Unified COA + BDMS operations centre for the New Delhi – Varanasi corridor.",
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

interface DashboardData {
  status: string;
  kpis: DashboardKPIs;
  corridor_status: CorridorStatus[];
  urgent_risks: UrgentRisk[];
  train_forecast: TrainForecast[];
  requisition_pipeline: RequisitionPipeline;
}

function DashboardPage() {
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
    punctuality_impact_index: 42
  },
  corridor_status: [
    {
      id: "ndls-cnb",
      name: "New Delhi (NDLS) – Kanpur (CNB)",
      from: "New Delhi (NDLS)",
      to: "Kanpur (CNB)",
      trains_running: 3,
      window: "11:00 - 14:00",
      traffic_intensity: 87,
      tracks: ["Up Main", "Down Main", "Line 3 Up"]
    },
    {
      id: "cnb-ald",
      name: "Kanpur (CNB) – Prayagraj (ALD)",
      from: "Kanpur (CNB)",
      to: "Prayagraj (ALD)",
      trains_running: 5,
      window: "14:00 - 17:00",
      traffic_intensity: 45,
      tracks: ["Up Main", "Down Main"]
    },
    {
      id: "ald-bsb",
      name: "Prayagraj (ALD) – Varanasi (BSB)",
      from: "Prayagraj (ALD)",
      to: "Varanasi (BSB)",
      trains_running: 2,
      window: "23:00 - 04:00",
      traffic_intensity: 92,
      tracks: ["Up Main", "Down Main"]
    }
  ],
  urgent_risks: [
    {
      id: "TRK-ENG-982",
      title: "IMR Track Fracture",
      severity: "Critical",
      location: "NDLS-CNB Down Main",
      description: "USFD Class IMR flaw. TSR 30 kmph imposed if defect >48h."
    },
    {
      id: "SIG-PNT-119",
      title: "Point Machine Failure",
      severity: "High",
      location: "DDU-BSB Up Main",
      description: "Intermittent failure in reverse operation."
    },
    {
      id: "OHE-MAST-341",
      title: "OHE Hot Spot",
      severity: "High",
      location: "NDLS-CNB Down Main",
      description: "Pantograph flashover reported by Loco Pilot."
    }
  ],
  train_forecast: [
    {
      id: "forecast-1",
      train: "COA-001",
      corridor: "NDLS - CNB",
      status: "On Time",
      time: "11:15"
    },
    {
      id: "forecast-2",
      train: "COA-002",
      corridor: "CNB - ALD",
      status: "Expected",
      time: "11:45"
    },
    {
      id: "forecast-3",
      train: "COA-003",
      corridor: "ALD - BSB",
      status: "Delayed",
      time: "12:20"
    }
  ],
  requisition_pipeline: {
    pending_ai_scheduling: 7,
    clustered_shadowed: 3,
    approved: 2,
    active: 1,
    completed: 67
  }
};

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/dashboard/kpis");
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

  const formatNumber = (val: number | undefined, isPercent = false, isHours = false, isMins = false) => {
    if (val === undefined || val === null) return "0";
    const formatted = val % 1 === 0 ? val.toString() : val.toFixed(1);
    if (isPercent) return `${formatted}%`;
    if (isHours) return `${formatted} hrs`;
    if (isMins) return `${formatted} min`;
    return formatted;
  };

  const kpis = data ? [
    {
      label: "Overall Asset Availability",
      value: formatNumber(data.kpis.overall_asset_availability, true),
      note: "Track + Signal + OHE composite",
      status: "● Operational",
      icon: Gauge,
      tone: "text-safe",
    },
    {
      label: "Scheduled Blocks",
      value: `${data.kpis.scheduled_blocks} / wk`,
      note: "Projected this month",
      status: "Planning queue",
      icon: Layers,
      tone: "text-trd",
    },
    {
      label: "Shadow Block Savings",
      value: formatNumber(data.kpis.shadow_block_savings, false, true),
      note: "Recovered through coordinated work",
      status: "AI Optimization",
      icon: Clock,
      tone: "text-purple-500",
    },
    {
      label: "Punctuality Impact",
      value: formatNumber(data.kpis.punctuality_impact_index, false, false, true),
      note: "Train delay minutes saved",
      status: "Positive operational impact",
      icon: TrainFront,
      tone: "text-safe",
    },
  ] : [];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Central Executive Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Unified COA + BDMS operations centre for the New Delhi – Varanasi corridor.
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Last updated: {lastRefreshed.toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-safe" />
              Auto-refresh: ON
            </span>
            <button 
              onClick={fetchData}
              disabled={isRefreshing}
              className="ml-2 rounded p-1 transition-colors hover:bg-secondary/80 disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
          <p className="text-xs font-medium text-muted-foreground">AI-assisted block planning</p>
          <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
            <Link to="/optimizer">
              Run Optimization Engine
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="border-l-4 border-l-transparent transition-all hover:border-l-primary hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </p>
                  <k.icon className={`size-5 ${k.tone}`} />
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {k.value}
                </p>
                <div className="mt-3 flex flex-col gap-1 text-[11px]">
                  <p className={`font-medium ${k.status.includes('●') ? 'text-safe' : 'text-foreground'}`}>{k.status}</p>
                  <p className="text-muted-foreground">{k.note}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && (
        <div className="mt-6 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card/50 px-5 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <Map className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">Active Corridors</span>
            <span className="font-bold text-base ml-1">{data.corridor_status.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrainFront className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">Trains Running</span>
            <span className="font-bold text-base ml-1">
              {data.corridor_status.reduce((acc, c) => acc + c.trains_running, 0)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">Urgent Risks</span>
            <span className="font-bold text-base ml-1">{data.urgent_risks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-purple-500" />
            <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">Pending AI Scheduling</span>
            <span className="font-bold text-base ml-1">{data.requisition_pipeline.pending_ai_scheduling}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-safe" />
            <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">Completed Requests</span>
            <span className="font-bold text-base ml-1">{data.requisition_pipeline.completed}</span>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* LIVE CORRIDOR STATUS */}
        <Card className="lg:col-span-2 shadow-sm border-t-2 border-t-primary/20">
          <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="size-4 text-primary" />
              Live Corridor Status Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : data?.corridor_status.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No corridor data available.</div>
            ) : (
              <div className="divide-y divide-border">
                {data?.corridor_status.map((c) => {
                  let intensityColor = "bg-safe";
                  let statusLabel = "Operational";
                  if (c.traffic_intensity > 40) { intensityColor = "bg-blue-500"; statusLabel = "Moderate"; }
                  if (c.traffic_intensity > 70) { intensityColor = "bg-warn"; statusLabel = "Congested"; }
                  if (c.traffic_intensity > 90) { intensityColor = "bg-destructive"; statusLabel = "Restricted"; }

                  return (
                    <div key={c.id} className="group p-5 transition-colors hover:bg-secondary/30">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{c.name}</h3>
                            {c.traffic_intensity > 70 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase tracking-wider font-bold">
                                High Traffic
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className={`size-2 rounded-full ${intensityColor}`}></span>
                              {statusLabel}
                            </span>
                            <span>·</span>
                            <span><strong className="text-foreground">{c.trains_running}</strong> trains running</span>
                            <span>·</span>
                            <span>Window: {c.window}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {c.tracks.map((track) => (
                            <Badge key={track} variant="outline" className="bg-background font-normal text-muted-foreground">
                              {track}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-1.5 flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Traffic intensity</span>
                          <span className={c.traffic_intensity > 90 ? "text-destructive" : "text-foreground"}>
                            {c.traffic_intensity}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                          <div 
                            className={`h-full ${intensityColor} transition-all duration-500`} 
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

        {/* URGENT RISK RADAR */}
        <Card className="flex flex-col shadow-sm border-t-2 border-t-destructive">
          <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldAlert className="size-4 text-destructive" />
              Urgent Risk Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : data?.urgent_risks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No urgent risks detected.</div>
            ) : (
              <div className="divide-y divide-border">
                {data?.urgent_risks
                  .sort((a, b) => {
                    const order: Record<string, number> = { Critical: 1, High: 2, Medium: 3, Low: 4 };
                    return (order[a.severity] || 5) - (order[b.severity] || 5);
                  })
                  .map((r) => {
                  let sevColor = "bg-safe/10 text-safe";
                  let iconColor = "text-safe";
                  if (r.severity === "Critical") { sevColor = "bg-destructive/10 text-destructive border-destructive/20"; iconColor = "text-destructive"; }
                  if (r.severity === "High") { sevColor = "bg-warn/10 text-warn border-warn/20"; iconColor = "text-warn"; }
                  if (r.severity === "Medium") { sevColor = "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"; iconColor = "text-yellow-600"; }

                  return (
                    <div key={r.id} className="p-4 transition-colors hover:bg-secondary/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`size-3.5 ${iconColor}`} />
                          <p className="font-semibold text-sm leading-tight text-foreground">{r.title}</p>
                        </div>
                        <Badge variant="outline" className={`h-5 border text-[10px] uppercase font-bold tracking-wider ${sevColor}`}>
                          {r.severity}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground ml-5.5">
                        <span className="font-mono">{r.id}</span>
                        <span>·</span>
                        <span>{r.location}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed ml-5.5">
                        {r.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          <div className="border-t border-border p-3">
            <Button asChild variant="ghost" className="w-full text-sm">
              <Link to="/requests">
                Open Requisition Ledger <ArrowRight className="ml-2 size-3" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* COA TRAIN PATH FORECAST */}
        <Card className="shadow-sm border-t-2 border-t-blue-500/50">
          <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrainFront className="size-4 text-blue-500" />
              COA Train Path Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : data?.train_forecast.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No train forecasts available.</div>
            ) : (
              <div className="divide-y divide-border">
                {data?.train_forecast.map((t) => {
                  let statusColor = "bg-secondary text-foreground";
                  if (t.status === "On Time") statusColor = "bg-safe/15 text-safe border-safe/20";
                  if (t.status === "Expected") statusColor = "bg-warn/15 text-warn border-warn/20";
                  if (t.status === "Delayed") statusColor = "bg-destructive/15 text-destructive border-destructive/20";

                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 px-5 transition-colors hover:bg-secondary/20">
                      <div className="flex items-center gap-4">
                        <div className="w-20 font-mono text-sm font-bold text-foreground">{t.train}</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{t.corridor}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3" /> {t.time}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`font-semibold tracking-wider text-[10px] uppercase h-5 ${statusColor}`}>
                        {t.status === "On Time" ? "● ON TIME" : t.status === "Expected" ? "● EXPECTED" : t.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* BDMS REQUISITION PIPELINE */}
        <Card className="shadow-sm border-t-2 border-t-primary/20">
          <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Layers className="size-4 text-primary" />
              Requisition Pipeline (BDMS)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : data ? (
              <div className="space-y-5">
                {[
                  { key: "pending_ai_scheduling", label: "Pending AI Scheduling" },
                  { key: "clustered_shadowed", label: "Clustered / Shadowed" },
                  { key: "approved", label: "Approved" },
                  { key: "active", label: "Active" },
                  { key: "completed", label: "Completed" },
                ].map((item) => {
                  const val = data.requisition_pipeline[item.key as keyof RequisitionPipeline];
                  const maxVal = Math.max(
                    10,
                    data.requisition_pipeline.completed,
                    data.requisition_pipeline.pending_ai_scheduling
                  );
                  const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));

                  return (
                    <div key={item.key} className="flex items-center gap-4">
                      <span className="w-44 text-sm font-medium text-muted-foreground">
                        {item.label}
                      </span>
                      <div className="flex-1">
                        <Progress value={pct} className="h-2 bg-secondary" />
                      </div>
                      <span className="w-8 text-right font-mono text-sm font-bold">
                        {val}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-2">
                  <Button asChild variant="outline" className="w-full shadow-sm">
                    <Link to="/planner">
                      View Gantt Planner <Calendar className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* AI PLANNING INTELLIGENCE */}
        <Card className="shadow-sm border border-purple-500/30 bg-gradient-to-br from-card to-purple-900/10">
          <CardHeader className="pb-3 border-b border-purple-500/10">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-purple-500">
              <BrainCircuit className="size-5" />
              AI Planning Intelligence
            </CardTitle>
            <CardDescription className="text-purple-300/70">
              Available for optimization runs
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 text-sm text-foreground">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-purple-500" />
                <span>Conflict-aware block planning</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-purple-500" />
                <span>Shadow block identification</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-purple-500" />
                <span>Train impact estimation</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-purple-500" />
                <span>Resource coordination</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-purple-500" />
                <span>Corridor-aware scheduling</span>
              </div>
            </div>
            <Button asChild className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-semibold">
              <Link to="/optimizer">
                Open Optimization Engine <Zap className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* TODAY'S OPERATIONAL PRIORITIES */}
        <Card className="shadow-sm border-t-2 border-t-primary/20">
          <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertCircle className="size-4 text-primary" />
              Today's Operational Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : data?.urgent_risks.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">No urgent operational priorities.</div>
            ) : (
              <div className="space-y-5">
                {data?.urgent_risks.slice(0, 3).map((r, i) => {
                  let sevColor = "bg-secondary text-foreground";
                  if (r.severity === "Critical") sevColor = "bg-destructive text-destructive-foreground";
                  if (r.severity === "High") sevColor = "bg-warn text-warn-foreground";

                  return (
                    <div key={r.id} className="flex gap-3">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${sevColor}`}>
                        {i + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground leading-none mb-1.5">{r.title}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className={`font-medium ${r.severity === 'Critical' ? 'text-destructive' : r.severity === 'High' ? 'text-warn' : ''}`}>{r.severity}</span> 
                          <span>·</span> 
                          <span>{r.location}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6 shadow-sm border-border bg-secondary/10">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
           <div className="flex items-center gap-2 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
             <Server className="size-4" />
             System Modules
           </div>
           <div className="flex flex-wrap gap-4 md:gap-8">
             {["COA", "BDMS", "TMS", "SMMS", "TDMS", "AI Planning"].map(sys => (
               <div key={sys} className="flex items-center gap-2">
                 <span className="flex size-2">
                   <span className="relative inline-flex size-2 rounded-full bg-safe"></span>
                 </span>
                 <span className="font-semibold text-foreground">{sys}</span>
                 <span className="text-[11px] text-muted-foreground hidden sm:inline uppercase tracking-wider">Integrated</span>
               </div>
             ))}
           </div>
        </CardContent>
      </Card>

    </>
  );
}