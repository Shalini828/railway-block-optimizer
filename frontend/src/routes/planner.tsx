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
  Calendar,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      return "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
    case "REJECTED":
      return "bg-red-100 text-red-900 border-red-300 font-bold";
    case "REWORK":
      return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
    default:
      return "bg-blue-100 text-blue-900 border-blue-300 font-bold";
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
  const [selectedBlock, setSelectedBlock] = useState<OptimizedBlock | null>(null);

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
        (selectedCorridor === "ALL" || b.corridor_id === selectedCorridor),
    );
  }, [blocks, dateStr, selectedCorridor]);

  const filteredTrains = useMemo(() => {
    return trains.filter(
      (t) =>
        t.travel_date === dateStr &&
        (selectedCorridor === "ALL" || t.corridor_id === selectedCorridor),
    );
  }, [trains, dateStr, selectedCorridor]);

  const activeCorridors = useMemo(() => {
    if (selectedCorridor !== "ALL") {
      return corridors.filter((c) => c.corridor_id === selectedCorridor);
    }
    const cIds = new Set([
      ...filteredBlocks.map((b) => b.corridor_id),
      ...filteredTrains.map((t) => t.corridor_id),
    ]);
    return corridors.filter((c) => cIds.has(c.corridor_id));
  }, [corridors, filteredBlocks, filteredTrains, selectedCorridor]);

  const totalBlockMinutes = filteredBlocks.reduce(
    (acc, b) => acc + parseInt(b.duration_min || "0"),
    0,
  );

  const avgUtil =
    filteredBlocks.length > 0
      ? filteredBlocks.reduce(
          (acc, b) => acc + parseFloat(b.utilization_percent || "0"),
          0,
        ) / filteredBlocks.length
      : 0;

  const overlaps = useMemo(() => {
    let count = 0;
    const conflictsList: { block: string; train: string }[] = [];

    filteredBlocks.forEach((b) => {
      const bStart = timeToMinutes(b.start_time);
      let bEnd = timeToMinutes(b.end_time);
      if (bEnd < bStart) bEnd += 1440;

      filteredTrains.forEach((t) => {
        if (t.corridor_id !== b.corridor_id) return;
        const tStart = timeToMinutes(t.arrival_time);
        let tEnd = timeToMinutes(t.departure_time);
        if (tEnd < tStart) tEnd += 1440;

        if (bStart < tEnd && tStart < bEnd) {
          count++;
          conflictsList.push({ block: b.block_id, train: t.train_id });
        }
      });
    });

    return { count, list: conflictsList };
  }, [filteredBlocks, filteredTrains]);

  const selectedBlockTrains = useMemo(() => {
    if (!selectedBlock) return [];
    const blockStart = timeToMinutes(selectedBlock.start_time);
    let blockEnd = timeToMinutes(selectedBlock.end_time);
    if (blockEnd < blockStart) blockEnd += 1440;

    return filteredTrains.filter((t) => {
      if (t.corridor_id !== selectedBlock.corridor_id) return false;
      const trainStart = timeToMinutes(t.arrival_time);
      let trainEnd = timeToMinutes(t.departure_time);
      if (trainEnd < trainStart) trainEnd += 1440;
      return blockStart < trainEnd && trainStart < blockEnd;
    });
  }, [selectedBlock, filteredTrains]);

  const updateBlockStatus = async (action: "approve" | "reject" | "rework") => {
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
        headers: { "Content-Type": "application/json" },
        ...(action === "approve" ? { body: JSON.stringify({ approved_by: "Senior Officer" }) } : {}),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || `Unable to ${action} block.`);
      }

      const messages = {
        approve: "Block authorized & recorded into operational schedule.",
        reject: "Block rejected and returned to controller queue.",
        rework: "Block sent back for shadow window adjustment.",
      };

      toast.success(messages[action]);
      setSelectedBlock(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Unable to update block status.");
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

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `IR-ABPS-GanttPlan-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Official CSV Corridor Schedule Exported.");
  };

  return (
    <>
      <PageHeader
        title="Corridor Operational Gantt & Megablock Schedule Planner"
        subtitle="Time-window visualization of AI-generated maintenance blocks, Sectional Express train paths, and corridor line capacity."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="h-8 w-auto text-xs bg-background rounded-[2px] border-slate-300 dark:border-slate-700"
            />

            <Select value={selectedCorridor} onValueChange={setSelectedCorridor}>
              <SelectTrigger className="h-8 w-[160px] text-xs bg-background rounded-[2px] border-slate-300 dark:border-slate-700">
                <SelectValue placeholder="All Corridors" />
              </SelectTrigger>
              <SelectContent className="rounded-[2px]">
                <SelectItem value="ALL" className="text-xs">All Corridors</SelectItem>
                {corridors.map((c) => (
                  <SelectItem key={c.corridor_id} value={c.corridor_id} className="text-xs">
                    {c.corridor_id} – {c.corridor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-8 text-xs font-bold border-slate-300 dark:border-slate-700"
            >
              <RefreshCw className={`mr-1 size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportPlan}
              className="h-8 text-xs font-bold border-slate-300 dark:border-slate-700"
            >
              <Download className="mr-1 size-3.5" /> Export Schedule
            </Button>

            <Button
              asChild
              size="sm"
              className="h-8 text-xs font-bold bg-[#003366] hover:bg-[#002244] text-white rounded-[2px]"
            >
              <Link to="/optimizer">
                <Play className="mr-1 size-3.5 text-[#FF9933]" /> Run Optimizer
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Metric Blocks */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Planned Megablocks" value={filteredBlocks.length} />
        <MetricCard label="Block Hours" value={`${(totalBlockMinutes / 60).toFixed(1)}h`} />
        <MetricCard
          label="Trains in Corridor"
          value={filteredTrains.length}
          tone="text-slate-800 dark:text-slate-200"
        />
        <MetricCard label="Avg Utilization" value={`${avgUtil.toFixed(1)}%`} tone="text-emerald-700 dark:text-emerald-400" />
        <MetricCard
          label="Path Conflicts"
          value={overlaps.count}
          tone={overlaps.count > 0 ? "text-red-700 dark:text-red-400 font-bold" : "text-emerald-700 dark:text-emerald-400"}
        />
        <MetricCard label="Active Corridors" value={activeCorridors.length} />
      </div>

      {/* Main Gantt Timeline Section */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* GANTT TIMELINE */}
        <Card className="lg:col-span-3 border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
          <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400 flex items-center gap-2">
              <CalendarRange className="size-4" /> 24-Hour Corridor Operational Timeline ({dateStr})
            </CardTitle>
            <span className="text-[10px] text-slate-500 font-mono">COA Real-Time Grid</span>
          </CardHeader>

          <CardContent className="p-4 overflow-x-auto">
            {activeCorridors.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-xs text-muted-foreground">
                <CalendarRange className="mb-2 size-8 text-slate-400 opacity-40" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No maintenance blocks scheduled for this date.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3 text-xs font-bold border-slate-300 dark:border-slate-700">
                  <Link to="/optimizer">
                    Run IR-ABPS Optimizer Engine
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="min-w-[920px]">
                {/* 24-HOUR HEADER */}
                <div className="mb-2 flex border-b border-border pb-1 pl-[130px] text-[10px] font-mono font-bold text-slate-500">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 border-l border-border/40 pl-1">
                      {h.toString().padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {/* CORRIDORS TIMELINE BARS */}
                {activeCorridors.map((corr) => {
                  const corrBlocks = filteredBlocks.filter((b) => b.corridor_id === corr.corridor_id);
                  const corrTrains = filteredTrains.filter((t) => t.corridor_id === corr.corridor_id);

                  return (
                    <div key={corr.corridor_id} className="mb-3 flex items-stretch border border-border bg-slate-50/50 dark:bg-slate-900/40">
                      {/* Corridor Label */}
                      <div className="flex w-[130px] flex-col justify-center border-r border-border p-2 bg-slate-100 dark:bg-slate-800">
                        <span className="text-xs font-bold font-mono text-[#003366] dark:text-sky-400">
                          {corr.corridor_id}
                        </span>
                        <span className="truncate text-[10px] text-slate-600 dark:text-slate-400" title={corr.corridor_name}>
                          {corr.corridor_name}
                        </span>
                      </div>

                      {/* Timeline Bar Track */}
                      <div className="relative min-h-[68px] flex-1 bg-white dark:bg-slate-950 py-1">
                        {/* Hour Gridlines */}
                        {Array.from({ length: 24 }).map((_, h) => (
                          <div
                            key={h}
                            className="pointer-events-none absolute bottom-0 top-0 border-l border-border/30"
                            style={{ left: `${(h / 24) * 100}%` }}
                          />
                        ))}

                        {/* Train movements */}
                        {corrTrains.map((t) => {
                          const startMins = timeToMinutes(t.arrival_time);
                          let endMins = timeToMinutes(t.departure_time);
                          if (endMins < startMins) endMins += 1440;

                          let left = (startMins / 1440) * 100;
                          let width = ((endMins - startMins) / 1440) * 100;
                          if (left > 100) return null;
                          if (left + width > 100) width = 100 - left;

                          return (
                            <div
                              key={t.train_id}
                              title={`${t.train_number} - ${t.train_name} (${t.arrival_time} to ${t.departure_time})`}
                              className="absolute z-10 h-2 rounded-[1px] bg-slate-500/70 border border-slate-600 hover:bg-slate-400 transition-all cursor-pointer"
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 0.6)}%`,
                                top: "6px",
                              }}
                            />
                          );
                        })}

                        {/* Optimized Maintenance Megablocks */}
                        {corrBlocks.map((b) => {
                          const startMins = timeToMinutes(b.start_time);
                          let endMins = timeToMinutes(b.end_time);
                          if (endMins < startMins) endMins += 1440;

                          let left = (startMins / 1440) * 100;
                          let width = ((endMins - startMins) / 1440) * 100;
                          if (left > 100) return null;
                          if (left + width > 100) width = 100 - left;

                          const isConflict = overlaps.list.some((o) => o.block === b.block_id);

                          return (
                            <button
                              key={b.block_id}
                              type="button"
                              onClick={() => setSelectedBlock(b)}
                              title="Click to scrutinize and authorize block"
                              className={`absolute z-20 flex h-8 flex-col items-start justify-center overflow-hidden rounded-[2px] px-1.5 text-left text-[10px] font-bold text-white border transition-transform hover:scale-[1.01] ${
                                isConflict
                                  ? "bg-[#800000] border-red-400 shadow-sm"
                                  : "bg-[#003366] border-[#FF9933]"
                              }`}
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 2.5)}%`,
                                top: "24px",
                              }}
                            >
                              <span className="w-full truncate">{b.block_id}</span>
                              <span className="w-full truncate text-[8px] font-mono opacity-80">
                                {formatTime(b.start_time)} – {formatTime(b.end_time)}
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

          {/* Timeline Legend */}
          <div className="flex flex-wrap items-center gap-5 border-t border-border px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
              <span className="h-2.5 w-4 rounded-[1px] bg-[#003366] border border-[#FF9933]" />
              AI Maintenance Megablock
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
              <span className="h-2 w-4 rounded-[1px] bg-slate-500 border border-slate-600" />
              Express Train Movement Path
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
              <span className="h-2.5 w-4 rounded-[1px] bg-[#800000] border border-red-400" />
              Overlapping Train Conflict
            </span>
          </div>
        </Card>

        {/* AI Planning Intelligence Sidebar */}
        <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none flex flex-col justify-between">
          <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
            <CardTitle className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400 flex items-center gap-2">
              <Zap className="size-4" /> Controller Scrutiny Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3 text-xs">
            {filteredBlocks.length > 0 ? (
              <>
                <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2.5 rounded-[2px] leading-relaxed">
                  <p className="font-bold text-[#003366] dark:text-sky-400 text-[11px] mb-1">
                    Corridor Clearance
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {filteredBlocks.length} megablocks computed for {dateStr}. Avg capacity utilization: <strong>{avgUtil.toFixed(1)}%</strong>.
                  </p>
                </div>

                {overlaps.count > 0 ? (
                  <div className="border border-red-300 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-[2px] text-red-900 dark:text-red-200">
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <TriangleAlert className="size-3.5 text-destructive" />
                      {overlaps.count} Potential Train Overlap(s)
                    </p>
                    <p className="text-[11px] mt-1">
                      Scrutiny required by Section Controller before approving block orders.
                    </p>
                  </div>
                ) : (
                  <div className="border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-[2px] text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                      Zero-Conflict Clearance
                    </p>
                    <p className="text-[11px] mt-1">
                      All blocks on this date are free from express path interference.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2 rounded-[2px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Megablocks</span>
                    <span className="font-mono font-bold text-base">{filteredBlocks.length}</span>
                  </div>
                  <div className="border border-border bg-slate-50 dark:bg-slate-800 p-2 rounded-[2px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Efficiency</span>
                    <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">{avgUtil.toFixed(1)}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No active block schedule on selected date.
              </div>
            )}
          </CardContent>
          <div className="p-3 border-t border-border bg-slate-50 dark:bg-slate-900/60">
            <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold border-slate-300 dark:border-slate-700">
              <Link to="/conflicts">
                Open Conflicts Scrutiny Desk <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Block Details Sheet for Officer Authorization */}
      <Sheet open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md border-2 border-[#003366] bg-white dark:bg-slate-950 p-0 rounded-[2px]">
          {selectedBlock && (
            <>
              <SheetHeader className="bg-[#003366] p-4 text-white border-b-2 border-[#FF9933]">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase">
                      BLOCK AUTHORIZATION DOSSIER
                    </span>
                    <SheetTitle className="text-base font-bold uppercase text-white mt-1">
                      {selectedBlock.block_id}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-300 font-mono">
                      {selectedBlock.corridor_id} · Date: {selectedBlock.block_date}
                    </SheetDescription>
                  </div>
                  <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase rounded-[2px] bg-white text-slate-900`}>
                    {formatStatus(selectedBlock.block_status)}
                  </span>
                </div>
              </SheetHeader>

              <div className="p-4 space-y-3.5 text-xs">
                {/* Window Timings */}
                <div className="border border-border bg-slate-50 dark:bg-slate-900 p-3 rounded-[2px]">
                  <p className="font-bold text-[#003366] dark:text-sky-400 uppercase text-[10px] mb-2">
                    Authorized Window Schedule
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">Start</span>
                      <strong className="text-slate-900 dark:text-slate-100">{formatTime(selectedBlock.start_time)} IST</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">End</span>
                      <strong className="text-slate-900 dark:text-slate-100">{formatTime(selectedBlock.end_time)} IST</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">Duration</span>
                      <strong>{selectedBlock.duration_min} minutes</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">Utilization</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">{selectedBlock.utilization_percent}%</strong>
                    </div>
                  </div>
                </div>

                {/* Work Package */}
                <div className="border border-border p-3 rounded-[2px]">
                  <p className="font-bold text-[#003366] dark:text-sky-400 uppercase text-[10px] mb-2">
                    Work Package Contents
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Tasks Coordinated</span>
                      <strong className="font-mono">{selectedBlock.number_of_tasks} Tasks</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Departments</span>
                      <strong>{selectedBlock.number_of_departments} Depts</strong>
                    </div>
                  </div>
                </div>

                {/* Train Conflicts Check */}
                <div className="border border-border p-3 rounded-[2px]">
                  <p className="font-bold text-[#003366] dark:text-sky-400 uppercase text-[10px] mb-2">
                    COA Train Movement Conflict Check
                  </p>
                  {selectedBlockTrains.length === 0 ? (
                    <div className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-4" /> Zero Train Overlaps Reported
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedBlockTrains.map((t) => (
                        <div key={t.train_id} className="border border-red-300 bg-red-50 dark:bg-red-950/40 p-2 rounded-[2px] text-[11px]">
                          <span className="font-bold text-red-900 dark:text-red-200">{t.train_number} {t.train_name}</span>
                          <span className="text-slate-500 block font-mono">Passing: {formatTime(t.arrival_time)} – {formatTime(t.departure_time)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Controller Authorization Buttons */}
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Section Controller Action</p>
                  <div className="grid gap-2">
                    <Button
                      onClick={() => updateBlockStatus("approve")}
                      disabled={actionLoading || selectedBlock.block_status === "APPROVED"}
                      className="w-full bg-[#137547] hover:bg-[#0f5c38] text-white font-bold h-8 text-xs rounded-[2px]"
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5" /> Approve & Issue Block Order
                    </Button>
                    <Button
                      onClick={() => updateBlockStatus("rework")}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full border-amber-400 text-amber-900 dark:text-amber-300 hover:bg-amber-50 h-8 text-xs font-bold rounded-[2px]"
                    >
                      <RotateCcw className="mr-1.5 size-3.5" /> Send Back For Window Adjustment
                    </Button>
                    <Button
                      onClick={() => updateBlockStatus("reject")}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full border-red-400 text-red-900 dark:text-red-300 hover:bg-red-50 h-8 text-xs font-bold rounded-[2px]"
                    >
                      <XCircle className="mr-1.5 size-3.5" /> Reject Block Application
                    </Button>
                  </div>
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
  tone = "text-slate-900 dark:text-slate-100",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none p-3">
      <p className="text-[10px] font-bold uppercase text-slate-500 truncate">{label}</p>
      <p className={`font-mono text-xl font-bold mt-0.5 ${tone}`}>{value}</p>
    </Card>
  );
}