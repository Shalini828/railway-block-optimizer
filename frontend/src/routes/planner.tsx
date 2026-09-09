import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { CalendarRange, TriangleAlert, RefreshCw, Download, Play, Info, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Gantt Planner | IR-ABPS" },
      { name: "description", content: "Time-window planning for maintenance blocks, train movements and corridor availability." },
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

function PlannerPage() {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [blocks, setBlocks] = useState<OptimizedBlock[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateStr, setDateStr] = useState("2026-08-30");
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
    return blocks.filter((b) => b.block_date === dateStr && (selectedCorridor === "ALL" || b.corridor_id === selectedCorridor));
  }, [blocks, dateStr, selectedCorridor]);

  const filteredTrains = useMemo(() => {
    return trains.filter((t) => t.travel_date === dateStr && (selectedCorridor === "ALL" || t.corridor_id === selectedCorridor));
  }, [trains, dateStr, selectedCorridor]);

  const activeCorridors = useMemo(() => {
    if (selectedCorridor !== "ALL") {
      return corridors.filter((c) => c.corridor_id === selectedCorridor);
    }
    const cIds = new Set([...filteredBlocks.map((b) => b.corridor_id), ...filteredTrains.map((t) => t.corridor_id)]);
    return corridors.filter((c) => cIds.has(c.corridor_id));
  }, [corridors, filteredBlocks, filteredTrains, selectedCorridor]);

  const totalBlockMinutes = filteredBlocks.reduce((acc, b) => acc + parseInt(b.duration_min || "0"), 0);
  const avgUtil = filteredBlocks.length > 0 
    ? filteredBlocks.reduce((acc, b) => acc + parseFloat(b.utilization_percent || "0"), 0) / filteredBlocks.length 
    : 0;

  // Conflict logic
  const overlaps = useMemo(() => {
    let count = 0;
    const conflictsList: {block: string, train: string}[] = [];
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

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Gantt Planner
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Time-window planning for maintenance blocks, train movements and corridor availability.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input 
            type="date" 
            value={dateStr} 
            onChange={(e) => setDateStr(e.target.value)} 
            className="w-auto h-9 bg-background"
          />
          <Select value={selectedCorridor} onValueChange={setSelectedCorridor}>
            <SelectTrigger className="w-[180px] h-9 bg-background">
              <SelectValue placeholder="All Corridors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Corridors</SelectItem>
              {corridors.map((c) => (
                <SelectItem key={c.corridor_id} value={c.corridor_id}>
                  {c.corridor_id} - {c.corridor_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="mr-2 size-4" /> Export Plan
          </Button>
          <Button asChild size="sm" className="h-9 bg-purple-600 hover:bg-purple-700 text-white">
            <Link to="/optimizer">
              <Play className="mr-2 size-4" /> Run Optimization
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-6">
        <MetricCard label="Planned Blocks" value={filteredBlocks.length} />
        <MetricCard label="Total Block Hours" value={(totalBlockMinutes / 60).toFixed(1) + "h"} />
        <MetricCard label="Trains Affected" value={overlaps.count} tone={overlaps.count > 0 ? "text-warn" : "text-foreground"} />
        <MetricCard label="Avg Utilization" value={avgUtil.toFixed(1) + "%"} tone="text-safe" />
        <MetricCard label="Conflicts Detected" value={overlaps.count} tone={overlaps.count > 0 ? "text-destructive" : "text-safe"} />
        <MetricCard label="Available Windows" value={activeCorridors.length * 2} />
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mb-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="size-4" /> Gantt Timeline ({dateStr})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {activeCorridors.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                <CalendarRange className="size-8 opacity-20 mb-3" />
                <p>No optimized blocks available for this date.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/optimizer">Run IR-ABPS Optimization</Link>
                </Button>
              </div>
            ) : (
              <div className="min-w-[900px]">
                <div className="mb-2 flex pl-[120px] text-[10px] text-muted-foreground border-b border-border pb-1">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 border-l border-border/30 pl-1">
                      {h.toString().padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
                {activeCorridors.map((corr) => {
                  const corrBlocks = filteredBlocks.filter((b) => b.corridor_id === corr.corridor_id);
                  const corrTrains = filteredTrains.filter((t) => t.corridor_id === corr.corridor_id);

                  return (
                    <div key={corr.corridor_id} className="mb-3 flex items-stretch">
                      <div className="w-[120px] text-xs font-semibold pr-2 py-2 border-r border-border truncate flex flex-col justify-center">
                        <span title={corr.corridor_name}>{corr.corridor_id}</span>
                        <span className="text-[9px] text-muted-foreground font-normal truncate">{corr.corridor_name}</span>
                      </div>
                      <div className="relative flex-1 bg-secondary/10 border-y border-border min-h-[60px] py-1">
                        {/* Hour markers */}
                        {Array.from({ length: 24 }).map((_, h) => (
                          <div key={h} className="absolute top-0 bottom-0 border-l border-border/20 pointer-events-none" style={{ left: `${(h / 24) * 100}%` }} />
                        ))}
                        
                        {/* Trains */}
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
                              title={`${t.train_number} - ${t.train_name}`}
                              className="absolute h-2 bg-slate-500/60 rounded-full z-10 hover:bg-slate-400"
                              style={{ left: `${left}%`, width: `${width}%`, top: '8px' }}
                            />
                          );
                        })}

                        {/* Blocks */}
                        {corrBlocks.map((b) => {
                          const startMins = timeToMinutes(b.start_time);
                          let endMins = timeToMinutes(b.end_time);
                          if (endMins < startMins) endMins += 1440;
                          
                          let left = (startMins / 1440) * 100;
                          let width = ((endMins - startMins) / 1440) * 100;

                          if (left > 100) return null;
                          if (left + width > 100) width = 100 - left;

                          // Conflict detection for red highlight
                          const isConflict = overlaps.list.some((o) => o.block === b.block_id);

                          return (
                            <button
                              key={b.block_id}
                              onClick={() => setSelectedBlock(b)}
                              className={`absolute h-8 rounded text-[10px] font-bold text-white px-1.5 flex flex-col justify-center items-start overflow-hidden transition-all hover:brightness-110 border border-white/20 z-20 ${
                                isConflict ? "bg-destructive shadow-[0_0_8px_rgba(220,38,38,0.8)]" : "bg-primary"
                              }`}
                              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%`, top: '20px' }}
                            >
                              <span className="truncate w-full text-left">{b.block_id}</span>
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
          <div className="px-6 pb-4 pt-2 border-t border-border flex flex-wrap gap-4 text-xs mt-2">
            <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded bg-primary" /> Maintenance Block</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-1 rounded bg-slate-500/60" /> Train Movement</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded bg-destructive" /> Conflict Highlight</span>
          </div>
        </Card>

        <Card className="shadow-sm border-t-2 border-t-purple-500/50 bg-gradient-to-br from-card to-purple-900/5">
          <CardHeader className="border-b border-purple-500/10 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-purple-500">
              <Zap className="size-4" />
              IR-ABPS Planning Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {filteredBlocks.length > 0 ? (
              <>
                <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-md text-sm text-foreground">
                  <p className="font-semibold flex items-center gap-2 mb-1 text-purple-600">
                    <Info className="size-4" /> Optimization Insight
                  </p>
                  AI generated {filteredBlocks.length} block(s) for {dateStr}. The average utilization is {avgUtil.toFixed(1)}%.
                </div>
                {overlaps.count > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md text-sm text-foreground">
                    <p className="font-semibold flex items-center gap-2 mb-1 text-destructive">
                      <TriangleAlert className="size-4" /> High Scheduling Risk
                    </p>
                    AI detected {overlaps.count} potential overlap(s) with scheduled trains. Adjust block timings to safely clear train paths.
                  </div>
                )}
                {filteredBlocks.length > 0 && overlaps.count === 0 && (
                  <div className="bg-safe/10 border border-safe/20 p-3 rounded-md text-sm text-foreground">
                    <p className="font-semibold flex items-center gap-2 mb-1 text-safe">
                      <ShieldCheck className="size-4" /> Safe Scheduling
                    </p>
                    All blocks for this date are currently conflict-free with respect to known train paths.
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No active insights.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedBlock} onOpenChange={(o) => !o && setSelectedBlock(null)}>
        <SheetContent className="w-full sm:max-w-md border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-4 mb-4">
            <Badge className="w-fit mb-2">{selectedBlock?.block_status}</Badge>
            <SheetTitle className="text-xl">{selectedBlock?.block_id}</SheetTitle>
            <SheetDescription>
              {selectedBlock?.corridor_id} · {selectedBlock?.block_date}
            </SheetDescription>
          </SheetHeader>
          
          {selectedBlock && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/10 p-4 rounded-lg border border-border">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Time Window</p>
                  <p className="font-medium font-mono">{selectedBlock.start_time.slice(0,5)} - {selectedBlock.end_time.slice(0,5)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Duration</p>
                  <p className="font-medium">{selectedBlock.duration_min} min</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Utilization</p>
                  <p className="font-medium text-safe">{selectedBlock.utilization_percent}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Tasks Included</p>
                  <p className="font-medium">{selectedBlock.number_of_tasks} tasks</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Departments</p>
                  <p className="font-medium">{selectedBlock.number_of_departments}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Optimization Score</p>
                  <p className="font-medium text-primary">{selectedBlock.optimization_score}/100</p>
                </div>
              </div>

              {overlaps.list.filter(o => o.block === selectedBlock.block_id).length > 0 && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                  <p className="flex items-center gap-2 font-bold text-destructive text-sm mb-2">
                    <TriangleAlert className="size-4" /> Conflict Detected
                  </p>
                  <p className="text-xs text-destructive/80 mb-3">
                    Overlaps with train: {overlaps.list.find(o => o.block === selectedBlock.block_id)?.train}
                  </p>
                  <Button asChild size="sm" variant="destructive" className="w-full text-xs font-bold">
                    <Link to="/conflicts">Review in Conflicts Workflow</Link>
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-border flex flex-col gap-2">
                <Button variant="outline" className="w-full">
                  View Full Block Details
                </Button>
                <Button asChild variant="outline" className="w-full border-primary/20 text-primary">
                  <Link to="/conflicts">Open in Conflicts & Approvals <ArrowRight className="ml-2 size-4" /></Link>
                 </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function MetricCard({ label, value, tone = "text-foreground" }: { label: string, value: string | number, tone?: string }) {
  return (
    <Card className="shadow-sm border-border">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
