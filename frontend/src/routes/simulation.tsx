import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  TrendingUp,
  Activity,
  ShieldCheck,
  ShieldAlert,
  TrainFront,
  Flame,
  Layers,
  FileText,
  Building2,
  Info,
  Server,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "What-If Simulation | IR-ABPS Operations Sandbox" },
      {
        name: "description",
        content:
          "Hypothetical maintenance window testing and operational impact scenario comparison for Indian Railways.",
      },
    ],
  }),
  component: WhatIfSimulationPage,
});

type CorridorOption = {
  corridor_id: string;
  corridor_name: string;
};

type MaintenanceTaskOption = {
  task_id: string;
  description: string;
  department: string;
  priority_category: string;
  estimated_duration_min: number;
};

type SimulationResponse = {
  status: string;
  database_modified: boolean;
  simulation: {
    corridor: string;
    date: string;
    start: string;
    end: string;
    duration_minutes: number;
    priority?: string;
    task_id?: string | null;
    include_goods_demand?: boolean;
  };
  current_plan: {
    block_id: string;
    corridor: string;
    date: string;
    start: string;
    end: string;
    block_duration: number;
    traffic_impact: number;
    goods_demand_impact: number;
    asset_risk: number;
    block_utilization: number;
    train_conflicts: number;
    optimization_score: number;
    number_of_tasks: number;
  };
  what_if_scenario: {
    corridor: string;
    date: string;
    start: string;
    end: string;
    block_duration: number;
    traffic_impact: number;
    goods_demand_impact: number;
    asset_risk: number;
    block_utilization: number;
    train_conflicts: number;
    optimization_score: number;
    number_of_tasks: number;
  };
  comparison_deltas: {
    block_duration: number;
    traffic_impact: number;
    goods_demand_impact: number;
    asset_risk: number;
    block_utilization: number;
    train_conflicts: number;
    optimization_score: number;
    number_of_tasks: number;
  };
  ai_assessment: {
    recommended_scenario: string;
    verdict: string;
    reasons: string[];
    is_what_if_better: boolean;
  };
  impact_breakdown: {
    traffic: {
      passenger_trains: number;
      goods_trains: number;
      special_trains: number;
      express_trains: number;
      total_trains: number;
      score: number;
      estimated_delay: number;
    };
    asset_risk: {
      risk_score: number;
      risk_category: string;
      failure_probability: number;
      maintenance_urgency: string;
      asset_id?: string | null;
      task_description?: string | null;
    };
    goods_demand: {
      forecast_demand: number;
      demand_pressure: number;
      level?: string;
      corridor?: string;
      forecast_date?: string;
      unscheduled_expected?: number;
    };
    schedule_quality: {
      utilization: number;
      conflicts: number;
      optimization_score: number;
      consolidated_tasks: number;
    };
  };
  timeline: {
    corridor_trains: Array<{
      train_id?: string;
      train_number: string;
      train_name: string;
      train_type: string;
      traffic_class: string;
      scheduled_time: string;
    }>;
    current_block: {
      title: string;
      start: string;
      end: string;
      duration_min: number;
    };
    what_if_block: {
      title: string;
      start: string;
      end: string;
      duration_min: number;
    };
  };
  conflicts: Array<{
    train_id: string;
    train_number: string;
    train_name: string;
    train_type: string;
    scheduled_time: string;
    overlap_minutes: number;
    estimated_delay_minutes: number;
    severity?: string;
    operational_priority?: number;
  }>;
};

const DEFAULT_CORRIDORS: CorridorOption[] = [
  { corridor_id: "C01", corridor_name: "New Delhi - Kanpur (NDLS-CNB)" },
  { corridor_id: "C02", corridor_name: "Kanpur - Prayagraj (CNB-PRYJ)" },
  { corridor_id: "C03", corridor_name: "Prayagraj - Pt. Deen Dayal Upadhyaya (PRYJ-DDU)" },
  { corridor_id: "C04", corridor_name: "Ghaziabad - Moradabad (GZB-MB)" },
  { corridor_id: "C05", corridor_name: "Agra Cantt - Jhansi (AGC-VGLB)" },
];

