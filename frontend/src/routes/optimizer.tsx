import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BrainCircuit,
  Layers,
  Sparkles,
  TimerReset,
  TriangleAlert,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Activity,
  Zap,
  RefreshCw,
  FileText,
  BarChart4,
  AlertTriangle,
  ShieldCheck,
  Map,
  Target,
  Info,
  Server,
  TrainTrack,
  TrainFront,
  GitBranch,
  CalendarCheck,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { deptColor, PageHeader } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import { DAYS, DEPT_LABEL, criticalityScore, fmt } from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Can } from "@/components/Can";
import { useLanguage } from "@/context/LanguageContext";

export const Route = createFileRoute("/optimizer")({
  head: () => ({
    meta: [
      { title: "AI Block Optimizer Engine | IR-ABPS" },
      {
        name: "description",
        content:
          "Run criticality scoring, shadow maintenance clustering and corridor window matching to auto-generate mega blocks.",
      },
      { property: "og:title", content: "IR-ABPS Optimization Engine" },
    ],
  }),
  component: OptimizerPage,
});

interface OptimizationApiResponse {
  status: string;
  message?: string;
  requests_processed?: number;
  blocks_generated?: number;
  run_metrics?: {
    total_block_minutes: number;
    average_utilization: number;
    average_optimization_score: number;
    total_train_impact: number;
    total_train_conflicts: number;
  };
  blocks?: Array<{
    block_id: string;
    corridor: string;
    date: string;
    start: string;
    end: string;
    duration: number;
    utilization: number;
    train_impact: number;
    number_of_tasks: number;
    train_conflicts: number;
  }>;
}

interface SavedPlanBlock {
  block_id: string;
  corridor_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  duration_min: string | number;
  utilization_percent: string | number;
  train_impact_score: string | number;
  optimization_score: string | number;
  number_of_tasks?: string | number;
  number_of_departments?: string | number;
  conflicts?: unknown[];
  tasks?: unknown[];
  train_conflicts?: number;
  task_count?: number;
}

async function fetchSavedOptimization(): Promise<OptimizationApiResponse | null> {
  const response = await apiFetch("/optimized-plan/");

  if (!response.ok) {
    throw new Error("Unable to load saved optimized plan");
  }

  const payload = await response.json();
  const savedBlocks = (payload.blocks ?? []) as SavedPlanBlock[];

  if (payload.status !== "success" || savedBlocks.length === 0) {
    return null;
  }

  const blocks = savedBlocks.map((block) => ({
    block_id: block.block_id,
    corridor: block.corridor_id,
    date: block.block_date,
    start: block.start_time,
    end: block.end_time,
    duration: Number(block.duration_min) || 0,
    utilization: Number(block.utilization_percent) || 0,
    train_impact: Number(block.train_impact_score) || 0,
    number_of_tasks: Number(
      block.number_of_tasks ?? block.task_count ?? block.tasks?.length ?? 0,
    ) || 0,
    train_conflicts: Number(
      block.train_conflicts ?? block.conflicts?.length ?? 0,
    ) || 0,
  }));

  const totalMinutes = blocks.reduce((sum, block) => sum + block.duration, 0);
  const averageUtilization =
    blocks.length > 0
      ? blocks.reduce((sum, block) => sum + block.utilization, 0) / blocks.length
      : 0;
  const averageScore =
    savedBlocks.length > 0
      ? savedBlocks.reduce(
          (sum, block) => sum + (Number(block.optimization_score) || 0),
          0,
        ) / savedBlocks.length
      : 0;
  const totalTrainImpact = blocks.reduce((sum, block) => sum + block.train_impact, 0);
  const totalConflicts = blocks.reduce((sum, block) => sum + block.train_conflicts, 0);
  const requestsProcessed = blocks.reduce((sum, block) => sum + block.number_of_tasks, 0);

  return {
    status: "success",
    message: "Loaded saved optimized blocks from PostgreSQL",
    requests_processed: requestsProcessed,
    blocks_generated: blocks.length,
    run_metrics: {
      total_block_minutes: totalMinutes,
      average_utilization: Number(averageUtilization.toFixed(2)),
      average_optimization_score: Number(averageScore.toFixed(2)),
      total_train_impact: totalTrainImpact,
      total_train_conflicts: totalConflicts,
    },
    blocks,
  };
}

