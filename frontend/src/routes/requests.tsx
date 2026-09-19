import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Send,
  AlertTriangle,
  Box,
  Building2,
  ClipboardList,
  Search,
  SlidersHorizontal,
  CircleCheck,
  Sparkles,
  Brain,
  ArrowRight,
  Clock,
  CalendarClock,
  Zap,
  CheckCircle2,
  Server,
  Wrench,
  FileText,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, deptColor } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import {
  CORRIDORS,
  DEPT_LABEL,
  criticalityScore,
  fmt,
  DAYS,
  type Dept,
  type Requisition,
  type Status,
} from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BACKEND_CORRIDORS = [
  { id: "C02", name: "Delhi – Ghaziabad" },
  { id: "C03", name: "Ghaziabad – Meerut" },
  { id: "C04", name: "Delhi – Panipat" },
  { id: "C05", name: "Panipat – Ambala" },
  { id: "C06", name: "Mumbai – Thane" },
  { id: "C07", name: "Thane – Nashik" },
  { id: "C08", name: "Chennai – Arakkonam" },
  { id: "C09", name: "Kolkata – Howrah" },
  { id: "C10", name: "Bhopal – Itarsi" },
  { id: "C11", name: "Pune – Lonavala" },
];

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Block Requisition Portal | IR-ABPS" },
      {
        name: "description",
        content:
          "Submit and track track, signalling and traction block requisitions across TMS, SMMS and TDMS in one unified departmental ledger.",
      },
      { property: "og:title", content: "Block Requisition Portal | IR-ABPS" },
      {
        property: "og:description",
        content: "Unified multi-department block requisition ingestion for Indian Railways.",
      },
    ],
  }),
  component: RequestsPage,
});

const STATUSES: (Status | "All")[] = [
  "All",
  "Pending AI Scheduling",
  "Clustered / Shadowed",
  "Approved",
  "Active",
  "Completed",
];

