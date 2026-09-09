import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, TriangleAlert, ShieldAlert, CheckCircle2, XCircle, 
  ArrowRight, Search, Filter, RefreshCw, Calendar, Map, 
  TrainFront, BrainCircuit, Activity, Clock, Server, Zap, CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/conflicts")({
  head: () => ({
    meta: [
      { title: "Conflicts & Approvals | IR-ABPS" },
      { name: "description", content: "Human-in-the-loop review of AI-generated maintenance blocks and operational conflicts." },
    ],
  }),
  component: ConflictsPage,
});

type TrainConflict = {
  block_id: string;
  train_number: string;
  train_name: string;
  train_type: string;
  arrival_time: string;
  departure_time: string;
  operational_priority: string;
  estimated_delay_min: string;
};

type Task = {
  block_id: string;
  task_id: string;
  department: string;
  task_type: string;
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
  conflicts: TrainConflict[];
  tasks: Task[];
};

type ConflictItem = {
  id: string;
  block: OptimizedBlock;
  train: TrainConflict | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  isConflict: boolean;
};

function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":");
  return parseInt(h || "0") * 60 + parseInt(m || "0");
}

function ConflictsPage() {
  const [blocks, setBlocks] = useState<OptimizedBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<ConflictItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/optimized-plan/");
      const data = await res.json();
      setBlocks(data.blocks || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load optimized plan data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const items: ConflictItem[] = useMemo(() => {
    const list: ConflictItem[] = [];
    blocks.forEach((b) => {
      if (b.conflicts && b.conflicts.length > 0) {
        b.conflicts.forEach((c) => {
          let severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
          const prio = parseInt(c.operational_priority || "0");
          if (prio >= 4 || c.train_type?.toUpperCase() === "EXPRESS") severity = "CRITICAL";
          else if (prio === 3 || c.train_type?.toUpperCase() === "PASSENGER") severity = "HIGH";
          else severity = "MEDIUM";

          list.push({
            id: `CF-${b.block_id}-${c.train_number}`,
            block: b,
            train: c,
            severity,
            isConflict: true
          });
        });
      } else {
        list.push({
          id: `OK-${b.block_id}`,
          block: b,
          train: null,
          severity: "LOW",
          isConflict: false
        });
      }
    });
    return list;
  }, [blocks]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = !search || 
        item.block.block_id.toLowerCase().includes(search.toLowerCase()) ||
        item.block.corridor_id.toLowerCase().includes(search.toLowerCase()) ||
        item.train?.train_number.toLowerCase().includes(search.toLowerCase());
      
      const matchSeverity = severityFilter === "ALL" || item.severity === severityFilter;
      const matchStatus = statusFilter === "ALL" || item.block.block_status === statusFilter;

      return matchSearch && matchSeverity && matchStatus;
    });
  }, [items, search, severityFilter, statusFilter]);

  const stats = useMemo(() => {
    let openConflicts = 0;
    let criticalConflicts = 0;
    let awaitingApproval = 0;
    let approvedToday = 0;
    let rejected = 0;
    let highRiskImpacts = 0;

    blocks.forEach(b => {
      if (b.block_status === "PLANNED") awaitingApproval++;
      if (b.block_status === "APPROVED") approvedToday++;
      if (b.block_status === "REJECTED" || b.block_status === "REWORK") rejected++;
      
      if (b.conflicts?.length > 0 && b.block_status === "PLANNED") {
        openConflicts += b.conflicts.length;
        b.conflicts.forEach(c => {
          const prio = parseInt(c.operational_priority || "0");
          if (prio >= 4 || c.train_type?.toUpperCase() === "EXPRESS") {
            criticalConflicts++;
            highRiskImpacts++;
          }
        });
      }
    });

    return { openConflicts, criticalConflicts, awaitingApproval, approvedToday, rejected, highRiskImpacts };
  }, [blocks]);

  const handleAction = async (action: "approve" | "reject" | "rework") => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const url = `http://127.0.0.1:8000/optimized-plan/${selectedItem.block.block_id}/${action}`;
      const payload = action === "approve" ? { approved_by: "DRM Planning" } : undefined;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });

      if (!res.ok) throw new Error("Action failed");
      
      toast.success(`Block ${selectedItem.block.block_id} has been marked as ${action.toUpperCase()}.`);
      setApprovalDialog(null);
      setSelectedItem(null);
      fetchPlan();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${action} block.`);
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    if (sev === "CRITICAL") return "text-destructive bg-destructive/10 border-destructive/30";
    if (sev === "HIGH") return "text-warn bg-warn/10 border-warn/30";
    if (sev === "MEDIUM") return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    return "text-safe bg-safe/10 border-safe/30";
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Conflicts & Approvals
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Human-in-the-loop review of AI-generated maintenance blocks and operational conflicts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="h-9 px-3 bg-warn/10 text-warn border-warn/30 uppercase tracking-wider font-bold">
            {stats.awaitingApproval} Pending Approval
          </Badge>
          <div className="flex items-center gap-2 border border-border bg-background rounded-md px-3 h-9 text-xs font-semibold text-muted-foreground">
            <Calendar className="size-4" /> 2026-08-30
          </div>
          <Button variant="outline" size="sm" onClick={fetchPlan} className="h-9">
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        <MetricCard label="Open Conflicts" value={stats.openConflicts} tone={stats.openConflicts > 0 ? "text-warn" : "text-foreground"} />
        <MetricCard label="Critical Conflicts" value={stats.criticalConflicts} tone={stats.criticalConflicts > 0 ? "text-destructive" : "text-foreground"} />
        <MetricCard label="Awaiting Approval" value={stats.awaitingApproval} tone="text-blue-500" />
        <MetricCard label="Approved Today" value={stats.approvedToday} tone="text-safe" />
        <MetricCard label="Rejected / Rework" value={stats.rejected} />
        <MetricCard label="High-Risk Impacts" value={stats.highRiskImpacts} tone={stats.highRiskImpacts > 0 ? "text-destructive" : "text-foreground"} />
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="w-[240px] pl-9 h-9 text-xs bg-background"
              placeholder="Search block, corridor, train..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
              <Filter className="size-3.5 mr-2" />
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Severities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low (Safe)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-background">
              <Filter className="size-3.5 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PLANNED">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="REWORK">Rework</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CONFLICT QUEUE */}
      <Card className="shadow-sm border-border overflow-hidden flex flex-col mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Conflict / Block ID</th>
                <th className="px-5 py-3.5">Corridor</th>
                <th className="px-5 py-3.5">Task / Depts</th>
                <th className="px-5 py-3.5">Train Info</th>
                <th className="px-5 py-3.5">Time Window</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">Loading queue...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="size-10 text-safe opacity-50 mb-2" />
                      <p className="text-lg font-semibold text-foreground">NO ACTIVE CONFLICTS</p>
                      <p className="text-sm text-muted-foreground">All currently generated blocks have passed conflict screening.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getSeverityColor(item.severity)}`}>
                        {item.severity}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        {item.isConflict ? (
                          <span className="font-bold text-foreground text-xs">{item.id}</span>
                        ) : (
                          <span className="font-bold text-safe text-xs flex items-center gap-1">
                            <ShieldCheck className="size-3" /> NO CONFLICT
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-muted-foreground">{item.block.block_id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold">
                      {item.block.corridor_id}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium text-foreground">{item.block.tasks?.length || 0} Tasks</span>
                        <span className="text-muted-foreground">{item.block.number_of_departments} Depts</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {item.train ? (
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-bold text-warn flex items-center gap-1">
                            <TrainFront className="size-3" /> {item.train.train_number}
                          </span>
                          <span className="text-muted-foreground truncate max-w-[120px]" title={item.train.train_name}>{item.train.train_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5 text-xs font-mono">
                        <span className="font-semibold text-foreground">{item.block.start_time.slice(0,5)} – {item.block.end_time.slice(0,5)}</span>
                        <span className="text-[10px] text-muted-foreground">{item.block.block_date}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${
                        item.block.block_status === "PLANNED" ? "bg-warn/10 text-warn border-warn/30" :
                        item.block.block_status === "APPROVED" ? "bg-safe/10 text-safe border-safe/30" :
                        "bg-destructive/10 text-destructive border-destructive/30"
                      }`}>
                        {item.block.block_status === "PLANNED" ? "PENDING" : item.block.block_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={() => setSelectedItem(item)}>
                        Review <ArrowRight className="ml-1.5 size-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CONFLICT DETAILS DRAWER */}
      <Sheet open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-[600px] border-l border-border overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border p-6 pb-4">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className={`text-[10px] font-bold tracking-wider uppercase ${getSeverityColor(selectedItem?.severity || "LOW")}`}>
                {selectedItem?.severity} SEVERITY
              </Badge>
              <Badge variant="outline" className="bg-secondary/50">{selectedItem?.block.block_status}</Badge>
            </div>
            <SheetTitle className="text-xl flex items-center gap-2">
              {selectedItem?.isConflict ? <ShieldAlert className="size-5 text-destructive" /> : <ShieldCheck className="size-5 text-safe" />}
              Conflict Review
            </SheetTitle>
            <SheetDescription className="font-mono text-xs mt-1">
              {selectedItem?.id}
            </SheetDescription>
          </div>

          {selectedItem && (
            <div className="p-6 space-y-8">
              
              {/* BLOCK INFO */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b border-border/50 pb-1">Block Information</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Block ID</span>
                    <p className="font-mono font-bold mt-0.5">{selectedItem.block.block_id}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Corridor</span>
                    <p className="font-semibold mt-0.5">{selectedItem.block.corridor_id}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Window</span>
                    <p className="font-mono font-medium mt-0.5">{selectedItem.block.start_time.slice(0,5)} – {selectedItem.block.end_time.slice(0,5)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Duration</span>
                    <p className="font-medium mt-0.5">{selectedItem.block.duration_min} min</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Utilization</span>
                    <p className="font-medium text-safe mt-0.5">{selectedItem.block.utilization_percent}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Tasks</span>
                    <p className="font-medium mt-0.5">{selectedItem.block.number_of_tasks} ({selectedItem.block.number_of_departments} Depts)</p>
                  </div>
                </div>
              </div>

              {/* TRAIN INFO & IMPACT */}
              {selectedItem.isConflict && selectedItem.train && (
                <>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b border-border/50 pb-1">Conflicting Train</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm bg-warn/5 border border-warn/20 p-4 rounded-lg">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Train No.</span>
                        <p className="font-mono font-bold text-warn flex items-center gap-1 mt-0.5"><TrainFront className="size-3" /> {selectedItem.train.train_number}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Name / Type</span>
                        <p className="font-semibold mt-0.5">{selectedItem.train.train_name} <span className="text-muted-foreground text-xs font-normal">({selectedItem.train.train_type})</span></p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Arrival</span>
                        <p className="font-mono font-medium mt-0.5">{selectedItem.train.arrival_time.slice(0,5)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Departure</span>
                        <p className="font-mono font-medium mt-0.5">{selectedItem.train.departure_time.slice(0,5)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Priority</span>
                        <p className="font-bold text-destructive mt-0.5">Level {selectedItem.train.operational_priority}</p>
                      </div>
                    </div>
                  </div>

                  {/* IMPACT ANALYSIS */}
                  <div className="bg-secondary/10 border border-border/50 p-4 rounded-lg space-y-2">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5"><Activity className="size-3" /> Impact Analysis</p>
                    <p className="text-sm leading-relaxed">
                      Maintenance block <span className="font-mono font-semibold">{selectedItem.block.block_id}</span> overlaps the scheduled movement window of train <span className="font-mono font-semibold">{selectedItem.train.train_number}</span>. 
                      The train is classified as <span className="font-semibold">{selectedItem.train.train_type}</span> with operational priority <span className="font-semibold">{selectedItem.train.operational_priority}</span>.
                      <br/><br/>
                      Estimated impact: <span className="text-destructive font-bold">{selectedItem.train.estimated_delay_min} minutes delay</span>.
                    </p>
                  </div>

                  {/* TIMELINE CONFLICT VIEW */}
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">Timeline Conflict Visualization</p>
                    <div className="border border-border/50 bg-secondary/5 rounded-lg p-4 relative">
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-4">
                        <span>{selectedItem.block.start_time.slice(0,5)}</span>
                        <span>Time</span>
                        <span>{selectedItem.block.end_time.slice(0,5)}</span>
                      </div>
                      
                      <div className="relative h-20">
                        {/* Ruler line */}
                        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-border/50 -translate-y-1/2"></div>
                        
                        {/* Compute relative positions */}
                        {(() => {
                          const bStart = timeToMinutes(selectedItem.block.start_time);
                          let bEnd = timeToMinutes(selectedItem.block.end_time);
                          if (bEnd < bStart) bEnd += 1440;
                          const bDur = bEnd - bStart;

                          const tStart = timeToMinutes(selectedItem.train!.arrival_time);
                          let tEnd = timeToMinutes(selectedItem.train!.departure_time);
                          if (tEnd < tStart) tEnd += 1440;
                          
                          // normalize to block window context + padding
                          const viewStart = bStart - 30;
                          const viewEnd = bEnd + 30;
                          const viewSpan = viewEnd - viewStart;

                          const tLeft = Math.max(0, ((tStart - viewStart) / viewSpan) * 100);
                          const tWidth = Math.min(100 - tLeft, ((tEnd - tStart) / viewSpan) * 100);

                          const bLeft = Math.max(0, ((bStart - viewStart) / viewSpan) * 100);
                          const bWidth = ((bEnd - bStart) / viewSpan) * 100;

                          const overlapStart = Math.max(bStart, tStart);
                          const overlapEnd = Math.min(bEnd, tEnd);
                          const oLeft = Math.max(0, ((overlapStart - viewStart) / viewSpan) * 100);
                          const oWidth = Math.max(0, ((overlapEnd - overlapStart) / viewSpan) * 100);

                          return (
                            <>
                              {/* Block */}
                              <div className="absolute top-2 h-4 bg-primary/20 border border-primary text-primary text-[9px] rounded font-bold px-1 overflow-hidden" 
                                style={{ left: `${bLeft}%`, width: `${bWidth}%` }}>
                                BLOCK
                              </div>
                              {/* Train */}
                              <div className="absolute top-14 h-2 bg-slate-400 rounded-full" 
                                style={{ left: `${tLeft}%`, width: `${tWidth}%` }} />
                              {/* Conflict Highlight */}
                              {oWidth > 0 && (
                                <div className="absolute top-2 bottom-4 border-x-2 border-destructive bg-destructive/10 z-10 flex flex-col justify-center items-center"
                                  style={{ left: `${oLeft}%`, width: `${oWidth}%` }}>
                                  <span className="bg-destructive text-white text-[8px] font-bold px-1 rounded uppercase tracking-widest mt-6">Conflict</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* AI RECOMMENDATION */}
              <div className="border border-purple-500/20 bg-purple-500/5 rounded-lg overflow-hidden">
                <div className="bg-purple-500/10 p-3 border-b border-purple-500/20 flex items-center gap-2">
                  <BrainCircuit className="size-4 text-purple-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">IR-ABPS Recommendation</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Recommendation:</span>
                    <Badge className={selectedItem.isConflict ? "bg-warn text-warn-foreground hover:bg-warn" : "bg-safe text-safe-foreground hover:bg-safe"}>
                      {selectedItem.isConflict ? "RESCHEDULE / REWORK" : "APPROVE"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Reason:</span>
                    <p className="text-sm">
                      {selectedItem.isConflict 
                        ? `The requested block overlaps a high-priority ${selectedItem.train?.train_type} train. Sending for rework will allow the optimizer to find a later window on the same corridor providing higher operational safety with comparable maintenance utilization.`
                        : "The block exhibits high maintenance utilization and presents zero conflicts with currently scheduled train movements. Safe for authorization."
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* APPROVAL WORKFLOW STEPPER */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/50 pb-1">Approval Workflow</h3>
                <div className="space-y-4 px-2 mb-6">
                  <div className="flex gap-3 relative">
                    <div className="absolute left-[7px] top-5 bottom-[-16px] w-[2px] bg-primary" />
                    <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 bg-background flex items-center justify-center z-10 border-primary"><div className="size-1.5 rounded-full bg-primary" /></div>
                    <div className="pb-2"><p className="text-sm font-medium text-foreground">AI Generated</p></div>
                  </div>
                  <div className="flex gap-3 relative">
                    <div className="absolute left-[7px] top-5 bottom-[-16px] w-[2px] bg-primary" />
                    <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 bg-background flex items-center justify-center z-10 border-primary"><div className="size-1.5 rounded-full bg-primary" /></div>
                    <div className="pb-2"><p className="text-sm font-medium text-foreground">Conflict Checked</p></div>
                  </div>
                  <div className="flex gap-3 relative">
                    <div className="absolute left-[7px] top-5 bottom-[-16px] w-[2px] bg-border" />
                    <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 bg-background flex items-center justify-center z-10 border-primary"><div className="size-1.5 rounded-full bg-primary animate-pulse" /></div>
                    <div className="pb-2">
                      <p className="text-sm font-medium text-primary">Human Review</p>
                      <p className="text-xs text-muted-foreground">Pending DRM Planning decision</p>
                    </div>
                  </div>
                  <div className="flex gap-3 relative">
                    <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 bg-background flex items-center justify-center z-10 border-muted-foreground" />
                    <div className="pb-2"><p className="text-sm text-muted-foreground">Final Planning Status</p></div>
                  </div>
                </div>

                {selectedItem.block.block_status === "PLANNED" ? (
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <Button variant="outline" className="w-full border-warn/30 text-warn hover:bg-warn/10" onClick={() => handleAction("rework")}>
                      REQUEST REVISION
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={() => handleAction("reject")}>
                      REJECT BLOCK
                    </Button>
                    <Button className="w-full col-span-2 bg-safe text-safe-foreground hover:bg-safe/90 font-bold" onClick={() => setApprovalDialog(selectedItem)}>
                      <CheckCircle2 className="size-4 mr-2" /> APPROVE BLOCK
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-secondary/10 border border-border text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Block Status is Finalized</p>
                    <Badge className="mt-2 text-xs">{selectedItem.block.block_status}</Badge>
                  </div>
                )}
              </div>

              {/* AUDIT TRAIL */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Server className="size-3" /> System Audit Trail</p>
                <div className="space-y-2 text-xs font-mono text-muted-foreground">
                  <div className="flex justify-between"><span>[SYSTEM] Block {selectedItem.block.block_id} generated</span><span>{new Date().toISOString().split("T")[0]}</span></div>
                  <div className="flex justify-between"><span>[SYSTEM] Conflict screening completed</span><span>{new Date().toISOString().split("T")[0]}</span></div>
                  <div className="flex justify-between"><span>[AI] Recommendation generated</span><span>{new Date().toISOString().split("T")[0]}</span></div>
                  <div className="flex justify-between text-foreground"><span>[HUMAN] Planner reviewing...</span><span>Now</span></div>
                </div>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* APPROVAL DIALOG */}
      <Dialog open={!!approvalDialog} onOpenChange={(o) => !o && setApprovalDialog(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-safe">
              <CheckSquare className="size-5" /> Confirm Block Authorization
            </DialogTitle>
          </DialogHeader>
          
          {approvalDialog && (
            <div className="py-2 space-y-4">
              <div className="p-4 bg-secondary/20 border border-border/50 rounded-md grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold block mb-0.5">Block ID</span>
                  <span className="font-mono font-bold">{approvalDialog.block.block_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold block mb-0.5">Corridor</span>
                  <span className="font-semibold">{approvalDialog.block.corridor_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold block mb-0.5">Date & Time</span>
                  <span className="font-mono text-xs">{approvalDialog.block.block_date} {approvalDialog.block.start_time.slice(0,5)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold block mb-0.5">Tasks</span>
                  <span className="font-semibold">{approvalDialog.block.number_of_tasks} tasks</span>
                </div>
                <div className="col-span-2 border-t border-border/50 pt-2 mt-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold block mb-1">Conflict Status</span>
                  {approvalDialog.isConflict ? (
                    <Badge variant="destructive" className="text-[10px]">Overlaps {approvalDialog.train?.train_number} ({approvalDialog.train?.estimated_delay_min}m delay)</Badge>
                  ) : (
                    <Badge className="bg-safe text-safe-foreground hover:bg-safe text-[10px]">No train conflicts</Badge>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md flex gap-2">
                <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  Approval records the planner's decision. This prototype does not directly control railway signalling or interlocking systems.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between gap-3 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setApprovalDialog(null)} disabled={actionLoading}>
              CANCEL
            </Button>
            <Button 
              onClick={() => handleAction("approve")} 
              disabled={actionLoading}
              className="bg-safe text-safe-foreground hover:bg-safe/90 font-bold tracking-wider text-xs"
            >
              {actionLoading ? "PROCESSING..." : "CONFIRM APPROVAL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MetricCard({ label, value, tone = "text-foreground" }: { label: string, value: string | number, tone?: string }) {
  return (
    <Card className="shadow-sm border-border bg-card">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
