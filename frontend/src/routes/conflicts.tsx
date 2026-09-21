import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, TriangleAlert, ShieldAlert, CheckCircle2, XCircle, 
  ArrowRight, Search, Filter, RefreshCw, Calendar, Map, 
  TrainFront, BrainCircuit, Activity, Clock, Server, Zap, CheckSquare,
  FileCheck, AlertOctagon, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { classifyTrainConflictSeverity } from "@/lib/conflict-priority";

export const Route = createFileRoute("/conflicts")({
  head: () => ({
    meta: [
      { title: "Conflicts & Approvals | IR-ABPS Scrutiny Desk" },
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
  severity?: string;
  traffic_class?: string;
  source?: string;
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
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAR";
  isConflict: boolean;
};

function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":");
  return parseInt(h || "0") * 60 + parseInt(m || "0");
}

function ConflictsPage() {
  const { role, scope, can } = useAbps();
  const { t } = useLanguage();

  const [blocks, setBlocks] = useState<OptimizedBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedItem, setSelectedItem] = useState<ConflictItem | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<ConflictItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [changeShift, setChangeShift] = useState("");

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/optimized-plan/");
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
          const severity = classifyTrainConflictSeverity(
            c.operational_priority,
            c.train_type,
            c.severity
          );

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
          severity: "CLEAR",          
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
      
      if (
  b.conflicts?.length > 0 &&
  (b.block_status === "PLANNED" || b.block_status === "PENDING")
) {
        openConflicts += b.conflicts.length;
        b.conflicts.forEach(c => {
          const severity = classifyTrainConflictSeverity(
            c.operational_priority,
            c.train_type,
            c.severity
          );
          if (severity === "CRITICAL") {
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
      const url = `/optimized-plan/${selectedItem.block.block_id}/${action}`;
      
      const res = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!res.ok) throw new Error("Action failed");
      
      toast.success(`Block ${selectedItem.block.block_id} has been recorded as ${action.toUpperCase()}.`);
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

  const handleAcknowledge = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/optimized-plan/${selectedItem.block.block_id}/acknowledge`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Acknowledgement failed");
      toast.success(t("Conflict / block schedule acknowledged.", "विवाद / ब्लॉक अनुसूची स्वीकृत।"));
      setSelectedItem(null);
      fetchPlan();
    } catch (e: any) {
      toast.error(e.message || "Failed to acknowledge");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAdjustment = async () => {
    if (!selectedItem) return;
    if (!changeReason.trim()) {
      toast.error(t("Please provide a reason for the adjustment request", "कृपया समायोजन अनुरोध का कारण बताएं"));
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(`/optimized-plan/${selectedItem.block.block_id}/request-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: changeReason,
          suggested_shift_min: changeShift ? Number(changeShift) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success(t("Adjustment request submitted to Control Office.", "समायोजन अनुरोध नियंत्रण कार्यालय को प्रस्तुत किया गया।"));
      setChangeModalOpen(false);
      setChangeReason("");
      setChangeShift("");
      setSelectedItem(null);
      fetchPlan();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    if (sev === "CLEAR") return "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
    if (sev === "CRITICAL") return "bg-red-100 text-red-900 border-red-300 font-bold";
    if (sev === "HIGH") return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
    if (sev === "MEDIUM") return "bg-blue-100 text-blue-900 border-blue-300 font-bold";
    return "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
  };

  return (
    <>
      <PageHeader
        title={
          scope === "department"
            ? t("My Departmental Conflicts Desk", "मेरा विभागीय विवाद पटल")
            : t(
                "Section Controller Conflict Scrutiny & Authorization Desk",
                "अनुभाग नियंत्रक विवाद संवीक्षा एवं प्राधिकरण पटल",
              )
        }
        subtitle={
          scope === "department"
            ? t(
                "Review operational train conflicts affecting your department's maintenance blocks and submit shift adjustments.",
                "अपने विभाग के अनुरक्षण ब्लॉकों को प्रभावित करने वाले परिचालन ट्रेन विवादों की समीक्षा करें और समायोजन प्रस्तुत करें।",
              )
            : t(
                "Human-in-the-loop review of AI-generated maintenance blocks, train movement overlaps, and operational authorization sign-off.",
                "एआई-जनित अनुरक्षण ब्लॉकों, ट्रेन संचलन ओवरलैप और परिचालन प्राधिकरण साइन-ऑफ की मानव-समीक्षा।",
              )
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-amber-300 bg-amber-100 text-amber-900 px-2.5 py-1 text-xs font-bold rounded-[2px] uppercase">
              {stats.awaitingApproval} {t("Awaiting Scrutiny", "संवीक्षा लंबित")}
            </span>
            <Button variant="outline" size="sm" onClick={fetchPlan} className="h-8 text-xs font-bold border-slate-300 dark:border-slate-700">
              <RefreshCw className="mr-1.5 size-3.5" /> {t("Refresh Scrutiny Queue", "संवीक्षा कतार ताज़ा करें")}
            </Button>
          </div>
        }
      />

      {/* KPI Matrix Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard label="Open Conflicts" value={stats.openConflicts} tone={stats.openConflicts > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"} />
        <MetricCard label="Critical Clashes" value={stats.criticalConflicts} tone={stats.criticalConflicts > 0 ? "text-red-700 dark:text-red-400 font-bold" : "text-slate-900 dark:text-slate-100"} />
        <MetricCard label="Pending Approval" value={stats.awaitingApproval} tone="text-blue-700 dark:text-blue-400" />
        <MetricCard label="Authorized Today" value={stats.approvedToday} tone="text-emerald-700 dark:text-emerald-400 font-bold" />
        <MetricCard label="Rejected / Rework" value={stats.rejected} />
        <MetricCard label="Express Risk Impact" value={stats.highRiskImpacts} tone={stats.highRiskImpacts > 0 ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              className="w-[240px] pl-8 h-8 text-xs bg-background rounded-[2px] border-slate-300 dark:border-slate-700"
              placeholder="Search block, corridor, train..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background rounded-[2px] border-slate-300 dark:border-slate-700">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="rounded-[2px]">
              <SelectItem value="ALL" className="text-xs">All Severities</SelectItem>
              <SelectItem value="CRITICAL" className="text-xs">Critical Severity</SelectItem>
              <SelectItem value="HIGH" className="text-xs">High Severity</SelectItem>
              <SelectItem value="MEDIUM" className="text-xs">Medium Severity</SelectItem>
              <SelectItem value="LOW" className="text-xs">Low (Zero Conflict)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background rounded-[2px] border-slate-300 dark:border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-[2px]">
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="PLANNED" className="text-xs">Pending Approval</SelectItem>
              <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
              <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
              <SelectItem value="REWORK" className="text-xs">Rework</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
          Showing {filteredItems.length} Scrutiny Cases
        </span>
      </div>

      {/* Scrutiny Queue Table */}
      <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none flex flex-col mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-border text-[11px] font-bold uppercase text-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3 border-r border-border">Severity</th>
                <th className="px-4 py-3 border-r border-border">Scrutiny Ref / Block ID</th>
                <th className="px-4 py-3 border-r border-border">Corridor</th>
                <th className="px-4 py-3 border-r border-border">Work Package</th>
                <th className="px-4 py-3 border-r border-border">Conflicting Train</th>
                <th className="px-4 py-3 border-r border-border">Window</th>
                <th className="px-4 py-3 border-r border-border">Status</th>
                <th className="px-4 py-3 text-right">Scrutiny Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading scrutiny queue...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <ShieldCheck className="size-8 text-emerald-600 opacity-60 mb-1" />
                      <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">
                        NO ACTIVE CONFLICTS DETECTED
                      </p>
                      <p className="text-[11px] text-slate-500">
                        All computed blocks are free from express path collisions.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2.5 border-r border-border/60">
                      <span className={`border px-1.5 py-0.5 text-[9px] uppercase rounded-[2px] ${getSeverityBadge(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/60 font-mono">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{item.id}</p>
                      <p className="text-[10px] text-slate-500">{item.block.block_id}</p>
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/60 font-semibold">
                      {item.block.corridor_id}
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/60">
                      <span className="font-bold">{item.block.tasks?.length || 0} Tasks</span> · <span className="text-slate-500">{item.block.number_of_departments} Depts</span>
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/60">
                      {item.train ? (
                        <div>
                          <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <TrainFront className="size-3 text-amber-700" /> {item.train.train_number}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{item.train.train_name}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/60 font-mono">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{item.block.start_time.slice(0,5)} – {item.block.end_time.slice(0,5)}</p>
                      <p className="text-[10px] text-slate-500">{item.block.block_date}</p>
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/60">
                      <span className={`border px-1.5 py-0.5 text-[9px] uppercase rounded-[2px] font-bold ${
                        item.block.block_status === "PLANNED" ? "bg-amber-100 text-amber-900 border-amber-300" :
                        item.block.block_status === "APPROVED" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                        "bg-red-100 text-red-900 border-red-300"
                      }`}>
                        {item.block.block_status === "PLANNED" ? "PENDING" : item.block.block_status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] font-bold border-slate-300 dark:border-slate-700"
                        onClick={() => setSelectedItem(item)}
                      >
                        Scrutinize <ArrowRight className="ml-1 size-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Conflict Scrutiny Drawer */}
      <Sheet open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-[580px] border-2 border-[#003366] bg-white dark:bg-slate-950 p-0 rounded-[2px] overflow-y-auto">
          <SheetHeader className="bg-[#003366] p-4 text-white border-b-2 border-[#FF9933]">
            <div className="flex justify-between items-start">
              <div>
                <span className={`border px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-[2px] bg-white text-slate-900`}>
                  {selectedItem?.severity} SEVERITY SCRUTINY
                </span>
                <SheetTitle className="text-base font-bold uppercase text-white mt-1">
                  {selectedItem?.id}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-300 font-mono">
                  Block Ref: {selectedItem?.block.block_id} · Corridor: {selectedItem?.block.corridor_id}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedItem && (
            <div className="p-4 space-y-4 text-xs">
              {/* Block Details */}
              <div className="border border-border bg-slate-50 dark:bg-slate-900 p-3 rounded-[2px]">
                <p className="font-bold text-[#003366] dark:text-sky-400 uppercase text-[10px] mb-2">
                  Block Parameters
                </p>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Corridor</span>
                    <strong>{selectedItem.block.corridor_id}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Time Window</span>
                    <strong>{selectedItem.block.start_time.slice(0,5)} – {selectedItem.block.end_time.slice(0,5)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Duration</span>
                    <strong>{selectedItem.block.duration_min} min</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Utilization</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">{selectedItem.block.utilization_percent}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Tasks Bundled</span>
                    <strong>{selectedItem.block.number_of_tasks} tasks</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Departments</span>
                    <strong>{selectedItem.block.number_of_departments} Depts</strong>
                  </div>
                </div>
              </div>

              {/* Conflicting Train Details */}
              {selectedItem.isConflict && selectedItem.train && (
                <div className="border border-red-300 bg-red-50 dark:bg-red-950/40 p-3 rounded-[2px] text-red-950 dark:text-red-200">
                  <p className="font-bold uppercase text-[10px] text-red-800 dark:text-red-300 mb-2 flex items-center gap-1.5">
                    <AlertOctagon className="size-3.5 text-destructive" /> Conflicting Train Movement
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Train Number & Name</span>
                      <strong className="font-mono">{selectedItem.train.train_number} – {selectedItem.train.train_name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Category & Priority</span>
                      <strong>{selectedItem.train.train_type} (Level {selectedItem.train.operational_priority})</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Path Timing</span>
                      <strong className="font-mono">{selectedItem.train.arrival_time.slice(0,5)} to {selectedItem.train.departure_time.slice(0,5)} IST</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Estimated Delay</span>
                      <strong className="text-destructive font-black font-mono">+{selectedItem.train.estimated_delay_min} min delay</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Recommendation */}
              <div className="border border-border p-3 rounded-[2px] bg-slate-50 dark:bg-slate-900 leading-relaxed">
                <p className="font-bold text-[#003366] dark:text-sky-400 uppercase text-[10px] mb-1">
                  CRIS Algorithm Advisory
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedItem.isConflict
                    ? "Overlaps with high-priority scheduled express service. Controller discretion advised: send for shadow rework or approve with speed caution order."
                    : "Zero clashes reported on corridor line. Work bundling satisfies safety and operational clearance criteria."}
                </p>
              </div>

              {/* Action Buttons */}
              {selectedItem.block.block_status === "PLANNED" ? (
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500">{t("Official Action", "आधिकारिक कार्रवाई")}</p>
                  {scope === "department" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setChangeModalOpen(true)}
                        variant="outline"
                        className="border-amber-400 text-amber-900 dark:text-amber-300 font-bold h-8 text-xs rounded-[2px]"
                        disabled={actionLoading}
                      >
                        {t("Request Adjustment", "समायोजन का अनुरोध करें")}
                      </Button>
                      <Button
                        onClick={handleAcknowledge}
                        className="bg-[#003366] hover:bg-[#002244] text-white font-bold h-8 text-xs rounded-[2px]"
                        disabled={actionLoading}
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-400" /> {t("Acknowledge", "स्वीकार करें")}
                      </Button>
                    </div>
                  ) : role.id === "control" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleAction("rework")}
                        variant="outline"
                        className="border-amber-400 text-amber-900 dark:text-amber-300 font-bold h-8 text-xs rounded-[2px]"
                        disabled={actionLoading}
                      >
                        {t("Return For Rework", "पुनर्विचार के लिए लौटाएं")}
                      </Button>
                      <Button
                        onClick={() => {
                          toast.info(t("Conflict marked operationally resolved by controller.", "विवाद नियंत्रक द्वारा परिचालन रूप से सुलझाया गया चिह्नित।"));
                          setSelectedItem(null);
                        }}
                        className="bg-[#003366] hover:bg-[#002244] text-white font-bold h-8 text-xs rounded-[2px]"
                        disabled={actionLoading}
                      >
                        {t("Mark Handled", "सुलझाया गया चिह्नित करें")}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleAction("rework")}
                        variant="outline"
                        className="border-amber-400 text-amber-900 dark:text-amber-300 font-bold h-8 text-xs rounded-[2px]"
                        disabled={actionLoading}
                      >
                        {t("Return For Rework", "पुनर्विचार के लिए लौटाएं")}
                      </Button>
                      <Button
                        onClick={() => handleAction("reject")}
                        variant="outline"
                        className="border-red-400 text-red-900 dark:text-red-300 font-bold h-8 text-xs rounded-[2px]"
                        disabled={actionLoading}
                      >
                        {t("Reject Application", "आवेदन अस्वीकार करें")}
                      </Button>
                      <Button
                        onClick={() => setApprovalDialog(selectedItem)}
                        className="col-span-2 bg-[#137547] hover:bg-[#0f5c38] text-white font-bold h-8 text-xs rounded-[2px]"
                        disabled={actionLoading}
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" /> {t("Authorize & Issue Block Order", "ब्लॉक आदेश अधिकृत करें")}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-border bg-slate-100 dark:bg-slate-800 p-2.5 text-center font-bold text-xs uppercase">
                  Block Status: {selectedItem.block.block_status}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={(o) => !o && setApprovalDialog(null)}>
        <DialogContent className="sm:max-w-md border-2 border-[#003366] bg-white dark:bg-slate-950 p-0 rounded-[2px]">
          <DialogHeader className="bg-[#003366] p-4 text-white border-b-2 border-[#FF9933]">
            <DialogTitle className="text-base font-bold uppercase text-white flex items-center gap-2">
              <CheckSquare className="size-4 text-[#FF9933]" /> Controller Authorization Sign-Off
            </DialogTitle>
          </DialogHeader>

          {approvalDialog && (
            <div className="p-4 space-y-3 text-xs">
              <div className="border border-border bg-slate-50 dark:bg-slate-900 p-3 rounded-[2px] font-mono">
                <p className="font-bold text-slate-900 dark:text-slate-100">Block ID: {approvalDialog.block.block_id}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Corridor: {approvalDialog.block.corridor_id} · Date: {approvalDialog.block.block_date} ({approvalDialog.block.start_time.slice(0,5)} – {approvalDialog.block.end_time.slice(0,5)})
                </p>
              </div>

              <p className="text-slate-600 dark:text-slate-400 leading-normal">
                By confirming, you digitally certify that sectional capacity and safety interlocks have been verified in accordance with Indian Railways operating procedures.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setApprovalDialog(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading}
                  className="bg-[#137547] hover:bg-[#0f5c38] text-white font-bold rounded-[2px]"
                >
                  {actionLoading ? "Processing..." : "Confirm & Authorize"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Department Adjustment Request Dialog */}
      <Dialog open={changeModalOpen} onOpenChange={setChangeModalOpen}>
        <DialogContent className="sm:max-w-md border-2 border-amber-500 bg-white dark:bg-slate-950 rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm font-bold uppercase">
              <RefreshCw className="size-4 text-amber-500" />
              {t("Request Conflict Adjustment", "विवाद समायोजन का अनुरोध करें")}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {t(
                "Submit a recommended shift in block timings to avoid train operational collision.",
                "ट्रेन परिचालन टकराव से बचने के लिए ब्लॉक समय में अनुशंसित बदलाव जमा करें।",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">
                {t("Reason for Adjustment", "समायोजन का कारण")} <span className="text-destructive">*</span>
              </label>
              <Input
                className="mt-1 text-xs rounded-[2px]"
                placeholder={t(
                  "e.g. Request shift by 30 mins to avoid Express train headway",
                  "उदा. एक्सप्रेस ट्रेन के हेडवे से बचने के लिए 30 मिनट का बदलाव",
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
                placeholder="e.g. +30 or -45"
                value={changeShift}
                onChange={(e) => setChangeShift(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-[2px]"
              onClick={() => setChangeModalOpen(false)}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button
              size="sm"
              className="bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-[2px]"
              onClick={() => void handleRequestAdjustment()}
            >
              {t("Submit Adjustment", "समायोजन जमा करें")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