function RequestsPage() {
  const { reqs, addReq, role } = useAbps();
  const defaultDept: Dept = role.dept === "COA" ? "TMS" : role.dept;

  const [dept, setDept] = useState<Dept>(defaultDept);
  const [assetId, setAssetId] = useState("TRK-ENG-1200");
  const [work, setWork] = useState("");
  const [section, setSection] = useState("C02");
  const [line, setLine] = useState("Down Main");
  const [chainage, setChainage] = useState("KM 412/10 - 414/05");
  const [blockType, setBlockType] = useState<Requisition["blockType"]>("Traffic Block");
  const [duration, setDuration] = useState("3");
  const [crew, setCrew] = useState("16");
  const [criticality, setCriticality] = useState<Requisition["criticality"]>("High");
  const [overdue, setOverdue] = useState("4");
  const [tsr, setTsr] = useState(true);

  const [tab, setTab] = useState<Dept | "ALL">("ALL");
  const [status, setStatus] = useState<Status | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [detail, setDetail] = useState<Requisition | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return reqs.filter((r) => {
      const matchTab = tab === "ALL" || r.dept === tab;
      const matchStatus = status === "All" || r.status === status;
      const matchSearch =
        !searchQuery ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.section.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchStatus && matchSearch;
    });
  }, [reqs, tab, status, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: reqs.length,
      pending: reqs.filter((r) => r.status === "Pending AI Scheduling").length,
      active: reqs.filter((r) => r.status === "Active").length,
      completed: reqs.filter((r) => r.status === "Completed").length,
    };
  }, [reqs]);

  const insights = useMemo(() => {
    const sortedByScore = [...reqs].sort(
      (a, b) => (b.score ?? criticalityScore(b)) - (a.score ?? criticalityScore(a)),
    );
    const sortedByOverdue = [...reqs].sort((a, b) => b.daysOverdue - a.daysOverdue);
    const sortedByDuration = [...reqs].sort((a, b) => b.duration - a.duration);

    return {
      highestPriority: sortedByScore[0] ?? null,
      mostOverdue: sortedByOverdue[0] ?? null,
      longestBlock: sortedByDuration[0] ?? null,
      activeWork: reqs.find((r) => r.status === "Active") ?? null,
    };
  }, [reqs]);

  const submit = async () => {
    if (!work.trim()) {
      toast.error("Please enter nature of work / task description");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      dept,
      assetId,
      work,
      section,
      line,
      chainage,
      blockType,
      duration: Number(duration) || 1,
      crew: Number(crew) || 1,
      criticality,
      daysOverdue: Number(overdue) || 0,
      tsrRisk: tsr,
      requestedBy: role.name,
    };

    try {
      // 1. Create requisition in PostgreSQL
      const requestResponse = await apiFetch("/block-requests/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const requestData = await requestResponse.json();

      if (!requestResponse.ok) {
        throw new Error(requestData.detail || "Failed to submit requisition");
      }

      console.log("Requisition created:", requestData);

      // Keep frontend requisition ledger in sync
      addReq(payload);

      // 2. Immediately run IR-ABPS optimization
      const optimizationResponse = await apiFetch("/optimization/", {
        method: "POST",
      });

      const optimizationData = await optimizationResponse.json();

      if (!optimizationResponse.ok) {
        throw new Error(
          optimizationData.detail || optimizationData.message || "Optimization failed",
        );
      }

      console.log("Optimization completed:", optimizationData);

      if (
        optimizationData.status !== "success" ||
        !optimizationData.blocks ||
        optimizationData.blocks.length === 0
      ) {
        throw new Error("Requisition was submitted, but no optimized block was generated.");
      }

      setWork("");

      toast.success(
        <div className="flex items-center gap-2">
          <CircleCheck className="size-4 text-emerald-600" />
          <span>Requisition filed & optimized successfully into Gantt schedule</span>
        </div>,
      );

      setTimeout(() => {
        window.location.href = "/planner";
      }, 700);
    } catch (error) {
      console.error("Requisition/optimization error:", error);
      toast.error(error instanceof Error ? error.message : "Could not complete requisition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentScore = criticalityScore({
    criticality,
    daysOverdue: Number(overdue) || 0,
    tsrRisk: tsr,
    blockType,
  } as Requisition);

  let scoreColor = "text-emerald-700 dark:text-emerald-400";
  let scoreBg = "bg-emerald-100 text-emerald-900 border border-emerald-300";
  let scoreLabel = "LOW PRIORITY";
  if (currentScore > 40) {
    scoreColor = "text-blue-700 dark:text-blue-400";
    scoreBg = "bg-blue-100 text-blue-900 border border-blue-300";
    scoreLabel = "MEDIUM PRIORITY";
  }
  if (currentScore > 65) {
    scoreColor = "text-amber-700 dark:text-amber-400";
    scoreBg = "bg-amber-100 text-amber-900 border border-amber-300";
    scoreLabel = "HIGH PRIORITY";
  }
  if (currentScore > 85) {
    scoreColor = "text-red-700 dark:text-red-400";
    scoreBg = "bg-red-100 text-red-900 border border-red-300 font-bold";
    scoreLabel = "CRITICAL / SAFETY";
  }

  const getDeptStyle = (d: Dept) => {
    switch (d) {
      case "TMS":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "SMMS":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "TDMS":
        return "bg-blue-100 text-blue-900 border-blue-300";
      default:
        return "bg-purple-100 text-purple-900 border-purple-300";
    }
  };

  const getStatusStyle = (s: Status) => {
    switch (s) {
      case "Pending AI Scheduling":
        return "bg-purple-100 text-purple-900 border-purple-300";
      case "Clustered / Shadowed":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "Approved":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold";
      case "Active":
        return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
      case "Completed":
        return "bg-slate-100 text-slate-900 border-slate-300";
    }
  };

  return (
    <>
      <PageHeader
        title="Departmental Block Requisition Portal (BDMS Ingestion)"
        subtitle="Official filing register for Civil Track (TMS), Signal & Telecom (SMMS), and Electrical Traction (TDMS) maintenance demands."
        action={
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-border px-3 py-1 text-xs">
            <Server className="size-3.5 text-emerald-600" />
            <span className="font-bold text-slate-700 dark:text-slate-300">BDMS Gateway:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">ONLINE</span>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Demands</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{stats.total}</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">Pending AI Scheduling</p>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-0.5">{stats.pending}</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Active Execution</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{stats.active}</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Completed & Closed</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.completed}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr]">
        {/* LEFT PANEL: FORM IR-REQ-2024 */}
        <div className="space-y-4">
          <Card className="border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
            <div className="bg-[#003366] p-3 text-white border-b-2 border-[#FF9933] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider">Form IR-REQ-2024</h2>
                <p className="text-[10px] text-slate-300">Electronic Maintenance Demand Filing</p>
              </div>
              <span className="bg-[#FF9933] text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase">
                Official
              </span>
            </div>

            <CardContent className="space-y-3.5 p-4 text-xs">
              <div className="grid gap-1">
                <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                  Originating Department <span className="text-destructive">*</span>
                </Label>
                <Select value={dept} onValueChange={(v) => setDept(v as Dept)}>
                  <SelectTrigger className="h-8 rounded-[2px] text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2px]">
                    {(Object.keys(DEPT_LABEL) as Dept[]).map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          {DEPT_LABEL[d]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Asset / Equipment Tag <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] font-mono text-slate-500">TMS/SMMS/TDMS Tag</span>
                </div>
                <Input
                  className="h-8 font-mono text-xs rounded-[2px] bg-background"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                  Nature of Maintenance Work <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="h-8 text-xs rounded-[2px] bg-background"
                  value={work}
                  placeholder="e.g. USFD Class IMR Flaw Rectification / Point Overhaul"
                  onChange={(e) => setWork(e.target.value)}
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                  Railway Section <span className="text-destructive">*</span>
                </Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger className="h-8 rounded-[2px] text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2px]">
                    {BACKEND_CORRIDORS.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name} ({c.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Track Line
                  </Label>
                  <Select value={line} onValueChange={setLine}>
                    <SelectTrigger className="h-8 rounded-[2px] text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2px]">
                      {["Up Main", "Down Main", "Line 3 Up", "Freight Loop"].map((l) => (
                        <SelectItem key={l} value={l} className="text-xs">
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Chainage (KM)
                  </Label>
                  <Input
                    className="h-8 font-mono text-xs rounded-[2px] bg-background"
                    value={chainage}
                    onChange={(e) => setChainage(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Block Nature
                  </Label>
                  <Select
                    value={blockType}
                    onValueChange={(v) => setBlockType(v as Requisition["blockType"])}
                  >
                    <SelectTrigger className="h-8 rounded-[2px] text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2px]">
                      {["Traffic Block", "Power Block", "Disconnection"].map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Duration (Hrs)
                  </Label>
                  <Input
                    className="h-8 text-xs rounded-[2px] bg-background"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Crew Gang
                  </Label>
                  <Input
                    className="h-8 text-xs rounded-[2px] bg-background"
                    type="number"
                    value={crew}
                    onChange={(e) => setCrew(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Criticality
                  </Label>
                  <Select
                    value={criticality}
                    onValueChange={(v) => setCriticality(v as Requisition["criticality"])}
                  >
                    <SelectTrigger className="h-8 rounded-[2px] text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2px]">
                      {["High", "Medium", "Low", "Critical"].map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Days Overdue
                  </Label>
                  <Input
                    className="h-8 text-xs rounded-[2px] bg-background"
                    type="number"
                    value={overdue}
                    onChange={(e) => setOverdue(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border border-border bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-[2px]">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs font-bold cursor-pointer" htmlFor="tsr-toggle">
                    TSR Risk If Deferred
                  </Label>
                  <span className="text-[10px] text-slate-500">Imposes sectional caution order</span>
                </div>
                <Switch id="tsr-toggle" checked={tsr} onCheckedChange={setTsr} />
              </div>

              {/* Live Priority Score Tile */}
              <div className="border border-border bg-slate-50 dark:bg-slate-800/80 p-3 rounded-[2px]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                    Calculated Criticality Index
                  </span>
                  <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${scoreBg}`}>
                    {scoreLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-[2px] bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-[#003366] dark:bg-sky-400"
                      style={{ width: `${currentScore}%` }}
                    />
                  </div>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {currentScore}/100
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-9 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-[2px]"
                onClick={submit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 size-3.5 animate-spin" /> Transmitting to Optimizer...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-3.5" /> Submit Requisition for Shadow Scheduling
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: REQUISITIONS LEDGER */}
        <div className="space-y-4">
          <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none flex flex-col">
            <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-[#003366] dark:text-sky-400" />
                  <CardTitle className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
                    Departmental Maintenance Ledger
                  </CardTitle>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {filtered.length} Requisitions Filtered
                </span>
              </div>

              {/* Filter Controls Bar */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Tabs value={tab} onValueChange={(v) => setTab(v as Dept | "ALL")} className="w-auto">
                  <TabsList className="h-8 rounded-[2px] bg-slate-200 dark:bg-slate-800 p-0.5">
                    <TabsTrigger value="ALL" className="text-xs px-2.5 h-7 rounded-[2px] font-bold">ALL</TabsTrigger>
                    <TabsTrigger value="TMS" className="text-xs px-2.5 h-7 rounded-[2px] font-bold">TMS (Civil)</TabsTrigger>
                    <TabsTrigger value="SMMS" className="text-xs px-2.5 h-7 rounded-[2px] font-bold">SMMS (Signal)</TabsTrigger>
                    <TabsTrigger value="TDMS" className="text-xs px-2.5 h-7 rounded-[2px] font-bold">TDMS (OHE)</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex-1 flex gap-2 min-w-[220px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by ID, asset or corridor..."
                      className="pl-8 h-8 text-xs rounded-[2px] bg-background"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status | "All")}>
                    <SelectTrigger className="w-[180px] h-8 text-xs rounded-[2px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2px]">
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisition ID / Asset</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Section / Line</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const rScore = r.score ?? criticalityScore(r);
                    let scrLabel = "LOW";
                    let scrClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
                    if (rScore > 40) {
                      scrLabel = "MED";
                      scrClass = "bg-blue-100 text-blue-900 border-blue-300";
                    }
                    if (rScore > 65) {
                      scrLabel = "HIGH";
                      scrClass = "bg-amber-100 text-amber-900 border-amber-300";
                    }
                    if (rScore > 85) {
                      scrLabel = "CRIT";
                      scrClass = "bg-red-100 text-red-900 border-red-300 font-bold";
                    }

                    return (
                      <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell>
                          <p className="font-mono font-bold text-xs text-[#003366] dark:text-sky-400">
                            {r.id}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500">{r.assetId}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`border px-1.5 py-0.5 text-[9px] uppercase rounded-[2px] font-bold ${getDeptStyle(r.dept)}`}>
                            {r.dept}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{r.section}</p>
                          <p className="text-[10px] text-slate-500">{r.line} · {r.chainage}</p>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right font-bold">
                          {r.duration} hrs
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`border px-1.5 py-0.5 text-[9px] uppercase rounded-[2px] font-mono font-bold ${scrClass}`}>
                            {rScore} ({scrLabel})
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`border px-1.5 py-0.5 text-[9px] uppercase rounded-[2px] font-semibold ${getStatusStyle(r.status)}`}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] font-bold border-slate-300 dark:border-slate-700"
                            onClick={() => setDetail(r)}
                          >
                            Details <ArrowRight className="ml-1 size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                        No requisitions matching selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <div className="border-t border-border bg-slate-50 dark:bg-slate-900/60 px-4 py-2 text-[11px] text-slate-500 flex justify-between items-center">
              <span>National Railway BDMS Register (Audit Compliant)</span>
              <span>Showing {filtered.length} of {reqs.length} Total Records</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Official Requisition Detail Modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md border-2 border-[#003366] bg-white dark:bg-slate-950 p-0 rounded-[2px] shadow-lg">
          <DialogHeader className="bg-[#003366] p-4 text-white border-b-2 border-[#FF9933]">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-[2px]">
                  {detail?.dept} REQUISITION RECORD
                </span>
                <DialogTitle className="text-base font-bold uppercase mt-1 text-white">
                  {detail?.id}
                </DialogTitle>
                <p className="text-[11px] text-slate-300 font-mono mt-0.5">Asset Tag: {detail?.assetId}</p>
              </div>
              <span className={`border px-2 py-0.5 text-[10px] uppercase font-bold rounded-[2px] bg-white text-slate-900`}>
                {detail?.status}
              </span>
            </div>
          </DialogHeader>

          {detail && (
            <div className="p-4 space-y-3 text-xs">
              <div className="border border-border bg-slate-50 dark:bg-slate-900 p-2.5 rounded-[2px]">
                <p className="text-[10px] font-bold uppercase text-slate-500">Nature of Work</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.work}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 border border-border p-3 rounded-[2px]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Section</span>
                  <p className="font-semibold">{detail.section}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Line</span>
                  <p className="font-semibold">{detail.line}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Chainage</span>
                  <p className="font-mono font-semibold">{detail.chainage}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Block Type</span>
                  <p className="font-semibold">{detail.blockType}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Duration</span>
                  <p className="font-mono font-semibold">{detail.duration} hrs</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Crew Strength</span>
                  <p className="font-semibold">{detail.crew} staff</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Criticality</span>
                  <p className="font-semibold">{detail.criticality}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Days Overdue</span>
                  <p className="font-semibold">{detail.daysOverdue} days</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">TSR Risk</span>
                  <p className="font-semibold">{detail.tsrRisk ? "Imposed (Yes)" : "No"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Filed By</span>
                  <p className="font-semibold">{detail.requestedBy}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
