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
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [blocks, setBlocks] = useState<OptimizedBlock[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState("ALL");
  const [selectedBlock, setSelectedBlock] =
    useState<OptimizedBlock | null>(null);

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
          ...(action === "approve"
            ? {
                body: JSON.stringify({
                  approved_by: "Senior Officer",
                }),
              }
            : {}),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail || `Unable to ${action} block.`,
        );
      }

      const messages = {
        approve: "Block authorization recorded.",
        reject: "Block rejected and returned to the controller queue.",
        rework: "Block sent back for window adjustment.",
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

                  <div className="border-t border-border pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Human Approval Workflow
                    </p>

                    <div className="grid gap-2">
                      <Button
                        onClick={() => void updateBlockStatus("approve")}
                        disabled={
                          actionLoading ||
                          selectedBlock.block_status === "APPROVED"
                        }
                        className="h-8 w-full rounded-[2px] bg-[#137547] text-xs font-bold text-white hover:bg-[#0f5c38]"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" />
                        Approve Block
                      </Button>

                      <Button
                        onClick={() => void updateBlockStatus("rework")}
                        disabled={actionLoading}
                        variant="outline"
                        className="h-8 w-full rounded-[2px] border-amber-400 text-xs font-bold text-amber-900 hover:bg-amber-50 dark:text-amber-300"
                      >
                        <RotateCcw className="mr-1.5 size-3.5" />
                        Send Back For Adjustment
                      </Button>

                      <Button
                        onClick={() => void updateBlockStatus("reject")}
                        disabled={actionLoading}
                        variant="outline"
                        className="h-8 w-full rounded-[2px] border-red-400 text-xs font-bold text-red-900 hover:bg-red-50 dark:text-red-300"
                      >
                        <XCircle className="mr-1.5 size-3.5" />
                        Reject Block
                      </Button>
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
