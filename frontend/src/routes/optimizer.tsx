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
  Clock,
  ArrowLeftRight,
  Star,
  Check,
  Network,
} from "lucide-react";
import { toast } from "sonner";
import { deptColor, PageHeader } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import { DAYS, DEPT_LABEL, criticalityScore, fmt } from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    train_impact_score?: number;
    number_of_tasks: number;
    train_conflicts: number;
    conflict_count?: number;
    estimated_delay?: number;
    optimization_score?: number;
    maintenance_priority?: number;
    asset_risk_score?: number;
    traffic_impact_score?: number;
    goods_impact_score?: number;
    consolidation_score?: number;
    ai_reasons?: string[] | null;
    ai_explanation?: string | Record<string, unknown> | null;
    ai_decision_confidence?: {
      level?: string;
      score_gap?: number;
      candidates_evaluated?: number;
    } | null;
    reason?: string | null;
  }>;

  shadow_block_opportunities?: Array<{
    corridor: string;
    date: string;
    base_tasks: string[];
    candidate_tasks: string[];
    base_window: {
      start: string;
      end: string;
    };
    candidate_window: {
      start: string;
      end: string;
    };
    gap_minutes: number;
    combined_duration_minutes: number;
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
  estimated_delay_min?: string | number;
  optimization_score: string | number;
  number_of_tasks?: string | number;
  number_of_departments?: string | number;
  conflicts?: unknown[];
  tasks?: unknown[];
  train_conflicts?: number;
  task_count?: number;
  maintenance_priority?: string | number;
  asset_risk_score?: string | number;
  traffic_impact_score?: string | number;
  goods_impact_score?: string | number;
  consolidation_score?: string | number;
  ai_reasons?: string[] | null;
  ai_explanation?: string | Record<string, unknown> | null;
  ai_decision_confidence?: {
    level?: string;
    score_gap?: number;
    candidates_evaluated?: number;
  } | null;
  reason?: string | null;
}

interface BlockIntelligence {
  success: boolean;
  block_id: string;
  corridor_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  requested_window?: {
    start: string;
    end: string;
  };
  selected_window?: {
    start: string;
    end: string;
  };
  conflict_count?: number;
  train_conflicts?: number;
  train_impact_score?: number;
  estimated_delay?: number;
  tasks_analyzed: number;
  trains_in_window: number;
  intelligence: {
    asset_risk: {
      risk_score: number;
      priority_category: string;
      risk_probability?: number;
    };
    traffic_impact: {
      traffic_impact_score: number;
      disruption_level: string;
    };
    goods_demand: {
      predicted_goods_train_demand: number;
      demand_level: string;
    };
    overall_assessment: {
      pressure_score: number;
      overall_level: string;
      asset_level: string;
      traffic_level: string;
      goods_level: string;
    };
  };
  traffic_summary: {
    passenger_trains: number;
    goods_trains: number;
    special_trains: number;
    express_trains: number;
  };
  ai_explanation?: {
    score?: number;
    why_selected?: string[];
    metrics?: {
      duration_min?: number;
      utilization_percent?: number;
      train_impact_score?: number;
      number_of_tasks?: number;
      number_of_departments?: number;
    };
  } | null;
  ai_decision_confidence?: {
    level?: string;
    score_gap?: number;
    candidates_evaluated?: number;
  } | null;
  ai_reasons?: string[] | null;
  ai_explanation_text?: string | null;
}

