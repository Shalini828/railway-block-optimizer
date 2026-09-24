import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { apiFetch } from "@/lib/api";
import {
  ArrowRight,
  Filter,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  BrainCircuit,
  Wrench,
  Activity,
  Search,
  CalendarClock,
  LayoutList,
  CheckSquare,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useLanguage } from "@/context/LanguageContext";
import { useAbps } from "@/context/AbpsContext";

export const Route = createFileRoute("/maintenance-tasks")({
  head: () => ({
    meta: [
      { title: "Asset Maintenance Ledger & Field Work Register | IR-ABPS" },
      {
        name: "description",
        content:
          "Official Indian Railways departmental asset maintenance ledger across Track, Signalling, and Traction Distribution.",
      },
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
  const { t } = useLanguage();
  const { role, scope, can } = useAbps();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const initialDept = scope === "department" ? role.dept : "All";
  const [deptFilter, setDeptFilter] = useState(initialDept);
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
    apiFetch("/maintenance-tasks/")
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
      case "CRITICAL":
        return {
          text: "text-[#800000]",
          bg: "bg-[#800000]/10",
          border: "border-[#800000]/30",
          bar: "bg-[#800000]",
        };
      case "HIGH":
        return {
          text: "text-[#D97706]",
          bg: "bg-[#D97706]/10",
          border: "border-[#D97706]/30",
          bar: "bg-[#D97706]",
        };
      case "MEDIUM":
        return {
          text: "text-[#003366]",
          bg: "bg-[#003366]/10",
          border: "border-[#003366]/30",
          bar: "bg-[#003366]",
        };
      case "LOW":
        return {
          text: "text-[#137547]",
          bg: "bg-[#137547]/10",
          border: "border-[#137547]/30",
          bar: "bg-[#137547]",
        };
      default:
        return {
          text: "text-slate-700",
          bg: "bg-slate-100",
          border: "border-slate-300",
          bar: "bg-slate-500",
        };
    }
  };

  const getStatusStyle = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "bg-sky-50 text-[#003366] border-sky-300";
      case "IN PROGRESS":
        return "bg-amber-50 text-[#B45309] border-amber-300";
      case "COMPLETED":
        return "bg-emerald-50 text-[#137547] border-emerald-300";
      case "OVERDUE":
        return "bg-red-50 text-[#800000] border-red-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  // Derived metrics
  const criticalCount = tasks.filter(
    (t) => t.priority_category?.toUpperCase() === "CRITICAL",
  ).length;
  const overdueCount = tasks.filter(
    (t) => (t.overdue_days ?? 0) > 0 && t.task_status !== "COMPLETED",
  ).length;
  const dueSoonCount = tasks.filter((t) => {
  if (!t.due_date || t.task_status === "COMPLETED") return false;

  const today = new Date();
  const dueDate = new Date(t.due_date);

  const diffDays = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return diffDays >= 0 && diffDays <= 7;
}).length;
  const completedCount = tasks.filter((t) => t.task_status === "COMPLETED").length;

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const matchSearch =
          !search ||
          t.task_id.toLowerCase().includes(search.toLowerCase()) ||
          (t.asset_id && t.asset_id.toLowerCase().includes(search.toLowerCase())) ||
          (t.task_type && t.task_type.toLowerCase().includes(search.toLowerCase()));

        const matchDept = deptFilter === "All" || t.department === deptFilter;
        const matchPri =
          priorityFilter === "All" ||
          t.priority_category?.toUpperCase() === priorityFilter.toUpperCase();
        const matchStatus =
          statusFilter === "All" || t.task_status?.toUpperCase() === statusFilter.toUpperCase();
        const matchRisk =
          riskFilter === "All" || t.safety_risk?.toString() === riskFilter.split("/")[0];

        let matchDue = true;
        if (dueFilter === "Overdue")
          matchDue = (t.overdue_days ?? 0) > 0 && t.task_status !== "COMPLETED";

        return matchSearch && matchDept && matchPri && matchStatus && matchRisk && matchDue;
      })
      .sort((a, b) => {
        if (viewMode === "Priority") {
          return (b.priority_score ?? 0) - (a.priority_score ?? 0);
        }
        return 0;
      });
  }, [tasks, search, deptFilter, priorityFilter, statusFilter, riskFilter, dueFilter, viewMode]);

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE) || 1;
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const depts = Array.from(new Set(tasks.map((t) => t.department).filter(Boolean)));

  const handleComplete = async () => {
    if (!completeConfirm) return;
    const taskId = completeConfirm.task_id;
    setUpdating(taskId);
    setCompleteConfirm(null);

    try {
      const res = await apiFetch(`/maintenance-tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_status: "COMPLETED" }),
      });

      if (!res.ok) throw new Error("Failed to update task");

      setTasks((prev) =>
        prev.map((t) => (t.task_id === taskId ? { ...t, task_status: "COMPLETED" } : t)),
      );
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-[#137547]" />
          Maintenance task marked as completed in asset register.
        </div>,
      );
      if (viewTask?.task_id === taskId) {
        setViewTask({ ...viewTask, task_status: "COMPLETED" });
      }
    } catch (err) {
      console.error("Task update error:", err);
      toast.error("Could not update task status in asset register.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* OFFICIAL GOVT BANNER */}
      <div className="rounded-[2px] border border-[#003366]/30 bg-white shadow-sm overflow-hidden">
        <div className="bg-[#003366] px-5 py-3 text-white flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#FF9933]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-[2px] bg-white/10 border border-white/20">
              <FileSpreadsheet className="size-5 text-[#FF9933]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF9933] bg-black/30 px-2 py-0.5 rounded-[2px]">
                  FORM IR-ASSET-REG-2025
                </span>
                <span className="text-xs text-white/80 font-serif">
                  {t("RAILWAY BOARD • ASSET MAINTENANCE REGISTER", "रेलवे बोर्ड • परिसंपत्ति अनुरक्षण पंजिका")}
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-bold font-serif tracking-tight text-white mt-0.5">
                {t("Departmental Asset Maintenance Ledger & Field Work Register", "विभागीय परिसंपत्ति अनुरक्षण खाता एवं कार्य पंजिका")}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              className="bg-[#FF9933] hover:bg-[#e68524] text-slate-950 font-bold text-xs uppercase tracking-wider rounded-[2px] h-9 px-4 shadow-sm"
            >
              <Link to="/optimizer">
                <BrainCircuit className="size-3.5 mr-1.5" />
                AI Cluster Engine <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <p>
            Centralized inventory of defect logs, scheduled overhauls, and urgent field maintenance requirements across{" "}
            <strong>Track (TMS)</strong>, <strong>Signalling (SMMS)</strong>, and{" "}
            <strong>Traction Distribution (TDMS)</strong>.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-[#003366]">
            <Building2 className="size-3.5 text-[#003366]" />
            DIVISION: NR-DLI • SECTION: NDLS-PRYJ-DDU
          </div>
        </div>
      </div>

      {/* EXECUTIVE STATUS STRIP */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="TOTAL REGISTERED"
          value={tasks.length}
          desc="Active database records"
          icon={LayoutList}
          borderColor="border-slate-300"
          tone="text-[#003366]"
        />
        <MetricCard
          label="CRITICAL DEFECTS"
          value={criticalCount}
          desc="Immediate corridor hazard"
          icon={AlertTriangle}
          borderColor="border-[#800000]/40"
          tone="text-[#800000]"
          bg="bg-[#800000]/5"
        />
        <MetricCard
          label="OVERDUE WORK"
          value={overdueCount}
          desc="Past compliance deadline"
          icon={Clock}
          borderColor="border-[#D97706]/40"
          tone="text-[#D97706]"
          bg="bg-[#D97706]/5"
        />
        <MetricCard
          label="SCHEDULED SOON"
          value={dueSoonCount}
          desc="Due within 7 days"
          icon={CalendarClock}
          borderColor="border-sky-300"
          tone="text-[#003366]"
        />
        <MetricCard
          label="COMPLETED (CY)"
          value={completedCount}
          desc="Certified by Section In-Charge"
          icon={CheckCircle2}
          borderColor="border-[#137547]/40"
          tone="text-[#137547]"
          bg="bg-[#137547]/5"
        />
      </div>

      {/* AI PRIORITY BANNER & SMART RECOMMENDATION */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[2px] border border-[#003366]/30 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-[2px] bg-[#003366]/10 text-[#003366] shrink-0 border border-[#003366]/20">
              <BrainCircuit className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#003366] bg-[#003366]/10 px-2 py-0.5 rounded-[2px] border border-[#003366]/20">
                  AI CLUSTERING ADVISORY
                </span>
                <span className="text-[11px] text-slate-500 font-mono">CRIS IR-ABPS-M1</span>
              </div>
              <p className="text-xs text-slate-800 mt-1 leading-relaxed">
  <strong>{criticalCount} critical safety defects</strong> and{" "}
  <strong>{overdueCount} overdue maintenance items</strong> detected in the active register.
  {scope === "department" && role.dept === "TMS"
    ? " AI identifies compatible Track maintenance activities for consolidated block planning."
    : scope === "department" && role.dept === "SMMS"
      ? " AI identifies compatible Signalling and S&T maintenance activities for consolidated block planning."
      : scope === "department" && role.dept === "TDMS"
        ? " AI identifies compatible Traction Distribution maintenance activities for consolidated block planning."
        : " AI identifies compatible maintenance activities across departments for consolidated block planning."}
</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white shrink-0 text-xs font-bold uppercase rounded-[2px] h-8 px-4"
            onClick={() => {
              setViewMode("Priority");
              setPriorityFilter("CRITICAL");
            }}
          >
            Filter Critical ({criticalCount})
          </Button>
        </div>

        <div className="rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[#003366]" /> Safety Audit Ledger
            </span>
            <span className="text-[10px] text-[#137547] font-bold">ACTIVE</span>
          </div>
          <div className="p-3 space-y-2 text-xs">
            {overdueCount > 0 && (
              <p className="font-semibold text-[#800000] flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0" /> {overdueCount} maintenance jobs exceed target window.
              </p>
            )}
            <p className="text-slate-700 flex items-center gap-1.5">
              <Layers className="size-3.5 text-[#003366] shrink-0" /> Joint-block cluster potential: <strong>High</strong>
            </p>
            {tasks.length > 0 && tasks.find((t) => (t.priority_score ?? 0) >= 90) && (
  <p className="text-slate-600 flex items-center gap-1.5 text-[11px]">
    <ShieldAlert className="size-3 text-[#800000] shrink-0" />
    {scope === "department" && role.dept === "TMS"
      ? "High-priority Track maintenance requires Section Controller review."
      : scope === "department" && role.dept === "SMMS"
        ? "High-priority Signalling maintenance requires Section Controller review."
        : scope === "department" && role.dept === "TDMS"
          ? "High-priority Traction maintenance requires Section Controller review."
          : "High-priority maintenance requires Section Controller review."}
  </p>
)}
          </div>
        </div>
      </div>

      {/* WORKLOAD OVERVIEW */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2px] border border-slate-300 bg-white p-4 shadow-sm">
          <WorkloadBar
            title="DEPARTMENTAL REQUISITION LOAD"
            data={depts.map((d) => ({
              label: d,
              val: tasks.filter((t) => t.department === d).length,
            }))}
            total={tasks.length}
            color="bg-[#003366]"
          />
        </div>
        <div className="rounded-[2px] border border-slate-300 bg-white p-4 shadow-sm">
          <WorkloadBar
            title="SAFETY RISK CLASSIFICATION"
            data={[
              { label: "Critical", val: criticalCount, color: "bg-[#800000]" },
              {
                label: "High",
                val: tasks.filter((t) => t.priority_category?.toUpperCase() === "HIGH").length,
                color: "bg-[#D97706]",
              },
              {
                label: "Medium",
                val: tasks.filter((t) => t.priority_category?.toUpperCase() === "MEDIUM").length,
                color: "bg-[#003366]",
              },
              {
                label: "Low",
                val: tasks.filter((t) => t.priority_category?.toUpperCase() === "LOW").length,
                color: "bg-[#137547]",
              },
            ]}
            total={tasks.length}
          />
        </div>
        <div className="rounded-[2px] border border-slate-300 bg-white p-4 shadow-sm">
          <WorkloadBar
            title="EXECUTION LIFECYCLE STATUS"
            data={[
              {
                label: "Pending",
                val: tasks.filter((t) => t.task_status === "PENDING").length,
                color: "bg-sky-600",
              },
              { label: "Completed", val: completedCount, color: "bg-[#137547]" },
              { label: "Overdue", val: overdueCount, color: "bg-[#800000]" },
            ]}
            total={tasks.length}
          />
        </div>
      </div>

      {/* FILTER BAR & TOGGLE */}
      <div className="rounded-[2px] border border-slate-300 bg-slate-100 p-3 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex bg-white p-0.5 rounded-[2px] border border-slate-300">
          <button
            className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
              viewMode === "Priority"
                ? "bg-[#003366] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setViewMode("Priority")}
          >
            AI Priority Rank
          </button>
          <button
            className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
              viewMode === "All"
                ? "bg-[#003366] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setViewMode("All")}
          >
            All Registered Tasks
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              className="w-[180px] pl-8 h-8 text-xs bg-white rounded-[2px] border-slate-300 focus:border-[#003366]"
              placeholder="Search Task/Asset ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterSelect
            value={scope === "department" ? role.dept : deptFilter}
            onChange={setDeptFilter}
            options={scope === "department" ? [role.dept] : ["All", ...depts]}
            disabled={scope === "department"}
            w="w-[120px]"
          />
          <FilterSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={["All", "Critical", "High", "Medium", "Low"]}
            w="w-[110px]"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={["All", "Pending", "In Progress", "Completed"]}
            w="w-[120px]"
          />
          <FilterSelect
            value={riskFilter}
            onChange={setRiskFilter}
            options={["All", "1/5", "2/5", "3/5", "4/5", "5/5"]}
            w="w-[90px]"
          />
          <FilterSelect
            value={dueFilter}
            onChange={setDueFilter}
            options={["All", "Overdue", "Today", "Later"]}
            w="w-[100px]"
          />

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs rounded-[2px] border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            onClick={resetFilters}
          >
            <Filter className="mr-1.5 size-3" /> Reset
          </Button>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#003366]">
              REGISTER OF MAINTENANCE WORK ORDERS
            </span>
            <span className="text-[11px] text-slate-500">
              ({filteredTasks.length} record{filteredTasks.length !== 1 ? "s" : ""} matching criteria)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            UPDATED: {new Date().toLocaleDateString("en-IN")}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#003366] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 border-r border-[#002244] w-[110px]">Priority Score</th>
                <th className="px-4 py-3 border-r border-[#002244]">Task ID & Asset Details</th>
                <th className="px-4 py-3 border-r border-[#002244] w-[100px]">Department</th>
                <th className="px-4 py-3 border-r border-[#002244] w-[120px]">Due Date</th>
                <th className="px-4 py-3 border-r border-[#002244] w-[100px]">Safety Risk</th>
                <th className="px-4 py-3 border-r border-[#002244] w-[110px]">Status</th>
                <th className="px-4 py-3 text-right w-[140px]">Officer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-slate-50">
                    <td className="px-4 py-3"><div className="h-6 w-16 bg-slate-200 rounded-[2px]" /></td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 bg-slate-200 rounded-[2px] mb-1.5" />
                      <div className="h-3 w-48 bg-slate-200 rounded-[2px]" />
                    </td>
                    <td className="px-4 py-3"><div className="h-5 w-12 bg-slate-200 rounded-[2px]" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-200 rounded-[2px]" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-slate-200 rounded-[2px]" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-slate-200 rounded-[2px]" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-7 w-16 bg-slate-200 rounded-[2px] ml-auto" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                      <AlertTriangle className="size-8 text-[#800000]" />
                      <p className="font-bold text-slate-800 text-sm">
                        Unable to load maintenance records from PostgreSQL database.
                      </p>
                      <p className="text-xs text-slate-500">
                        Check backend connection on <code>http://127.0.0.1:8000</code>.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTasks}
                        className="mt-2 rounded-[2px] border-slate-300 text-xs"
                      >
                        <RefreshCw className="mr-1.5 size-3" /> Retry Retrieval
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Search className="size-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-bold text-slate-700">No maintenance records found matching active filters.</p>
                    <p className="text-xs mt-1">Try resetting the department or status filters.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="mt-3 rounded-[2px] border-slate-300 text-xs"
                    >
                      Reset All Filters
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task, idx) => {
                  const pStyle = getPriorityStyle(task.priority_category);
                  const isOverdue =
                    (task.overdue_days ?? 0) > 0 && task.task_status !== "COMPLETED";

                  return (
                    <tr
                      key={task.task_id}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                      }`}
                    >
                      {/* Priority */}
                      <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-base font-bold text-slate-900">
                              {task.priority_score?.toFixed(1) ?? "0"}
                            </span>
                            <span className={`text-[9px] font-bold tracking-wider uppercase ${pStyle.text}`}>
                              {task.priority_category ?? "UNKNOWN"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-[1px] overflow-hidden mt-1 border border-slate-300">
                            <div
                              className={`h-full ${pStyle.bar}`}
                              style={{ width: `${task.priority_score ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Task & Asset */}
                      <td className="px-4 py-3 border-r border-slate-200 max-w-[280px]">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-bold text-slate-900 text-xs uppercase truncate">
                            {task.task_type || "Maintenance Work Order"}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate" title={task.description || ""}>
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 rounded-[2px] bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-800 border border-slate-300">
                              <Wrench className="size-2.5 text-[#003366]" /> {task.asset_id ?? "N/A"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              REF: {task.task_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Dept */}
                      <td className="px-4 py-3 border-r border-slate-200">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold tracking-wider border-slate-300 bg-white text-slate-800 rounded-[2px]"
                        >
                          {task.department}
                        </Badge>
                      </td>

                      {/* Due */}
                      <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-medium text-slate-800">{task.due_date ?? "—"}</span>
                          {isOverdue && (
                            <Badge
                              variant="outline"
                              className="w-fit text-[9px] uppercase font-bold tracking-wider border-[#800000]/40 text-[#800000] bg-red-50 rounded-[2px] gap-1 px-1 py-0"
                            >
                              <AlertTriangle className="size-2.5" /> OVERDUE {task.overdue_days}d
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Risk */}
                      <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`size-2 rounded-[1px] ${
                                  i <= (task.safety_risk ?? 0)
                                    ? task.safety_risk && task.safety_risk >= 4
                                      ? "bg-[#800000]"
                                      : task.safety_risk === 3
                                        ? "bg-[#D97706]"
                                        : "bg-[#003366]"
                                    : "bg-slate-200 border border-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold uppercase text-slate-600 font-mono">
                            {task.safety_risk}/5 Severity
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 border-r border-slate-200">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold uppercase tracking-wider rounded-[2px] ${getStatusStyle(
                            task.task_status,
                          )}`}
                        >
                          {task.task_status ?? "UNKNOWN"}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-bold text-[#003366] border-slate-300 bg-white hover:bg-slate-100 rounded-[2px]"
                            onClick={() => setViewTask(task)}
                            title="View Docket"
                          >
                            <Eye className="size-3 mr-1" /> View
                          </Button>
                          {task.task_status !== "COMPLETED" && can("tasks.update") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-bold text-[#137547] border-emerald-400 bg-emerald-50 hover:bg-emerald-100 rounded-[2px]"
                              onClick={() => setCompleteConfirm(task)}
                            >
                              <CheckSquare className="size-3 mr-1" /> Certify
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
          <div className="border-t border-slate-300 bg-slate-50 px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{" "}
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)}</strong> of{" "}
              <strong>{filteredTasks.length}</strong> official tasks
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs rounded-[2px] border-slate-300 bg-white"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-3 mr-1" /> Previous
              </Button>
              <div className="px-2 font-mono font-bold text-slate-800">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs rounded-[2px] border-slate-300 bg-white"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="size-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MARK COMPLETE DIALOG */}
      <Dialog open={!!completeConfirm} onOpenChange={(o) => !o && setCompleteConfirm(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-[#003366]/30 rounded-[2px] p-0 overflow-hidden shadow-lg">
          <div className="bg-[#003366] text-white px-4 py-3 flex items-center gap-2 border-b-2 border-[#FF9933]">
            <CheckSquare className="size-4 text-[#FF9933]" />
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-white">
              Certify Maintenance Work Completion
            </DialogTitle>
          </div>
          {completeConfirm && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                You are about to record official completion certification in the Indian Railways database:
              </p>
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-[2px] space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">TASK ID:</span>
                  <span className="font-bold text-[#003366]">{completeConfirm.task_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ASSET ID:</span>
                  <span className="font-bold text-slate-800">{completeConfirm.asset_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">WORK TYPE:</span>
                  <span className="font-bold text-slate-800">{completeConfirm.task_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DEPARTMENT:</span>
                  <span className="font-bold text-slate-800">{completeConfirm.department}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Certification will close this work order and update the asset availability status in the IR-ABPS intelligence engine.
              </p>
            </div>
          )}
          <DialogFooter className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[2px] border-slate-300 text-xs"
              onClick={() => setCompleteConfirm(null)}
              disabled={!!updating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={!!updating}
              className="bg-[#137547] hover:bg-[#0f5c37] text-white font-bold text-xs uppercase tracking-wider rounded-[2px]"
            >
              {updating ? "Saving to Database..." : "Confirm Completion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TASK DETAILS DRAWER */}
      <Sheet open={!!viewTask} onOpenChange={(o) => !o && setViewTask(null)}>
        <SheetContent className="w-full sm:max-w-md border-l border-[#003366]/30 bg-white p-0 overflow-y-auto">
          <div className="bg-[#003366] text-white p-4 border-b-2 border-[#FF9933]">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#FF9933]">
              <Wrench className="size-3.5" />
              OFFICIAL ASSET WORK DOCKET
            </div>
            <SheetTitle className="text-base font-bold text-white mt-1">
              Task Reference: {viewTask?.task_id}
            </SheetTitle>
            <SheetDescription className="text-xs text-white/80 font-mono mt-0.5">
              Asset: {viewTask?.asset_id} • Dept: {viewTask?.department}
            </SheetDescription>
          </div>

          {viewTask && (
            <div className="p-5 space-y-5">
              <div className="bg-slate-50 p-3.5 rounded-[2px] border border-slate-300 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Asset Ref</span>
                    <p className="font-mono font-bold text-slate-900">{viewTask.asset_id}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Department</span>
                    <p className="font-bold text-slate-900">{viewTask.department}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Work Scope</span>
                    <p className="font-bold text-[#003366] text-sm">{viewTask.task_type}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Technical Description</span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{viewTask.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="border border-slate-300 bg-white rounded-[2px] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500">AI Priority Score</span>
                  <p className="font-mono font-bold text-xl text-slate-900 mt-1">
                    {viewTask.priority_score?.toFixed(1) || "0"}{" "}
                    <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </p>
                  <Badge
                    variant="outline"
                    className={`mt-1.5 text-[9px] font-bold uppercase rounded-[2px] ${getPriorityStyle(viewTask.priority_category).text} ${getPriorityStyle(viewTask.priority_category).bg}`}
                  >
                    {viewTask.priority_category}
                  </Badge>
                </div>
                <div className="border border-slate-300 bg-white rounded-[2px] p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Safety Hazard Index</span>
                  <p className="font-mono font-bold text-xl text-slate-900 mt-1">
                    {viewTask.safety_risk || "0"}{" "}
                    <span className="text-xs text-slate-400 font-normal">/ 5</span>
                  </p>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`size-2 rounded-[1px] ${
                          i <= (viewTask.safety_risk || 0)
                            ? "bg-[#800000]"
                            : "bg-slate-200 border border-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border border-slate-300 bg-slate-50 p-3 rounded-[2px]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Target Due Date</span>
                  <p className="font-mono font-bold text-slate-800">{viewTask.due_date}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Current Status</span>
                  <div className="mt-0.5">
                    <Badge variant="outline" className={`text-[9px] font-bold uppercase rounded-[2px] ${getStatusStyle(viewTask.task_status)}`}>
                      {viewTask.task_status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-300 rounded-[2px] text-xs space-y-1">
                <p className="font-bold text-[#003366] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Activity className="size-3 text-[#003366]" /> Corridor Block Coordination Advisory
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Asset requires physical line access. Schedule via the AI Optimizer module to combine with parallel works in the same section.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs uppercase tracking-wider rounded-[2px] h-9 gap-2 shadow-sm"
                  asChild
                >
                  <Link to="/optimizer">
                    <BrainCircuit className="size-4 text-[#FF9933]" /> Cluster for AI Scheduling
                  </Link>
                </Button>
                {viewTask.task_status !== "COMPLETED" && can("tasks.update") && (
                  <Button
                    variant="outline"
                    className="w-full text-xs font-bold text-[#137547] border-emerald-400 bg-emerald-50 hover:bg-emerald-100 rounded-[2px] h-9 gap-1.5"
                    onClick={() => {
                      setCompleteConfirm(viewTask);
                      setViewTask(null);
                    }}
                  >
                    <CheckSquare className="size-4" /> Certify Completion
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetricCard({ label, value, desc, icon: Icon, tone = "text-slate-900", borderColor = "border-slate-300", bg = "bg-white" }: any) {
  return (
    <div className={`rounded-[2px] border ${borderColor} ${bg} p-3.5 shadow-sm flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <div>
        <p className={`text-2xl font-bold font-mono ${tone}`}>{value}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{desc}</p>
      </div>
    </div>
  );
}

function WorkloadBar({ title, data, total, color }: any) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#003366] border-b border-slate-200 pb-1">
        {title}
      </p>
      <div className="space-y-2">
        {data.map((item: any) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-800">{item.label}</span>
              <span className="font-mono font-bold text-slate-600">{item.val}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-[1px] overflow-hidden border border-slate-300">
              <div
                className={`h-full ${item.color || color || "bg-[#003366]"}`}
                style={{ width: `${total > 0 ? (item.val / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, w, disabled }: any) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`${w} h-8 text-xs bg-white rounded-[2px] border-slate-300 focus:border-[#003366] ${disabled ? "opacity-80 cursor-not-allowed bg-slate-100" : ""}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-[2px] border-slate-300">
        {options.map((o: string) => (
          <SelectItem key={o} value={o} className="text-xs">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
