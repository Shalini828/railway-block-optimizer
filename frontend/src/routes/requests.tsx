import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  Send, AlertTriangle, Box, Building2, ClipboardList, 
  Search, SlidersHorizontal, CircleCheck, Sparkles, Brain, ArrowRight,
  Clock, CalendarClock, Zap, CheckCircle2, Server, Wrench, FileText,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { deptColor } from "@/components/AppShell";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [section, setSection] = useState(CORRIDORS[0]!.id);
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
    const sortedByScore = [...reqs].sort((a, b) => (b.score ?? criticalityScore(b)) - (a.score ?? criticalityScore(a)));
    const sortedByOverdue = [...reqs].sort((a, b) => b.daysOverdue - a.daysOverdue);
    const sortedByDuration = [...reqs].sort((a, b) => b.duration - a.duration);
    const activeReqs = reqs.filter(r => r.status === "Active");
    
    return {
      highestPriority: sortedByScore.length > 0 ? sortedByScore[0] : null,
      mostOverdue: sortedByOverdue.length > 0 ? sortedByOverdue[0] : null,
      longestBlock: sortedByDuration.length > 0 ? sortedByDuration[0] : null,
      activeWork: activeReqs.length > 0 ? activeReqs[0] : null
    };
  }, [reqs]);

  const submit = () => {
    if (!work.trim()) {
      toast.error("Enter the nature of work before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate network delay for realistic interaction
    setTimeout(() => {
      addReq({
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
      });
      setWork("");
      setIsSubmitting(false);
      toast.success(
        <div className="flex items-center gap-2">
          <CircleCheck className="size-4 text-safe" /> 
          Requisition submitted successfully
        </div>
      );
    }, 600);
  };

  const currentScore = criticalityScore({
    criticality,
    daysOverdue: Number(overdue) || 0,
    tsrRisk: tsr,
    blockType,
  } as Requisition);
  
  let scoreColor = "text-safe";
  let scoreBg = "bg-safe/20";
  let scoreLabel = "LOW PRIORITY";
  if (currentScore > 40) { scoreColor = "text-blue-500"; scoreBg = "bg-blue-500/20"; scoreLabel = "MEDIUM PRIORITY"; }
  if (currentScore > 65) { scoreColor = "text-warn"; scoreBg = "bg-warn/20"; scoreLabel = "HIGH PRIORITY"; }
  if (currentScore > 85) { scoreColor = "text-destructive"; scoreBg = "bg-destructive/20"; scoreLabel = "CRITICAL PRIORITY"; }

  const getStatusStyle = (s: Status) => {
    switch (s) {
      case "Pending AI Scheduling": return "bg-warn/10 text-warn border-warn/20";
      case "Active": return "bg-safe/10 text-safe border-safe/20";
      case "Completed": return "bg-secondary text-muted-foreground border-border";
      case "Clustered / Shadowed": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Approved": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default: return "bg-secondary text-foreground";
    }
  };
  
  const getDeptStyle = (d: Dept) => {
    switch(d) {
      case "TMS": return "border-amber-500/40 text-amber-500 bg-amber-500/10";
      case "SMMS": return "border-safe/40 text-safe bg-safe/10";
      case "TDMS": return "border-cyan-500/40 text-cyan-500 bg-cyan-500/10";
      default: return "border-border text-foreground bg-secondary/50";
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Block Requisition Portal</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Unified TMS, SMMS and TDMS work requests feeding the BDMS AI scheduling engine.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 rounded-lg border border-border bg-secondary/20 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Server className="size-3.5" /> BDMS Status
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-safe"></span>
            </span>
            <span className="font-bold text-safe">ONLINE</span>
            <span className="text-muted-foreground ml-2 text-xs">Last sync: Just now</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card/40 px-5 py-3 text-sm shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground font-semibold text-xs tracking-wider uppercase">Total Requests</span>
          <span className="font-bold text-base ml-1">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-purple-500" />
          <span className="text-muted-foreground font-semibold text-xs tracking-wider uppercase">Pending AI Scheduling</span>
          <span className="font-bold text-base ml-1">{stats.pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-warn" />
          <span className="text-muted-foreground font-semibold text-xs tracking-wider uppercase">Active</span>
          <span className="font-bold text-base ml-1">{stats.active}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-safe" />
          <span className="text-muted-foreground font-semibold text-xs tracking-wider uppercase">Completed</span>
          <span className="font-bold text-base ml-1">{stats.completed}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr]">
        {/* LEFT PANEL */}
        <div className="space-y-6">
          <Card className="shadow-sm border-t-2 border-t-primary">
            <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wrench className="size-4 text-primary" />
                  Work Request Submission
                </CardTitle>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px] uppercase font-bold tracking-wider">
                  New Requisition
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Create a maintenance requisition for AI-assisted block scheduling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Department</Label>
                <Select value={dept} onValueChange={(v) => setDept(v as Dept)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DEPT_LABEL) as Dept[]).map((d) => (
                      <SelectItem key={d} value={d}>
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          {DEPT_LABEL[d]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Asset ID</Label>
                  <span className="text-[10px] text-muted-foreground">Unique asset identifier</span>
                </div>
                <Input className="bg-background font-mono" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
              </div>
              
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Nature of work</Label>
                <Input
                  className="bg-background"
                  value={work}
                  placeholder="e.g. USFD flaw rectification"
                  onChange={(e) => setWork(e.target.value)}
                />
              </div>
              
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Section</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORRIDORS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Line</Label>
                  <Select value={line} onValueChange={setLine}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Up Main", "Down Main", "Line 3 Up", "Freight Loop"].map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Chainage</Label>
                  <Input className="bg-background font-mono text-sm" value={chainage} onChange={(e) => setChainage(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Block type</Label>
                  <Select
                    value={blockType}
                    onValueChange={(v) => setBlockType(v as Requisition["blockType"])}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Traffic Block", "Power Block", "Disconnection"].map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Duration (hrs)</Label>
                  <Input
                    className="bg-background"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Crew</Label>
                  <Input className="bg-background" type="number" value={crew} onChange={(e) => setCrew(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Criticality</Label>
                  <Select
                    value={criticality}
                    onValueChange={(v) => setCriticality(v as Requisition["criticality"])}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["High", "Medium", "Low", "Critical"].map((c) => (
                        <SelectItem key={c} value={c}>
                          <div className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${c === 'Critical' ? 'bg-destructive' : c === 'High' ? 'bg-warn' : c === 'Medium' ? 'bg-blue-500' : 'bg-safe'}`}></span>
                            {c}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Days overdue</Label>
                  <Input
                    className="bg-background"
                    type="number"
                    value={overdue}
                    onChange={(e) => setOverdue(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm cursor-pointer" htmlFor="tsr-toggle">TSR risk if deferred</Label>
                  <span className="text-[10px] text-muted-foreground">Impacts temp speed restriction</span>
                </div>
                <Switch id="tsr-toggle" checked={tsr} onCheckedChange={setTsr} />
              </div>
              
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Live Priority Score</span>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${scoreBg} ${scoreColor}`}>
                    {scoreLabel}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${scoreColor.replace('text-', 'bg-')}`} 
                      style={{ width: `${currentScore}%` }}
                    />
                  </div>
                  <span className="font-mono text-lg font-bold">{currentScore}<span className="text-xs text-muted-foreground">/100</span></span>
                </div>
              </div>
              
              <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2" onClick={submit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" /> Submit Requisition
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-6">
          <Card className="shadow-sm border-t-2 border-t-secondary-foreground overflow-hidden flex flex-col">
            <CardHeader className="border-b border-border/50 bg-secondary/10 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardList className="size-4" />
                    Unified Departmental Ledger
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Cross-department requisitions awaiting BDMS scheduling.
                  </CardDescription>
                </div>
                <div className="font-semibold text-sm">
                  {filtered.length} Requests
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Tabs value={tab} onValueChange={(v) => setTab(v as Dept | "ALL")} className="w-auto">
                  <TabsList className="h-9">
                    <TabsTrigger value="ALL" className="text-xs">ALL</TabsTrigger>
                    <TabsTrigger value="TMS" className="text-xs">TMS</TabsTrigger>
                    <TabsTrigger value="SMMS" className="text-xs">SMMS</TabsTrigger>
                    <TabsTrigger value="TDMS" className="text-xs">TDMS</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex-1 flex gap-3 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search requisition, asset or section..." 
                      className="pl-9 h-9 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status | "All")}>
                    <SelectTrigger className="w-[180px] h-9 text-xs">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="size-3" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
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
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider h-10">Requisition</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider h-10">Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider h-10">Section / Line</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider h-10 text-right">Dur.</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider h-10 text-right">Score</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider h-10">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider h-10 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const rScore = r.score ?? criticalityScore(r);
                    let scrLabel = "LOW"; let scrColor = "text-safe";
                    if(rScore > 40) { scrLabel = "MED"; scrColor = "text-blue-500"; }
                    if(rScore > 65) { scrLabel = "HIGH"; scrColor = "text-warn"; }
                    if(rScore > 85) { scrLabel = "CRIT"; scrColor = "text-destructive"; }
                    
                    return (
                      <TableRow key={r.id} className="hover:bg-secondary/30 transition-colors group">
                        <TableCell className="py-2.5">
                          <p className="text-sm font-bold text-foreground">{r.id}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{r.assetId}</p>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getDeptStyle(r.dept)}`}>
                            {r.dept}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs">
                          <span className="font-medium text-foreground">{r.section}</span>
                          <br />
                          <span className="text-muted-foreground">{r.line}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs font-mono text-right">{r.duration}h</TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-sm">{rScore}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${scrColor}`}>{scrLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className={`text-[10px] font-semibold ${getStatusStyle(r.status)}`}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <Button size="sm" variant="ghost" className="h-8 text-xs font-medium text-blue-500 hover:text-blue-600 opacity-80 group-hover:opacity-100" onClick={() => setDetail(r)}>
                            View <ArrowRight className="ml-1 size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="size-8 text-muted-foreground/50" />
                          <p>No requisitions found</p>
                          <p className="text-xs">Try changing the department or status filter.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <div className="border-t border-border bg-secondary/10 px-5 py-3 text-xs text-muted-foreground flex justify-between items-center">
              <span>Showing {filtered.length} of {reqs.length} total requisitions</span>
            </div>
          </Card>

          {/* REQUISITION INTELLIGENCE & READINESS */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b border-border/50 bg-secondary/10 py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  Requisition Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {insights.highestPriority && (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Highest Priority</p>
                      <p className="text-xs font-semibold mt-0.5">{insights.highestPriority.id}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-warn/30 text-warn bg-warn/10">Score {insights.highestPriority.score ?? criticalityScore(insights.highestPriority)}</Badge>
                  </div>
                )}
                {insights.mostOverdue && (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Most Overdue</p>
                      <p className="text-xs font-semibold mt-0.5">{insights.mostOverdue.id}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/10">{insights.mostOverdue.daysOverdue} days</Badge>
                  </div>
                )}
                {insights.longestBlock && (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Longest Block</p>
                      <p className="text-xs font-semibold mt-0.5">{insights.longestBlock.id}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">{insights.longestBlock.duration} hrs</Badge>
                  </div>
                )}
                {insights.activeWork ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Work</p>
                      <p className="text-xs font-semibold mt-0.5">{insights.activeWork.id}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-safe/30 text-safe bg-safe/10">In progress</Badge>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Work</p>
                      <p className="text-xs text-muted-foreground mt-0.5">None currently</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-purple-500/20 bg-gradient-to-br from-card to-purple-900/5">
              <CardHeader className="border-b border-purple-500/10 py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-500">
                  <Brain className="size-4" />
                  AI Scheduling Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col h-[calc(100%-45px)]">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">Ready for optimization</span>
                    <span className="text-sm font-bold">{stats.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">Critical requests</span>
                    <span className="text-sm font-bold text-destructive">
                      {reqs.filter(r => (r.score ?? criticalityScore(r)) > 85).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">Data completeness</span>
                    <span className="text-sm font-bold text-safe">100%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">BDMS queue</span>
                    <Badge className="bg-safe/20 text-safe hover:bg-safe/20 text-[10px] uppercase font-bold tracking-wider border-0">Ready</Badge>
                  </div>
                </div>
                <Button asChild className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-semibold h-9 text-xs">
                  <Link to="/optimizer">
                    Run Optimization Engine <ArrowRight className="ml-1.5 size-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card shadow-lg p-0 overflow-hidden">
          <DialogHeader className="bg-secondary/30 p-5 pb-4 border-b border-border/50">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline" className={`mb-2 text-[10px] uppercase font-bold tracking-wider ${detail ? getDeptStyle(detail.dept) : ''}`}>
                  {detail?.dept}
                </Badge>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="size-5 text-muted-foreground" />
                  {detail?.id}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Box className="size-3.5" /> {detail?.assetId}
                </p>
              </div>
              <Badge variant="outline" className={`text-xs font-semibold px-2 py-1 ${detail ? getStatusStyle(detail.status) : ''}`}>
                {detail?.status}
              </Badge>
            </div>
          </DialogHeader>
          
          {detail && (
            <div className="p-5 space-y-4">
              <div className="rounded-md bg-secondary/20 p-3 border border-border/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Nature of Work</p>
                <p className="font-medium text-sm">{detail.work}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row k="Section" v={detail.section} />
                <Row k="Line" v={detail.line} />
                <Row k="Chainage" v={detail.chainage} className="col-span-2" />
                
                <div className="col-span-2 my-1 border-t border-border/50"></div>
                
                <Row k="Block type" v={detail.blockType} />
                <Row k="Duration" v={`${detail.duration} hours`} />
                <Row k="Crew size" v={`${detail.crew} staff`} />
                <Row k="Criticality" v={detail.criticality} />
                <Row k="Days overdue" v={`${detail.daysOverdue} days`} />
                <Row k="TSR risk" v={detail.tsrRisk ? "Yes" : "No"} />
                
                <div className="col-span-2 my-1 border-t border-border/50"></div>
                
                <Row k="Requested by" v={detail.requestedBy} />
                <Row k="AI priority score" v={
                  <span className="font-bold text-foreground">{`${detail.score ?? criticalityScore(detail)} / 100`}</span>
                } />
                
                <div className="col-span-2">
                  <Row k="Scheduled slot" v={
                    detail.slot
                      ? <Badge variant="secondary" className="font-medium text-xs bg-secondary">
                          <CalendarClock className="mr-1.5 size-3" />
                          {DAYS[detail.slot.day]} {fmt(detail.slot.start)}–{fmt(detail.slot.end)}
                        </Badge>
                      : "Not scheduled"
                  } />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v, className = "" }: { k: string; v: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
  );
}