function normalizeAiReasons(value: unknown): string[] {
  if (Array.isArray(value)) {
    const flattened: string[] = [];

    for (const item of value) {
      if (typeof item === "string") {
        const nested = normalizeAiReasons(item);
        if (nested.length > 0) {
          flattened.push(...nested);
        } else if (item.trim()) {
          flattened.push(item.trim());
        }
      }
    }

    return flattened;
  }

  if (typeof value !== "string") return [];

  const raw = value.trim();
  if (!raw) return [];

  // Already a normal JSON array.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return normalizeAiReasons(parsed);
    }
  } catch {
    // Stored optimizer explanations may use Python repr syntax.
  }

  // Extract the "reasons" array from a persisted Python-dict string:
  // {'reasons': ['reason 1', 'reason 2'], ...}
  const reasonsMatch = raw.match(/['"]reasons['"]\s*:\s*\[(.*?)\](?:\s*,|\s*})/s);

  if (reasonsMatch?.[1]) {
    const extracted: string[] = [];
    const itemRegex = /['"]((?:\\.|[^'"])*)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(reasonsMatch[1])) !== null) {
      const reason = (match?.[1] ?? "").replace(/\\"/g, '"').replace(/\\/g, "").trim();

      if (reason) extracted.push(reason);
    }

    if (extracted.length > 0) return extracted;
  }

  // A plain persisted Python list:
  // ['reason 1', 'reason 2']
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const extracted: string[] = [];
    const itemRegex = /['"]((?:\\.|[^'"])*)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(raw)) !== null) {
      const reason = (match?.[1] ?? "").replace(/\\"/g, '"').replace(/\\/g, "").trim();
      if (reason) extracted.push(reason);
    }

    if (extracted.length > 0) return extracted;
  }

  // Never render a serialized Python/JSON object as a "reason".
  if ((raw.startsWith("{") && raw.endsWith("}")) || raw.startsWith("Object(")) {
    return [];
  }

  return [raw];
}

function getBlockAiReasons(
  block: NonNullable<OptimizationApiResponse["blocks"]>[number],
  intelligence?: BlockIntelligence,
): string[] {
  const intelligenceReasons = normalizeAiReasons(intelligence?.ai_explanation?.why_selected);
  const blockReasons = normalizeAiReasons(block.ai_reasons);
  const combinedReasons = Array.from(
    new Set([...intelligenceReasons, ...blockReasons]),
  );
  if (combinedReasons.length > 0) return combinedReasons;

  if (block.reason?.trim()) return [block.reason.trim()];
  if (typeof block.ai_explanation === "string" && block.ai_explanation.trim()) {
    return [block.ai_explanation.trim()];
  }

  return [];
}

function getBlockAiScore(
  block: NonNullable<OptimizationApiResponse["blocks"]>[number],
  intelligence?: BlockIntelligence,
): number {
  const intelligenceScore = Number(intelligence?.ai_explanation?.score);
  if (Number.isFinite(intelligenceScore)) return intelligenceScore;
  const optimizerScore = Number(block.optimization_score);
  return Number.isFinite(optimizerScore) ? optimizerScore : 0;
}

async function fetchSavedOptimization(): Promise<OptimizationApiResponse | null> {
  const response = await apiFetch("/optimized-plan/");

  if (!response.ok) {
    throw new Error("Unable to load saved optimized plan");
  }

  const payload = await response.json();
  const savedBlocks = (payload.blocks ?? []) as SavedPlanBlock[];

  const savedShadowOpportunities = (payload.shadow_block_opportunities ?? []) as NonNullable<
    OptimizationApiResponse["shadow_block_opportunities"]
  >;

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
    train_impact_score: Number(block.train_impact_score) || 0,
    number_of_tasks:
      Number(block.number_of_tasks ?? block.task_count ?? block.tasks?.length ?? 0) || 0,
    train_conflicts: Number(block.train_conflicts ?? block.conflicts?.length ?? 0) || 0,
    conflict_count: Number(block.train_conflicts ?? block.conflicts?.length ?? 0) || 0,
    estimated_delay: Number(block.estimated_delay_min ?? 0) || 0,
    optimization_score: Number(block.optimization_score) || 0,
    maintenance_priority: Number(block.maintenance_priority) || 0,
    asset_risk_score: Number(block.asset_risk_score) || 0,
    traffic_impact_score: Number(block.traffic_impact_score) || 0,
    goods_impact_score: Number(block.goods_impact_score) || 0,
    consolidation_score: Number(block.consolidation_score) || 0,
    ai_reasons: Array.isArray(block.ai_reasons) ? block.ai_reasons : [],
    ai_explanation: block.ai_explanation ?? null,
    ai_decision_confidence: block.ai_decision_confidence ?? null,
    reason: block.reason ?? null,
  }));

  const totalMinutes = blocks.reduce((sum, block) => sum + block.duration, 0);
  const averageUtilization =
    blocks.length > 0
      ? blocks.reduce((sum, block) => sum + block.utilization, 0) / blocks.length
      : 0;
  const averageScore =
    savedBlocks.length > 0
      ? savedBlocks.reduce((sum, block) => sum + (Number(block.optimization_score) || 0), 0) /
        savedBlocks.length
      : 0;
  const totalTrainImpact = blocks.reduce((sum, block) => sum + block.train_impact, 0);
  const totalConflicts = blocks.reduce((sum, block) => sum + block.train_conflicts, 0);
  const requestsProcessed = Number(payload.requests_processed ?? payload.request_count ?? 0);

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
    shadow_block_opportunities: savedShadowOpportunities,
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

  // Shadow Block Opportunities are optional in the API response.
  // Always expose a safe array to the UI so a missing/null apiData never breaks rendering.
  const shadowBlockOpportunities = apiData?.shadow_block_opportunities ?? [];
  const [lastExecution, setLastExecution] = useState<Date | null>(null);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);
  const [blockIntelligence, setBlockIntelligence] = useState<Record<string, BlockIntelligence>>({});

  const pending = reqs.filter((r) => r.status === "Pending AI Scheduling");

  // Window A vs Window B Candidate Evaluator State
  const DEFAULT_CAND_CORRIDORS = [
    { corridor_id: "C01", corridor_name: "New Delhi - Kanpur (NDLS-CNB)" },
    { corridor_id: "C02", corridor_name: "Kanpur - Prayagraj (CNB-PRYJ)" },
    { corridor_id: "C03", corridor_name: "Prayagraj - Pt. Deen Dayal Upadhyaya (PRYJ-DDU)" },
    { corridor_id: "C04", corridor_name: "Ghaziabad - Moradabad (GZB-MB)" },
    { corridor_id: "C05", corridor_name: "Agra Cantt - Jhansi (AGC-VGLB)" },
  ];

  const [corridorsList, setCorridorsList] =
    useState<{ corridor_id: string; corridor_name: string }[]>(DEFAULT_CAND_CORRIDORS);
  const [candCorridor, setCandCorridor] = useState("C01");
  const [candDate, setCandDate] = useState("");
  const [candStart, setCandStart] = useState("09:00");
  const [candEnd, setCandEnd] = useState("12:00");
  const [recommendResult, setRecommendResult] = useState<Record<string, any> | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);

  const evaluateCandidateWindows = async (
    overrideCorridor?: string,
    overrideDate?: string,
    overrideStart?: string,
    overrideEnd?: string,
    silent?: boolean,
  ) => {
    setRecommendLoading(true);
    try {
      const corr = overrideCorridor || candCorridor;
      const d = overrideDate || candDate;
      const s = overrideStart || candStart;
      const e = overrideEnd || candEnd;
      const res = await apiFetch("/optimization/recommend-windows", {
        method: "POST",
        body: JSON.stringify({
          corridor: corr,
          date: d,
          start: s,
          end: e,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, string>;
        throw new Error(err["detail"] || err["message"] || "Failed to evaluate candidate windows");
      }
      const data = (await res.json()) as Record<string, any>;
      setRecommendResult(data);
      setSelectedCandidateIndex(0);
      if (!silent) {
        toast.success(
          t(
            "Alternative candidate windows evaluated.",
            "वैकल्पिक उम्मीदवार विंडो का मूल्यांकन किया गया।",
          ),
        );
      }
    } catch (e: unknown) {
      if (!silent) {
        toast.error(e instanceof Error ? e.message : "Candidate window evaluation failed");
      }
    } finally {
      setRecommendLoading(false);
    }
  };

  useEffect(() => {
    apiFetch("/corridors/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.corridors?.length) {
          setCorridorsList(data.corridors);
        }
      })
      .catch(() => {});

  }, []);

  useEffect(() => {
    const planningDate = apiData?.blocks?.[0]?.date;
    if (!planningDate) return;

    setCandDate((currentDate) => (
      currentDate === planningDate ? currentDate : planningDate
    ));
    void evaluateCandidateWindows("C01", planningDate, "09:00", "12:00", true);
  }, [apiData]);

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

  useEffect(() => {
    if (!apiData?.blocks?.length) {
      setBlockIntelligence({});
      return;
    }

    const blocks = apiData.blocks;
    let cancelled = false;

    const loadBlockIntelligence = async () => {
      const results: Record<string, BlockIntelligence> = {};

      await Promise.all(
        blocks.map(async (block) => {
          try {
            const response = await apiFetch(`/ai/blocks/${block.block_id}/intelligence`);

            if (!response.ok) {
              console.error(`AI intelligence failed for ${block.block_id}`);
              return;
            }

            const data = (await response.json()) as BlockIntelligence;

            if (data.ai_explanation) {
              const rawReasons = data.ai_explanation.why_selected;
              const normalizedReasons = normalizeAiReasons(rawReasons);

              data.ai_explanation = {
                ...data.ai_explanation,
                why_selected: normalizedReasons,
              };
            }

            if (data.ai_reasons) {
              data.ai_reasons = normalizeAiReasons(data.ai_reasons);
            }

            results[block.block_id] = data;
          } catch (error) {
            console.error(`Failed to load AI intelligence for ${block.block_id}:`, error);
          }
        }),
      );

      if (!cancelled) {
        setBlockIntelligence(results);
      }
    };

    void loadBlockIntelligence();

    return () => {
      cancelled = true;
    };
  }, [apiData]);

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
            if (
              saved.status === "success" &&
              Array.isArray(saved.blocks) &&
              saved.blocks.length > 0
            ) {
              const blocks = (
                saved.blocks as Array<{
                  block_id?: unknown;
                  corridor?: unknown;
                  corridor_id?: unknown;
                  date?: unknown;
                  block_date?: unknown;
                  start?: unknown;
                  start_time?: unknown;
                  end?: unknown;
                  end_time?: unknown;
                  duration?: unknown;
                  duration_min?: unknown;
                  utilization?: unknown;
                  utilization_percent?: unknown;
                  train_impact?: unknown;
                  train_impact_score?: unknown;
                  number_of_tasks?: unknown;
                  train_conflicts?: unknown;
                  optimization_score?: unknown;
                  maintenance_priority?: unknown;
                  asset_risk_score?: unknown;
                  traffic_impact_score?: unknown;
                  goods_impact_score?: unknown;
                  consolidation_score?: unknown;
                  ai_reasons?: unknown;
                  ai_explanation?: unknown;
                  ai_decision_confidence?: unknown;
                  reason?: unknown;
                }>
              ).map((block) => ({
                block_id: String(block.block_id ?? ""),
                corridor: String(block.corridor ?? block.corridor_id ?? ""),
                date: String(block.date ?? block.block_date ?? ""),
                start: String(block.start ?? block.start_time ?? ""),
                end: String(block.end ?? block.end_time ?? ""),
                duration: Number(block.duration ?? block.duration_min ?? 0),
                utilization: Number(block.utilization ?? block.utilization_percent ?? 0),
                train_impact: Number(block.train_impact ?? block.train_impact_score ?? 0),
                train_impact_score: Number(block.train_impact_score ?? block.train_impact ?? 0),
                number_of_tasks: Number(block.number_of_tasks ?? 0),
                train_conflicts: Number(block.train_conflicts ?? 0),
                conflict_count: Number(block.conflict_count ?? block.train_conflicts ?? 0),
                estimated_delay: Number(block.estimated_delay ?? block.estimated_delay_min ?? 0),
                optimization_score: Number(block.optimization_score ?? 0),
                maintenance_priority: Number(block.maintenance_priority ?? 0),
                asset_risk_score: Number(block.asset_risk_score ?? 0),
                traffic_impact_score: Number(block.traffic_impact_score ?? 0),
                goods_impact_score: Number(block.goods_impact_score ?? 0),
                consolidation_score: Number(block.consolidation_score ?? 0),
                ai_reasons: normalizeAiReasons(block.ai_reasons),
                ai_explanation:
                  block.ai_explanation && typeof block.ai_explanation === "object"
                    ? (block.ai_explanation as Record<string, unknown>)
                    : typeof block.ai_explanation === "string"
                      ? block.ai_explanation
                      : null,
                ai_decision_confidence:
                  block.ai_decision_confidence &&
                  typeof block.ai_decision_confidence === "object"
                    ? (block.ai_decision_confidence as {
                        level?: string;
                        score_gap?: number;
                        candidates_evaluated?: number;
                      })
                    : null,
                reason: typeof block.reason === "string" ? block.reason : null,
              }));

              finalData = {
                ...data,
                status: "success",
                message: "Showing latest saved optimization plan.",
                requests_processed: Number(
                  saved.requests_processed ?? saved.request_count ?? data.requests_processed ?? 0,
                ),
                blocks_generated: blocks.length,
                blocks,
                run_metrics: {
                  total_block_minutes: blocks.reduce((sum, b) => sum + b.duration, 0),
                  average_utilization:
                    blocks.reduce((sum, b) => sum + b.utilization, 0) / blocks.length,
                  average_optimization_score: 0,
                  total_train_impact: blocks.reduce((sum, b) => sum + b.train_impact, 0),
                  total_train_conflicts: blocks.reduce((sum, b) => sum + b.train_conflicts, 0),
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

      // The optimizer can successfully create/persist blocks while its
      // in-memory request list is empty. The persisted PostgreSQL plan is
      // authoritative for the number of BDMS requests actually bundled.
      if (Number(data.requests_processed ?? 0) === 0 && Number(data.blocks_generated ?? 0) > 0) {
        try {
          const savedResponse = await apiFetch("/optimized-plan/");

          if (savedResponse.ok) {
            const saved = await savedResponse.json();

            if (saved.status === "success") {
              finalData = {
                ...data,
                requests_processed: Number(
                  saved.requests_processed ?? saved.request_count ?? data.requests_processed ?? 0,
                ),
                blocks_generated: Number(
                  data.blocks_generated ?? saved.blocks_generated ?? saved.block_count ?? 0,
                ),
                run_metrics: data.run_metrics ?? saved.run_metrics,
                blocks: data.blocks?.length ? data.blocks : (saved.blocks ?? data.blocks),
              };
            }
          }
        } catch (savedMetricError) {
          console.error(
            "Could not restore persisted request count after execution:",
            savedMetricError,
          );
        }
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
      const duration = (Date.now() - startTime) / 1000;
      setExecutionDuration(duration);
      localStorage.setItem("optimizer_execution_duration", String(duration));

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="size-4" /> Optimization Execution Successful
          </span>
          <span className="text-xs">
            {displayData.blocks_generated ?? 0} megablocks computed ·{" "}
            {displayData.run_metrics?.total_block_minutes ?? 0} min total window
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
    {
      id: 1,
      name: "BDMS INGESTION",
      desc: `${reqs.length} Demands`,
      icon: FileText,
      done: progress >= 20 || !!apiData,
    },
    {
      id: 2,
      name: "CRITICALITY INDEX",
      desc: "USFD Scoring",
      icon: Target,
      done: progress >= 40 || !!apiData,
    },
    {
      id: 3,
      name: "SHADOW CLUSTERING",
      desc: "Cross-Dept Overlap",
      icon: Layers,
      done: progress >= 60 || !!apiData,
    },
    {
      id: 4,
      name: "CORRIDOR MATCHING",
      desc: "COA Window Clearance",
      icon: Map,
      done: progress >= 80 || !!apiData,
    },
    {
      id: 5,
      name: "MEGABLOCK OUTPUT",
      desc: "Optimized Schedule",
      icon: Sparkles,
      done: progress === 100 || !!apiData,
    },
  ];

  return (
    <>
      <PageHeader
        title="CRIS Automatic Block Planning & Optimization Engine"
        subtitle="Autonomous algorithm for multi-departmental shadow block clustering, line capacity maximization, and zero-conflict train scheduling."
        action={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              Status:{" "}
              <strong className="text-emerald-700 dark:text-emerald-400">ENGINE READY</strong>
            </span>
            <Can
              perm="optimizer.run"
              fallback="disable"
              reason={t(
                "Scheduling is restricted to Control Office and DRM Planning",
                "शेड्यूलिंग नियंत्रण कार्यालय और डीआरएम योजना तक सीमित है",
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
                    <RefreshCw className="mr-1.5 size-3.5 animate-spin" />{" "}
                    {t("Optimizing...", "अनुकूलन जारी...")}
                  </>
                ) : (
                  <>
                    <BrainCircuit className="mr-1.5 size-3.5 text-[#FF9933]" />{" "}
                    {t("Execute AI Engine", "एआई इंजन चलाएं")}
                  </>
                )}
              </Button>
            </Can>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-[#003366] text-[#003366] dark:border-sky-400 dark:text-sky-300 hover:bg-[#003366]/10 rounded-[2px]"
            >
              <Link to="/impact-dna">
                <Network className="mr-1.5 size-3.5 text-[#FF9933]" />
                {t("Railway Impact DNA", "रेलवे प्रभाव डीएनए")}
              </Link>
            </Button>
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
                "केवल पढ़ने के लिए — शेड्यूलिंग नियंत्रण / डीआरएम योजना द्वारा संचालित है",
              )}
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
              {t(
                "Departmental engineers may review AI schedule recommendations and shadow clusters for their division.",
                "विभागीय इंजीनियर अपने प्रभाग के लिए एआई शेड्यूल सिफारिशों और शैडो समूहों की समीक्षा कर सकते हैं।",
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
            Last Executed:{" "}
            {lastExecution
              ? lastExecution.toLocaleTimeString("en-IN") + " IST"
              : "Awaiting Trigger"}
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
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
            {pending.length}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">In BDMS Queue</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-[#003366] dark:text-sky-400">
            Megablocks Output
          </p>
          <p className="text-xl font-bold font-mono text-[#003366] dark:text-sky-400 mt-0.5">
            {apiData?.blocks_generated ?? "-"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Optimized Windows</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
            Downtime Saved
          </p>
          <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
            {apiData?.run_metrics?.total_block_minutes
              ? `${apiData.run_metrics.total_block_minutes}m`
              : "-"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Recovered Line Time</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
            Train Delays
          </p>
          <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
            {apiData?.run_metrics?.total_train_impact != null
              ? Number(
                  apiData.blocks?.reduce(
                    (total, block) => total + Number(block.estimated_delay ?? 0),
                    0,
                  ) ?? 0,
                ).toFixed(2)
              : "0.00"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">COA Estimated Impact</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px] col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">
            Path Conflicts
          </p>
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
              <Progress
                value={progress}
                className="h-2 rounded-[2px] bg-slate-200 dark:bg-slate-800"
              />
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
                  {executionDuration !== null
                    ? `${executionDuration.toFixed(1)}s`
                    : running
                      ? "..."
                      : "-"}
                </p>
              </div>
              <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                <p className="text-[10px] font-bold uppercase text-slate-500">Avg Utilization</p>
                <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {apiData?.run_metrics?.average_utilization
                    ? `${apiData.run_metrics.average_utilization}%`
                    : "-"}
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
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-bold border-slate-300 dark:border-slate-700"
                >
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
                Clusters TMS track, SMMS point, and TDMS OHE works on same section to eliminate
                redundant line blocks.
              </p>
            </div>

            <div className="border border-border p-2.5 rounded-[2px]">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[#003366] dark:text-sky-400 text-[11px]">
                <GitBranch className="size-3.5" /> 3. COA Window Clearance
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Validates headway and express paths (Vande Bharat, Rajdhani) for zero corridor
                disruption.
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

      {/* ==================================================== */}
      {/* TRAFFIC IN WINDOW & WINDOW A vs B COMPARISON VIEW    */}
      {/* ==================================================== */}
      {(() => {
        const activeCand =
          recommendResult?.["recommended_windows"]?.[selectedCandidateIndex] ??
          recommendResult?.["recommended_windows"]?.[0];
        const reqWindow = recommendResult?.["requested_window"] as Record<string, any> | undefined;

        return (
          <Card className="mb-6 border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
            <CardHeader className="bg-[#003366] p-3 text-white border-b-2 border-[#FF9933]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="size-4 text-[#FF9933]" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-white">
                    AI Decision Layer: Window A vs Window B Candidate Evaluator
                  </CardTitle>
                </div>
                <span className="text-[10px] font-mono text-slate-300">
                  POST /optimization/recommend-windows
                </span>
              </div>
              <p className="text-[11px] text-slate-200 mt-1">
                {t(
                  "Operational Purpose: Cross-checks your requested maintenance slot (Window A) against alternative corridor windows (Window B) to minimize passenger train delays, protect Special train punctuality, and balance freight demands.",
                  "परिचालन उद्देश्य: यात्री ट्रेन की देरी को कम करने, विशेष ट्रेनों की समयबद्धता की रक्षा करने और माल ढुलाई की मांग को संतुलित करने के लिए आपके अनुरोधित रखरखाव स्लॉट (विंडो ए) की वैकल्पिक विंडो (विंडो बी) से तुलना करता है।",
                )}
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Corridor & Window Selection Controls */}
              <div className="flex flex-wrap items-end gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-[2px] border border-border text-xs">
                <div className="w-[200px]">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Corridor
                  </label>
                  <Select
                    value={candCorridor}
                    onValueChange={(val) => {
                      setCandCorridor(val);
                      void evaluateCandidateWindows(val, candDate, candStart, candEnd, false);
                    }}
                  >
                    <SelectTrigger className="h-8 rounded-[2px] text-xs">
                      <SelectValue placeholder="Select Corridor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2px]">
                      {corridorsList.map((c) => (
                        <SelectItem key={c.corridor_id} value={c.corridor_id} className="text-xs">
                          {c.corridor_id} – {c.corridor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={candDate}
                    onChange={(e) => setCandDate(e.target.value)}
                    className="h-8 w-[130px] rounded-[2px] text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Window Start
                  </label>
                  <Input
                    type="time"
                    value={candStart}
                    onChange={(e) => setCandStart(e.target.value)}
                    className="h-8 w-[100px] rounded-[2px] text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Window End
                  </label>
                  <Input
                    type="time"
                    value={candEnd}
                    onChange={(e) => setCandEnd(e.target.value)}
                    className="h-8 w-[100px] rounded-[2px] text-xs"
                  />
                </div>

                <div className="pt-1">
                  <Button
                    onClick={() => void evaluateCandidateWindows()}
                    disabled={recommendLoading}
                    size="sm"
                    className="bg-[#003366] hover:bg-[#002244] text-white font-bold h-8 text-xs rounded-[2px] cursor-pointer"
                  >
                    {recommendLoading ? (
                      <>
                        <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> Evaluating...
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="mr-1.5 size-3.5 text-[#FF9933]" /> Compare
                        Candidate Windows
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* LOADING STATE */}
              {recommendLoading && (
                <div className="p-8 text-center border-2 border-dashed border-[#003366]/40 rounded-[2px] bg-slate-50 dark:bg-slate-800/40">
                  <RefreshCw className="size-6 text-[#003366] dark:text-sky-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
                    Evaluating Candidate Windows for Corridor {candCorridor}...
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Scanning daily corridor schedules (05:00 to 23:00), evaluating Special train
                    headway, and ranking optimal slots.
                  </p>
                </div>
              )}

              {/* WINDOW A VS WINDOW B COMPARISON VIEW */}
              {!recommendLoading &&
                recommendResult?.["recommended_windows"] &&
                recommendResult["recommended_windows"].length > 0 && (
                  <div className="space-y-4">
                    {/* AI Recommendation Driver Banner */}
                    <div className="p-3 rounded-[2px] border-2 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 text-xs">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <Sparkles className="size-4 text-emerald-600" />
                        <span>AI Recommendation Driver</span>
                      </div>
                      <p className="text-[11px] leading-relaxed font-medium">
                        {recommendResult["recommendation"]}
                      </p>
                    </div>

                    {/* Candidate Selector Tabs */}
                    {recommendResult["recommended_windows"]?.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-500 mr-1 shrink-0">
                          Candidate Slots:
                        </span>
                        {(
                          recommendResult["recommended_windows"] as Array<{
                            start: string;
                            end: string;
                            optimization_score: number | string;
                          }>
                        ).map((cand, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedCandidateIndex(idx)}
                            className={`px-2.5 py-1 rounded-[2px] text-xs font-mono font-bold border transition-colors shrink-0 cursor-pointer ${
                              selectedCandidateIndex === idx
                                ? "bg-[#003366] text-white border-[#003366]"
                                : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            Option {idx + 1}: {cand.start.slice(0, 5)}–{cand.end.slice(0, 5)} (
                            {cand.optimization_score} pts)
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Side-by-Side Comparison Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* WINDOW A (Baseline / Requested Window) */}
                      <div className="border border-border bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-[2px]">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                          <Badge
                            variant="outline"
                            className="border-slate-400 font-bold uppercase text-[10px]"
                          >
                            Window A (Requested Baseline)
                          </Badge>
                          <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                            {candStart} – {candEnd}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Corridor / Date:</span>
                            <span className="font-mono font-bold">
                              {candCorridor} · {candDate}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Duration:</span>
                            <span className="font-mono font-bold">
                              {reqWindow?.["duration_minutes"] ?? 180} min
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Train Schedule Conflicts:</span>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                              {reqWindow?.["train_conflicts"] ?? "—"} trains
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Special Services Clashing:</span>
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                              {reqWindow?.["special_conflicts"] ?? 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Estimated Delay:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {reqWindow?.["estimated_delay_min"] ?? "—"} min
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Freight Pressure:</span>
                            <span className="font-mono font-bold uppercase">
                              {reqWindow?.["freight_pressure_level"] || "MEDIUM"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Corridor Congestion:</span>
                            <span className="font-mono font-bold uppercase">
                              {reqWindow?.["corridor_congestion"] || "MEDIUM"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* WINDOW B (AI Recommended Candidate) */}
                      <div className="border-2 border-[#003366] bg-blue-50/40 dark:bg-slate-800/70 p-3.5 rounded-[2px]">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-[#003366] text-white font-bold uppercase text-[10px]">
                              Window B (Option {selectedCandidateIndex + 1})
                            </Badge>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                              ★ RECOMMENDED
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs text-[#003366] dark:text-sky-400">
                            {activeCand?.start?.slice(0, 5)} – {activeCand?.end?.slice(0, 5)}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Optimization Score:</span>
                            <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                              {activeCand?.optimization_score} / 100
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Train Conflicts:</span>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {activeCand?.train_conflicts} conflict(s)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Special Clashes:</span>
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                              {activeCand?.special_conflicts}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Estimated Delay:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {activeCand?.estimated_delay_min ?? 0} min
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Freight Pressure:</span>
                            <span className="font-mono font-bold uppercase">
                              {activeCand?.freight_pressure_level}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Risk Assessment:</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                activeCand?.risk_level === "LOW"
                                  ? "border-emerald-400 text-emerald-800"
                                  : activeCand?.risk_level === "MEDIUM"
                                    ? "border-amber-400 text-amber-800"
                                    : "border-red-400 text-red-800"
                              }`}
                            >
                              {activeCand?.risk_level}
                            </Badge>
                          </div>

                          {activeCand?.reasons && activeCand.reasons.length > 0 && (
                            <div className="pt-2 border-t border-border/60">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                AI Decision Reasons:
                              </span>
                              <ul className="text-[11px] list-disc list-inside text-slate-700 dark:text-slate-300 space-y-0.5">
                                {activeCand.reasons.map((r: string, idx: number) => (
                                  <li key={idx}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="pt-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (activeCand?.start && activeCand?.end) {
                                  setCandStart(activeCand.start.slice(0, 5));
                                  setCandEnd(activeCand.end.slice(0, 5));
                                  toast.success(
                                    `Adopted Window B: ${activeCand.start.slice(0, 5)}–${activeCand.end.slice(0, 5)} as active interval`,
                                  );
                                }
                              }}
                              className="w-full bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold h-8 rounded-[2px] cursor-pointer"
                            >
                              Adopt Window B as Active Interval
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TRAFFIC IN WINDOW B GRID */}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Activity className="size-3.5 text-[#003366] dark:text-sky-400" />
                          Traffic in Window B (Option {selectedCandidateIndex + 1}:{" "}
                          {activeCand?.start?.slice(0, 5)}–{activeCand?.end?.slice(0, 5)})
                        </h3>
                        {/* Freight Pressure Chip */}
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-amber-500 bg-amber-100 text-amber-900 font-bold uppercase text-[10px] dark:bg-amber-900/50 dark:text-amber-200"
                          >
                            Freight Pressure: {activeCand?.freight_pressure_level || "MEDIUM"}
                          </Badge>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            • Forecast-based corridor split
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Passenger / Express
                          </span>
                          <p className="font-mono text-base font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                            {activeCand?.conflicts_by_class?.passenger ?? 0}
                            <span className="text-[10px] font-normal text-slate-500 ml-1">
                              ({activeCand?.conflicts_by_class?.express ?? 0} Exp)
                            </span>
                          </p>
                        </div>

                        <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Scheduled Goods
                          </span>
                          <p className="font-mono text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                            {activeCand?.conflicts_by_class?.goods ?? 0}
                          </p>
                        </div>

                        <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Special Services
                          </span>
                          <p className="font-mono text-base font-bold text-purple-700 dark:text-purple-400 mt-0.5">
                            {activeCand?.special_conflicts ?? 0}
                          </p>
                        </div>

                        <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px]">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Est. Delay Min
                          </span>
                          <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                            {activeCand?.estimated_delay_min ?? 0} min
                          </p>
                        </div>
                      </div>

                      {/* List of Special Conflicts */}
                      <div className="mt-2.5">
                        {(activeCand?.special_conflicts ?? 0) > 0 ? (
                          <div className="p-2.5 border border-purple-400 bg-purple-50/80 dark:bg-purple-950/30 rounded-[2px] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Star className="size-4 text-purple-600 fill-amber-400 shrink-0" />
                              <span className="text-purple-950 dark:text-purple-200 font-semibold">
                                {activeCand.special_conflicts} Special train service(s) intersect
                                with this maintenance window. Headway clearance required.
                              </span>
                            </div>
                            <Badge className="bg-purple-700 text-white font-bold text-[10px]">
                              CRITICAL HEADWAY
                            </Badge>
                          </div>
                        ) : (
                          <div className="p-2 border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-[2px] flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>
                              Zero Special train conflicts detected in this time interval.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* EMPTY CALLOUT IF NOT EVALUATED */}
              {!recommendLoading &&
                (!recommendResult?.["recommended_windows"] ||
                  recommendResult?.["recommended_windows"]?.length === 0) && (
                  <div className="p-6 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2px]">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Ready to Evaluate Candidate Windows
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                      Select a corridor, date, and your proposed maintenance window, then click
                      &quot;Compare Candidate Windows&quot; to discover conflict-free slots.
                    </p>
                    <Button
                      onClick={() => void evaluateCandidateWindows()}
                      className="mt-3 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold h-8 rounded-[2px]"
                    >
                      Compare Candidate Windows Now
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        );
      })()}

      {/* SHADOW BLOCK OPPORTUNITIES */}
      <div className="mb-6 border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#003366] bg-slate-100 dark:bg-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#003366] dark:text-sky-400 text-lg">◈</span>

              <h2 className="font-mono font-bold text-sm uppercase tracking-wider text-[#003366] dark:text-sky-400">
                Shadow Block Opportunities
              </h2>
            </div>

            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">
              AI-identified opportunities for combining nearby maintenance windows
            </p>
          </div>

          <span className="border border-emerald-300 bg-emerald-100 text-emerald-800 px-3 py-1 text-[10px] font-bold uppercase">
            {shadowBlockOpportunities.length} Opportunities
          </span>
        </div>

        {shadowBlockOpportunities.length > 0 ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {shadowBlockOpportunities.map((opportunity, index) => (
              <div
                key={`${opportunity.corridor}-${opportunity.date}-${index}`}
                className="border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 rounded-[2px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold text-xs text-[#003366] dark:text-sky-400">
                      SHADOW-{String(index + 1).padStart(2, "0")}
                    </p>

                    <p className="text-[10px] text-slate-500 uppercase mt-1">
                      {opportunity.corridor} · {opportunity.date}
                    </p>
                  </div>

                  <span className="text-[9px] font-bold uppercase border border-amber-300 bg-amber-100 text-amber-800 px-2 py-1">
                    Candidate
                  </span>
                </div>

                {/* Base Window */}
                <div className="mb-2">
                  <p className="text-[9px] uppercase font-bold text-slate-500">Existing Window</p>

                  <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono text-xs">
                    {opportunity.base_window.start}
                    {" → "}
                    {opportunity.base_window.end}
                  </div>
                </div>

                {/* Candidate Window */}
                <div className="mb-3">
                  <p className="text-[9px] uppercase font-bold text-slate-500">Nearby Candidate</p>

                  <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono text-xs">
                    {opportunity.candidate_window.start}
                    {" → "}
                    {opportunity.candidate_window.end}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 text-center">
                    <p className="text-[8px] uppercase font-bold text-slate-500">Gap</p>

                    <p className="font-mono font-bold text-sm text-[#003366] dark:text-sky-400">
                      {opportunity.gap_minutes} min
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 text-center">
                    <p className="text-[8px] uppercase font-bold text-slate-500">Combined</p>

                    <p className="font-mono font-bold text-sm text-[#003366] dark:text-sky-400">
                      {opportunity.combined_duration_minutes} min
                    </p>
                  </div>
                </div>

                {/* Tasks */}
                <div className="mt-3">
                  <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">
                    Maintenance Tasks
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {[
                      ...(opportunity.base_tasks || []),
                      ...(opportunity.candidate_tasks || []),
                    ].map((task, taskIndex) => (
                      <span
                        key={`${task}-${taskIndex}`}
                        className="text-[9px] font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1"
                      >
                        {task}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5">
            <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-5 text-center rounded-[2px]">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                No Shadow Block Opportunities Identified
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                The AI optimizer did not find another nearby maintenance window that can be combined
                within the configured corridor, time-gap, and block-duration limits.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* GENERATED OPTIMIZED BLOCKS GRID */}
      {apiData && apiData.blocks && apiData.blocks.length > 0 && (
        <div className="mb-6">
          <div className="border-b-2 border-[#003366] pb-1.5 mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#003366] dark:text-sky-400 flex items-center gap-2">
              <CalendarCheck className="size-4" /> Generated Mega Block Schedule (
              {apiData.blocks.length} Blocks)
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Synchronized with Gantt Timeline
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {apiData.blocks.map((b) => (
              <Card
                key={b.block_id}
                className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none"
              >
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
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {b.start} – {b.end}
                    </span>
                    <span className="text-primary font-bold">{b.duration} min</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center divide-x divide-border">
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">
                        Util
                      </span>
                      <span className="font-mono font-bold text-xs">{b.utilization}%</span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">
                        Tasks
                      </span>
                      <span className="font-mono font-bold text-xs">{b.number_of_tasks}</span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">
                        Impact
                      </span>
                      <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
                        {b.train_impact}
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">
                        Clashes
                      </span>
                      <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                        {b.conflict_count ?? b.train_conflicts}
                      </span>
                    </div>
                  </div>

                  {/* UNIFIED AI INTELLIGENCE */}
                  {(() => {
                    const intelligence = blockIntelligence[b.block_id];
                    const aiReasons = getBlockAiReasons(b, intelligence);
                    const aiScore = getBlockAiScore(b, intelligence);
                    const requestedWindow = intelligence?.requested_window;
                    const selectedWindow = intelligence?.selected_window ?? {
                      start: b.start,
                      end: b.end,
                    };
                    const selectedConflictCount =
                      intelligence?.conflict_count ?? b.conflict_count ?? b.train_conflicts;
                    const selectedDelay = intelligence?.estimated_delay ?? b.estimated_delay ?? 0;
                    const decisionConfidence =
                      intelligence?.ai_decision_confidence ?? b.ai_decision_confidence;

                    return (
                      <>
                        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px] text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                Requested Window
                              </span>
                              <span className="font-mono font-bold">
                                {requestedWindow
                                  ? `${requestedWindow.start.slice(0, 5)}–${requestedWindow.end.slice(0, 5)}`
                                  : "Not available"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                Selected Optimized Window
                              </span>
                              <span className="font-mono font-bold text-[#003366] dark:text-sky-400">
                                {selectedWindow.start.slice(0, 5)}–{selectedWindow.end.slice(0, 5)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                Selected Window Conflicts
                              </span>
                              <span className="font-mono font-bold">
                                {selectedConflictCount} train(s)
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                                Estimated Delay
                              </span>
                              <span className="font-mono font-bold">
                                {selectedDelay} min
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-2 border-[#003366] dark:border-sky-700 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-[2px]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <BrainCircuit className="size-3.5 text-[#003366] dark:text-sky-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#003366] dark:text-sky-400">
                                Unified AI Intelligence
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-bold">
                              {intelligence?.intelligence?.overall_assessment?.overall_level ??
                                (aiScore >= 80 ? "HIGH" : aiScore >= 60 ? "MEDIUM" : "REVIEW")}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white dark:bg-slate-900 border border-border p-2 rounded-[2px] text-center">
                              <p className="text-[8px] uppercase font-bold text-slate-500">
                                Asset Risk Category
                              </p>
                              <p className="font-mono font-bold text-sm">
                                {intelligence?.intelligence?.asset_risk?.risk_score != null
                                  ? Number(intelligence.intelligence.asset_risk.risk_score).toFixed(
                                      1,
                                    )
                                  : b.asset_risk_score != null
                                    ? Number(b.asset_risk_score).toFixed(1)
                                    : "—"}
                              </p>
                              <p className="text-[9px] font-bold">
                                {intelligence?.intelligence?.asset_risk?.priority_category ??
                                  "Risk category unavailable"}
                              </p>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-border p-2 rounded-[2px] text-center">
                              <p className="text-[8px] uppercase font-bold text-slate-500">
                                Forecast Traffic Impact
                              </p>
                              <p className="font-mono font-bold text-sm">
                                {intelligence?.intelligence?.traffic_impact?.traffic_impact_score !=
                                null
                                  ? Number(
                                      intelligence.intelligence.traffic_impact.traffic_impact_score,
                                    ).toFixed(1)
                                  : b.traffic_impact_score != null
                                    ? Number(b.traffic_impact_score).toFixed(1)
                                    : Number(b.train_impact ?? 0).toFixed(1)}
                              </p>
                              <p className="text-[9px] font-bold">
                                {intelligence?.intelligence?.traffic_impact?.disruption_level ??
                                  "Traffic impact"}
                              </p>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-border p-2 rounded-[2px] text-center">
                              <p className="text-[8px] uppercase font-bold text-slate-500">
                                Forecast Goods Demand
                              </p>
                              <p className="font-mono font-bold text-sm">
                                {intelligence?.intelligence?.goods_demand
                                  ?.predicted_goods_train_demand != null
                                  ? Number(
                                      intelligence.intelligence.goods_demand
                                        .predicted_goods_train_demand,
                                    ).toFixed(1)
                                  : b.goods_impact_score != null
                                    ? Number(b.goods_impact_score).toFixed(1)
                                    : "—"}
                              </p>
                              <p className="text-[9px] font-bold">
                                {intelligence?.intelligence?.goods_demand?.demand_level ??
                                  "Forecast"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-[2px] p-3">
                            <p className="text-[8px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                              Scheduled Traffic in Selected Window
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                              <div className="text-center">
                                <p className="text-[8px] uppercase font-bold text-slate-500">
                                  Scheduled Passenger
                                </p>
                                <p className="font-mono font-bold text-sm">
                                  {intelligence?.traffic_summary?.passenger_trains ?? 0}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-[8px] uppercase font-bold text-slate-500">
                                  Scheduled Goods
                                </p>
                                <p className="font-mono font-bold text-sm">
                                  {intelligence?.traffic_summary?.goods_trains ?? 0}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-[8px] uppercase font-bold text-slate-500">
                                  Scheduled Special
                                </p>
                                <p className="font-mono font-bold text-sm">
                                  {intelligence?.traffic_summary?.special_trains ?? 0}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-[8px] uppercase font-bold text-slate-500">
                                  Scheduled Express
                                </p>
                                <p className="font-mono font-bold text-sm">
                                  {intelligence?.traffic_summary?.express_trains ?? 0}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold text-slate-500">
                              Overall Pressure
                            </span>
                            <span className="font-mono font-bold text-sm text-[#003366] dark:text-sky-400">
                              {intelligence?.intelligence?.overall_assessment?.pressure_score !=
                              null
                                ? Number(
                                    intelligence.intelligence.overall_assessment.pressure_score,
                                  ).toFixed(1)
                                : Number(aiScore).toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* WHY AI SELECTED THIS BLOCK */}
                        {aiReasons.length > 0 && (
                          <div className="border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-[2px]">
                            <div className="flex items-center gap-1.5 mb-2">
                              <CheckCircle2 className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                Why AI Selected This Block
                              </span>
                              <span className="ml-auto font-mono text-[10px] font-bold text-[#003366] dark:text-sky-400">
                                Score {Number(aiScore).toFixed(2)}
                                 Score {Number(aiScore).toFixed(2)}
                              </span>
                            </div>
                            {decisionConfidence?.level && (
                              <div className="mb-2 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                Decision confidence: {decisionConfidence.level} (score gap {Number(
                                  decisionConfidence.score_gap ?? 0,
                                ).toFixed(2)})
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {aiReasons.map((reason, index) => (
                                <div
                                  key={`${b.block_id}-reason-${index}`}
                                  className="flex items-start gap-2 text-[10px] text-slate-700 dark:text-slate-300"
                                >
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    ✓
                                  </span>
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>

                            {b.optimization_score != null && (
                              <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-900/50 grid grid-cols-2 gap-2 text-[9px]">
                                <div>
                                  <span className="text-slate-500 uppercase font-bold">
                                    Optimizer Score
                                  </span>
                                  <span className="ml-1 font-mono font-bold">
                                    {Number(b.optimization_score).toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 uppercase font-bold">
                                    Consolidation
                                  </span>
                                  <span className="ml-1 font-mono font-bold">
                                    {b.consolidation_score != null
                                      ? Number(b.consolidation_score).toFixed(1)
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="pt-2.5 border-t border-border flex justify-end">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold border-[#003366] text-[#003366] dark:border-sky-400 dark:text-sky-300 hover:bg-[#003366]/10 rounded-[2px]"
                    >
                      <Link to="/impact-dna" search={{ blockId: b.block_id }}>
                        <Network className="mr-1.5 size-3.5 text-[#FF9933]" />
                        {t("Trace Impact DNA →", "प्रभाव डीएनए ट्रेस करें →")}
                      </Link>
                    </Button>
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
                    IR-ABPS successfully scheduled{" "}
                    <strong>{apiData.blocks.length} multi-departmental megablocks</strong> across
                    Northern Central Railway. All high-criticality USFD rail flaws and signal
                    overhauls have been clustered into low-density night/afternoon windows.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold uppercase text-slate-500 text-[10px]">
                    Allocated Block Schedule
                  </p>
                  {apiData.blocks.map((bl) => (
                    <div
                      key={bl.block_id}
                      className="border border-border p-3 rounded-[2px] bg-slate-50 dark:bg-slate-900"
                    >
                      <div className="flex justify-between font-mono font-bold text-xs">
                        <span className="text-[#003366] dark:text-sky-400">{bl.block_id}</span>
                        <span>
                          {bl.date} ({bl.start} – {bl.end})
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        Corridor: {bl.corridor} · Duration: {bl.duration} min · Tasks Bundled:{" "}
                        {bl.number_of_tasks}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button
                    asChild
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold h-9 rounded-[2px]"
                  >
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
