import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [blockType, setBlockType] =
    useState<Requisition["blockType"]>("Traffic Block");
  const [duration, setDuration] = useState("3");
  const [crew, setCrew] = useState("16");
  const [criticality, setCriticality] = useState<Requisition["criticality"]>("High");
  const [overdue, setOverdue] = useState("4");
  const [tsr, setTsr] = useState(true);

  const [tab, setTab] = useState<Dept | "ALL">("ALL");
  const [status, setStatus] = useState<Status | "All">("All");
  const [detail, setDetail] = useState<Requisition | null>(null);

  const filtered = reqs.filter(
    (r) => (tab === "ALL" || r.dept === tab) && (status === "All" || r.status === status),
  );

  const submit = () => {
    if (!work.trim()) {
      toast.error("Enter the nature of work before submitting.");
      return;
    }
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
    toast.success("Requisition submitted to BDMS — awaiting AI scheduling.");
  };

  return (
    <>
      <PageHeader
        title="Multi-Department Data Ingestion & Request Portal"
        subtitle="TMS, SMMS and TDMS requisitions flow into a single BDMS ledger for AI scheduling."
      />

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Request Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Department</Label>
              <Select value={dept} onValueChange={(v) => setDept(v as Dept)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEPT_LABEL) as Dept[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {DEPT_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Asset ID</Label>
              <Input value={assetId} onChange={(e) => setAssetId(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Nature of work</Label>
              <Input
                value={work}
                placeholder="e.g. USFD flaw rectification"
                onChange={(e) => setWork(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Line</Label>
                <Select value={line} onValueChange={setLine}>
                  <SelectTrigger>
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
                <Label>Chainage</Label>
                <Input value={chainage} onChange={(e) => setChainage(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Block type</Label>
                <Select
                  value={blockType}
                  onValueChange={(v) => setBlockType(v as Requisition["blockType"])}
                >
                  <SelectTrigger>
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
                <Label>Duration (hrs)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Crew</Label>
                <Input type="number" value={crew} onChange={(e) => setCrew(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Criticality</Label>
                <Select
                  value={criticality}
                  onValueChange={(v) => setCriticality(v as Requisition["criticality"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["High", "Medium", "Low"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Days overdue</Label>
                <Input
                  type="number"
                  value={overdue}
                  onChange={(e) => setOverdue(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">TSR risk if deferred</span>
              <Switch checked={tsr} onCheckedChange={setTsr} />
            </div>
            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              Live criticality score preview:{" "}
              <span className="font-semibold text-foreground">
                {criticalityScore({
                  criticality,
                  daysOverdue: Number(overdue) || 0,
                  tsrRisk: tsr,
                  blockType,
                } as Requisition)}
                /100
              </span>
            </div>
            <Button className="w-full" onClick={submit}>
              <Send className="size-4" /> Submit requisition
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <CardTitle className="text-base">Unified Departmental Ledger</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Dept | "ALL")}>
                <TabsList>
                  <TabsTrigger value="ALL">All</TabsTrigger>
                  <TabsTrigger value="TMS">TMS</TabsTrigger>
                  <TabsTrigger value="SMMS">SMMS</TabsTrigger>
                  <TabsTrigger value="TDMS">TDMS</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={status} onValueChange={(v) => setStatus(v as Status | "All")}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisition</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Section / Line</TableHead>
                  <TableHead>Dur.</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{r.id}</p>
                      <p className="text-xs text-muted-foreground">{r.assetId}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={deptColor[r.dept]}>
                        {r.dept}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.section}
                      <br />
                      <span className="text-muted-foreground">{r.line}</span>
                    </TableCell>
                    <TableCell className="text-xs">{r.duration}h</TableCell>
                    <TableCell className="text-xs font-semibold">
                      {r.score ?? criticalityScore(r)}
                    </TableCell>
                    <TableCell className="text-xs">{r.status}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No requisitions match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{detail.work}</p>
              <Row k="Department" v={DEPT_LABEL[detail.dept]} />
              <Row k="Asset" v={detail.assetId} />
              <Row k="Section / Line" v={`${detail.section} · ${detail.line}`} />
              <Row k="Chainage" v={detail.chainage} />
              <Row k="Block type" v={detail.blockType} />
              <Row k="Duration / Crew" v={`${detail.duration} h · ${detail.crew} staff`} />
              <Row
                k="Criticality"
                v={`${detail.criticality} · ${detail.daysOverdue} days overdue`}
              />
              <Row k="TSR risk if deferred" v={detail.tsrRisk ? "Yes" : "No"} />
              <Row k="Requested by" v={detail.requestedBy} />
              <Row k="AI score" v={`${detail.score ?? criticalityScore(detail)}/100`} />
              <Row
                k="Scheduled slot"
                v={
                  detail.slot
                    ? `${DAYS[detail.slot.day]} ${fmt(detail.slot.start)}–${fmt(detail.slot.end)}`
                    : "Not scheduled"
                }
              />
              <Row k="Status" v={detail.status} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-1.5 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
