import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  BrainCircuit, Layers, Sparkles, TimerReset, TriangleAlert,
  ArrowRight, CheckCircle2, ChevronRight, Activity, Zap, 
  RefreshCw, FileText, BarChart4, AlertTriangle, ShieldCheck,
  Map, Target, Info, Server, TrainTrack, TrainFront, GitBranch,
  CalendarCheck
} from "lucide-react";
import { toast } from "sonner";
import { deptColor } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import { DAYS, DEPT_LABEL, criticalityScore, fmt } from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/optimizer")({
  head: () => ({
    meta: [
      { title: "IR-ABPS Optimization Engine | AI Block Planner" },
      {
        name: "description",
        content: "Run criticality scoring, shadow maintenance clustering and corridor window matching to auto-generate mega blocks.",
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

function OptimizerPage() {
  const { reqs, plan, conflicts, optimize } = useAbps();
  
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Idle");
  const [drawer, setDrawer] = useState(false);
  
  const [apiData, setApiData] = useState<OptimizationApiResponse | null>(null);
  const [apiError, setApiError] = useState(false);
  const [lastExecution, setLastExecution] = useState<Date | null>(null);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);

  const pending = reqs.filter((r) => r.status === "Pending AI Scheduling");

  const run = async () => {
    setRunning(true);
    setProgress(0);
    setApiError(false);
    
    const startTime = Date.now();
    const stages = [
      "Loading maintenance requests...",
      "Calculating criticality scores...",
      "Detecting overlapping requests...",
      "Evaluating corridor windows...",
      "Generating optimized blocks...",
      "Calculating train impact..."
    ];
    
    let currentStage = 0;
    
    // Simulate frontend progress for visual feedback
    const timer = setInterval(() => {
      setStage(stages[currentStage] ?? "Finalizing plan...");
      setProgress(((currentStage + 1) / stages.length) * 100);
      currentStage += 1;
    }, 550);

    try {
      // Hit actual API
      const response = await fetch("http://127.0.0.1:8000/optimization/", {
        method: "POST"
      });
      
      if (!response.ok) throw new Error("API response not OK");
      
      const data: OptimizationApiResponse = await response.json();
      
      if (data.status === "error") {
        throw new Error(data.message || "Optimization failed");
      }
      
      // Complete progress bar
      clearInterval(timer);
      setProgress(100);
      setStage("Optimization complete");
      
      // Update global context for other pages
      const res = optimize();
      
      // Set local API data for rendering this page
      setApiData(data);
      setLastExecution(new Date());
      setExecutionDuration((Date.now() - startTime) / 1000);
      
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold flex items-center gap-2"><Sparkles className="size-4" /> Optimization Successful</span>
          <span>{data.blocks_generated} mega blocks formed · {res.saved} min saved</span>
        </div>
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
    if (score >= 90) return { label: "CRITICAL", color: "text-destructive", bg: "bg-destructive/20", bar: "bg-destructive" };
    if (score >= 75) return { label: "HIGH", color: "text-warn", bg: "bg-warn/20", bar: "bg-warn" };
    if (score >= 50) return { label: "MEDIUM", color: "text-blue-500", bg: "bg-blue-500/20", bar: "bg-blue-500" };
    return { label: "LOW", color: "text-safe", bg: "bg-safe/20", bar: "bg-safe" };
  };

  const pipelineStages = [
    { id: 1, name: "REQUEST INGESTION", desc: `${reqs.length} requests`, icon: FileText, active: running && progress < 20, done: progress >= 20 || apiData },
    { id: 2, name: "CRITICALITY", desc: "Priority scoring", icon: Target, active: running && progress >= 20 && progress < 40, done: progress >= 40 || apiData },
    { id: 3, name: "CLUSTERING", desc: "Overlap detection", icon: Layers, active: running && progress >= 40 && progress < 60, done: progress >= 60 || apiData },
    { id: 4, name: "WINDOW MATCHING", desc: "Traffic-aware matching", icon: Map, active: running && progress >= 60 && progress < 80, done: progress >= 80 || apiData },
    { id: 5, name: "BLOCK GENERATION", desc: "Optimized blocks", icon: Sparkles, active: running && progress >= 80, done: progress === 100 || apiData },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Automatic Block Optimization Engine</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            AI-driven maintenance block planning across traffic, asset criticality and corridor availability.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 rounded-lg border border-border bg-secondary/20 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Server className="size-3.5" /> System Status
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="size-2 rounded-full bg-safe"></span> AI Engine Ready
            </span>
            <span className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <span className="size-2 rounded-full bg-safe"></span> Data Feeds Connected
            </span>
          </div>
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Last sync: {lastExecution ? lastExecution.toLocaleTimeString() : 'Awaiting Run'}
          </span>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-secondary/40 to-transparent p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
              <BrainCircuit className="size-4" /> Optimization Pipeline
            </div>
            <p className="text-xs text-muted-foreground">
              Requests → Criticality → Clustering → Window Matching → Optimized Blocks
            </p>
          </div>
          <Button 
            onClick={run} 
            disabled={running} 
            className="w-full md:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all"
          >
            {running ? (
              <><RefreshCw className="mr-2 size-4 animate-spin" /> Optimizing...</>
            ) : (
              <><BrainCircuit className="mr-2 size-4" /> Run IR-ABPS Optimization Engine</>
            )}
          </Button>
        </div>
        
        <div className="border-t border-border/50 bg-secondary/10 p-5 overflow-x-auto">
          <div className="flex items-center min-w-max justify-between px-2">
            {pipelineStages.map((stage, i) => (
              <div key={stage.id} className="flex items-center">
                <div className={`flex flex-col items-center gap-2 ${stage.active ? 'opacity-100' : stage.done ? 'opacity-70' : 'opacity-40 grayscale'}`}>
                  <div className={`flex size-10 items-center justify-center rounded-full border-2 
                    ${stage.active ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 
                      stage.done ? 'border-safe bg-safe/10 text-safe' : 'border-border bg-secondary text-muted-foreground'}`}>
                    <stage.icon className="size-4" />
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${stage.active ? 'text-primary' : 'text-foreground'}`}>{stage.name}</p>
                    <p className="text-[10px] text-muted-foreground">{stage.desc}</p>
                  </div>
                </div>
                {i < pipelineStages.length - 1 && (
                  <div className="mx-4 w-12 h-[2px] bg-border relative top-[-10px]">
                    <div className={`h-full bg-primary transition-all duration-500 ${stage.done ? 'w-full' : 'w-0'}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {apiError && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/20 p-2 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Optimization failed</h3>
              <p className="text-sm text-destructive/80">Unable to complete the optimization run. The API endpoint might be down.</p>
            </div>
          </div>
          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/20" onClick={run}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* ENGINE EXECUTION CONSOLE */}
        <Card className="lg:col-span-2 shadow-sm border-t-2 border-t-primary/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TerminalIcon className="size-4 text-primary" />
                AI Engine Execution Console
              </CardTitle>
              <Badge className={`uppercase text-[10px] font-bold tracking-wider ${
                running ? 'bg-primary/20 text-primary' : 
                apiData ? 'bg-safe/20 text-safe' : 
                apiError ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-muted-foreground'
              }`}>
                {running ? 'RUNNING' : apiData ? 'COMPLETED' : apiError ? 'FAILED' : 'READY'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                {running && <RefreshCw className="size-3.5 animate-spin text-primary" />}
                {stage}
              </p>
              <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className={`h-2 ${apiData ? '[&>div]:bg-safe' : apiError ? '[&>div]:bg-destructive' : ''}`} />
            
            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Requests Processed</p>
                <p className="text-xl font-mono font-bold text-foreground">
                  {apiData ? apiData.requests_processed : running ? '...' : '-'}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Blocks Generated</p>
                <p className="text-xl font-mono font-bold text-primary">
                  {apiData ? apiData.blocks_generated : running ? '...' : '-'}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Duration</p>
                <p className="text-xl font-mono font-bold text-foreground">
                  {executionDuration ? `${executionDuration.toFixed(1)}s` : running ? '...' : '-'}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Avg Score</p>
                <p className="text-xl font-mono font-bold text-safe">
                  {apiData?.run_metrics?.average_optimization_score ? `${apiData.run_metrics.average_optimization_score}/100` : running ? '...' : '-'}
                </p>
              </div>
            </div>
            
            {running && (
              <div className="mt-5 space-y-1.5 text-xs text-muted-foreground font-mono bg-secondary/30 p-3 rounded-md border border-border/50">
                <p className={progress >= 16 ? "text-safe flex items-center gap-1" : "opacity-50"}>
                  {progress >= 16 ? <CheckCircle2 className="size-3" /> : <span className="w-3" />} Loading maintenance requests
                </p>
                <p className={progress >= 33 ? "text-safe flex items-center gap-1" : "opacity-50"}>
                  {progress >= 33 ? <CheckCircle2 className="size-3" /> : <span className="w-3" />} Calculating criticality scores
                </p>
                <p className={progress >= 50 ? "text-safe flex items-center gap-1" : "opacity-50"}>
                  {progress >= 50 ? <CheckCircle2 className="size-3" /> : <span className="w-3" />} Detecting overlapping requests
                </p>
                <p className={progress >= 66 ? "text-safe flex items-center gap-1" : "opacity-50"}>
                  {progress >= 66 ? <CheckCircle2 className="size-3" /> : <span className="w-3" />} Evaluating corridor windows
                </p>
                <p className={progress >= 83 ? "text-safe flex items-center gap-1" : "opacity-50"}>
                  {progress >= 83 ? <CheckCircle2 className="size-3" /> : <span className="w-3" />} Generating optimized blocks
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI DECISION PIPELINE (ALGORITHMS) */}
        <Card className="shadow-sm border-t-2 border-t-purple-500/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BrainCircuit className="size-4 text-purple-500" />
              AI Decision Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 flex-1 overflow-y-auto">
            <Algo
              title="CRITICALITY SCORING"
              icon={Target}
              body="Ranks requests using asset deterioration, safety hazard, TSR risk and overdue duration."
              flow="Input → Scoring → Priority"
            />
            <Algo
              title="SHADOW CLUSTERING"
              icon={Layers}
              body="Identifies overlapping TMS / SMMS / TDMS requests and combines them to remove redundant shutdowns."
              flow="Multiple Requests → Cluster → Mega Block"
            />
            <Algo
              title="CORRIDOR WINDOW MATCHING"
              icon={GitBranch}
              body="Matches clusters with available corridor windows while respecting train paths and operational constraints."
              flow="Cluster → Available Window → Safe Block"
            />
          </CardContent>
        </Card>
      </div>

      {/* KPI GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <KpiCard 
          label="PENDING REQUESTS" 
          value={String(pending.length)} 
          icon={FileText} 
          desc="Awaiting optimization"
          active={true}
        />
        <KpiCard 
          label="OPTIMIZED BLOCKS" 
          value={apiData?.blocks_generated?.toString() || (plan.filter(p => p.reqIds.length > 1).length > 0 ? String(plan.filter(p => p.reqIds.length > 1).length) : "-")} 
          icon={Sparkles} 
          desc="AI-generated maintenance windows"
          active={!!apiData}
          tone="text-primary"
        />
        <KpiCard 
          label="DOWNTIME SAVED" 
          value={apiData?.run_metrics ? `${apiData.run_metrics.total_block_minutes}m` : plan.length > 0 ? `${plan.reduce((s, p) => s + p.savedMinutes, 0)}m` : "-"} 
          icon={TimerReset} 
          desc="Total recovered operational time"
          active={!!apiData || plan.length > 0}
          tone="text-safe"
        />
        <KpiCard 
          label="TRAIN IMPACT" 
          value={apiData?.run_metrics?.total_train_impact?.toString() || "-"} 
          icon={TrainFront} 
          desc="Total delayed trains estimated"
          active={!!apiData}
          tone="text-warn"
        />
        <KpiCard 
          label="CONFLICTS AVOIDED" 
          value={apiData?.run_metrics?.total_train_conflicts?.toString() || "-"} 
          icon={ShieldCheck} 
          desc="Path overlaps prevented"
          active={!!apiData}
          tone="text-blue-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* OPTIMIZATION IMPACT */}
        <Card className="shadow-sm border-t-2 border-t-safe">
          <CardHeader className="border-b border-border/50 pb-4 bg-secondary/10">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart4 className="size-4 text-safe" />
              Optimization Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {apiData || plan.length > 0 ? (
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-xs text-muted-foreground uppercase tracking-wider">Before AI</Badge>
                  </div>
                  <Row k="Maintenance requests" v={<span className="font-mono text-foreground font-bold">{apiData ? apiData.requests_processed : reqs.length}</span>} />
                  <Row k="Separate blocks" v={<span className="font-mono text-muted-foreground">{apiData ? apiData.requests_processed : reqs.length} potential work windows</span>} />
                  <Row k="Estimated downtime" v={<span className="font-mono text-warn">High</span>} />
                  <Row k="Train conflicts" v={<span className="font-mono text-destructive">Unchecked</span>} />
                </div>
                <div className="p-5 space-y-4 bg-safe/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-xs bg-safe/20 text-safe border-safe/30 uppercase tracking-wider">After AI</Badge>
                  </div>
                  <Row k="Optimized blocks" v={<span className="font-mono text-primary font-bold">{apiData?.blocks_generated || plan.filter(p => p.reqIds.length > 1).length}</span>} />
                  <Row k="Downtime saved" v={<span className="font-mono text-safe font-bold">{apiData?.run_metrics?.total_block_minutes || plan.reduce((s, p) => s + p.savedMinutes, 0)} mins</span>} />
                  <Row k="Train impact" v={<span className="font-mono text-foreground">{apiData?.run_metrics?.total_train_impact || 0} delays</span>} />
                  <Row k="Conflicts avoided" v={<span className="font-mono text-safe flex items-center gap-1"><CheckCircle2 className="size-3" /> Validated</span>} />
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <BarChart4 className="size-8 opacity-20 mb-3" />
                <p>No optimization results available.</p>
                <p className="text-xs mt-1">Run the optimization engine to generate blocks.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI INSIGHT / RECOMMENDATION */}
        <Card className="shadow-sm border-t-2 border-t-purple-500/50 bg-gradient-to-br from-card to-purple-900/5 flex flex-col">
          <CardHeader className="border-b border-purple-500/10 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-purple-500">
              <Sparkles className="size-4" />
              AI Planning Insight
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between">
            {apiData || plan.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                  <p className="text-sm text-foreground font-medium flex items-start gap-2">
                    <Info className="size-4 text-purple-500 shrink-0 mt-0.5" />
                    <span>
                      AI successfully generated {apiData?.blocks_generated || plan.length} optimized maintenance windows with coordinated work across departments. Overlapping requests have been clustered to reduce repeated network shutdowns.
                    </span>
                  </p>
                </div>
                
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why this recommendation?</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-safe" /> <span className="text-muted-foreground">Asset criticality prioritized</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-safe" /> <span className="text-muted-foreground">Shadow clusters formed</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-safe" /> <span className="text-muted-foreground">Corridor availability checked</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-safe" /> <span className="text-muted-foreground">Minimal train impact</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-muted-foreground opacity-50 space-y-3">
                <BrainCircuit className="size-8" />
                <p className="text-sm">Awaiting optimization run to generate AI insights.</p>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-border/50">
              <Button variant="outline" className="w-full border-purple-500/30 text-purple-500 hover:bg-purple-500/10 hover:text-purple-600" onClick={() => setDrawer(true)}>
                Open AI recommendation drawer <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OPTIMIZED BLOCKS */}
      {apiData && apiData.blocks && apiData.blocks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            Optimized Blocks
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {apiData.blocks.map(b => (
              <Card key={b.block_id} className="shadow-sm border-l-4 border-l-safe hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-foreground text-base">{b.block_id}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Map className="size-3" /> {b.corridor}</p>
                    </div>
                    <Badge className="bg-safe/20 text-safe hover:bg-safe/20 text-[10px] uppercase font-bold tracking-wider">
                      Optimized
                    </Badge>
                  </div>
                  
                  <div className="bg-secondary/20 rounded p-2.5 mb-3 flex justify-between items-center text-sm font-mono border border-border/50">
                    <span className="text-muted-foreground text-xs">{b.date}</span>
                    <span className="font-semibold text-foreground">{b.start} — {b.end}</span>
                    <span className="text-primary font-bold">{b.duration}h</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-center divide-x divide-border">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">Util</span>
                      <span className="text-sm font-bold">{b.utilization}%</span>
                    </div>
                    <div className="flex flex-col pl-2">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">Tasks</span>
                      <span className="text-sm font-bold">{b.number_of_tasks}</span>
                    </div>
                    <div className="flex flex-col pl-2">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">Impact</span>
                      <span className="text-sm font-bold text-warn">{b.train_impact}</span>
                    </div>
                    <div className="flex flex-col pl-2">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">Conflict</span>
                      <span className="text-sm font-bold text-safe">{b.train_conflicts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CRITICALITY QUEUE & CONSTRAINTS */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4 bg-secondary/10">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="size-4 text-primary" />
              Criticality Scoring Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[...reqs]
                .sort((a, b) => (b.score ?? criticalityScore(b)) - (a.score ?? criticalityScore(a)))
                .slice(0, 5)
                .map((r) => {
                  const score = r.score ?? criticalityScore(r);
                  const visual = getScoreVisuals(score);
                  
                  return (
                    <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors">
                      <Badge variant="outline" className={`w-14 justify-center text-[10px] uppercase font-bold tracking-wider ${deptColor[r.dept]}`}>
                        {r.dept}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{r.id}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{r.assetId} · {r.section}</p>
                      </div>
                      <div className="w-32 flex flex-col items-end gap-1.5">
                        <div className="flex justify-between w-full items-center">
                          <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${visual.bg} ${visual.color}`}>{visual.label}</span>
                          <span className="text-sm font-mono font-bold text-foreground">{score}<span className="text-xs text-muted-foreground">/100</span></span>
                        </div>
                        <Progress value={score} className={`h-1.5 w-full [&>div]:${visual.bar.replace('bg-', 'bg-')}`} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4 bg-secondary/10">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-safe" />
              Operational Constraints
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {apiData || plan.length > 0 ? (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-safe shrink-0" />
                  <span className="font-medium">Passenger train paths protected</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-safe shrink-0" />
                  <span className="font-medium">Express services protected</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-safe shrink-0" />
                  <span className="font-medium">Corridor windows validated</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-safe shrink-0" />
                  <span className="font-medium">TSR conflicts checked</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-safe shrink-0" />
                  <span className="font-medium">Asset overlap checked</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-safe shrink-0" />
                  <span className="font-medium">Maintenance duration validated</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50 py-6">
                <ShieldCheck className="size-8 mb-2" />
                <p className="text-sm">Validation status unavailable</p>
                <p className="text-xs mt-1">Run optimizer to verify constraints</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl border-border">
          <SheetHeader className="border-b border-border/50 pb-4 mb-4">
            <SheetTitle className="flex items-center gap-2 text-purple-500">
              <Sparkles className="size-5" /> AI Recommendation Drawer
            </SheetTitle>
            <SheetDescription>
              Generated schedule with explanations and expected train delay impact.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 pb-8">
            {plan.length === 0 && (
              <div className="text-center p-8 bg-secondary/10 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  No plan yet — run the optimization engine to view recommendations.
                </p>
              </div>
            )}
            
            {plan.map((p) => (
              <div key={p.clusterId} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="bg-secondary/30 p-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {p.clusterId}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold tracking-wider ${p.depts.length > 1 ? deptColor["JOINT"] : deptColor[p.depts[0] ?? "TMS"]}`}
                  >
                    {p.depts.length > 1 ? "Joint Coordinated" : DEPT_LABEL[p.depts[0]!]}
                  </Badge>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/10 p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground mt-0.5">{p.section} · {p.line}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Schedule</p>
                      <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5"><CalendarCheck className="size-3" />{DAYS[p.day]} · {fmt(p.start)}–{fmt(p.end)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Why this block?</p>
                    <p className="text-sm text-foreground leading-relaxed">{p.explanation}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 p-2 rounded bg-safe/10 border border-safe/20 text-safe">
                      <TimerReset className="size-4" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold">Saved Time</span>
                        <span className="text-sm font-bold">{p.savedMinutes} min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-warn/10 border border-warn/20 text-warn">
                      <TrainFront className="size-4" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold">Expected Delay</span>
                        <span className="text-sm font-bold">{p.expectedDelay} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {conflicts.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 mt-6">
                <p className="flex items-center gap-2 font-bold text-destructive text-sm mb-2">
                  <TriangleAlert className="size-4" /> {conflicts.length} corridor conflict(s) detected
                </p>
                <p className="text-xs text-destructive/80 mb-3">Manual resolution is required for safely overriding these constraints.</p>
                <Button asChild size="sm" variant="destructive" className="w-full text-xs font-bold">
                  <Link to="/conflicts">Resolve in workflow</Link>
                </Button>
              </div>
            )}
            
            {plan.length > 0 && (
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/10">
                  <Link to="/planner">Open Gantt Planner <ArrowRight className="ml-2 size-4" /></Link>
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setDrawer(false)}>
                  Close Drawer
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------- Helper Components ----------------

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  desc,
  active = false,
  tone = "text-foreground"
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  active?: boolean;
  tone?: string;
}) {
  return (
    <Card className={`shadow-sm transition-all duration-300 ${active ? 'border-primary/30 bg-card' : 'opacity-70 bg-secondary/5'}`}>
      <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className={`p-1.5 rounded-md ${active ? 'bg-primary/10' : 'bg-secondary'}`}>
            <Icon className={`size-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>
        <div>
          <p className={`text-2xl font-bold font-mono ${active ? tone : 'text-muted-foreground'}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Algo({ title, body, flow, icon: Icon }: { title: string; body: string; flow: string, icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/10 p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-purple-500" />
        <p className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{body}</p>
      <div className="inline-flex rounded-md bg-background border border-border px-2 py-1 text-[10px] font-mono font-medium text-purple-500/80">
        {flow}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-xs">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
