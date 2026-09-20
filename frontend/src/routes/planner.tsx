import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  Download,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

import {
  classifyTrainConflictSeverity,
  getSeverityColorClasses,
  overallSeverity,
} from "@/lib/conflict-priority";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Gantt Planner | IR-ABPS Corridor Timetable" },
      {
        name: "description",
        content:
          "Time-window planning for maintenance blocks, train movements and corridor availability.",
      },
    ],
  }),
  component: PlannerPage,
});

type Corridor = {
  corridor_id: string;
  corridor_name: string;
};

type OptimizedBlock = {
  block_id: string;
  corridor_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  duration_min: string;
  utilization_percent: string;
  train_impact_score: string;
  optimization_score: string;
  block_status: string;
  number_of_tasks: string;
  number_of_departments: string;
  review?: {
    controller_decision?: string;
    controller_note?: string;
    change_requests?: Array<{ reason: string; suggested_shift_min?: number; actor_dept: string }>;
  };
};

type Train = {
  train_id: string;
  train_number: string;
  train_name: string;
  train_type: string;
  corridor_id: string;
  travel_date: string;
  arrival_time: string;
  departure_time: string;
  operational_priority?: string;
};

function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  const [hours = "0", minutes = "0"] = timeStr.split(":");
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

function formatTime(time?: string) {
  if (!time) return "--:--";
  return time.slice(0, 5);
}

function formatStatus(status?: string) {
  if (!status) return "PLANNED";
  return status.replaceAll("_", " ");
}

function statusClass(status?: string) {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "border-emerald-300 bg-emerald-100 font-bold text-emerald-900";
    case "REJECTED":
      return "border-red-300 bg-red-100 font-bold text-red-900";
    case "REWORK":
      return "border-amber-300 bg-amber-100 font-bold text-amber-900";
    default:
      return "border-blue-300 bg-blue-100 font-bold text-blue-900";
  }
}

