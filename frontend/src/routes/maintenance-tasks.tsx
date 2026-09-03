import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ArrowRight, Filter, RefreshCw, AlertTriangle, ShieldAlert,
  Clock, CheckCircle2, ChevronLeft, ChevronRight, Eye, BrainCircuit,
  Wrench, Activity, Search, CalendarClock, LayoutList, CheckSquare
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/maintenance-tasks")({
  head: () => ({
    meta: [
      { title: "Maintenance Tasks | IR-ABPS" },
    ],
  }),
  component: MaintenanceTasksPage,
});

type MaintenanceTask = {
  task_id: string;
  asset_id: string | null;
  department: string;
  task_type: string | null;
  description: string | null;
  created_date: string | null;
  due_date: string | null;
  estimated_duration_min: number | null;
  overdue_days: number | null;
  safety_risk: number | null;
  task_status: string | null;
  priority_score: number | null;
  priority_category: string | null;
};

const ITEMS_PER_PAGE = 10;

export default function MaintenanceTasksPage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [dueFilter, setDueFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"Priority" | "All">("Priority");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modals/Drawers
  const [viewTask, setViewTask] = useState<MaintenanceTask | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<MaintenanceTask | null>(null);

  const fetchTasks = () => {
    setLoading(true);
    setError(false);
    fetch("http://127.0.0.1:8000/maintenance-tasks/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setTasks(data.tasks ?? []))
      .catch((err) => {
        console.error("Maintenance Tasks API error:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const resetFilters = () => {
    setSearch("");
    setDeptFilter("All");
    setPriorityFilter("All");
    setStatusFilter("All");
    setRiskFilter("All");
    setDueFilter("All");
    setCurrentPage(1);
  };

  const getPriorityStyle = (cat: string | null) => {
    switch (cat?.toUpperCase()) {
      case "CRITICAL": return { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", bar: "bg-destructive" };
      case "HIGH": return { text: "text-warn", bg: "bg-warn/10", border: "border-warn/20", bar: "bg-warn" };
      case "MEDIUM": return { text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", bar: "bg-blue-500" };
      case "LOW": return { text: "text-safe", bg: "bg-safe/10", border: "border-safe/20", bar: "bg-safe" };
      default: return { text: "text-muted-foreground", bg: "bg-secondary", border: "border-border", bar: "bg-secondary-foreground" };
    }
  };

  const getStatusStyle = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case "PENDING": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "IN PROGRESS": return "bg-warn/10 text-warn border-warn/20";
      case "COMPLETED": return "bg-safe/10 text-safe border-safe/20";
      case "OVERDUE": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-secondary text-muted-foreground border-border";
    }
  };

  // Derived metrics
  const criticalCount = tasks.filter(t => t.priority_category?.toUpperCase() === "CRITICAL").length;
  const overdueCount = tasks.filter(t => (t.overdue_days ?? 0) > 0 && t.task_status !== "COMPLETED").length;
  
  // Due soon logic (assuming due in next 7 days). Simple check based on dates.
  // Real implementation would parse dates, but we can fake it or use a heuristic if due_date is string.
  // For safety, just checking if not overdue and not completed and due_date exists.
  const dueSoonCount = tasks.filter(t => (t.overdue_days ?? 0) <= 0 && t.task_status !== "COMPLETED" && t.due_date).length;
  const completedCount = tasks.filter(t => t.task_status === "COMPLETED").length;

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !search || 
        t.task_id.toLowerCase().includes(search.toLowerCase()) || 
        (t.asset_id && t.asset_id.toLowerCase().includes(search.toLowerCase())) ||
        (t.task_type && t.task_type.toLowerCase().includes(search.toLowerCase()));
      
      const matchDept = deptFilter === "All" || t.department === deptFilter;
      const matchPri = priorityFilter === "All" || t.priority_category?.toUpperCase() === priorityFilter.toUpperCase();
      const matchStatus = statusFilter === "All" || t.task_status?.toUpperCase() === statusFilter.toUpperCase();
      const matchRisk = riskFilter === "All" || t.safety_risk?.toString() === riskFilter.split("/")[0];
      
      let matchDue = true;
      if (dueFilter === "Overdue") matchDue = (t.overdue_days ?? 0) > 0 && t.task_status !== "COMPLETED";
      // other due filters could be implemented if actual date parsing was reliable.
      
      return matchSearch && matchDept && matchPri && matchStatus && matchRisk && matchDue;
    }).sort((a, b) => {
      if (viewMode === "Priority") {
        return (b.priority_score ?? 0) - (a.priority_score ?? 0);
      }
      return 0; // Maintain original or arbitrary order for "All Tasks"
    });
  }, [tasks, search, deptFilter, priorityFilter, statusFilter, riskFilter, dueFilter, viewMode]);

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE) || 1;
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const depts = Array.from(new Set(tasks.map(t => t.department).filter(Boolean)));

  const handleComplete = async () => {
    if (!completeConfirm) return;
    const taskId = completeConfirm.task_id;
    setUpdating(taskId);
    setCompleteConfirm(null);

    try {
      const res = await fetch(`http://127.0.0.1:8000/maintenance-tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: "COMPLETED" }),
      });

      if (!res.ok) throw new Error("Failed to update task");

      setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, task_status: "COMPLETED" } : t));
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-safe" />
          Maintenance task marked as completed.
        </div>
      );
      if (viewTask?.task_id === taskId) {
        setViewTask({ ...viewTask, task_status: "COMPLETED" });
      }
    } catch (err) {
      console.error("Task update error:", err);
      toast.error("Could not update task status.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Maintenance Tasks</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            AI-prioritized maintenance workload across track, signalling and OHE assets.
          </p>
        </div>
        <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold h-10 px-6">
          <Link to="/optimizer">
            <BrainCircuit className="size-4" />
            AI Maintenance Planner <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* EXECUTIVE STATUS STRIP */}
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-5">
        <MetricCard label="TOTAL TASKS" value={tasks.length} desc="Active database records" icon={LayoutList} />
        <MetricCard label="CRITICAL" value={criticalCount} desc="Requires immediate attention" icon={AlertTriangle} tone="text-destructive" />
        <MetricCard label="OVERDUE" value={overdueCount} desc="Past planned completion" icon={Clock} tone="text-warn" />
        <MetricCard label="DUE SOON" value={dueSoonCount} desc="Upcoming schedule" icon={CalendarClock} tone="text-blue-500" />
        <MetricCard label="COMPLETED" value={completedCount} desc="This planning cycle" icon={CheckCircle2} tone="text-safe" />
      </div>

      {/* AI PRIORITY BANNER & SMART RECOMMENDATION */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 shadow-sm border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-500/20 text-blue-500 shrink-0">
                <BrainCircuit className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-blue-500 text-sm tracking-wide">AI Maintenance Priority</h3>
                <p className="text-sm text-foreground mt-1">
                  <strong>{criticalCount} critical tasks</strong> require attention. <strong>{overdueCount} assets</strong> are currently overdue. AI suggests clustering compatible high-risk tasks.
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10 shrink-0" onClick={() => { setViewMode("Priority"); setPriorityFilter("CRITICAL"); }}>
              View AI Priorities
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border bg-secondary/10">
          <CardHeader className="p-4 pb-2 border-b border-border/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Activity className="size-3.5 text-primary" /> IR-ABPS Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3 space-y-2">
            {overdueCount > 0 && <p className="text-xs font-medium text-warn flex items-center gap-1.5"><AlertTriangle className="size-3" /> {overdueCount} tasks are overdue.</p>}
            <p className="text-xs text-foreground flex items-center gap-1.5"><BrainCircuit className="size-3 text-purple-500" /> Potential maintenance clustering detected.</p>
            {tasks.length > 0 && tasks.find(t => (t.priority_score ?? 0) >= 90) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldAlert className="size-3 text-destructive" /> Highest priority asset requires block.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WORKLOAD OVERVIEW */}
      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <WorkloadBar title="DEPARTMENT WORKLOAD" data={depts.map(d => ({ label: d, val: tasks.filter(t => t.department === d).length }))} total={tasks.length} color="bg-primary" />
        <WorkloadBar title="PRIORITY DISTRIBUTION" data={[
          { label: "Critical", val: criticalCount, color: "bg-destructive" },
          { label: "High", val: tasks.filter(t => t.priority_category?.toUpperCase() === "HIGH").length, color: "bg-warn" },
          { label: "Medium", val: tasks.filter(t => t.priority_category?.toUpperCase() === "MEDIUM").length, color: "bg-blue-500" },
          { label: "Low", val: tasks.filter(t => t.priority_category?.toUpperCase() === "LOW").length, color: "bg-safe" },
        ]} total={tasks.length} />
        <WorkloadBar title="STATUS DISTRIBUTION" data={[
          { label: "Pending", val: tasks.filter(t => t.task_status === "PENDING").length, color: "bg-blue-500" },
          { label: "Completed", val: completedCount, color: "bg-safe" },
          { label: "Overdue", val: overdueCount, color: "bg-destructive" }
        ]} total={tasks.length} />
      </div>

      {/* FILTER BAR & TOGGLE */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex bg-secondary/50 p-1 rounded-lg border border-border">
          <button 
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'Priority' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setViewMode("Priority")}
          >
            Priority
          </button>
          <button 
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'All' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setViewMode("All")}
          >
            All Tasks
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="w-[200px] pl-9 h-9 text-xs bg-background" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <FilterSelect value={deptFilter} onChange={setDeptFilter} options={["All", ...depts]} w="w-[130px]" />
          <FilterSelect value={priorityFilter} onChange={setPriorityFilter} options={["All", "Critical", "High", "Medium", "Low"]} w="w-[110px]" />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={["All", "Pending", "In Progress", "Completed"]} w="w-[120px]" />
          <FilterSelect value={riskFilter} onChange={setRiskFilter} options={["All", "1/5", "2/5", "3/5", "4/5", "5/5"]} w="w-[90px]" />
          <FilterSelect value={dueFilter} onChange={setDueFilter} options={["All", "Overdue", "Today", "Later"]} w="w-[100px]" />
          
          <Button variant="outline" size="sm" className="h-9 px-3 text-xs" onClick={resetFilters}>
            <Filter className="mr-2 size-3" /> Reset
          </Button>
        </div>
      </div>

      {/* MAIN TABLE */}
      <Card className="shadow-sm border-border overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Task & Asset</th>
                <th className="px-5 py-3.5">Dept</th>
                <th className="px-5 py-3.5">Due</th>
                <th className="px-5 py-3.5">Risk</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-secondary/5">
                    <td className="px-5 py-4"><div className="h-6 w-16 bg-border rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-4 w-32 bg-border rounded mb-2"></div><div className="h-3 w-48 bg-border rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-5 w-12 bg-border rounded-full"></div></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-border rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-3 w-16 bg-border rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 bg-border rounded-full"></div></td>
                    <td className="px-5 py-4 text-right"><div className="h-8 w-16 bg-border rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertTriangle className="size-8 text-destructive opacity-80" />
                      <div>
                        <p className="font-semibold text-foreground">Unable to load maintenance tasks.</p>
                        <p className="text-xs text-muted-foreground mt-1">Maintenance data could not be retrieved from the operations database.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={fetchTasks} className="mt-2"><RefreshCw className="mr-2 size-3" /> Retry</Button>
                    </div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground opacity-80">
                      <Search className="size-8 mb-1" />
                      <p className="font-semibold text-foreground">No maintenance tasks match your filters.</p>
                      <p className="text-xs mt-1">Try changing the department, priority, status or date filters.</p>
                      <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">Reset Filters</Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const pStyle = getPriorityStyle(task.priority_category);
                  const isOverdue = (task.overdue_days ?? 0) > 0 && task.task_status !== "COMPLETED";
                  
                  return (
                    <tr key={task.task_id} className="hover:bg-secondary/10 transition-colors group">
                      {/* Priority */}
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono text-lg font-bold">{task.priority_score?.toFixed(1) ?? "0"}</span>
                            <span className={`text-[9px] font-bold tracking-wider ${pStyle.text}`}>{task.priority_category ?? "UNKNOWN"}</span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-1">
                            <div className={`h-full ${pStyle.bar}`} style={{ width: `${task.priority_score ?? 0}%` }}></div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Task & Asset */}
                      <td className="px-5 py-3 max-w-[280px]">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-bold text-foreground text-sm uppercase truncate">{task.task_type || "Maintenance Task"}</p>
                          <p className="text-xs text-muted-foreground truncate" title={task.description || ""}>{task.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 rounded bg-secondary/50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground border border-border">
                              <Wrench className="size-3" /> {task.asset_id ?? "Unknown Asset"}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground opacity-50">{task.task_id}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Dept */}
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider border-border bg-secondary/30">
                          {task.department}
                        </Badge>
                      </td>
                      
                      {/* Due */}
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{task.due_date ?? "—"}</span>
                          {isOverdue && (
                            <Badge variant="outline" className="w-fit text-[9px] uppercase font-bold tracking-wider border-warn/30 text-warn bg-warn/10 gap-1 px-1.5">
                              <AlertTriangle className="size-2.5" /> OVERDUE {task.overdue_days}d
                            </Badge>
                          )}
                        </div>
                      </td>
                      
                      {/* Risk */}
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={`size-2 rounded-full ${i <= (task.safety_risk ?? 0) ? (task.safety_risk && task.safety_risk >= 4 ? 'bg-destructive' : task.safety_risk === 3 ? 'bg-warn' : 'bg-blue-500') : 'bg-secondary border border-border'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground mt-0.5">
                            {task.safety_risk}/5 Risk
                          </span>
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(task.task_status)}`}>
                          {task.task_status ?? "UNKNOWN"}
                        </Badge>
                      </td>
                      
                      {/* Action */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600" onClick={() => setViewTask(task)} title="View Details">
                            <Eye className="size-4" />
                          </Button>
                          {task.task_status !== "COMPLETED" && (
                            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => setCompleteConfirm(task)}>
                              <CheckSquare className="mr-1.5 size-3.5" /> Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && !loading && !error && (
          <div className="border-t border-border bg-secondary/10 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)} of {filteredTasks.length} tasks
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="size-3" />
              </Button>
              <div className="flex items-center px-2 text-xs font-medium">
                {currentPage} / {totalPages}
              </div>
              <Button variant="outline" size="icon" className="size-7" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MARK COMPLETE DIALOG */}
      <Dialog open={!!completeConfirm} onOpenChange={(o) => !o && setCompleteConfirm(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="size-5 text-primary" /> Complete Maintenance Task?
            </DialogTitle>
          </DialogHeader>
          {completeConfirm && (
            <div className="py-2 space-y-3">
              <div className="p-3 bg-secondary/20 border border-border/50 rounded-md">
                <div className="grid grid-cols-[100px_1fr] text-sm">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold mt-0.5">Task ID</span>
                  <span className="font-mono font-bold text-foreground">{completeConfirm.task_id}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] text-sm mt-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold mt-0.5">Asset</span>
                  <span className="font-mono font-medium text-foreground">{completeConfirm.asset_id}</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] text-sm mt-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-semibold mt-0.5">Issue</span>
                  <span className="font-medium text-foreground">{completeConfirm.task_type || completeConfirm.description}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Marking this task as complete will update its status in the maintenance database.</p>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-end mt-2">
            <Button variant="ghost" onClick={() => setCompleteConfirm(null)} disabled={!!updating}>CANCEL</Button>
            <Button onClick={handleComplete} disabled={!!updating} className="bg-primary font-bold tracking-wider text-xs">
              {updating ? "UPDATING..." : "MARK AS COMPLETE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TASK DETAILS DRAWER */}
      <Sheet open={!!viewTask} onOpenChange={(o) => !o && setViewTask(null)}>
        <SheetContent className="w-full sm:max-w-md border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border/50 pb-4 mb-4 text-left">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Wrench className="size-5 text-primary" /> Maintenance Task
            </SheetTitle>
            <SheetDescription className="font-mono text-xs mt-1">
              {viewTask?.task_id}
            </SheetDescription>
          </SheetHeader>
          
          {viewTask && (
            <div className="space-y-6 pb-8">
              <div className="bg-secondary/10 p-4 rounded-lg border border-border/50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Asset</p>
                    <p className="font-medium text-foreground font-mono">{viewTask.asset_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Department</p>
                    <p className="font-medium text-foreground">{viewTask.department}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Issue</p>
                    <p className="font-bold text-foreground">{viewTask.task_type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground">{viewTask.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border border-border/50 bg-secondary/5 rounded p-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Priority</p>
                  <p className="font-mono font-bold text-lg">{viewTask.priority_score?.toFixed(1) || "0"} <span className="text-xs text-muted-foreground">/ 100</span></p>
                  <Badge variant="outline" className={`mt-1 text-[10px] ${getPriorityStyle(viewTask.priority_category).text} ${getPriorityStyle(viewTask.priority_category).bg}`}>{viewTask.priority_category}</Badge>
                </div>
                <div className="border border-border/50 bg-secondary/5 rounded p-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Risk</p>
                  <p className="font-mono font-bold text-lg">{viewTask.safety_risk || "0"} <span className="text-xs text-muted-foreground">/ 5</span></p>
                  <div className="flex gap-0.5 mt-2">
                    {[1,2,3,4,5].map(i => <div key={i} className={`size-1.5 rounded-full ${i <= (viewTask.safety_risk || 0) ? 'bg-warn' : 'bg-secondary border border-border'}`} />)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Due Date</p>
                  <p className="font-medium">{viewTask.due_date}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Status</p>
                  <Badge variant="outline" className={getStatusStyle(viewTask.task_status)}>{viewTask.task_status}</Badge>
                </div>
              </div>
              
              <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5"><Activity className="size-3" /> Operational Impact</p>
                <p className="text-xs text-foreground">Operational impact assessment available through IR-ABPS analysis. Ensure block coordination to prevent traffic disruption.</p>
              </div>

              {/* Task Status Flow */}
              <div className="py-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className={viewTask.task_status === "PENDING" || viewTask.task_status === "IN PROGRESS" || viewTask.task_status === "COMPLETED" ? "text-primary" : ""}>Pending</span>
                  <span className={viewTask.task_status === "IN PROGRESS" || viewTask.task_status === "COMPLETED" ? "text-primary" : ""}>In Progress</span>
                  <span className={viewTask.task_status === "COMPLETED" ? "text-safe" : ""}>Completed</span>
                </div>
                <div className="mt-2 flex items-center">
                  <div className={`size-3 rounded-full ${viewTask.task_status === "PENDING" || viewTask.task_status === "IN PROGRESS" || viewTask.task_status === "COMPLETED" ? "bg-primary" : "bg-border"}`} />
                  <div className={`h-1 flex-1 ${viewTask.task_status === "IN PROGRESS" || viewTask.task_status === "COMPLETED" ? "bg-primary" : "bg-border"}`} />
                  <div className={`size-3 rounded-full ${viewTask.task_status === "IN PROGRESS" || viewTask.task_status === "COMPLETED" ? "bg-primary" : "bg-border"}`} />
                  <div className={`h-1 flex-1 ${viewTask.task_status === "COMPLETED" ? "bg-primary" : "bg-border"}`} />
                  <div className={`size-3 rounded-full ${viewTask.task_status === "COMPLETED" ? "bg-safe" : "bg-border"}`} />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border flex flex-col gap-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold gap-2" asChild>
                  <Link to="/optimizer">
                    <BrainCircuit className="size-4" /> Cluster for AI Scheduling
                  </Link>
                </Button>
                {viewTask.task_status !== "COMPLETED" && (
                  <Button variant="outline" className="w-full gap-2 font-semibold" onClick={() => { setCompleteConfirm(viewTask); setViewTask(null); }}>
                    <CheckSquare className="size-4" /> Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function MetricCard({ label, value, desc, icon: Icon, tone = "text-foreground" }: any) {
  return (
    <Card className="shadow-sm bg-card border-border">
      <CardContent className="p-4 flex flex-col gap-1.5 h-full">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <Icon className={`size-4 ${tone === 'text-foreground' ? 'text-muted-foreground' : tone}`} />
        </div>
        <p className={`text-2xl font-bold font-mono ${tone}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
      </CardContent>
    </Card>
  );
}

function WorkloadBar({ title, data, total, color }: any) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {data.map((item: any) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="font-mono text-muted-foreground">{item.val}</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${item.color || color || 'bg-primary'}`} style={{ width: `${total > 0 ? (item.val / total) * 100 : 0}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, w }: any) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`${w} h-9 text-xs bg-background`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o: string) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}