export function WhatIfSimulationPage() {
  const { user } = useAbps();
  const { t } = useLanguage();

  // Form State
  const [corridor, setCorridor] = useState<string>("C02");
  const [maintenanceDate, setMaintenanceDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [proposedStartTime, setProposedStartTime] = useState<string>("11:00");
  const [durationMin, setDurationMin] = useState<number>(120);
  const [priority, setPriority] = useState<string>("HIGH");
  const [taskId, setTaskId] = useState<string>("NONE");
  const [includeGoodsDemand, setIncludeGoodsDemand] = useState<boolean>(true);

  // Data State
  const [corridorsList, setCorridorsList] = useState<CorridorOption[]>(DEFAULT_CORRIDORS);
  const [tasksList, setTasksList] = useState<MaintenanceTaskOption[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [lastSimulatedTime, setLastSimulatedTime] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load Corridors & Tasks
  useEffect(() => {
    async function loadMetadata() {
      try {
        const corrRes = await apiFetch("/corridors/");
        if (corrRes.ok) {
          const cData = await corrRes.json();
          if (cData.corridors && cData.corridors.length > 0) {
            setCorridorsList(cData.corridors);
          }
        }
      } catch (err) {
        console.warn("Could not load corridors list, using defaults.", err);
      }

      try {
        const taskRes = await apiFetch("/maintenance-tasks/");
        if (taskRes.ok) {
          const tData = await taskRes.json();
          if (tData.tasks && Array.isArray(tData.tasks)) {
            setTasksList(tData.tasks);
          }
        } else {
          // Fallback legacy endpoint
          const legRes = await apiFetch("/api/maintenance-tasks");
          if (legRes.ok) {
            const legData = await legRes.json();
            if (Array.isArray(legData)) {
              setTasksList(legData);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load tasks list.", err);
      }
    }

    loadMetadata();
  }, []);

  // Run Simulation Handler
  const handleRunSimulation = async () => {
    setSimulating(true);
    setApiError(null);

    try {
      const payload: Record<string, string | number | boolean> = {
        corridor,
        date: maintenanceDate,
        start: proposedStartTime.length === 5 ? `${proposedStartTime}:00` : proposedStartTime,
        duration_min: Number(durationMin),
        priority,
        include_goods_demand: includeGoodsDemand,
      };

      if (taskId && taskId !== "NONE") {
        payload.task_id = taskId;
      }

      const res = await apiFetch("/optimization/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMessage = `Simulation failed with server status ${res.status}`;
        try {
          const errData = (await res.json()) as { detail?: string; message?: string };
          errMessage = errData.detail || errData.message || errMessage;
        } catch {
          // Ignore JSON parse error on non-json response
        }

        if (res.status === 401) {
          errMessage = "Authentication required. Please authenticate into the officer console.";
        } else if (res.status === 403) {
          errMessage =
            "Access Denied: Simulation requires Senior Officer, Control Office, or Engineering clearance.";
        } else if (res.status === 404) {
          errMessage = "Corridor data or timetable not found for selected date.";
        }

        setApiError(errMessage);
        toast.error(t("Simulation Error", "सिमुलेशन त्रुटि"), { description: errMessage });
        return;
      }

      const data: SimulationResponse = await res.json();
      if (data.status === "error") {
        const errObj = data as unknown as { message?: string };
        const errMsg = errObj.message || "Simulation calculation error";
        setApiError(errMsg);
        toast.error(t("Simulation Failure", "सिमुलेशन असफलता"), {
          description: errMsg,
        });
        return;
      }

      setSimulationResult(data);
      const now = new Date();
      setLastSimulatedTime(now.toLocaleTimeString("en-IN", { hour12: false }));
      toast.success(t("What-If Simulation Computed", "व्हाट-इफ़ सिमुलेशन संगणित"), {
        description: `${data.ai_assessment?.recommended_scenario || "Results generated"} · Cor: ${corridor}`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Network connectivity failure. Unable to reach simulation engine.";
      setApiError(msg);
      toast.error(t("Network Failure", "नेटवर्क त्रुटि"), { description: msg });
    } finally {
      setSimulating(false);
    }
  };

  // Reset Handler
  const handleReset = () => {
    setCorridor("C02");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMaintenanceDate(tomorrow.toISOString().split("T")[0]);
    setProposedStartTime("11:00");
    setDurationMin(120);
    setPriority("HIGH");
    setTaskId("NONE");
    setIncludeGoodsDemand(true);
    setSimulationResult(null);
    setApiError(null);
    toast.info(t("Simulation Parameters Reset", "सिमुलेशन पैरामीटर रीसेट किए गए"));
  };

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (!simulationResult) return [];

    const curr = simulationResult.current_plan;
    const whatIf = simulationResult.what_if_scenario;

    return [
      {
        category: "Traffic Impact",
        current: Number(curr.traffic_impact) || 0,
        whatIf: Number(whatIf.traffic_impact) || 0,
      },
      {
        category: "Goods Impact",
        current: Number(curr.goods_demand_impact) || 0,
        whatIf: Number(whatIf.goods_demand_impact) || 0,
      },
      {
        category: "Asset Risk",
        current: Number(curr.asset_risk) || 0,
        whatIf: Number(whatIf.asset_risk) || 0,
      },
      {
        category: "Utilization %",
        current: Number(curr.block_utilization) || 0,
        whatIf: Number(whatIf.block_utilization) || 0,
      },
      {
        category: "Score",
        current: Number(curr.optimization_score) || 0,
        whatIf: Number(whatIf.optimization_score) || 0,
      },
    ];
  }, [simulationResult]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. PAGE HEADER */}
      <div className="border-b-2 border-[#003366] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[11px] font-bold uppercase tracking-wider bg-[#003366] text-white">
              <SlidersHorizontal className="size-3.5 text-[#FF9933]" />
              WHAT-IF SIMULATION
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
              <ShieldCheck className="size-3 text-amber-700 dark:text-amber-400" />
              SIMULATION MODE: LIVE SCHEDULE UNCHANGED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {t("What-If Simulation", "व्हाट-इफ़ सिमुलेशन")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {t(
              "Test alternative maintenance windows and compare their operational impact before making a scheduling decision.",
              "वैकल्पिक रखरखाव विंडो का परीक्षण करें और शेड्यूलिंग निर्णय लेने से पहले उनके परिचालन प्रभाव की तुलना करें।",
            )}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end text-xs font-mono text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {lastSimulatedTime ? `Last simulated: ${lastSimulatedTime}` : "Ready for simulation"}
          </span>
          <span className="text-[10px] text-[#137547] font-bold flex items-center gap-1 mt-0.5">
            <span className="size-2 rounded-full bg-[#137547] animate-pulse" />
            ISOLATED READ-ONLY ENGINE
          </span>
        </div>
      </div>

      {/* Error Alert if any */}
      {apiError && (
        <div className="border-l-4 border-destructive bg-red-50 dark:bg-red-950/50 p-4 rounded-[2px] text-destructive flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">{t("Simulation Advisory", "सिमुलेशन परामर्श")}</h3>
              <p className="text-xs mt-0.5 text-red-700 dark:text-red-300">{apiError}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApiError(null)}
            className="text-xs h-7 border-destructive/50"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* TWO COLUMN WORKSPACE (Desktop: Config / Results; Mobile: Stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2. SIMULATION INPUT PANEL (Left 4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-2 border-slate-300 dark:border-slate-800 shadow-sm rounded-[2px]">
            <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wide text-[#003366] dark:text-sky-400 flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-[#FF9933]" />
                  {t("Simulation Scenario", "सिमुलेशन परिदृश्य")}
                </CardTitle>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[2px]">
                  SANDBOX
                </span>
              </div>
              <CardDescription className="text-[11px] text-slate-500">
                {t(
                  "Configure parameters to model track occupancy without altering active blocks.",
                  "सक्रिय ब्लॉक बदले बिना ट्रैक अधिभोग का मॉडल करने के लिए पैरामीटर कॉन्फ़िगर करें।",
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Corridor */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="sim-corridor"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {t("A. Railway Corridor", "क. रेलवे कॉरिडोर")}
                </Label>
                <Select value={corridor} onValueChange={setCorridor}>
                  <SelectTrigger
                    id="sim-corridor"
                    className="w-full h-9 rounded-[2px] text-xs font-medium border-slate-300 dark:border-slate-700"
                  >
                    <SelectValue placeholder="Select corridor" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2px]">
                    {corridorsList.map((c) => (
                      <SelectItem key={c.corridor_id} value={c.corridor_id} className="text-xs">
                        <span className="font-bold font-mono mr-1.5">{c.corridor_id}</span>
                        <span>{c.corridor_name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Maintenance Date */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="sim-date"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {t("B. Maintenance Date", "ख. अनुरक्षण तिथि")}
                </Label>
                <div className="relative">
                  <Input
                    id="sim-date"
                    type="date"
                    value={maintenanceDate}
                    onChange={(e) => setMaintenanceDate(e.target.value)}
                    className="h-9 rounded-[2px] text-xs font-mono border-slate-300 dark:border-slate-700 pl-8"
                  />
                  <Calendar className="absolute left-2.5 top-2.5 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Start Time & Duration in 2 cols */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="sim-time"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t("C. Start Time", "ग. प्रस्तावित समय")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="sim-time"
                      type="time"
                      value={proposedStartTime}
                      onChange={(e) => setProposedStartTime(e.target.value)}
                      className="h-9 rounded-[2px] text-xs font-mono border-slate-300 dark:border-slate-700 pl-8"
                    />
                    <Clock className="absolute left-2.5 top-2.5 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="sim-duration"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t("D. Duration", "घ. अवधि")}
                  </Label>
                  <Select
                    value={String(durationMin)}
                    onValueChange={(val) => setDurationMin(Number(val))}
                  >
                    <SelectTrigger
                      id="sim-duration"
                      className="w-full h-9 rounded-[2px] text-xs font-medium border-slate-300 dark:border-slate-700"
                    >
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2px]">
                      <SelectItem value="30" className="text-xs font-mono">
                        30 min (0.5h)
                      </SelectItem>
                      <SelectItem value="60" className="text-xs font-mono">
                        60 min (1.0h)
                      </SelectItem>
                      <SelectItem value="90" className="text-xs font-mono">
                        90 min (1.5h)
                      </SelectItem>
                      <SelectItem value="120" className="text-xs font-mono">
                        120 min (2.0h)
                      </SelectItem>
                      <SelectItem value="180" className="text-xs font-mono">
                        180 min (3.0h)
                      </SelectItem>
                      <SelectItem value="240" className="text-xs font-mono">
                        240 min (4.0h)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="sim-priority"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {t("E. Maintenance Priority", "ङ. रखरखाव प्राथमिकता")}
                </Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger
                    id="sim-priority"
                    className="w-full h-9 rounded-[2px] text-xs font-bold border-slate-300 dark:border-slate-700"
                  >
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2px]">
                    <SelectItem
                      value="LOW"
                      className="text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      LOW (Routine Work)
                    </SelectItem>
                    <SelectItem
                      value="MEDIUM"
                      className="text-xs font-bold text-amber-600 dark:text-amber-400"
                    >
                      MEDIUM (Scheduled Cyclic)
                    </SelectItem>
                    <SelectItem
                      value="HIGH"
                      className="text-xs font-bold text-orange-600 dark:text-orange-400"
                    >
                      HIGH (Safety Priority)
                    </SelectItem>
                    <SelectItem value="CRITICAL" className="text-xs font-bold text-destructive">
                      CRITICAL (IMR Flaw / Defect)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Maintenance Task */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="sim-task"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t("F. Maintenance Task", "च. अनुरक्षण कार्य")}
                  </Label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger
                    id="sim-task"
                    className="w-full h-9 rounded-[2px] text-xs font-medium border-slate-300 dark:border-slate-700"
                  >
                    <SelectValue placeholder="Select maintenance task..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2px] max-h-56">
                    <SelectItem value="NONE" className="text-xs text-muted-foreground italic">
                      -- None (Synthetic Proposed Window) --
                    </SelectItem>
                    {tasksList.map((tsk) => (
                      <SelectItem key={tsk.task_id} value={tsk.task_id} className="text-xs">
                        <div className="flex flex-col py-0.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {tsk.task_id} · [{tsk.department}]
                          </span>
                          <span className="text-[10px] text-slate-500 truncate max-w-xs">
                            {tsk.description} ({tsk.estimated_duration_min} min)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Goods Demand Toggle */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="goods-demand-toggle"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {t("Include Goods Demand Impact", "मालगाड़ी मांग प्रभाव शामिल करें")}
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    {t("Evaluates freight corridor pressure", "मालगाड़ी कॉरिडोर दबाव का मूल्यांकन")}
                  </p>
                </div>
                <Switch
                  id="goods-demand-toggle"
                  checked={includeGoodsDemand}
                  onCheckedChange={setIncludeGoodsDemand}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
                <Button
                  id="btn-run-simulation"
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="flex-1 h-10 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-[2px] cursor-pointer shadow-xs"
                >
                  <SlidersHorizontal className="size-4 mr-2 text-[#FF9933]" />
                  {simulating
                    ? t("Simulating...", "सिमुलेशन जारी...")
                    : t("Run Simulation", "सिमुलेशन चलाएं")}
                </Button>

                <Button
                  id="btn-reset-simulation"
                  variant="outline"
                  onClick={handleReset}
                  disabled={simulating}
                  className="h-10 rounded-[2px] text-xs font-semibold border-slate-300 dark:border-slate-700"
                >
                  <RotateCcw className="size-3.5 mr-1.5 text-slate-500" />
                  {t("Reset", "रीसेट")}
                </Button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] font-mono text-slate-400">
                  {t(
                    "Execution is 100% isolated · DB schedules unmodified",
                    "निष्पादन 100% पृथक है · डीबी शेड्यूल अपरिवर्तित",
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RESULTS PANEL (Right 8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {!simulationResult && !simulating && (
            <Card className="border-2 border-dashed border-slate-300 dark:border-slate-800 p-8 text-center rounded-[2px] bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                <div className="size-14 rounded-full bg-[#003366]/10 dark:bg-sky-950 flex items-center justify-center text-[#003366] dark:text-sky-400">
                  <SlidersHorizontal className="size-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                  {t("No Simulation Executed Yet", "अभी तक कोई सिमुलेशन निष्पादित नहीं हुआ")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t(
                    "Configure your proposed corridor, date, time window, and click 'Run Simulation' to evaluate predicted operational impact against the current schedule.",
                    "वर्तमान शेड्यूल के विरुद्ध अनुमानित परिचालन प्रभाव का मूल्यांकन करने के लिए अपना प्रस्तावित कॉरिडोर, तिथि, समय विंडो कॉन्फ़िगर करें और 'सिमुलेशन चलाएं' पर क्लिक करें।",
                  )}
                </p>
                <Button
                  onClick={handleRunSimulation}
                  className="mt-2 h-9 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-[2px]"
                >
                  <SlidersHorizontal className="size-3.5 mr-1.5 text-[#FF9933]" />
                  {t("Run Quick Scenario on Corridor C02", "कॉरिडोर C02 पर त्वरित परिदृश्य चलाएं")}
                </Button>
              </div>
            </Card>
          )}

          {simulating && (
            <Card className="border-2 border-[#003366] p-12 text-center rounded-[2px] bg-white dark:bg-slate-900">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="size-12 rounded-full border-4 border-[#003366] border-t-transparent animate-spin" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#003366] dark:text-sky-400 uppercase tracking-wider">
                    {t(
                      "Evaluating What-If Scenario...",
                      "व्हाट-इफ़ परिदृश्य का मूल्यांकन किया जा रहा है...",
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t(
                      "Loading passenger & goods timetable, checking track overlap conflicts, evaluating risk scores...",
                      "यात्री एवं मालगाड़ी समय सारिणी लोड करना, ट्रैक ओवरलैप विवादों की जांच, जोखिम स्कोर का मूल्यांकन...",
                    )}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {simulationResult && !simulating && (
            <>
              {/* 6. SCENARIO DECISION SUMMARY (PROMINENT ASSESSMENT) */}
              <div
                className={`p-4 sm:p-5 rounded-[2px] border-2 shadow-sm ${
                  simulationResult.ai_assessment.is_what_if_better
                    ? "bg-[#137547]/10 border-[#137547] text-slate-900 dark:text-slate-100"
                    : "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-slate-100"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-current/20">
                  <div className="flex items-center gap-2">
                    {simulationResult.ai_assessment.is_what_if_better ? (
                      <CheckCircle2 className="size-5 text-[#137547] shrink-0" />
                    ) : (
                      <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider">
                        {t("SCENARIO ASSESSMENT & DECISION ENGINE", "परिदृश्य मूल्यांकन एवं निर्णय इंजन")}
                      </span>
                      <h2 className="text-base font-extrabold tracking-tight">
                        {simulationResult.ai_assessment.recommended_scenario === "WHAT-IF SCENARIO"
                          ? t(
                              "Recommended: What-If Window is Operationally Favorable",
                              "अनुशंसित: व्हाट-इफ़ विंडो परिचालन दृष्टि से अनुकूल है",
                            )
                          : t(
                              "Recommended: Current Schedule Remains Superior",
                              "अनुशंसित: वर्तमान शेड्यूल बेहतर बना हुआ है",
                            )}
                      </h2>
                    </div>
                  </div>

                  <Badge
                    className={`font-mono font-bold text-xs uppercase px-2.5 py-1 rounded-[2px] ${
                      simulationResult.ai_assessment.is_what_if_better
                        ? "bg-[#137547] text-white hover:bg-[#137547]"
                        : "bg-amber-600 text-white hover:bg-amber-600"
                    }`}
                  >
                    {simulationResult.ai_assessment.recommended_scenario}
                  </Badge>
                </div>

                <div className="mt-3 text-xs sm:text-sm font-medium">
                  <p className="mb-2 font-bold text-slate-800 dark:text-slate-200">
                    {simulationResult.ai_assessment.verdict}
                  </p>
                  <ul className="space-y-1.5">
                    {simulationResult.ai_assessment.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <span
                          className={`font-bold ${
                            simulationResult.ai_assessment.is_what_if_better
                              ? "text-[#137547]"
                              : "text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {simulationResult.ai_assessment.is_what_if_better ? "✓" : "⚠"}
                        </span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 3. CURRENT PLAN vs WHAT-IF (SCENARIO COMPARISON) */}
              <Card className="border-2 border-slate-300 dark:border-slate-800 rounded-[2px] shadow-sm">
                <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Layers className="size-4 text-[#003366] dark:text-sky-400" />
                        {t("Scenario Comparison", "परिदृश्य तुलना")}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        {t(
                          "Direct side-by-side metric comparison between live baseline and proposed window.",
                          "लाइव बेसलाइन और प्रस्तावित विंडो के बीच सीधा मीट्रिक तुलना।",
                        )}
                      </CardDescription>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">
                      Corridor: {simulationResult.simulation.corridor}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                        <th className="p-3.5 pl-4">{t("Operational Metric", "परिचालन मीट्रिक")}</th>
                        <th className="p-3.5 text-center bg-slate-100/50 dark:bg-slate-900/40">
                          {t("Current Optimized Plan", "वर्तमान अनुकूलित योजना")}
                        </th>
                        <th className="p-3.5 text-center bg-[#003366]/5 dark:bg-sky-950/30 text-[#003366] dark:text-sky-300">
                          {t("What-If Scenario", "व्हाट-इफ़ परिदृश्य")}
                        </th>
                        <th className="p-3.5 text-right pr-4">{t("Net Delta", "शुद्ध अंतर")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {/* Block Duration */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3 pl-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          Block Duration
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {simulationResult.current_plan.block_duration} min
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 bg-[#003366]/5 dark:bg-sky-950/20">
                          {simulationResult.what_if_scenario.block_duration} min
                        </td>
                        <td className="p-3 text-right pr-4 text-slate-600">
                          {simulationResult.comparison_deltas.block_duration > 0
                            ? `+${simulationResult.comparison_deltas.block_duration} min`
                            : simulationResult.comparison_deltas.block_duration < 0
                              ? `${simulationResult.comparison_deltas.block_duration} min`
                              : "0 min"}
                        </td>
                      </tr>

                      {/* Traffic Impact */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3 pl-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          Traffic Impact
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {simulationResult.current_plan.traffic_impact.toFixed(1)}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 bg-[#003366]/5 dark:bg-sky-950/20">
                          {simulationResult.what_if_scenario.traffic_impact.toFixed(1)}
                        </td>
                        <td className="p-3 text-right pr-4 font-bold">
                          {simulationResult.comparison_deltas.traffic_impact < 0 ? (
                            <span className="text-[#137547] inline-flex items-center gap-0.5">
                              <TrendingDown className="size-3.5" />↓{" "}
                              {Math.abs(simulationResult.comparison_deltas.traffic_impact).toFixed(
                                1,
                              )}
                            </span>
                          ) : simulationResult.comparison_deltas.traffic_impact > 0 ? (
                            <span className="text-destructive inline-flex items-center gap-0.5">
                              <TrendingUp className="size-3.5" />↑{" "}
                              {simulationResult.comparison_deltas.traffic_impact.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-500">0.0</span>
                          )}
                        </td>
                      </tr>

                      {/* Goods Demand Impact */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3 pl-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          Goods Demand Impact
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {simulationResult.current_plan.goods_demand_impact.toFixed(1)}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 bg-[#003366]/5 dark:bg-sky-950/20">
                          {simulationResult.what_if_scenario.goods_demand_impact.toFixed(1)}
                        </td>
                        <td className="p-3 text-right pr-4">
                          {simulationResult.comparison_deltas.goods_demand_impact < 0 ? (
                            <span className="text-[#137547] font-bold">
                              ↓{" "}
                              {Math.abs(
                                simulationResult.comparison_deltas.goods_demand_impact,
                              ).toFixed(1)}
                            </span>
                          ) : simulationResult.comparison_deltas.goods_demand_impact > 0 ? (
                            <span className="text-destructive font-bold">
                              ↑ {simulationResult.comparison_deltas.goods_demand_impact.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-500">0.0</span>
                          )}
                        </td>
                      </tr>

                      {/* Asset Risk */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3 pl-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          Asset Risk
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {simulationResult.current_plan.asset_risk.toFixed(1)}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 bg-[#003366]/5 dark:bg-sky-950/20">
                          {simulationResult.what_if_scenario.asset_risk.toFixed(1)}
                        </td>
                        <td className="p-3 text-right pr-4 font-bold">
                          {simulationResult.comparison_deltas.asset_risk < 0 ? (
                            <span className="text-[#137547]">
                              ↓ {Math.abs(simulationResult.comparison_deltas.asset_risk).toFixed(1)}
                            </span>
                          ) : simulationResult.comparison_deltas.asset_risk > 0 ? (
                            <span className="text-amber-600">
                              ↑ {simulationResult.comparison_deltas.asset_risk.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-500">0.0</span>
                          )}
                        </td>
                      </tr>

                      {/* Block Utilization */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3 pl-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          Block Utilization
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {simulationResult.current_plan.block_utilization.toFixed(1)}%
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 bg-[#003366]/5 dark:bg-sky-950/20">
                          {simulationResult.what_if_scenario.block_utilization.toFixed(1)}%
                        </td>
                        <td className="p-3 text-right pr-4 font-bold">
                          {simulationResult.comparison_deltas.block_utilization > 0 ? (
                            <span className="text-[#137547] inline-flex items-center gap-0.5">
                              <ArrowUpRight className="size-3.5" />↑{" "}
                              {simulationResult.comparison_deltas.block_utilization.toFixed(1)}%
                            </span>
                          ) : simulationResult.comparison_deltas.block_utilization < 0 ? (
                            <span className="text-destructive inline-flex items-center gap-0.5">
                              <ArrowDownRight className="size-3.5" />↓{" "}
                              {Math.abs(
                                simulationResult.comparison_deltas.block_utilization,
                              ).toFixed(1)}
                              %
                            </span>
                          ) : (
                            <span className="text-slate-500">0.0%</span>
                          )}
                        </td>
                      </tr>

                      {/* Train Conflicts */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3 pl-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          Train Conflicts
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {simulationResult.current_plan.train_conflicts}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 bg-[#003366]/5 dark:bg-sky-950/20">
                          {simulationResult.what_if_scenario.train_conflicts}
                        </td>
                        <td className="p-3 text-right pr-4 font-bold">
                          {simulationResult.comparison_deltas.train_conflicts < 0 ? (
                            <span className="text-[#137547]">
                              ↓ {Math.abs(simulationResult.comparison_deltas.train_conflicts)}
                            </span>
                          ) : simulationResult.comparison_deltas.train_conflicts > 0 ? (
                            <span className="text-destructive">
                              ↑ {simulationResult.comparison_deltas.train_conflicts}
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                      </tr>

                      {/* Optimization Score */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 bg-slate-50/30 dark:bg-slate-950/20">
                        <td className="p-3.5 pl-4 font-sans font-bold text-[#003366] dark:text-sky-400">
                          Optimization Score
                        </td>
                        <td className="p-3.5 text-center font-extrabold text-slate-700 dark:text-slate-300">
                          {simulationResult.current_plan.optimization_score.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center font-extrabold text-base text-[#003366] dark:text-sky-400 bg-[#003366]/10 dark:bg-sky-950/40">
                          {simulationResult.what_if_scenario.optimization_score.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right pr-4 font-extrabold">
                          {simulationResult.comparison_deltas.optimization_score > 0 ? (
                            <span className="text-[#137547] inline-flex items-center gap-1">
                              <TrendingUp className="size-4" />↑{" "}
                              {simulationResult.comparison_deltas.optimization_score.toFixed(2)}
                            </span>
                          ) : simulationResult.comparison_deltas.optimization_score < 0 ? (
                            <span className="text-destructive inline-flex items-center gap-1">
                              <TrendingDown className="size-4" />↓{" "}
                              {Math.abs(
                                simulationResult.comparison_deltas.optimization_score,
                              ).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-500">0.00</span>
                          )}
                        </td>
                      </tr>

                      {/* Number of Tasks */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3 pl-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          Maintenance Tasks Consolidated
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {simulationResult.current_plan.number_of_tasks}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 bg-[#003366]/5 dark:bg-sky-950/20">
                          {simulationResult.what_if_scenario.number_of_tasks}
                        </td>
                        <td className="p-3 text-right pr-4 text-slate-600">
                          {simulationResult.comparison_deltas.number_of_tasks >= 0
                            ? `+${simulationResult.comparison_deltas.number_of_tasks}`
                            : `${simulationResult.comparison_deltas.number_of_tasks}`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* 4. SCENARIO IMPACT BREAKDOWN (4 COMPACT CARDS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* TRAFFIC IMPACT CARD */}
                <Card className="border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-xs">
                  <CardHeader className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <TrainFront className="size-3.5 text-[#003366] dark:text-sky-400" />
                      Traffic Impact
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold">
                      {simulationResult.impact_breakdown.traffic.score} pts
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Passenger trains:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.traffic.passenger_trains}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Goods trains:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.traffic.goods_trains}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Special trains:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.traffic.special_trains}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Express trains:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.traffic.express_trains}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                      <span>Overall Impact:</span>
                      <span className="font-mono text-[#003366] dark:text-sky-400">
                        {simulationResult.impact_breakdown.traffic.score.toFixed(1)} / 100
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* ASSET RISK CARD */}
                <Card className="border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-xs">
                  <CardHeader className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Flame className="size-3.5 text-orange-600" />
                      Asset Risk
                    </span>
                    <Badge
                      className={`text-[10px] font-mono font-bold uppercase rounded-[2px] ${
                        simulationResult.impact_breakdown.asset_risk.risk_category === "CRITICAL"
                          ? "bg-destructive text-white"
                          : simulationResult.impact_breakdown.asset_risk.risk_category === "HIGH"
                            ? "bg-orange-600 text-white"
                            : "bg-emerald-600 text-white"
                      }`}
                    >
                      {simulationResult.impact_breakdown.asset_risk.risk_category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Risk score:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.asset_risk.risk_score.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Risk category:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {simulationResult.impact_breakdown.asset_risk.risk_category}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Failure probability:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {(
                          simulationResult.impact_breakdown.asset_risk.failure_probability * 100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Maintenance urgency:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {simulationResult.impact_breakdown.asset_risk.maintenance_urgency}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 truncate text-[10px] text-slate-500">
                      Asset:{" "}
                      {simulationResult.impact_breakdown.asset_risk.asset_id || "Network Average"}
                    </div>
                  </CardContent>
                </Card>

                {/* GOODS DEMAND CARD */}
                <Card className="border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-xs">
                  <CardHeader className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-[#137547]" />
                      Goods Demand
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold">
                      {simulationResult.impact_breakdown.goods_demand.level || "ACTIVE"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Forecast demand:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.goods_demand.forecast_demand} trains/d
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Demand pressure:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.goods_demand.demand_pressure} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Corridor:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.goods_demand.corridor ||
                          simulationResult.simulation.corridor}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Forecast date:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.goods_demand.forecast_date ||
                          simulationResult.simulation.date}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                      <span>Unscheduled freight:</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">
                        {simulationResult.impact_breakdown.goods_demand.unscheduled_expected ?? 1.5}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* SCHEDULE QUALITY CARD */}
                <Card className="border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-xs">
                  <CardHeader className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-[#003366] dark:text-sky-400" />
                      Schedule Quality
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-bold text-[#003366]"
                    >
                      {simulationResult.impact_breakdown.schedule_quality.optimization_score.toFixed(
                        1,
                      )}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Utilization:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.schedule_quality.utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Conflicts:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.schedule_quality.conflicts}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Optimization score:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.schedule_quality.optimization_score.toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Consolidated tasks:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.impact_breakdown.schedule_quality.consolidated_tasks}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                      <span>Status:</span>
                      <span className="text-[#137547]">Punctuality Safe</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 5. VISUAL COMPARISON CHART */}
              <Card className="border-2 border-slate-300 dark:border-slate-800 rounded-[2px] shadow-sm">
                <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Activity className="size-4 text-[#003366] dark:text-sky-400" />
                        {t(
                          "Visual Comparison: Current Plan vs What-If",
                          "दृश्य तुलना: वर्तमान योजना बनाम व्हाट-इफ़",
                        )}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        {t(
                          "Comparative operational indices normalized across safety, asset risk, and utilization.",
                          "सुरक्षा, परिसंपत्ति जोखिम और उपयोग में सामान्यीकृत तुलनात्मक परिचालन सूचकांक।",
                        )}
                      </CardDescription>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">
                      RANGE: 0 - 100 INDEX
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="category"
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
                          domain={[0, 100]}
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
                          dataKey="current"
                          name="Current Plan Baseline"
                          fill="#94A3B8"
                          radius={[2, 2, 0, 0]}
                          barSize={28}
                        />
                        <Bar
                          dataKey="whatIf"
                          name="What-If Proposed Window"
                          fill="#003366"
                          radius={[2, 2, 0, 0]}
                          barSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 7. TIMELINE VISUALIZATION */}
              <Card className="border-2 border-slate-300 dark:border-slate-800 rounded-[2px] shadow-sm">
                <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <CardTitle className="text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Clock className="size-4 text-[#003366] dark:text-sky-400" />
                        {t(
                          "Corridor Train Traffic & Block Overlay Timeline",
                          "कॉरिडोर ट्रेन ट्रैफ़िक एवं ब्लॉक ओवरले टाइमलाइन",
                        )}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        {t(
                          "Live train schedules alongside Current Block vs What-If proposed window.",
                          "लाइव ट्रेन शेड्यूल के साथ वर्तमान ब्लॉक बनाम व्हाट-इफ़ प्रस्तावित विंडो।",
                        )}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <span className="size-2 rounded-full bg-slate-500" /> Scheduled Trains
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className="size-2 rounded-full bg-slate-400" /> Current Block
                      </span>
                      <span className="flex items-center gap-1 text-[#003366] dark:text-sky-400 font-bold">
                        <span className="size-2 rounded-full bg-[#003366] dark:bg-sky-400" />{" "}
                        What-If Window
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Train Traffic Sequence */}
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 block">
                      {t("Existing Train Traffic Sequence", "विद्यमान ट्रेन ट्रैफ़िक अनुक्रम")}
                    </span>

                    <div className="flex items-center gap-2.5 overflow-x-auto pb-3 [scrollbar-width:thin]">
                      {simulationResult.timeline.corridor_trains.map((train, idx) => (
                        <div
                          key={idx}
                          className="shrink-0 border border-slate-300 dark:border-slate-700 rounded-[2px] p-2 bg-white dark:bg-slate-950 min-w-[130px] shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                            <span>{train.scheduled_time}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 ${
                                train.train_type === "GOODS"
                                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                                  : train.train_type === "SPECIAL"
                                    ? "border-purple-600 text-purple-700 dark:text-purple-400"
                                    : "border-sky-600 text-sky-700 dark:text-sky-400"
                              }`}
                            >
                              {train.train_type}
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                            {train.train_name}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{train.train_number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Window Overlays */}
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    {/* Current Block Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {simulationResult.timeline.current_block.title}
                        </span>
                        <span className="text-slate-500">
                          {simulationResult.timeline.current_block.start} ───{" "}
                          {simulationResult.timeline.current_block.end} (
                          {simulationResult.timeline.current_block.duration_min} min)
                        </span>
                      </div>
                      <div className="h-6 w-full bg-slate-200 dark:bg-slate-800 rounded-[2px] overflow-hidden flex items-center px-3 border border-slate-300 dark:border-slate-700">
                        <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 tracking-wider">
                          ACTIVE OPTIMIZED CORRIDOR SHUTDOWN
                        </span>
                      </div>
                    </div>

                    {/* What-If Block Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-[#003366] dark:text-sky-400">
                          {simulationResult.timeline.what_if_block.title}
                        </span>
                        <span className="font-bold text-[#003366] dark:text-sky-400">
                          {simulationResult.timeline.what_if_block.start} ───{" "}
                          {simulationResult.timeline.what_if_block.end} (
                          {simulationResult.timeline.what_if_block.duration_min} min)
                        </span>
                      </div>
                      <div className="h-7 w-full bg-[#003366] text-white rounded-[2px] overflow-hidden flex items-center justify-between px-3 border-2 border-[#FF9933] shadow-xs">
                        <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                          <SlidersHorizontal className="size-3 text-[#FF9933]" />
                          PROPOSED WHAT-IF SIMULATION WINDOW
                        </span>
                        <span className="text-[10px] font-mono text-sky-200">
                          PRIORITY: {simulationResult.simulation.priority || "HIGH"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 8. CONFLICT ALERT */}
              {simulationResult.conflicts.length > 0 ? (
                <div className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 rounded-[2px]">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                          {t(
                            "Potential Operational Conflict Detected",
                            "संभावित परिचालन विवाद का पता चला",
                          )}
                        </h3>
                        <Badge className="bg-amber-600 text-white font-mono text-[10px] rounded-[2px]">
                          {simulationResult.conflicts.length} CONFLICT(S)
                        </Badge>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                        {t(
                          "The proposed maintenance window overlaps with active train schedules on this corridor.",
                          "प्रस्तावित रखरखाव विंडो इस कॉरिडोर पर सक्रिय ट्रेन शेड्यूल के साथ ओवरलैप करती है।",
                        )}
                      </p>

                      {/* Conflict Table */}
                      <div className="mt-3 overflow-x-auto border border-amber-300 dark:border-amber-800 rounded-[2px] bg-white dark:bg-slate-900">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-amber-100/60 dark:bg-amber-950/60 text-[10px] font-extrabold uppercase text-amber-900 dark:text-amber-200 border-b border-amber-300 dark:border-amber-800 font-mono">
                            <tr>
                              <th className="p-2.5">Train</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Scheduled</th>
                              <th className="p-2.5">Overlap</th>
                              <th className="p-2.5">Delay Est.</th>
                              <th className="p-2.5">Severity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                            {simulationResult.conflicts.map((conf, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/50">
                                <td className="p-2.5 font-bold font-sans">
                                  #{conf.train_number} {conf.train_name}
                                </td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                                    {conf.train_type}
                                  </Badge>
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                  {conf.scheduled_time || "11:20"}
                                </td>
                                <td className="p-2.5 font-bold text-amber-700 dark:text-amber-400">
                                  {conf.overlap_minutes} min
                                </td>
                                <td className="p-2.5 text-slate-700 dark:text-slate-300">
                                  +{conf.estimated_delay_minutes} min
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase ${
                                      conf.severity === "CRITICAL"
                                        ? "bg-destructive text-white"
                                        : conf.severity === "HIGH"
                                          ? "bg-orange-600 text-white"
                                          : "bg-amber-100 text-amber-900 border border-amber-300"
                                    }`}
                                  >
                                    {conf.severity || "MEDIUM"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-[#137547] bg-[#137547]/10 p-4 sm:p-5 rounded-[2px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-[#137547] shrink-0" />
                    <div>
                      <h3 className="text-sm font-extrabold text-[#137547] dark:text-emerald-400 uppercase tracking-wide">
                        {t("No Train Conflicts Detected", "कोई ट्रेन विवाद नहीं मिला")}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {t(
                          "The proposed maintenance window has zero overlapping scheduled train paths on Corridor ",
                          "प्रस्तावित रखरखाव विंडो में कॉरिडोर पर कोई ओवरलैपिंग ट्रेन पथ नहीं है ",
                        )}
                        <span className="font-mono font-bold">
                          {simulationResult.simulation.corridor}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-[#137547] text-white font-mono text-[10px] rounded-[2px]">
                    CLEAR CORRIDOR
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
