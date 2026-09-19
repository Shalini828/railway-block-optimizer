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
  Info,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, deptColor } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
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
  const { visibleReqs, reqs, addReq, role, scope, can } = useAbps();
  const { t } = useLanguage();
  const defaultDept: Dept = role.dept === "COA" ? "TMS" : (role.dept as Dept);

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
  const [rejectingReq, setRejectingReq] = useState<Requisition | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use visibleReqs for department roles, reqs for network roles
  const activeReqs = visibleReqs;

  const filtered = useMemo(() => {
    return activeReqs.filter((r) => {
      const matchTab = tab === "ALL" || r.dept === tab;
      const matchStatus = status === "All" || r.status === status;
      const matchSearch =
        !searchQuery ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.section.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchStatus && matchSearch;
    });
  }, [activeReqs, tab, status, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: activeReqs.length,
      pending: activeReqs.filter((r) => r.status === "Pending AI Scheduling").length,
      active: activeReqs.filter((r) => r.status === "Active").length,
      completed: activeReqs.filter((r) => r.status === "Completed").length,
    };
  }, [activeReqs]);

  const insights = useMemo(() => {
    const sortedByScore = [...activeReqs].sort(
      (a, b) => (b.score ?? criticalityScore(b)) - (a.score ?? criticalityScore(a)),
    );
    const sortedByOverdue = [...activeReqs].sort((a, b) => b.daysOverdue - a.daysOverdue);
    const sortedByDuration = [...activeReqs].sort((a, b) => b.duration - a.duration);

    return {
      highestPriority: sortedByScore[0] ?? null,
      mostOverdue: sortedByOverdue[0] ?? null,
      longestBlock: sortedByDuration[0] ?? null,
      activeWork: activeReqs.find((r) => r.status === "Active") ?? null,
    };
  }, [activeReqs]);

  const submit = async (runOptimizer = false) => {
    if (!work.trim()) {
      toast.error(t("Please enter nature of work / task description", "कृपया कार्य का विवरण दर्ज करें"));
      return;
    }

    setIsSubmitting(true);

    const submissionDept = scope === "department" ? (role.dept as Dept) : dept;

    const payload = {
      dept: submissionDept,
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

      // Add to local frontend requisition ledger with backendId
      addReq({
        ...payload,
        backendId: requestData.request_id,
      });

      setWork("");

      if (runOptimizer && can("optimizer.run")) {
        // 2. Immediately run IR-ABPS optimization (Admin flow)
        const optimizationResponse = await apiFetch("/optimization/", {
          method: "POST",
        });

        const optimizationData = await optimizationResponse.json();

        if (!optimizationResponse.ok) {
          throw new Error(
            optimizationData.detail || optimizationData.message || "Optimization failed",
          );
        }

        toast.success(
          <div className="flex items-center gap-2">
            <CircleCheck className="size-4 text-emerald-600" />
            <span>{t("Requisition filed & optimized into Gantt schedule", "मांग पत्र दर्ज और गैंट शेड्यूल में अनुकूलित")}</span>
          </div>,
        );

        setTimeout(() => {
          window.location.href = "/planner";
        }, 700);
      } else {
        // Department flow or standard submit: stay on page
        toast.success(
          <div className="flex items-center gap-2">
            <CircleCheck className="size-4 text-emerald-600" />
            <span>
              {t(
                "Requisition submitted — Pending AI Scheduling. Control / DRM Planning will schedule it.",
                "मांग पत्र जमा किया गया — एआई शेड्यूलिंग लंबित। नियंत्रण / डीआरएम योजना इसे निर्धारित करेगी।"
              )}
            </span>
          </div>,
        );
      }
    } catch (error) {
      console.error("Requisition submission error:", error);
      toast.error(error instanceof Error ? error.message : "Could not complete requisition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (req: Requisition) => {
    if (!confirm(t(`Cancel requisition ${req.id}?`, `मांग पत्र ${req.id} रद्द करें?`))) return;
    try {
      const targetId = req.backendId || req.id;
      const res = await apiFetch(`/block-requests/${targetId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to cancel");
      }
      req.status = "Cancelled";
      toast.success(t(`Requisition ${req.id} cancelled.`, `मांग पत्र ${req.id} रद्द कर दिया गया।`));
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel requisition");
    }
  };

  const handleReject = async () => {
    if (!rejectingReq) return;
    if (!rejectionReason.trim()) {
      toast.error(t("Please provide a rejection reason", "कृपया अस्वीकृति का कारण बताएं"));
      return;
    }
    try {
      const targetId = rejectingReq.backendId || rejectingReq.id;
      const res = await apiFetch(`/block-requests/${targetId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to reject");
      }
      rejectingReq.status = "Rejected";
      rejectingReq.rejectionReason = rejectionReason;
      setRejectingReq(null);
      setRejectionReason("");
      toast.success(t(`Requisition ${rejectingReq.id} rejected.`, `मांग पत्र ${rejectingReq.id} अस्वीकृत।`));
    } catch (e: any) {
      toast.error(e.message || "Failed to reject requisition");
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
      case "Cancelled":
        return "bg-slate-100 text-slate-600 border-slate-300 line-through";
      case "Rejected":
        return "bg-red-100 text-red-900 border-red-300 font-semibold";
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
          <p className="text-[10px] font-bold uppercase text-slate-500">{t("Total Demands", "कुल मांग")}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{stats.total}</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">{t("Pending AI Scheduling", "एआई शेड्यूलिंग लंबित")}</p>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-0.5">{stats.pending}</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">{t("Active Execution", "सक्रिय निष्पादन")}</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{stats.active}</p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">{t("Completed & Closed", "पूर्ण एवं बंद")}</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.completed}</p>
        </div>
      </div>

      {/* Pending Scheduling Banner */}
      {stats.pending > 0 && (
        <div className="mb-5 bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-800 p-3.5 rounded-[2px] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="size-5 text-purple-700 dark:text-purple-300" />
            <div>
              <span className="text-xs font-bold text-purple-950 dark:text-purple-100">
                {stats.pending}{" "}
                {t(
                  "requisitions awaiting AI scheduling",
                  "मांग पत्र एआई शेड्यूलिंग की प्रतीक्षा कर रहे हैं"
                )}
              </span>
              <p className="text-[11px] text-purple-700 dark:text-purple-400">
                {t(
                  "Review demands in the IR-ABPS Brain optimization matrix.",
                  "आईआर-एबीपीएस ब्रेन ऑप्टिमाइज़ेशन मैट्रिक्स में मांगों की समीक्षा करें।"
                )}
              </p>
            </div>
          </div>
          <Link to="/optimizer">
            <Button size="sm" className="h-8 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-[2px]">
              <Brain className="mr-1.5 size-3.5" />
              {t("Open IR-ABPS Brain", "आईआर-एबीपीएस ब्रेन खोलें")}
              <ArrowRight className="ml-1.5 size-3" />
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr]">
        {/* LEFT PANEL: FORM IR-REQ-2024 or Control Office Info */}
        <div className="space-y-4">
          {role.id === "control" ? (
            <Card className="border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-none p-5">
              <div className="flex items-start gap-3">
                <Info className="size-5 text-[#003366] dark:text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    {t("Control Office Requisition Consumer", "नियंत्रण कार्यालय मांग पत्र उपभोक्ता")}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {t(
                      "Requisitions are raised by the department engineers. Control consumes and schedules them.",
                      "मांग पत्र विभागीय इंजीनियरों द्वारा उठाए जाते हैं। नियंत्रण उन्हें प्राप्त और निर्धारित करता है।"
                    )}
                  </p>
                  <div className="mt-4">
                    <Link to="/optimizer">
                      <Button size="sm" className="h-8 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-[2px]">
                        <Brain className="mr-1.5 size-3.5" />
                        {t("Open IR-ABPS Brain", "आईआर-एबीपीएस ब्रेन खोलें")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
              <div className="bg-[#003366] p-3 text-white border-b-2 border-[#FF9933] flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider">Form IR-REQ-2024</h2>
                  <p className="text-[10px] text-slate-300">{t("Electronic Maintenance Demand Filing", "इलेक्ट्रॉनिक अनुरक्षण मांग फाइलिंग")}</p>
                </div>
                <span className="bg-[#FF9933] text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase">
                  Official
                </span>
              </div>

              <CardContent className="space-y-3.5 p-4 text-xs">
                <div className="grid gap-1">
                  <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    {t("Originating Department", "मूल विभाग")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={scope === "department" ? (role.dept as Dept) : dept}
                    onValueChange={(v) => setDept(v as Dept)}
                    disabled={scope === "department"}
                  >
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
                  {scope === "department" && (
                    <span className="text-[10px] text-muted-foreground italic">
                      {t("Locked to departmental jurisdiction", "विभागीय अधिकार क्षेत्र के अनुसार लॉक किया गया")}
                    </span>
                  )}
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
                      Block Type
                    </Label>
                    <Select
                      value={blockType}
                      onValueChange={(v) => setBlockType(v as Requisition["blockType"])}
                    >
                      <SelectTrigger className="h-8 rounded-[2px] text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[2px]">
                        {["Traffic Block", "Power Block", "Integrated Block", "Shadow Block"].map(
                          (b) => (
                            <SelectItem key={b} value={b} className="text-xs">
                              {b}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                      Duration (Hrs)
                    </Label>
                    <Input
                      className="h-8 font-mono text-xs rounded-[2px] bg-background"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                      Crew Req.
                    </Label>
                    <Input
                      className="h-8 font-mono text-xs rounded-[2px] bg-background"
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

                {role.id === "admin" ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full h-9 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 font-bold text-xs rounded-[2px]"
                      onClick={() => submit(false)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="mr-2 size-3.5 animate-spin" /> {t("Filing...", "दर्ज किया जा रहा है...")}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 size-3.5" /> {t("Submit Requisition", "मांग पत्र जमा करें")}
                        </>
                      )}
                    </Button>
                    <Button
                      className="w-full h-9 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-[2px]"
                      onClick={() => submit(true)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="mr-2 size-3.5 animate-spin" /> {t("Optimizing...", "अनुकूलन जारी...")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 size-3.5 text-amber-400" /> {t("Submit & Run IR-ABPS", "जमा करें और आईआर-एबीपीएस चलाएं")}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full h-9 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-[2px]"
                    onClick={() => submit(false)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 size-3.5 animate-spin" /> {t("Transmitting...", "प्रेषित किया जा रहा है...")}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 size-3.5" /> {t("Submit Requisition", "मांग पत्र जमा करें")}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] font-bold border-slate-300 dark:border-slate-700"
                              onClick={() => setDetail(r)}
                            >
                              {t("Details", "विवरण")} <ArrowRight className="ml-1 size-3" />
                            </Button>
                            {r.status === "Pending AI Scheduling" && can("requests.cancel") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                                onClick={() => handleCancel(r)}
                                title={t("Cancel pending requisition", "लंबित मांग पत्र रद्द करें")}
                              >
                                <Ban className="mr-1 size-3" />
                                {t("Cancel", "रद्द")}
                              </Button>
                            )}
                            {r.status === "Pending AI Scheduling" && can("requests.reject") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-bold text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                onClick={() => setRejectingReq(r)}
                                title={t("Reject requisition with reason", "कारण सहित मांग पत्र अस्वीकार करें")}
                              >
                                {t("Reject", "अस्वीकार")}
                              </Button>
                            )}
                          </div>
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
                {detail.rejectionReason && (
                  <div className="col-span-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2 rounded-[2px]">
                    <span className="text-[10px] font-bold uppercase text-red-700 dark:text-red-400">Rejection Reason</span>
                    <p className="font-semibold text-red-900 dark:text-red-200 text-xs mt-0.5">{detail.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Requisition Dialog */}
      <Dialog open={!!rejectingReq} onOpenChange={(o) => !o && setRejectingReq(null)}>
        <DialogContent className="sm:max-w-md border-2 border-red-700 bg-white dark:bg-slate-950 p-0 rounded-[2px] shadow-lg">
          <DialogHeader className="bg-red-700 p-4 text-white">
            <DialogTitle className="text-sm font-bold uppercase text-white">
              {t("Reject Block Requisition", "ब्लॉक मांग पत्र अस्वीकार करें")}
            </DialogTitle>
            <p className="text-[11px] text-red-100 font-mono mt-0.5">
              {rejectingReq?.id} ({rejectingReq?.assetId} - {rejectingReq?.dept})
            </p>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <div>
              <Label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                {t("Reason for Rejection", "अस्वीकृति का कारण")} <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1 text-xs rounded-[2px]"
                placeholder={t("e.g. Traffic saturation / Overlapping mega-block", "उदा. यातायात अधिभार / अतिव्यापी ब्लॉक")}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-[2px]"
                onClick={() => setRejectingReq(null)}
              >
                {t("Cancel", "रद्द")}
              </Button>
              <Button
                size="sm"
                className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-[2px]"
                onClick={handleReject}
              >
                {t("Confirm Rejection", "अस्वीकृति की पुष्टि करें")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