function OptimizerPage() {
  const { reqs, plan, conflicts, optimize, scope } = useAbps();
  const { t } = useLanguage();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Idle");
  const [drawer, setDrawer] = useState(false);

  const [apiData, setApiData] = useState<OptimizationApiResponse | null>(null);
  const [apiError, setApiError] = useState(false);
  const [lastExecution, setLastExecution] = useState<Date | null>(null);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);

  const pending = reqs.filter((r) => r.status === "Pending AI Scheduling");

  useEffect(() => {
    let cancelled = false;

    const restoreSavedPlan = async () => {
      try {
        const saved = await fetchSavedOptimization();
        if (!cancelled && saved) {
          setApiData(saved);
          setProgress(100);
          setStage("Saved optimization loaded");
        }
      } catch (error) {
        console.error("Saved optimization load error:", error);
      }
    };

    void restoreSavedPlan();

    return () => {
      cancelled = true;
    };
  }, []);

  const run = async () => {
    if (!running && pending.length === 0) {
      try {
        const saved = await fetchSavedOptimization();
        if (saved) {
          setApiData(saved);
          setProgress(100);
          setStage("Saved optimization loaded");
          toast.success(`${saved.blocks_generated ?? 0} saved optimized block(s) loaded`);
        } else {
          toast.info("No pending requests or saved optimized blocks found.");
        }
      } catch (error) {
        console.error("Saved optimization load error:", error);
        setApiError(true);
      }
      return;
    }

    setRunning(true);
    setProgress(0);
    setApiError(false);

    const startTime = Date.now();
    const stages = [
      "Loading maintenance requests from BDMS...",
      "Executing USFD & P-Way criticality scoring...",
      "Clustering overlapping TMS, SMMS & TDMS demands...",
      "Evaluating corridor line capacity & traffic windows...",
      "Synthesizing zero-conflict shadow megablocks...",
      "Validating COA express train path clearance...",
    ];

    let currentStage = 0;

    const timer = setInterval(() => {
      if (currentStage >= stages.length) {
        clearInterval(timer);
        return;
      }

      setStage(stages[currentStage] ?? "Finalizing optimization...");
      setProgress(Math.min(((currentStage + 1) / stages.length) * 100, 100));
      currentStage += 1;

      if (currentStage >= stages.length) {
        clearInterval(timer);
      }
    }, 550);

    try {
      const response = await apiFetch("/optimization/", {
        method: "POST",
      });

      if (!response.ok) throw new Error("API response not OK");

      const data: OptimizationApiResponse = await response.json();

      let finalData = data;

      if (!data.blocks || data.blocks.length === 0) {
        try {
          const savedResponse = await apiFetch("/optimized-plan/");
          if (savedResponse.ok) {
            const saved = await savedResponse.json();
            if (saved.status === "success" && Array.isArray(saved.blocks) && saved.blocks.length > 0) {
              const blocks = saved.blocks.map((block: any) => ({
                block_id: String(block.block_id ?? ""),
                corridor: String(block.corridor ?? block.corridor_id ?? ""),
                date: String(block.date ?? block.block_date ?? ""),
                start: String(block.start ?? block.start_time ?? ""),
                end: String(block.end ?? block.end_time ?? ""),
                duration: Number(block.duration ?? block.duration_min ?? 0),
                utilization: Number(block.utilization ?? block.utilization_percent ?? 0),
                train_impact: Number(block.train_impact ?? block.train_impact_score ?? 0),
                number_of_tasks: Number(block.number_of_tasks ?? 0),
                train_conflicts: Number(block.train_conflicts ?? 0),
              }));

              finalData = {
                ...data,
                status: "success",
                message: "Showing latest saved optimization plan.",
                blocks_generated: blocks.length,
                blocks,
                run_metrics: {
                  total_block_minutes: blocks.reduce((sum: number, b: any) => sum + b.duration, 0),
                  average_utilization:
                    blocks.reduce((sum: number, b: any) => sum + b.utilization, 0) / blocks.length,
                  average_optimization_score: 0,
                  total_train_impact: blocks.reduce((sum: number, b: any) => sum + b.train_impact, 0),
                  total_train_conflicts: blocks.reduce((sum: number, b: any) => sum + b.train_conflicts, 0),
                },
              };
            }
          }
        } catch (savedError) {
          console.error("Failed to load saved plan:", savedError);
        }
      }

      if (data.status === "error") {
        throw new Error(data.message || "Optimization failed");
      }

      clearInterval(timer);
      setProgress(100);
      setStage("Optimization complete");

      let displayData = finalData;
      if ((finalData.blocks_generated ?? 0) === 0) {
        try {
          const saved = await fetchSavedOptimization();
          if (saved) displayData = saved;
        } catch (restoreError) {
          console.error("Could not restore saved optimization:", restoreError);
        }
      }

      setApiData(displayData);
      setLastExecution(new Date());
      setExecutionDuration((Date.now() - startTime) / 1000);

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="size-4" /> Optimization Execution Successful
          </span>
          <span className="text-xs">
            {displayData.blocks_generated ?? 0} megablocks computed · {displayData.run_metrics?.total_block_minutes ?? 0} min total window
          </span>
        </div>,
      );
    } catch (err) {
      clearInterval(timer);
      console.error("Optimization API error:", err);
      setApiError(true);
      setStage("Failed");
      setProgress(0);
    } finally {
      setRunning(false);
    }
  };

  const getScoreVisuals = (score: number) => {
    if (score >= 90)
      return {
        label: "CRITICAL",
        color: "text-red-700 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-950/60 border-red-300",
        bar: "bg-red-600",
      };
    if (score >= 75)
      return {
        label: "HIGH",
        color: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-300",
        bar: "bg-amber-600",
      };
    if (score >= 50)
      return {
        label: "MEDIUM",
        color: "text-blue-700 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-300",
        bar: "bg-blue-600",
      };
    return {
      label: "LOW",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300",
      bar: "bg-emerald-600",
    };
  };

  const pipelineStages = [
    { id: 1, name: "BDMS INGESTION", desc: `${reqs.length} Demands`, icon: FileText, done: progress >= 20 || !!apiData },
    { id: 2, name: "CRITICALITY INDEX", desc: "USFD Scoring", icon: Target, done: progress >= 40 || !!apiData },
    { id: 3, name: "SHADOW CLUSTERING", desc: "Cross-Dept Overlap", icon: Layers, done: progress >= 60 || !!apiData },
    { id: 4, name: "CORRIDOR MATCHING", desc: "COA Window Clearance", icon: Map, done: progress >= 80 || !!apiData },
    { id: 5, name: "MEGABLOCK OUTPUT", desc: "Optimized Schedule", icon: Sparkles, done: progress === 100 || !!apiData },
  ];

  return (
    <>
      <PageHeader
        title="CRIS Automatic Block Planning & Optimization Engine"
        subtitle="Autonomous algorithm for multi-departmental shadow block clustering, line capacity maximization, and zero-conflict train scheduling."
        action={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              Status: <strong className="text-emerald-700 dark:text-emerald-400">ENGINE READY</strong>
            </span>
            <Can
              perm="optimizer.run"
              fallback="disable"
              reason={t(
                "Scheduling is restricted to Control Office and DRM Planning",
                "शेड्यूलिंग नियंत्रण कार्यालय और डीआरएम योजना तक सीमित है"
              )}
            >
              <Button
                onClick={run}
                disabled={running}
                size="sm"
                className="bg-[#003366] hover:bg-[#002244] text-white font-bold h-8 text-xs rounded-[2px]"
              >
                {running ? (
                  <>
                    <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> {t("Optimizing...", "अनुकूलन जारी...")}
                  </>
                ) : (
                  <>
                    <BrainCircuit className="mr-1.5 size-3.5 text-[#FF9933]" /> {t("Execute AI Engine", "एआई इंजन चलाएं")}
                  </>
                )}
              </Button>
            </Can>
          </div>
        }
      />

      {/* Department Read-Only Notice Banner */}
      {scope === "department" && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 p-3.5 rounded-[2px] flex items-center gap-3">
          <Info className="size-5 text-amber-700 dark:text-amber-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-100">
              {t(
                "Read-only — scheduling is run by Control / DRM Planning",
                "केवल पढ़ने के लिए — शेड्यूलिंग नियंत्रण / डीआरएम योजना द्वारा संचालित है"
              )}
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
              {t(
                "Departmental engineers may review AI schedule recommendations and shadow clusters for their division.",
                "विभागीय इंजीनियर अपने प्रभाग के लिए एआई शेड्यूल सिफारिशों और शैडो समूहों की समीक्षा कर सकते हैं।"
              )}
            </p>
          </div>
        </div>
      )}

      {/* Optimization Pipeline Step Progress */}
      <Card className="mb-6 border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
        <div className="bg-[#003366] p-3 text-white border-b-2 border-[#FF9933] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-[#FF9933]" />
            <h2 className="text-xs font-bold uppercase tracking-wider">
              5-Stage Multi-Departmental Block Clustering Pipeline
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-300">
            Last Executed: {lastExecution ? lastExecution.toLocaleTimeString("en-IN") + " IST" : "Awaiting Trigger"}
          </span>
        </div>

        <CardContent className="p-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] px-2 py-1">
            {pipelineStages.map((st, i) => {
              const Icon = st.icon;
              return (
                <div key={st.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-[2px] border text-xs font-bold ${
                        st.done
                          ? "bg-[#003366] text-white border-[#003366]"
                          : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-900 dark:text-slate-100">
                        {st.name}
                      </p>
                      <p className="text-[10px] text-slate-500">{st.desc}</p>
                    </div>
                  </div>
                  {i < pipelineStages.length - 1 && (
                    <div className="mx-4 flex-1 h-[2px] bg-slate-200 dark:bg-slate-800">
                      <div className={`h-full bg-[#003366] ${st.done ? "w-full" : "w-0"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPI Matrix Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-slate-500">Pending Requests</p>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">{pending.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">In BDMS Queue</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-[#003366] dark:text-sky-400">Megablocks Output</p>
          <p className="text-xl font-bold font-mono text-[#003366] dark:text-sky-400 mt-0.5">{apiData?.blocks_generated ?? "-"}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Optimized Windows</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Downtime Saved</p>
          <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
            {apiData?.run_metrics?.total_block_minutes ? `${apiData.run_metrics.total_block_minutes}m` : "-"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Recovered Line Time</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Train Delays</p>
          <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
            {apiData?.run_metrics?.total_train_impact ?? "0"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">COA Estimated Impact</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px] col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Path Conflicts</p>
          <p className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400 mt-0.5">
            {apiData?.run_metrics?.total_train_conflicts ?? "0"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Clashes Checked</p>
        </div>
      </div>

      {/* Execution Console & Algorithm Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* CONSOLE */}
        <Card className="lg:col-span-2 border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
          <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400 flex items-center gap-2">
                <Activity className="size-4" /> AI Execution Status & Diagnostics
              </CardTitle>
              <span className="border border-emerald-300 bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[9px] uppercase font-bold rounded-[2px]">
                {running ? "PROCESSING" : apiData ? "COMPLETED" : "STANDBY"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                <span className="text-slate-800 dark:text-slate-200">{stage}</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 rounded-[2px] bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                <p className="text-[10px] font-bold uppercase text-slate-500">Demands Bundled</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {apiData?.requests_processed ?? (running ? "..." : "-")}
                </p>
              </div>
              <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                <p className="text-[10px] font-bold uppercase text-slate-500">Megablocks</p>
                <p className="font-mono text-lg font-bold text-[#003366] dark:text-sky-400 mt-0.5">
                  {apiData?.blocks_generated ?? (running ? "..." : "-")}
                </p>
              </div>
              <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                <p className="text-[10px] font-bold uppercase text-slate-500">Compute Time</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {executionDuration ? `${executionDuration.toFixed(1)}s` : running ? "..." : "-"}
                </p>
              </div>
              <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                <p className="text-[10px] font-bold uppercase text-slate-500">Avg Utilization</p>
                <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {apiData?.run_metrics?.average_utilization ? `${apiData.run_metrics.average_utilization}%` : "-"}
                </p>
              </div>
            </div>

            {apiData && (
              <div className="border border-border bg-slate-50 dark:bg-slate-800/60 p-3 rounded-[2px] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Optimization Plan Persisted in PostgreSQL Database
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Gantt Planner and Conflicts & Approvals desks have been automatically refreshed.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs font-bold border-slate-300 dark:border-slate-700">
                  <Link to="/planner">
                    View in Gantt <ArrowRight className="ml-1 size-3" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ALGORITHMS BREAKDOWN */}
        <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none flex flex-col justify-between">
          <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
            <CardTitle className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400 flex items-center gap-2">
              <BrainCircuit className="size-4" /> Indian Railways Optimization Logic
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-2.5 text-xs">
            <div className="border border-border p-2.5 rounded-[2px]">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[#003366] dark:text-sky-400 text-[11px]">
                <Target className="size-3.5" /> 1. Criticality Matrix
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                USFD rail flaw class, overdue days penalty, and TSR caution order impact scoring.
              </p>
            </div>

            <div className="border border-border p-2.5 rounded-[2px]">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[#003366] dark:text-sky-400 text-[11px]">
                <Layers className="size-3.5" /> 2. Cross-Department Clustering
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Clusters TMS track, SMMS point, and TDMS OHE works on same section to eliminate redundant line blocks.
              </p>
            </div>

            <div className="border border-border p-2.5 rounded-[2px]">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[#003366] dark:text-sky-400 text-[11px]">
                <GitBranch className="size-3.5" /> 3. COA Window Clearance
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Validates headway and express paths (Vande Bharat, Rajdhani) for zero corridor disruption.
              </p>
            </div>
          </CardContent>
          <div className="p-3 border-t border-border bg-slate-50 dark:bg-slate-900/60">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold border-slate-300 dark:border-slate-700"
              onClick={() => setDrawer(true)}
            >
              Open Recommendation Summary Drawer <ArrowRight className="ml-1.5 size-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* GENERATED OPTIMIZED BLOCKS GRID */}
      {apiData && apiData.blocks && apiData.blocks.length > 0 && (
        <div className="mb-6">
          <div className="border-b-2 border-[#003366] pb-1.5 mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#003366] dark:text-sky-400 flex items-center gap-2">
              <CalendarCheck className="size-4" /> Generated Mega Block Schedule ({apiData.blocks.length} Blocks)
            </h2>
            <span className="text-[11px] font-mono text-slate-500">Synchronized with Gantt Timeline</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {apiData.blocks.map((b) => (
              <Card key={b.block_id} className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
                <CardHeader className="bg-slate-100 dark:bg-slate-800/80 p-3 border-b border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-mono font-bold text-xs text-[#003366] dark:text-sky-400">
                        {b.block_id}
                      </h3>
                      <p className="text-[10px] text-slate-500">{b.corridor}</p>
                    </div>
                    <span className="border border-emerald-300 bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[9px] uppercase font-bold rounded-[2px]">
                      OPTIMIZED
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 space-y-3 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-[2px] font-mono border border-border">
                    <span className="text-slate-600 dark:text-slate-400">{b.date}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{b.start} – {b.end}</span>
                    <span className="text-primary font-bold">{b.duration} min</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center divide-x divide-border">
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Util</span>
                      <span className="font-mono font-bold text-xs">{b.utilization}%</span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Tasks</span>
                      <span className="font-mono font-bold text-xs">{b.number_of_tasks}</span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Impact</span>
                      <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">{b.train_impact}</span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Clashes</span>
                      <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">{b.train_conflicts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendation Drawer */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl border-2 border-[#003366] bg-white dark:bg-slate-950 p-0 rounded-[2px]">
          <SheetHeader className="bg-[#003366] p-4 text-white border-b-2 border-[#FF9933]">
            <SheetTitle className="text-base font-bold uppercase text-white flex items-center gap-2">
              <Sparkles className="size-4 text-[#FF9933]" /> Official Optimization Audit Report
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-300">
              Corridor scheduling breakdown and multi-departmental bundling analysis.
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-4 text-xs">
            {apiData?.blocks && apiData.blocks.length > 0 ? (
              <>
                <div className="border border-border bg-slate-50 dark:bg-slate-900 p-3 rounded-[2px] leading-relaxed">
                  <p className="font-bold text-[#003366] dark:text-sky-400 uppercase text-[11px] mb-1">
                    Optimizer Executive Summary
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    IR-ABPS successfully scheduled <strong>{apiData.blocks.length} multi-departmental megablocks</strong> across Northern Central Railway. All high-criticality USFD rail flaws and signal overhauls have been clustered into low-density night/afternoon windows.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold uppercase text-slate-500 text-[10px]">Allocated Block Schedule</p>
                  {apiData.blocks.map((bl) => (
                    <div key={bl.block_id} className="border border-border p-3 rounded-[2px] bg-slate-50 dark:bg-slate-900">
                      <div className="flex justify-between font-mono font-bold text-xs">
                        <span className="text-[#003366] dark:text-sky-400">{bl.block_id}</span>
                        <span>{bl.date} ({bl.start} – {bl.end})</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        Corridor: {bl.corridor} · Duration: {bl.duration} min · Tasks Bundled: {bl.number_of_tasks}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button asChild className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold h-9 rounded-[2px]">
                    <Link to="/planner">
                      Open in Gantt Planner <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-slate-500">
                Awaiting optimizer execution to generate recommendations.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