function PlannerPage() {
  const { role, scope, can } = useAbps();
  const { t } = useLanguage();

  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [blocks, setBlocks] = useState<OptimizedBlock[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState("ALL");
  const [selectedBlock, setSelectedBlock] =
    useState<OptimizedBlock | null>(null);

  const [softGateOpen, setSoftGateOpen] = useState(false);
  const [changeReqOpen, setChangeReqOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [shiftMin, setShiftMin] = useState("");
  const [recommendRejectOpen, setRecommendRejectOpen] = useState(false);
  const [recommendRejectNote, setRecommendRejectNote] = useState("");
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);

  useEffect(() => {
    if (selectedBlock) {
      apiFetch(`/optimized-plan/${selectedBlock.block_id}/history`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setReviewHistory(Array.isArray(data) ? data : []))
        .catch(() => setReviewHistory([]));
    } else {
      setReviewHistory([]);
    }
  }, [selectedBlock]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [corridorResponse, blockResponse, trainResponse] =
        await Promise.all([
          apiFetch("/corridors/"),
          apiFetch("/optimized-plan/"),
          apiFetch("/trains/"),
        ]);

      if (
        !corridorResponse.ok ||
        !blockResponse.ok ||
        !trainResponse.ok
      ) {
        throw new Error("One or more planner APIs failed.");
      }

      const corridorData = await corridorResponse.json();
      const blockData = await blockResponse.json();
      const trainData = await trainResponse.json();

      const nextCorridors: Corridor[] = corridorData.corridors ?? [];
      const nextBlocks: OptimizedBlock[] = blockData.blocks ?? [];
      const nextTrains: Train[] = trainData.trains ?? [];

      setCorridors(nextCorridors);
      setBlocks(nextBlocks);
      setTrains(nextTrains);

      // Prefer the first date that actually exists in the backend data.
      if (!dateStr) {
        const firstDate =
          nextBlocks[0]?.block_date ??
          nextTrains[0]?.travel_date ??
          "";
        if (firstDate) setDateStr(firstDate);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load planner data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredBlocks = useMemo(() => {
    return blocks.filter(
      (block) =>
        (!dateStr || block.block_date === dateStr) &&
        (selectedCorridor === "ALL" ||
          block.corridor_id === selectedCorridor),
    );
  }, [blocks, dateStr, selectedCorridor]);

  const filteredTrains = useMemo(() => {
    return trains.filter(
      (train) =>
        (!dateStr || train.travel_date === dateStr) &&
        (selectedCorridor === "ALL" ||
          train.corridor_id === selectedCorridor),
    );
  }, [trains, dateStr, selectedCorridor]);

  const activeCorridors = useMemo(() => {
    if (selectedCorridor !== "ALL") {
      return corridors.filter(
        (corridor) => corridor.corridor_id === selectedCorridor,
      );
    }

    const corridorIds = new Set([
      ...filteredBlocks.map((block) => block.corridor_id),
      ...filteredTrains.map((train) => train.corridor_id),
    ]);

    return corridors.filter((corridor) =>
      corridorIds.has(corridor.corridor_id),
    );
  }, [corridors, filteredBlocks, filteredTrains, selectedCorridor]);

  const totalBlockMinutes = filteredBlocks.reduce(
    (total, block) =>
      total + Number.parseInt(block.duration_min || "0", 10),
    0,
  );

  const avgUtilization =
    filteredBlocks.length > 0
      ? filteredBlocks.reduce(
          (total, block) =>
            total +
            Number.parseFloat(block.utilization_percent || "0"),
          0,
        ) / filteredBlocks.length
      : 0;

  const overlaps = useMemo(() => {
    let count = 0;
    const list: { block: string; train: string }[] = [];

    filteredBlocks.forEach((block) => {
      const blockStart = timeToMinutes(block.start_time);
      let blockEnd = timeToMinutes(block.end_time);

      if (blockEnd < blockStart) blockEnd += 1440;

      filteredTrains.forEach((train) => {
        if (train.corridor_id !== block.corridor_id) return;

        const trainStart = timeToMinutes(train.arrival_time);
        let trainEnd = timeToMinutes(train.departure_time);

        if (trainEnd < trainStart) trainEnd += 1440;

        if (blockStart < trainEnd && trainStart < blockEnd) {
          count += 1;
          list.push({
            block: block.block_id,
            train: train.train_id,
          });
        }
      });
    });

    return { count, list };
  }, [filteredBlocks, filteredTrains]);

  const selectedBlockTrains = useMemo(() => {
    if (!selectedBlock) return [];

    const blockStart = timeToMinutes(selectedBlock.start_time);
    let blockEnd = timeToMinutes(selectedBlock.end_time);

    if (blockEnd < blockStart) blockEnd += 1440;

    return filteredTrains.filter((train) => {
      if (train.corridor_id !== selectedBlock.corridor_id) {
        return false;
      }

      const trainStart = timeToMinutes(train.arrival_time);
      let trainEnd = timeToMinutes(train.departure_time);

      if (trainEnd < trainStart) trainEnd += 1440;

      return blockStart < trainEnd && trainStart < blockEnd;
    });
  }, [filteredTrains, selectedBlock]);

  const blockConflictPriority = useMemo(() => {
    if (selectedBlockTrains.length === 0) return "LOW" as const;

    const severities = selectedBlockTrains.map((train) =>
      classifyTrainConflictSeverity(
        train.operational_priority,
        train.train_type,
      ),
    );

    return overallSeverity(severities);
  }, [selectedBlockTrains]);

  const blockReasoning = useMemo(() => {
    if (!selectedBlock) return [];

    const reasons = [
      `Corridor maintenance window matched for ${selectedBlock.corridor_id}.`,
      `${selectedBlock.number_of_tasks} maintenance task(s) scheduled in this block.`,
      `${selectedBlock.utilization_percent}% maintenance-window utilization.`,
    ];

    if (selectedBlockTrains.length > 0) {
      reasons.push(
        `${selectedBlockTrains.length} train-path conflict(s) detected — highest severity ${blockConflictPriority}. Human review is required before approval.`,
      );
    } else {
      reasons.push("No train-path conflicts detected in the current dataset.");
    }

    return reasons;
  }, [blockConflictPriority, selectedBlock, selectedBlockTrains]);

  const updateBlockStatus = async (
    action: "approve" | "reject" | "rework",
  ) => {
    if (!selectedBlock) return;

    setActionLoading(true);

    try {
      const actionPath =
        action === "approve"
          ? "approve"
          : action === "reject"
            ? "reject"
            : "rework";

      const response = await apiFetch(
        `/optimized-plan/${selectedBlock.block_id}/${actionPath}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail || `Unable to ${action} block.`,
        );
      }

      const messages = {
        approve: t("Block authorization recorded.", "ब्लॉक प्राधिकरण दर्ज किया गया।"),
        reject: t("Block rejected and returned to queue.", "ब्लॉक अस्वीकृत और कतार में वापस।"),
        rework: t("Block sent back for window adjustment.", "ब्लॉक समय समायोजन हेतु वापस भेजा गया।"),
      };

      toast.success(messages[action]);
      setSelectedBlock(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update block status.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (confirmedOverride = false) => {
    if (!selectedBlock) return;
    const hasEndorsement =
      selectedBlock.review?.controller_decision === "CONTROLLER_ENDORSED" ||
      reviewHistory.some((h) => h.action === "CONTROLLER_ENDORSED");
    if (!hasEndorsement && !confirmedOverride) {
      setSoftGateOpen(true);
      return;
    }
    setSoftGateOpen(false);
    await updateBlockStatus("approve");
  };

  const handleEndorse = async () => {
    if (!selectedBlock) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/optimized-plan/${selectedBlock.block_id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "ENDORSE",
          note: "Endorsed by Chief Controller for authorization",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to record endorsement");
      }
      toast.success(
        t(
          "Controller endorsement recorded for DRM authorization.",
          "डीआरएम प्राधिकरण के लिए नियंत्रक का समर्थन दर्ज किया गया।",
        ),
      );
      await fetchData();
      setSelectedBlock(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to record endorsement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecommendReject = async () => {
    if (!selectedBlock) return;
    if (!recommendRejectNote.trim()) {
      toast.error(t("Please provide a note for recommendation", "कृपया सिफारिश के लिए एक नोट प्रदान करें"));
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(`/optimized-plan/${selectedBlock.block_id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "RECOMMEND_REJECT", note: recommendRejectNote }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to record recommendation");
      }
      toast.success(t("Recommendation to reject recorded.", "अस्वीकार करने की सिफारिश दर्ज की गई।"));
      setRecommendRejectOpen(false);
      setRecommendRejectNote("");
      await fetchData();
      setSelectedBlock(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to record recommendation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChange = async () => {
    if (!selectedBlock) return;
    if (!changeReason.trim()) {
      toast.error(t("Please enter a reason for the rework request", "कृपया पुनर्विचार अनुरोध का कारण दर्ज करें"));
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(`/optimized-plan/${selectedBlock.block_id}/request-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: changeReason,
          suggested_shift_min: shiftMin ? Number(shiftMin) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit change request");
      }
      toast.success(
        t(
          "Rework request submitted to Control & DRM Planning.",
          "पुनर्विचार अनुरोध नियंत्रण और डीआरएम योजना को प्रस्तुत किया गया।",
        ),
      );
      setChangeReqOpen(false);
      setChangeReason("");
      setShiftMin("");
      await fetchData();
      setSelectedBlock(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit change request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedBlock) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/optimized-plan/${selectedBlock.block_id}/acknowledge`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to acknowledge");
      }
      toast.success(
        t("Department schedule acknowledgement recorded.", "विभागीय अनुसूची स्वीकृति दर्ज की गई।"),
      );
      await fetchData();
      setSelectedBlock(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to acknowledge");
    } finally {
      setActionLoading(false);
    }
  };

  const exportPlan = () => {
    if (filteredBlocks.length === 0) {
      toast.info("There are no blocks to export.");
      return;
    }

    const headers = [
      "Block ID",
      "Corridor",
      "Date",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Utilization (%)",
      "Train Impact Score",
      "Optimization Score",
      "Tasks",
      "Departments",
      "Status",
    ];

    const rows = filteredBlocks.map((block) => [
      block.block_id,
      block.corridor_id,
      block.block_date,
      formatTime(block.start_time),
      formatTime(block.end_time),
      block.duration_min,
      block.utilization_percent,
      block.train_impact_score,
      block.optimization_score,
      block.number_of_tasks,
      block.number_of_departments,
      block.block_status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `IR-ABPS-GanttPlan-${dateStr || "schedule"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success("Corridor schedule exported.");
  };

  return (
    <>
      <PlannerPageHeader
        title="Corridor Operational Gantt & Megablock Schedule Planner"
        subtitle="Time-window visualization of AI-generated maintenance blocks, train paths and corridor capacity."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateStr}
              onChange={(event) => setDateStr(event.target.value)}
              className="h-8 w-auto rounded-[2px] border-slate-300 bg-background text-xs dark:border-slate-700"
            />

            <Select
              value={selectedCorridor}
              onValueChange={setSelectedCorridor}
            >
              <SelectTrigger className="h-8 w-[180px] rounded-[2px] border-slate-300 bg-background text-xs dark:border-slate-700">
                <SelectValue placeholder="All Corridors" />
              </SelectTrigger>
              <SelectContent className="rounded-[2px]">
                <SelectItem value="ALL" className="text-xs">
                  All Corridors
                </SelectItem>

                {corridors.map((corridor) => (
                  <SelectItem
                    key={corridor.corridor_id}
                    value={corridor.corridor_id}
                    className="text-xs"
                  >
                    {corridor.corridor_id} – {corridor.corridor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchData()}
              disabled={loading}
              className="h-8 border-slate-300 text-xs font-bold dark:border-slate-700"
            >
              <RefreshCw
                className={`mr-1 size-3.5 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportPlan}
              className="h-8 border-slate-300 text-xs font-bold dark:border-slate-700"
            >
              <Download className="mr-1 size-3.5" />
              Export Schedule
            </Button>

            <Button
              asChild
              size="sm"
              className="h-8 rounded-[2px] bg-[#003366] text-xs font-bold text-white hover:bg-[#002244]"
            >
              <Link to="/optimizer">
                <Play className="mr-1 size-3.5 text-[#FF9933]" />
                Run Optimizer
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="Planned Megablocks"
          value={filteredBlocks.length}
        />
        <MetricCard
          label="Block Hours"
          value={`${(totalBlockMinutes / 60).toFixed(1)}h`}
        />
        <MetricCard
          label="Trains in Corridor"
          value={filteredTrains.length}
        />
        <MetricCard
          label="Avg Utilization"
          value={`${avgUtilization.toFixed(1)}%`}
          tone="text-emerald-700 dark:text-emerald-400"
        />
        <MetricCard
          label="Path Conflicts"
          value={overlaps.count}
          tone={
            overlaps.count > 0
              ? "font-bold text-red-700 dark:text-red-400"
              : "text-emerald-700 dark:text-emerald-400"
          }
        />
        <MetricCard
          label="Active Corridors"
          value={activeCorridors.length}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="rounded-[2px] border border-border bg-white shadow-none dark:bg-slate-900 lg:col-span-3">
          <CardHeader className="flex items-center justify-between border-b border-border bg-slate-100 p-3.5 dark:bg-slate-900/80">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
              <CalendarRange className="size-4" />
              24-Hour Corridor Operational Timeline
              {dateStr ? ` (${dateStr})` : ""}
            </CardTitle>
            <span className="font-mono text-[10px] text-slate-500">
              Planning Grid
            </span>
          </CardHeader>

          <CardContent className="overflow-x-auto p-4">
            {activeCorridors.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-xs text-muted-foreground">
                <CalendarRange className="mb-2 size-8 text-slate-400 opacity-40" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {loading
                    ? "Loading planner data..."
                    : "No maintenance blocks scheduled for this date."}
                </p>

                {!loading && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-3 border-slate-300 text-xs font-bold dark:border-slate-700"
                  >
                    <Link to="/optimizer">
                      Run IR-ABPS Optimizer Engine
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="min-w-[920px]">
                <div className="mb-2 flex border-b border-border pb-1 pl-[130px] text-[10px] font-mono font-bold text-slate-500">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div
                      key={hour}
                      className="flex-1 border-l border-border/40 pl-1"
                    >
                      {hour.toString().padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {activeCorridors.map((corridor) => {
                  const corridorBlocks = filteredBlocks.filter(
                    (block) =>
                      block.corridor_id === corridor.corridor_id,
                  );

                  const corridorTrains = filteredTrains.filter(
                    (train) =>
                      train.corridor_id === corridor.corridor_id,
                  );

                  return (
                    <div
                      key={corridor.corridor_id}
                      className="mb-3 flex items-stretch border border-border bg-slate-50/50 dark:bg-slate-900/40"
                    >
                      <div className="flex w-[130px] shrink-0 flex-col justify-center border-r border-border bg-slate-100 p-2 dark:bg-slate-800">
                        <span className="font-mono text-xs font-bold text-[#003366] dark:text-sky-400">
                          {corridor.corridor_id}
                        </span>
                        <span
                          className="truncate text-[10px] text-slate-600 dark:text-slate-400"
                          title={corridor.corridor_name}
                        >
                          {corridor.corridor_name}
                        </span>
                      </div>

                      <div className="relative min-h-[68px] flex-1 bg-white py-1 dark:bg-slate-950">
                        {Array.from({ length: 24 }).map(
                          (_, hour) => (
                            <div
                              key={hour}
                              className="pointer-events-none absolute bottom-0 top-0 border-l border-border/30"
                              style={{
                                left: `${(hour / 24) * 100}%`,
                              }}
                            />
                          ),
                        )}

                        {corridorTrains.map((train) => {
                          const start = timeToMinutes(
                            train.arrival_time,
                          );
                          let end = timeToMinutes(
                            train.departure_time,
                          );

                          if (end < start) end += 1440;

                          const left = (start / 1440) * 100;
                          let width = ((end - start) / 1440) * 100;

                          if (left > 100) return null;
                          if (left + width > 100) {
                            width = 100 - left;
                          }

                          return (
                            <div
                              key={train.train_id}
                              title={`${train.train_number} - ${train.train_name} (${formatTime(train.arrival_time)} to ${formatTime(train.departure_time)})`}
                              className="absolute z-10 h-2 cursor-pointer rounded-[1px] border border-slate-600 bg-slate-500/70"
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 0.6)}%`,
                                top: "6px",
                              }}
                            />
                          );
                        })}

                        {corridorBlocks.map((block) => {
                          const start = timeToMinutes(
                            block.start_time,
                          );
                          let end = timeToMinutes(block.end_time);

                          if (end < start) end += 1440;

                          const left = (start / 1440) * 100;
                          let width = ((end - start) / 1440) * 100;

                          if (left > 100) return null;
                          if (left + width > 100) {
                            width = 100 - left;
                          }

                          const isConflict = overlaps.list.some(
                            (item) => item.block === block.block_id,
                          );

                          return (
                            <button
                              key={block.block_id}
                              type="button"
                              onClick={() => setSelectedBlock(block)}
                              title="Click to review this block"
                              className={`absolute z-20 flex h-8 flex-col items-start justify-center overflow-hidden rounded-[2px] border px-1.5 text-left text-[10px] font-bold text-white transition-transform hover:scale-[1.01] ${
                                isConflict
                                  ? "border-red-400 bg-red-900"
                                  : "border-[#FF9933] bg-[#003366]"
                              }`}
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 2.5)}%`,
                                top: "24px",
                              }}
                            >
                              <span className="w-full truncate">
                                {block.block_id}
                              </span>
                              <span className="w-full truncate font-mono text-[8px] opacity-80">
                                {formatTime(block.start_time)} –{" "}
                                {formatTime(block.end_time)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>

          <div className="flex flex-wrap items-center gap-5 border-t border-border bg-slate-50 px-4 py-2.5 text-xs dark:bg-slate-900/60">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="h-2.5 w-4 rounded-[1px] border border-[#FF9933] bg-[#003366]" />
              AI Maintenance Megablock
            </span>

            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="h-2 w-4 rounded-[1px] border border-slate-600 bg-slate-500" />
              Train Movement Path
            </span>

            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span className="h-2.5 w-4 rounded-[1px] border border-red-400 bg-red-900" />
              Train Conflict
            </span>
          </div>
        </Card>

        <Card className="flex flex-col justify-between rounded-[2px] border border-border bg-white shadow-none dark:bg-slate-900">
          <CardHeader className="border-b border-border bg-slate-100 p-3.5 dark:bg-slate-900/80">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
              <Zap className="size-4" />
              Controller Scrutiny Notes
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 p-3.5 text-xs">
            {filteredBlocks.length > 0 ? (
              <>
                <div className="rounded-[2px] border border-border bg-slate-50 p-2.5 leading-relaxed dark:bg-slate-800">
                  <p className="mb-1 text-[11px] font-bold text-[#003366] dark:text-sky-400">
                    Corridor Clearance
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {filteredBlocks.length} block(s) computed for{" "}
                    {dateStr || "selected date"}. Average utilization:{" "}
                    <strong>{avgUtilization.toFixed(1)}%</strong>.
                  </p>
                </div>

                {overlaps.count > 0 ? (
                  <div className="rounded-[2px] border border-red-300 bg-red-50 p-2.5 text-red-900 dark:bg-red-950/40 dark:text-red-200">
                    <p className="flex items-center gap-1.5 text-xs font-bold">
                      <TriangleAlert className="size-3.5" />
                      {overlaps.count} Potential Train Overlap(s)
                    </p>
                    <p className="mt-1 text-[11px]">
                      Human scrutiny is required before approving affected
                      blocks.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[2px] border border-emerald-300 bg-emerald-50 p-2.5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <p className="flex items-center gap-1.5 text-xs font-bold">
                      <ShieldCheck className="size-3.5" />
                      No Detected Overlap
                    </p>
                    <p className="mt-1 text-[11px]">
                      No overlap was detected in the current planning dataset.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="rounded-[2px] border border-border bg-slate-50 p-2 dark:bg-slate-800">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Megablocks
                    </span>
                    <span className="font-mono text-base font-bold">
                      {filteredBlocks.length}
                    </span>
                  </div>

                  <div className="rounded-[2px] border border-border bg-slate-50 p-2 dark:bg-slate-800">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Efficiency
                    </span>
                    <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
                      {avgUtilization.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-500">
                No active block schedule on the selected date.
              </div>
            )}
          </CardContent>

          <div className="border-t border-border bg-slate-50 p-3 dark:bg-slate-900/60">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full border-slate-300 text-xs font-bold dark:border-slate-700"
            >
              <Link to="/conflicts">
                Open Conflicts Scrutiny Desk
                <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <Sheet
        open={Boolean(selectedBlock)}
        onOpenChange={(open) => {
          if (!open) setSelectedBlock(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto rounded-[2px] border-2 border-[#003366] bg-white p-0 dark:bg-slate-950 sm:max-w-md">
          {selectedBlock ? (
            <>
              <SheetHeader className="border-b-2 border-[#FF9933] bg-[#003366] p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-[2px] bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      Block Authorization Dossier
                    </span>

                    <SheetTitle className="mt-1 text-base font-bold uppercase text-white">
                      {selectedBlock.block_id}
                    </SheetTitle>

                    <SheetDescription className="font-mono text-xs text-slate-300">
                      {selectedBlock.corridor_id} · Date:{" "}
                      {selectedBlock.block_date}
                    </SheetDescription>
                  </div>

                  <Badge
                    variant="outline"
                    className={statusClass(selectedBlock.block_status)}
                  >
                    {formatStatus(selectedBlock.block_status)}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-3.5 p-4 text-xs">
                <div className="rounded-[2px] border border-border bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="mb-2 text-[10px] font-bold uppercase text-[#003366] dark:text-sky-400">
                    Authorized Window Schedule
                  </p>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <Detail label="Start">
                      {formatTime(selectedBlock.start_time)} IST
                    </Detail>
                    <Detail label="End">
                      {formatTime(selectedBlock.end_time)} IST
                    </Detail>
                    <Detail label="Duration">
                      {selectedBlock.duration_min} minutes
                    </Detail>
                    <Detail label="Utilization">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {selectedBlock.utilization_percent}%
                      </span>
                    </Detail>
                  </div>
                </div>

                <div className="rounded-[2px] border border-border p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-[#003366] dark:text-sky-400">
                    Work Package Contents
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <Detail label="Tasks Coordinated">
                      {selectedBlock.number_of_tasks} Tasks
                    </Detail>
                    <Detail label="Departments">
                      {selectedBlock.number_of_departments} Depts
                    </Detail>
                  </div>
                </div>

                <div className="rounded-[2px] border border-border p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-[#003366] dark:text-sky-400">
                    Train Movement Conflict Check
                  </p>

                  {selectedBlockTrains.length === 0 ? (
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="size-4" />
                      No train overlap detected
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedBlockTrains.map((train) => (
                        <div
                          key={train.train_id}
                          className="rounded-[2px] border border-red-300 bg-red-50 p-2 text-[11px] dark:bg-red-950/40"
                        >
                          <span className="font-bold text-red-900 dark:text-red-200">
                            {train.train_number} {train.train_name}
                          </span>
                          <span className="block font-mono text-slate-500">
                            Passing: {formatTime(train.arrival_time)} –{" "}
                            {formatTime(train.departure_time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Controller Review
                  </p>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Conflict Priority
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider ${getSeverityColorClasses(
                          blockConflictPriority,
                        )}`}
                      >
                        {selectedBlockTrains.length === 0
                          ? "SAFE — NO CONFLICT"
                          : `${blockConflictPriority} PRIORITY`}
                      </Badge>
                    </div>

                    {selectedBlockTrains.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {selectedBlockTrains.map((train) => {
                          const severity =
                            classifyTrainConflictSeverity(
                              train.operational_priority,
                              train.train_type,
                            );

                          return (
                            <div
                              key={train.train_id}
                              className={`rounded-md border p-2 text-xs ${getSeverityColorClasses(
                                severity,
                              )}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">
                                  {train.train_number} · {train.train_name}
                                </span>
                                <span className="font-bold uppercase">
                                  {severity}
                                </span>
                              </div>

                              <p className="mt-1 text-muted-foreground">
                                {train.train_type} train, operational
                                priority {train.operational_priority ?? "N/A"}.
                                Window: {formatTime(train.arrival_time)}–
                                {formatTime(train.departure_time)}.
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">
                        Why IR-ABPS recommends this
                      </span>

                      <ul className="space-y-1 text-sm">
                        {blockReasoning.map((reason, index) => (
                          <li
                            key={`${reason}-${index}`}
                            className="flex items-start gap-2"
                          >
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-purple-500" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Review Action:
                      </span>

                      <Badge variant="outline">
                        {selectedBlockTrains.length > 0
                          ? "RESCHEDULE / REWORK"
                          : "APPROVE"}
                      </Badge>
                    </div>
                  </div>

                  {/* Review Timeline */}
                  {reviewHistory.length > 0 && (
                    <div className="rounded-[2px] border border-border p-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase text-[#003366] dark:text-sky-400">
                        {t("Review & Decision Timeline", "समीक्षा एवं निर्णय समयरेखा")}
                      </p>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {reviewHistory.map((ev, idx) => (
                          <div key={idx} className="border-l-2 border-[#003366] pl-2 py-0.5">
                            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                              <span className="font-bold">{ev.action}</span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(ev.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              {ev.actor_name} ({ev.actor_role})
                            </p>
                            {ev.note && (
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 italic">
                                "{ev.note}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {role.id === "admin"
                        ? t("DRM Authorization Desk", "डीआरएम प्राधिकरण पटल")
                        : role.id === "control"
                          ? t("Chief Controller Review Desk", "मुख्य नियंत्रक समीक्षा पटल")
                          : t("Departmental Block Response Desk", "विभागीय ब्लॉक प्रतिक्रिया पटल")}
                    </p>

                    <div className="grid gap-2">
                      {role.id === "admin" ? (
                        <>
                          <Button
                            onClick={() => void handleApprove(false)}
                            disabled={actionLoading || selectedBlock.block_status === "APPROVED"}
                            className="h-8 w-full rounded-[2px] bg-[#137547] text-xs font-bold text-white hover:bg-[#0f5c38]"
                          >
                            <CheckCircle2 className="mr-1.5 size-3.5" />
                            {t("Approve Block (DRM Final)", "ब्लॉक स्वीकृत करें (डीआरएम अंतिम)")}
                          </Button>

                          <Button
                            onClick={() => void updateBlockStatus("rework")}
                            disabled={actionLoading}
                            variant="outline"
                            className="h-8 w-full rounded-[2px] border-amber-400 text-xs font-bold text-amber-900 hover:bg-amber-50 dark:text-amber-300"
                          >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            {t("Send Back For Adjustment", "समायोजन के लिए वापस भेजें")}
                          </Button>

                          <Button
                            onClick={() => void updateBlockStatus("reject")}
                            disabled={actionLoading}
                            variant="outline"
                            className="h-8 w-full rounded-[2px] border-red-400 text-xs font-bold text-red-900 hover:bg-red-50 dark:text-red-300"
                          >
                            <XCircle className="mr-1.5 size-3.5" />
                            {t("Reject Block (Final)", "ब्लॉक अस्वीकार करें (अंतिम)")}
                          </Button>
                        </>
                      ) : role.id === "control" ? (
                        <>
                          <Button
                            onClick={() => void handleEndorse()}
                            disabled={actionLoading || selectedBlock.block_status === "APPROVED"}
                            className="h-8 w-full rounded-[2px] bg-[#003366] text-xs font-bold text-white hover:bg-[#002244]"
                          >
                            <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-400" />
                            {t("Endorse for Authorization", "प्राधिकरण के लिए समर्थन करें")}
                          </Button>

                          <Button
                            onClick={() => void updateBlockStatus("rework")}
                            disabled={actionLoading}
                            variant="outline"
                            className="h-8 w-full rounded-[2px] border-amber-400 text-xs font-bold text-amber-900 hover:bg-amber-50 dark:text-amber-300"
                          >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            {t("Send for Rework", "पुनर्विचार के लिए भेजें")}
                          </Button>

                          <Button
                            onClick={() => setRecommendRejectOpen(true)}
                            disabled={actionLoading}
                            variant="outline"
                            className="h-8 w-full rounded-[2px] border-red-400 text-xs font-bold text-red-900 hover:bg-red-50 dark:text-red-300"
                          >
                            <TriangleAlert className="mr-1.5 size-3.5 text-red-600" />
                            {t("Recommend Reject", "अस्वीकार करने की सिफारिश करें")}
                          </Button>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="w-full">
                                  <Button
                                    disabled
                                    className="h-8 w-full rounded-[2px] bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-400 cursor-not-allowed opacity-60"
                                  >
                                    <CheckCircle2 className="mr-1.5 size-3.5" />
                                    {t("Approve Block", "ब्लॉक स्वीकृत करें")}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs bg-slate-900 text-white p-2">
                                {t(
                                  "Final authorization rests with Admin / DRM Planning.",
                                  "अंतिम प्राधिकरण व्यवस्थापक / डीआरएम योजना के पास है।",
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => setChangeReqOpen(true)}
                            disabled={actionLoading}
                            variant="outline"
                            className="h-8 w-full rounded-[2px] border-amber-500 text-xs font-bold text-amber-900 hover:bg-amber-50 dark:text-amber-300"
                          >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            {t("Request Rework / Adjustment", "पुनर्विचार / समायोजन का अनुरोध करें")}
                          </Button>

                          <Button
                            onClick={() => void handleAcknowledge()}
                            disabled={actionLoading}
                            className="h-8 w-full rounded-[2px] bg-[#003366] text-xs font-bold text-white hover:bg-[#002244]"
                          >
                            <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-400" />
                            {t("Acknowledge Schedule", "समय सारणी स्वीकार करें")}
                          </Button>
                        </>
                      )}
                    </div>

                    <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                      This interface is for planning and human authorization.
                      It does not directly control railway signalling,
                      interlocking or train movements.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Admin Soft Gate Confirmation Dialog */}
      <Dialog open={softGateOpen} onOpenChange={setSoftGateOpen}>
        <DialogContent className="sm:max-w-md border-2 border-amber-500 bg-white dark:bg-slate-950 rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <TriangleAlert className="size-5" />
              {t("Controller Endorsement Missing", "नियंत्रक का समर्थन अनुपलब्ध")}
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              {t(
                "This mega block has not yet been endorsed by the Chief Controller. Authorize anyway with administrative override?",
                "इस मेगा ब्लॉक को अभी तक मुख्य नियंत्रक द्वारा समर्थन नहीं दिया गया है। क्या आप प्रशासनिक ओवरराइड के साथ प्राधिकरण करना चाहते हैं?",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-[2px]"
              onClick={() => setSoftGateOpen(false)}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-[2px]"
              onClick={() => void handleApprove(true)}
            >
              {t("Authorize Anyway", "फिर भी अधिकृत करें")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Control Office Recommend Reject Dialog */}
      <Dialog open={recommendRejectOpen} onOpenChange={setRecommendRejectOpen}>
        <DialogContent className="sm:max-w-md border-2 border-red-500 bg-white dark:bg-slate-950 rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <TriangleAlert className="size-5" />
              {t("Recommend Block Rejection", "ब्लॉक अस्वीकृति की सिफारिश करें")}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {t(
                "Record an operational recommendation for DRM Planning to reject this block schedule.",
                "डीआरएम योजना के लिए इस ब्लॉक शेड्यूल को अस्वीकार करने हेतु एक परिचालन सिफारिश दर्ज करें।",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              className="text-xs rounded-[2px]"
              placeholder={t(
                "e.g. Unacceptable conflict with Rajdhani Express headway",
                "उदा. राजधानी एक्सप्रेस के हेडवे के साथ अस्वीकार्य टकराव",
              )}
              value={recommendRejectNote}
              onChange={(e) => setRecommendRejectNote(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-[2px]"
              onClick={() => setRecommendRejectOpen(false)}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-[2px]"
              onClick={() => void handleRecommendReject()}
            >
              {t("Submit Recommendation", "सिफारिश जमा करें")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Rework Request Dialog */}
      <Dialog open={changeReqOpen} onOpenChange={setChangeReqOpen}>
        <DialogContent className="sm:max-w-md border-2 border-amber-500 bg-white dark:bg-slate-950 rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <RotateCcw className="size-5 text-amber-500" />
              {t("Request Block Rework / Shift", "ब्लॉक पुनर्विचार / बदलाव का अनुरोध")}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {t(
                "Submit a formal departmental request to adjust the scheduled maintenance window.",
                "निर्धारित अनुरक्षण विंडो को समायोजित करने के लिए औपचारिक विभागीय अनुरोध जमा करें।",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
                {t("Reason for Rework", "पुनर्विचार का कारण")} <span className="text-destructive">*</span>
              </label>
              <Textarea
                className="mt-1 text-xs rounded-[2px]"
                placeholder={t(
                  "e.g. Machine crew mobilization delay / Material arrival shift",
                  "उदा. मशीन चालक दल जुटाने में देरी / सामग्री आगमन में बदलाव",
                )}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
                {t("Suggested Shift (Minutes, optional)", "सुझाया गया बदलाव (मिनट, वैकल्पिक)")}
              </label>
              <Input
                type="number"
                className="mt-1 text-xs rounded-[2px]"
                placeholder="e.g. +30 or -60"
                value={shiftMin}
                onChange={(e) => setShiftMin(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-[2px]"
              onClick={() => setChangeReqOpen(false)}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button
              size="sm"
              className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-[2px]"
              onClick={() => void handleRequestChange()}
            >
              {t("Submit Request", "अनुरोध जमा करें")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="block text-[10px] font-sans uppercase text-slate-500">
        {label}
      </span>
      <strong className="text-slate-900 dark:text-slate-100">
        {children}
      </strong>
    </div>
  );
}

type PlannerPageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

function PlannerPageHeader({
  title,
  subtitle,
  action,
}: PlannerPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-[#003366] dark:text-sky-400">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "text-slate-900 dark:text-slate-100",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card className="rounded-[2px] border border-border bg-white p-3 shadow-none dark:bg-slate-900">
      <p className="truncate text-[10px] font-bold uppercase text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 font-mono text-xl font-bold ${tone}`}>
        {value}
      </p>
    </Card>
  );
}
