import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  CalendarRange,
  TriangleAlert,
  RefreshCw,
  Download,
  Play,
  Info,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock3,
  TrainFront,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";

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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Gantt Planner | IR-ABPS" },
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
};

function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;

  const [h, m] = timeStr.split(":");

  return parseInt(h || "0") * 60 + parseInt(m || "0");
}

function formatTime(time?: string) {
  if (!time) return "--:--";
  return time.slice(0, 5);
}

function formatStatus(status: string) {
  if (!status) return "PLANNED";

  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "bg-safe/15 text-safe border-safe/30";

    case "REJECTED":
      return "bg-destructive/15 text-destructive border-destructive/30";

    case "REWORK":
      return "bg-warn/15 text-warn border-warn/30";

    default:
      return "bg-primary/15 text-primary border-primary/30";
  }
}

function PlannerPage() {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [blocks, setBlocks] = useState<OptimizedBlock[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [dateStr, setDateStr] = useState("2026-09-01");
  const [selectedCorridor, setSelectedCorridor] = useState<string>("ALL");
  const [selectedBlock, setSelectedBlock] =
    useState<OptimizedBlock | null>(null);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [cRes, bRes, tRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/corridors/"),
        fetch("http://127.0.0.1:8000/optimized-plan/"),
        fetch("http://127.0.0.1:8000/trains/"),
      ]);

      if (!cRes.ok || !bRes.ok || !tRes.ok) {
        throw new Error("One or more planner APIs failed.");
      }

      const cData = await cRes.json();
      const bData = await bRes.json();
      const tData = await tRes.json();

      setCorridors(cData.corridors || []);
      setBlocks(bData.blocks || []);
      setTrains(tData.trains || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load planner data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBlocks = useMemo(() => {
    return blocks.filter(
      (b) =>
        b.block_date === dateStr &&
        (selectedCorridor === "ALL" ||
          b.corridor_id === selectedCorridor),
    );
  }, [blocks, dateStr, selectedCorridor]);

  const filteredTrains = useMemo(() => {
    return trains.filter(
      (t) =>
        t.travel_date === dateStr &&
        (selectedCorridor === "ALL" ||
          t.corridor_id === selectedCorridor),
    );
  }, [trains, dateStr, selectedCorridor]);

  const activeCorridors = useMemo(() => {
    if (selectedCorridor !== "ALL") {
      return corridors.filter(
        (c) => c.corridor_id === selectedCorridor,
      );
    }

    const cIds = new Set([
      ...filteredBlocks.map((b) => b.corridor_id),
      ...filteredTrains.map((t) => t.corridor_id),
    ]);

    return corridors.filter((c) => cIds.has(c.corridor_id));
  }, [
    corridors,
    filteredBlocks,
    filteredTrains,
    selectedCorridor,
  ]);

  const totalBlockMinutes = filteredBlocks.reduce(
    (acc, b) => acc + parseInt(b.duration_min || "0"),
    0,
  );

  const avgUtil =
    filteredBlocks.length > 0
      ? filteredBlocks.reduce(
          (acc, b) =>
            acc +
            parseFloat(b.utilization_percent || "0"),
          0,
        ) / filteredBlocks.length
      : 0;

  /*
   * Conflict detection.
   *
   * A conflict occurs when an optimized maintenance block
   * overlaps with a known train movement on the same corridor.
   */
  const overlaps = useMemo(() => {
    let count = 0;

    const conflictsList: {
      block: string;
      train: string;
    }[] = [];

    filteredBlocks.forEach((b) => {
      const bStart = timeToMinutes(b.start_time);

      let bEnd = timeToMinutes(b.end_time);

      if (bEnd < bStart) {
        bEnd += 1440;
      }

      filteredTrains.forEach((t) => {
        if (t.corridor_id !== b.corridor_id) {
          return;
        }

        const tStart = timeToMinutes(t.arrival_time);

        let tEnd = timeToMinutes(t.departure_time);

        if (tEnd < tStart) {
          tEnd += 1440;
        }

        if (bStart < tEnd && tStart < bEnd) {
          count++;

          conflictsList.push({
            block: b.block_id,
            train: t.train_id,
          });
        }
      });
    });

    return {
      count,
      list: conflictsList,
    };
  }, [filteredBlocks, filteredTrains]);

  /*
   * Find trains associated with the selected block.
   */
  const selectedBlockTrains = useMemo(() => {
    if (!selectedBlock) return [];

    const blockStart = timeToMinutes(
      selectedBlock.start_time,
    );

    let blockEnd = timeToMinutes(
      selectedBlock.end_time,
    );

    if (blockEnd < blockStart) {
      blockEnd += 1440;
    }

    return filteredTrains.filter((t) => {
      if (t.corridor_id !== selectedBlock.corridor_id) {
        return false;
      }

      const trainStart = timeToMinutes(t.arrival_time);

      let trainEnd = timeToMinutes(
        t.departure_time,
      );

      if (trainEnd < trainStart) {
        trainEnd += 1440;
      }

      return (
        blockStart < trainEnd &&
        trainStart < blockEnd
      );
    });
  }, [selectedBlock, filteredTrains]);

  /*
   * Approve / Reject / Rework
   */
  const updateBlockStatus = async (
    action: "approve" | "reject" | "rework",
  ) => {
    if (!selectedBlock) return;

    setActionLoading(true);

    try {
      const url =
        action === "approve"
          ? `http://127.0.0.1:8000/optimized-plan/${selectedBlock.block_id}/approve`
          : action === "reject"
            ? `http://127.0.0.1:8000/optimized-plan/${selectedBlock.block_id}/reject`
            : `http://127.0.0.1:8000/optimized-plan/${selectedBlock.block_id}/rework`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        ...(action === "approve"
          ? {
              body: JSON.stringify({
                approved_by: "Senior Officer",
              }),
            }
          : {}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Unable to ${action} block.`,
        );
      }

      const messages = {
        approve: "Block approved successfully.",
        reject: "Block rejected successfully.",
        rework: "Block sent for rework.",
      };

      toast.success(messages[action]);

      setSelectedBlock(null);

      await fetchData();
    } catch (err) {
      console.error(err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to update block status.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
   * Export current filtered plan as CSV.
   */
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

    const rows = filteredBlocks.map((b) => [
      b.block_id,
      b.corridor_id,
      b.block_date,
      formatTime(b.start_time),
      formatTime(b.end_time),
      b.duration_min,
      b.utilization_percent,
      b.train_impact_score,
      b.optimization_score,
      b.number_of_tasks,
      b.number_of_departments,
      b.block_status,
    ]);

    const csv = [
      headers,
      ...rows,
    ]
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
    link.download = `IR-ABPS-plan-${dateStr}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    toast.success("Optimization plan exported.");
  };

  return (
    <>
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Gantt Planner
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Time-window planning for maintenance blocks,
            train movements and corridor availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={dateStr}
            onChange={(e) =>
              setDateStr(e.target.value)
            }
            className="h-9 w-auto bg-background"
          />

          <Select
            value={selectedCorridor}
            onValueChange={setSelectedCorridor}
          >
            <SelectTrigger className="h-9 w-[180px] bg-background">
              <SelectValue placeholder="All Corridors" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">
                All Corridors
              </SelectItem>

              {corridors.map((c) => (
                <SelectItem
                  key={c.corridor_id}
                  value={c.corridor_id}
                >
                  {c.corridor_id} - {c.corridor_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw
              className={`mr-2 size-4 ${
                loading ? "animate-spin" : ""
              }`}
            />

            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportPlan}
            className="h-9"
          >
            <Download className="mr-2 size-4" />
            Export Plan
          </Button>

          <Button
            asChild
            size="sm"
            className="h-9 bg-purple-600 text-white hover:bg-purple-700"
          >
            <Link to="/optimizer">
              <Play className="mr-2 size-4" />
              Run Optimization
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard
          label="Planned Blocks"
          value={filteredBlocks.length}
        />

        <MetricCard
          label="Total Block Hours"
          value={
            (totalBlockMinutes / 60).toFixed(1) + "h"
          }
        />

        <MetricCard
          label="Trains Affected"
          value={overlaps.count}
          tone={
            overlaps.count > 0
              ? "text-warn"
              : "text-foreground"
          }
        />

        <MetricCard
          label="Avg Utilization"
          value={avgUtil.toFixed(1) + "%"}
          tone="text-safe"
        />

        <MetricCard
          label="Conflicts Detected"
          value={overlaps.count}
          tone={
            overlaps.count > 0
              ? "text-destructive"
              : "text-safe"
          }
        />

        <MetricCard
          label="Available Windows"
          value={activeCorridors.length * 2}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* GANTT */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="size-4" />

              Gantt Timeline ({dateStr})
            </CardTitle>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            {activeCorridors.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
                <CalendarRange className="mb-3 size-8 opacity-20" />

                <p>
                  No optimized blocks available for
                  this date.
                </p>

                <Button
                  asChild
                  variant="outline"
                  className="mt-4"
                >
                  <Link to="/optimizer">
                    Run IR-ABPS Optimization
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="min-w-[900px]">
                {/* HOUR HEADER */}
                <div className="mb-2 flex border-b border-border pb-1 pl-[120px] text-[10px] text-muted-foreground">
                  {Array.from({ length: 24 }).map(
                    (_, h) => (
                      <div
                        key={h}
                        className="flex-1 border-l border-border/30 pl-1"
                      >
                        {h
                          .toString()
                          .padStart(2, "0")}
                        :00
                      </div>
                    ),
                  )}
                </div>

                {/* CORRIDORS */}
                {activeCorridors.map((corr) => {
                  const corrBlocks =
                    filteredBlocks.filter(
                      (b) =>
                        b.corridor_id ===
                        corr.corridor_id,
                    );

                  const corrTrains =
                    filteredTrains.filter(
                      (t) =>
                        t.corridor_id ===
                        corr.corridor_id,
                    );

                  return (
                    <div
                      key={corr.corridor_id}
                      className="mb-3 flex items-stretch"
                    >
                      {/* CORRIDOR NAME */}
                      <div className="flex w-[120px] flex-col justify-center truncate border-r border-border py-2 pr-2 text-xs font-semibold">
                        <span
                          title={
                            corr.corridor_name
                          }
                        >
                          {corr.corridor_id}
                        </span>

                        <span className="truncate text-[9px] font-normal text-muted-foreground">
                          {corr.corridor_name}
                        </span>
                      </div>

                      {/* TIMELINE */}
                      <div className="relative min-h-[72px] flex-1 border-y border-border bg-secondary/10 py-1">
                        {/* HOUR GRID */}
                        {Array.from({
                          length: 24,
                        }).map((_, h) => (
                          <div
                            key={h}
                            className="pointer-events-none absolute bottom-0 top-0 border-l border-border/20"
                            style={{
                              left: `${
                                (h / 24) * 100
                              }%`,
                            }}
                          />
                        ))}

                        {/* TRAINS */}
                        {corrTrains.map((t) => {
                          const startMins =
                            timeToMinutes(
                              t.arrival_time,
                            );

                          let endMins =
                            timeToMinutes(
                              t.departure_time,
                            );

                          if (endMins < startMins) {
                            endMins += 1440;
                          }

                          let left =
                            (startMins / 1440) *
                            100;

                          let width =
                            ((endMins -
                              startMins) /
                              1440) *
                            100;

                          if (left > 100) {
                            return null;
                          }

                          if (
                            left + width >
                            100
                          ) {
                            width = 100 - left;
                          }

                          return (
                            <div
                              key={t.train_id}
                              title={`${t.train_number} - ${t.train_name}`}
                              className="absolute z-10 h-2 rounded-full bg-slate-500/60 transition-all hover:bg-slate-400"
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(
                                  width,
                                  0.5,
                                )}%`,
                                top: "8px",
                              }}
                            />
                          );
                        })}

                        {/* OPTIMIZED BLOCKS */}
                        {corrBlocks.map((b) => {
                          const startMins =
                            timeToMinutes(
                              b.start_time,
                            );

                          let endMins =
                            timeToMinutes(
                              b.end_time,
                            );

                          if (endMins < startMins) {
                            endMins += 1440;
                          }

                          let left =
                            (startMins / 1440) *
                            100;

                          let width =
                            ((endMins -
                              startMins) /
                              1440) *
                            100;

                          if (left > 100) {
                            return null;
                          }

                          if (
                            left + width >
                            100
                          ) {
                            width = 100 - left;
                          }

                          const isConflict =
                            overlaps.list.some(
                              (o) =>
                                o.block ===
                                b.block_id,
                            );

                          return (
                            <button
                              key={b.block_id}
                              type="button"
                              onClick={() =>
                                setSelectedBlock(b)
                              }
                              title="Open block details"
                              className={`absolute z-20 flex h-9 flex-col items-start justify-center overflow-hidden rounded px-1.5 text-left text-[10px] font-bold text-white transition-all hover:scale-[1.01] hover:brightness-110 ${
                                isConflict
                                  ? "bg-destructive shadow-[0_0_8px_rgba(220,38,38,0.8)]"
                                  : "bg-primary"
                              }`}
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(
                                  width,
                                  2,
                                )}%`,
                                top: "25px",
                              }}
                            >
                              <span className="w-full truncate">
                                {b.block_id}
                              </span>

                              <span className="w-full truncate text-[8px] font-normal opacity-80">
                                {formatTime(
                                  b.start_time,
                                )}{" "}
                                -{" "}
                                {formatTime(
                                  b.end_time,
                                )}
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

          {/* LEGEND */}
          <div className="mt-2 flex flex-wrap gap-4 border-t border-border px-6 pb-4 pt-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded bg-primary" />
              Maintenance Block
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded bg-slate-500/60" />
              Train Movement
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded bg-destructive" />
              Conflict Highlight
            </span>
          </div>
        </Card>

        {/* AI INTELLIGENCE */}
        <Card className="border-t-2 border-t-purple-500/50 bg-gradient-to-br from-card to-purple-900/5 shadow-sm">
          <CardHeader className="border-b border-purple-500/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-purple-500">
              <Zap className="size-4" />

              IR-ABPS Planning Intelligence
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {filteredBlocks.length > 0 ? (
              <>
                {/* OPTIMIZATION INSIGHT */}
                <div className="rounded-md border border-purple-500/20 bg-purple-500/10 p-3 text-sm">
                  <p className="mb-1 flex items-center gap-2 font-semibold text-purple-600">
                    <Info className="size-4" />

                    Optimization Insight
                  </p>

                  AI generated{" "}
                  {filteredBlocks.length} block(s)
                  for {dateStr}. The average
                  utilization is{" "}
                  {avgUtil.toFixed(1)}%.
                </div>

                {/* RISK */}
                {overlaps.count > 0 && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-2 font-semibold text-destructive">
                      <TriangleAlert className="size-4" />

                      High Scheduling Risk
                    </p>

                    AI detected{" "}
                    {overlaps.count} potential
                    overlap(s) with scheduled
                    trains.
                  </div>
                )}

                {/* SAFE */}
                {filteredBlocks.length > 0 &&
                  overlaps.count === 0 && (
                    <div className="rounded-md border border-safe/20 bg-safe/10 p-3 text-sm">
                      <p className="mb-1 flex items-center gap-2 font-semibold text-safe">
                        <ShieldCheck className="size-4" />

                        Safe Scheduling
                      </p>

                      All blocks for this date
                      are currently conflict-free
                      with respect to known train
                      paths.
                    </div>
                  )}

                {/* QUICK STATS */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-secondary/10 p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Blocks
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {filteredBlocks.length}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/10 p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Utilization
                    </p>

                    <p className="mt-1 text-xl font-bold text-safe">
                      {avgUtil.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No active insights.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BLOCK DETAILS SHEET */}
      <Sheet
        open={!!selectedBlock}
        onOpenChange={(open) =>
          !open && setSelectedBlock(null)
        }
      >
        <SheetContent className="w-full overflow-y-auto border-l border-border sm:max-w-md">
          {selectedBlock && (
            <>
              <SheetHeader className="mb-5 border-b border-border pb-4">
                <Badge
                  className={`w-fit border ${statusClass(
                    selectedBlock.block_status,
                  )}`}
                >
                  {formatStatus(
                    selectedBlock.block_status,
                  )}
                </Badge>

                <SheetTitle className="text-xl">
                  {selectedBlock.block_id}
                </SheetTitle>

                <SheetDescription>
                  {selectedBlock.corridor_id} ·{" "}
                  {selectedBlock.block_date}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                {/* TIME WINDOW */}
                <div className="rounded-lg border border-border bg-secondary/10 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />

                    <p className="text-sm font-semibold">
                      Scheduled Window
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem
                      label="Start"
                      value={formatTime(
                        selectedBlock.start_time,
                      )}
                    />

                    <DetailItem
                      label="End"
                      value={formatTime(
                        selectedBlock.end_time,
                      )}
                    />

                    <DetailItem
                      label="Duration"
                      value={`${selectedBlock.duration_min} min`}
                    />

                    <DetailItem
                      label="Date"
                      value={selectedBlock.block_date}
                    />
                  </div>
                </div>

                {/* OPTIMIZATION METRICS */}
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap className="size-4 text-purple-500" />

                    <p className="text-sm font-semibold">
                      Optimization Metrics
                    </p>
                  </div>

                  <div className="space-y-4">
                    <ScoreRow
                      label="Utilization"
                      value={`${selectedBlock.utilization_percent}%`}
                      percentage={Math.min(
                        100,
                        parseFloat(
                          selectedBlock.utilization_percent ||
                            "0",
                        ),
                      )}
                    />

                    <ScoreRow
                      label="Optimization Score"
                      value={`${selectedBlock.optimization_score}/100`}
                      percentage={Math.min(
                        100,
                        parseFloat(
                          selectedBlock.optimization_score ||
                            "0",
                        ),
                      )}
                    />

                    <ScoreRow
                      label="Train Impact"
                      value={`${selectedBlock.train_impact_score}`}
                      percentage={Math.min(
                        100,
                        parseFloat(
                          selectedBlock.train_impact_score ||
                            "0",
                        ),
                      )}
                    />
                  </div>
                </div>

                {/* WORK PACKAGE */}
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Layers3 className="size-4 text-primary" />

                    <p className="text-sm font-semibold">
                      Work Package
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem
                      label="Tasks Included"
                      value={`${selectedBlock.number_of_tasks} tasks`}
                    />

                    <DetailItem
                      label="Departments"
                      value={
                        selectedBlock.number_of_departments
                      }
                    />

                    <DetailItem
                      label="Corridor"
                      value={
                        selectedBlock.corridor_id
                      }
                    />

                    <DetailItem
                      label="Status"
                      value={formatStatus(
                        selectedBlock.block_status,
                      )}
                    />
                  </div>
                </div>

                {/* TRAIN IMPACT */}
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TrainFront className="size-4 text-primary" />

                    <p className="text-sm font-semibold">
                      Train Path Analysis
                    </p>
                  </div>

                  {selectedBlockTrains.length ===
                  0 ? (
                    <div className="rounded-md border border-safe/20 bg-safe/10 p-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-safe">
                        <ShieldCheck className="size-4" />

                        No train conflicts
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        No known train path overlaps
                        this maintenance window.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedBlockTrains.map(
                        (train) => (
                          <div
                            key={train.train_id}
                            className="rounded-md border border-destructive/30 bg-destructive/10 p-3"
                          >
                            <p className="text-sm font-semibold">
                              {train.train_number}{" "}
                              ·{" "}
                              {train.train_name}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatTime(
                                train.arrival_time,
                              )}{" "}
                              -{" "}
                              {formatTime(
                                train.departure_time,
                              )}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* SAFETY MESSAGE */}
                {selectedBlockTrains.length ===
                  0 && (
                  <div className="rounded-lg border border-safe/30 bg-safe/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-safe">
                      <ShieldCheck className="size-4" />

                      Safety Validation Passed
                    </p>

                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      The proposed maintenance window
                      does not overlap with known train
                      paths in the current planning
                      dataset. Final operational approval
                      remains with the authorized railway
                      officer.
                    </p>
                  </div>
                )}

                {/* APPROVAL ACTIONS */}
                <div className="border-t border-border pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Human Approval Workflow
                  </p>

                  <div className="grid gap-2">
                    <Button
                      onClick={() =>
                        updateBlockStatus("approve")
                      }
                      disabled={
                        actionLoading ||
                        selectedBlock.block_status ===
                          "APPROVED"
                      }
                      className="w-full bg-safe text-white hover:bg-safe/90"
                    >
                      <CheckCircle2 className="mr-2 size-4" />

                      {actionLoading
                        ? "Processing..."
                        : "Approve Block"}
                    </Button>

                    <Button
                      onClick={() =>
                        updateBlockStatus("rework")
                      }
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full border-warn/40 text-warn hover:bg-warn/10"
                    >
                      <RotateCcw className="mr-2 size-4" />

                      Send for Rework
                    </Button>

                    <Button
                      onClick={() =>
                        updateBlockStatus("reject")
                      }
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="mr-2 size-4" />

                      Reject Block
                    </Button>
                  </div>
                </div>

                {/* OTHER WORKFLOWS */}
                <div className="border-t border-border pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                  >
                    <Link to="/conflicts">
                      Open Conflicts & Approvals
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function MetricCard({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex h-full flex-col justify-between p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>

        <p
          className={`font-mono text-2xl font-bold ${tone}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 break-words font-medium">
        {value}
      </p>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  percentage,
}: {
  label: string;
  value: string;
  percentage: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {label}
        </span>

        <span className="font-mono font-semibold">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, percentage),
            )}%`,
          }}
        />
      </div>
    </div>
  );
}