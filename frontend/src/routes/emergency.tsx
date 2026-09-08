import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  AlertOctagon,
  ShieldAlert,
  Siren,
  Zap,
  RadioTower,
  TrainFront,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Map,
  Shield,
  ChevronRight,
  Info,
  PlusCircle,
  Activity,
  BrainCircuit,
  BarChart,
  Calendar,
  Target,
  PowerOff,
  XCircle,
  ArrowRight,
  Settings2,
  ActivitySquare,
  Server,
  Eye,
  Loader2,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Response | IR-ABPS" },
      {
        name: "description",
        content:
          "AI-assisted incident assessment, traffic protection and emergency block planning across the corridor.",
      },
    ],
  }),
  component: EmergencyPage,
});

// Demo Data
const trainImpactData = [
  { name: "12301", current: 18, ai: 5 },
  { name: "12424", current: 7, ai: 2 },
  { name: "12560", current: 12, ai: 1 },
  { name: "22415", current: 9, ai: 0 },
];

const emergencyHistory = [
  {
    id: "SOS-NDLS-002",
    type: "OHE Snapping",
    section: "NDLS-GZB",
    severity: "HIGH",
    start: "14:20",
    duration: "1h 45m",
    impact: "High",
    status: "Resolved",
  },
  {
    id: "SOS-ALD-014",
    type: "Signal Failure",
    section: "ALD-DDU",
    severity: "MEDIUM",
    start: "09:15",
    duration: "45m",
    impact: "Low",
    status: "Resolved",
  },
];

function EmergencyPage() {
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [blockActivated, setBlockActivated] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // What-If state
  const [whatIfDelay, setWhatIfDelay] = useState("+8 min");
  const [whatIfRisk, setWhatIfRisk] = useState("HIGH");

  const handleGenerate = () => {
    setIsGeneratingOptions(true);
    setTimeout(() => {
      setIsGeneratingOptions(false);
      setShowOptions(true);
      toast.success("AI re-block options generated successfully.");
    }, 1500);
  };

  const handleApprove = () => {
    setApprovalModalOpen(false);
    toast.success("Emergency block activated successfully.");
    setBlockActivated(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-card p-6 rounded-xl border border-destructive/20 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="max-w-3xl space-y-2 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-safe animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-safe">
              System Operational
            </span>
            <span className="text-muted-foreground text-xs px-2">•</span>
            <span className="text-xs text-muted-foreground">Last updated: Just now</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Emergency Response & Re-Blocking Command Center
          </h1>
          <p className="text-muted-foreground text-sm">
            AI-assisted incident assessment, traffic protection and emergency block planning across
            the corridor.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 relative z-10">
          <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            <PlusCircle className="mr-2 size-4" /> CREATE EMERGENCY RESPONSE
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
            <RefreshCw className="mr-2 size-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* STORYTELLING FLOW */}
      <div className="flex items-center justify-center py-2 overflow-hidden">
        <div className="flex flex-wrap items-center justify-center gap-1 md:gap-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <Badge
            variant="outline"
            className="bg-destructive/10 text-destructive border-destructive/20"
          >
            Incident Detected
          </Badge>
          <ArrowRight className="size-3" />
          <Badge variant="outline" className="bg-joint/10 text-joint border-joint/20">
            AI Assessment
          </Badge>
          <ArrowRight className="size-3" />
          <Badge variant="outline" className="bg-warn/10 text-warn border-warn/20">
            Impact Prediction
          </Badge>
          <ArrowRight className="size-3" />
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            AI Re-Block
          </Badge>
          <ArrowRight className="size-3" />
          <Badge variant="outline" className="bg-muted text-foreground">
            Human Approval
          </Badge>
          <ArrowRight className="size-3" />
          <Badge variant="outline" className="bg-safe/10 text-safe border-safe/20">
            Activation
          </Badge>
        </div>
      </div>

      {/* 2. EMERGENCY STATUS KPI ROW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-destructive/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Emergencies
              </p>
              <Siren className="size-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive mb-1">2</p>
            <p className="text-xs font-medium text-destructive/80">+1 in last hour</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Critical Incidents
              </p>
              <AlertOctagon className="size-4 text-warn" />
            </div>
            <p className="text-2xl font-bold mb-1">1</p>
            <p className="text-xs font-medium text-warn">Requires immediate review</p>
          </CardContent>
        </Card>
        <Card className="border-safe/30 shadow-sm bg-safe/5">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Traffic Protected
              </p>
              <ShieldCheck className="size-4 text-safe" />
            </div>
            <p className="text-2xl font-bold text-safe mb-1">2 sections</p>
            <p className="text-xs font-medium text-safe/80">Protected by active blocks</p>
          </CardContent>
        </Card>
        <Card className="border-joint/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                AI Re-Block Recs
              </p>
              <BrainCircuit className="size-4 text-joint" />
            </div>
            <p className="text-2xl font-bold text-joint mb-1">3</p>
            <p className="text-xs font-medium text-muted-foreground">Awaiting officer review</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Est. Delay Avoided
              </p>
              <Clock className="size-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary mb-1">46 min</p>
            <p className="text-xs font-medium text-muted-foreground">Projected impact</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Main Emergency Response & Optimization */}
        <div className="lg:col-span-8 space-y-6">
          {/* 3 & 4. EMERGENCY COMMAND CENTER & AI ASSESSMENT */}
          <Card className="border-destructive/40 shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 bg-destructive h-full"></div>
            <CardHeader className="bg-destructive/5 border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="size-5 text-destructive" />
                Emergency Response Console
              </CardTitle>
              <CardDescription>Incident assessment and decision support interface</CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid md:grid-cols-2">
              <div className="p-5 border-r border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground">
                    CRITICAL
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">SOS-CNB-001</span>
                </div>
                <h3 className="text-xl font-bold mb-4 text-foreground">TRACK FRACTURE</h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-[110px_1fr] text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-semibold">CNB Outer – Line 1</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] text-sm">
                    <span className="text-muted-foreground">Detected:</span>
                    <span>17:25 (12m ago)</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] text-sm">
                    <span className="text-muted-foreground">Asset:</span>
                    <span className="font-mono text-xs">TRK-ENG-982</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] text-sm">
                    <span className="text-muted-foreground">Train exposure:</span>
                    <span className="text-warn font-semibold">7 scheduled trains</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] text-sm">
                    <span className="text-muted-foreground">Est. restoration:</span>
                    <span>2h 40m</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-joint/5 relative">
                <div className="flex items-center gap-2 text-joint font-bold mb-3">
                  <BrainCircuit className="size-4" /> IR-ABPS AI Assessment
                </div>

                <div className="flex items-end gap-4 mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">
                      Risk Score
                    </span>
                    <span className="text-3xl font-bold text-destructive">
                      94<span className="text-sm text-muted-foreground">/100</span>
                    </span>
                  </div>
                  <div className="flex flex-col pb-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">
                      Confidence
                    </span>
                    <span className="text-sm font-bold text-joint">91%</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1.5 mb-4">
                  <p className="flex items-start gap-1.5">
                    <ChevronRight className="size-4 shrink-0 text-joint mt-0.5" /> Track fracture
                    detected on passenger corridor
                  </p>
                  <p className="flex items-start gap-1.5">
                    <ChevronRight className="size-4 shrink-0 text-joint mt-0.5" /> 7 trains
                    potentially exposed to danger zone
                  </p>
                  <p className="flex items-start gap-1.5">
                    <ChevronRight className="size-4 shrink-0 text-joint mt-0.5" /> Adjacent
                    engineering request can be coordinated
                  </p>
                </div>

                <div className="bg-background border border-border p-3 rounded-lg">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1">
                    Recommended Response
                  </p>
                  <p className="text-sm font-medium">
                    Immediate protective block + coordinated engineering response.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-xs font-bold text-joint border-joint/30 hover:bg-joint/10"
                  onClick={() => setAiDrawerOpen(true)}
                >
                  <Eye className="mr-2 size-3" /> VIEW AI REASONING
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 5. AI RE-BLOCKING ENGINE */}
          <Card className="border-joint/30 shadow-md">
            <CardHeader className="bg-joint/5 border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-joint flex items-center gap-2">
                    <Zap className="size-5" /> AI Emergency Re-Blocking
                  </CardTitle>
                  <CardDescription className="text-foreground/70">
                    Generate the safest available emergency block window while minimizing network
                    disruption.
                  </CardDescription>
                </div>
                {!showOptions && (
                  <Button
                    className="bg-joint hover:bg-joint/90 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    onClick={handleGenerate}
                    disabled={isGeneratingOptions}
                  >
                    {isGeneratingOptions ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> GENERATING...
                      </>
                    ) : (
                      "GENERATE RE-BLOCK OPTIONS"
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!showOptions ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                  <ActivitySquare className="size-10 mb-3 opacity-20" />
                  <p>Current Situation: No emergency window established.</p>
                  <p className="text-sm mt-1">7 trains approaching affected section.</p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Option A */}
                  <div className="border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card hover:border-border transition-colors">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">OPTION A</Badge>
                        <span className="font-bold text-sm uppercase">Minimum Disruption</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Window</p>
                          <p className="font-medium">18:10 – 19:40</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Train Impact
                          </p>
                          <p className="font-medium text-warn">+8 min (3 trains)</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Safety</p>
                          <p className="font-medium text-safe">HIGH</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Score</p>
                          <p className="font-bold">91/100</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setApprovalModalOpen(true)}>
                      SELECT
                    </Button>
                  </div>

                  {/* Option B */}
                  <div className="border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card hover:border-border transition-colors">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">OPTION B</Badge>
                        <span className="font-bold text-sm uppercase">Maximum Safety Buffer</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Window</p>
                          <p className="font-medium">18:00 – 20:00</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Train Impact
                          </p>
                          <p className="font-medium text-destructive">+19 min (5 trains)</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Safety</p>
                          <p className="font-medium text-safe">VERY HIGH</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Score</p>
                          <p className="font-bold text-muted-foreground">86/100</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setApprovalModalOpen(true)}>
                      SELECT
                    </Button>
                  </div>

                  {/* Option C - Recommended */}
                  <div className="border-2 border-primary rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-primary/5 shadow-[0_0_15px_rgba(var(--color-primary),0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                      ★ AI RECOMMENDED
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary hover:bg-primary">OPTION C</Badge>
                        <span className="font-bold text-sm uppercase text-primary">
                          Coordinated Block
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Window</p>
                          <p className="font-medium">18:20 – 20:00</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Train Impact
                          </p>
                          <p className="font-medium text-safe">+5 min (3 trains)</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Safety</p>
                          <p className="font-medium text-safe">HIGH</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Score</p>
                          <p className="font-bold text-primary">95/100</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 border-t pt-2 border-primary/20">
                        Combines emergency protection with 2 pending maintenance requests.
                      </p>
                    </div>
                    <Button className="shadow-md" onClick={() => setApprovalModalOpen(true)}>
                      SELECT & REVIEW
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. BEFORE vs AFTER & 8. TRAIN IMPACT PREDICTION */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Re-Blocking Impact Simulation</CardTitle>
                <CardDescription className="text-xs">
                  Projected simulation — requires officer approval
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold text-center mb-2">
                      Without Optimization
                    </p>
                    <div className="space-y-1 text-center">
                      <p className="text-xl font-bold text-destructive">31 min</p>
                      <p className="text-xs text-muted-foreground">Train delay</p>
                      <p className="text-xs font-semibold mt-2">7 trains affected</p>
                    </div>
                  </div>
                  <div className="p-3 bg-safe/10 rounded-lg border border-safe/30">
                    <p className="text-[10px] uppercase text-safe font-bold text-center mb-2">
                      With AI Re-Block
                    </p>
                    <div className="space-y-1 text-center">
                      <p className="text-xl font-bold text-safe">8 min</p>
                      <p className="text-xs text-muted-foreground">Train delay</p>
                      <p className="text-xs font-semibold mt-2 text-safe">3 trains affected</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-medium px-2 py-1">
                  <span className="text-safe">↓ 74% projected delay</span>
                  <span className="text-safe">↓ 3 → 1 work windows</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Train Impact Forecast</CardTitle>
                <CardDescription className="text-xs">
                  7 trains analysed • 3 projected to experience delay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={trainImpactData}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar
                        dataKey="current"
                        name="Current"
                        fill="var(--destructive)"
                        radius={[2, 2, 0, 0]}
                        barSize={15}
                      />
                      <Bar
                        dataKey="ai"
                        name="AI Re-block"
                        fill="var(--safe)"
                        radius={[2, 2, 0, 0]}
                        barSize={15}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 7. CORRIDOR VISUALIZATION */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Corridor Operational Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex items-center justify-between px-6 py-4">
                <div className="absolute left-10 right-10 h-1 bg-border top-1/2 -translate-y-1/2 z-0"></div>
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-muted-foreground">NDLS</div>
                  <div className="w-4 h-4 rounded-full border-2 border-background bg-safe"></div>
                  <div className="text-[10px] text-muted-foreground mt-1">Normal</div>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-foreground">CNB</div>
                  <div className="w-6 h-6 rounded-full border-4 border-background bg-destructive shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse"></div>
                  <div className="text-[10px] font-bold text-destructive mt-1">CRITICAL</div>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-foreground">ALD</div>
                  <div className="w-4 h-4 rounded-full border-2 border-background bg-warn"></div>
                  <div className="text-[10px] text-warn mt-1">Restricted</div>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-muted-foreground">DDU</div>
                  <div className="w-4 h-4 rounded-full border-2 border-background bg-safe"></div>
                  <div className="text-[10px] text-muted-foreground mt-1">Normal</div>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-muted-foreground">BSB</div>
                  <div className="w-4 h-4 rounded-full border-2 border-background bg-safe"></div>
                  <div className="text-[10px] text-muted-foreground mt-1">Normal</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Action & Status */}
        <div className="lg:col-span-4 space-y-6">
          {/* 11. HUMAN APPROVAL GATE (Visible when block is ready/activated) */}
          {blockActivated && (
            <Card className="border-safe shadow-md bg-safe/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-safe flex items-center gap-2">
                  <ShieldCheck className="size-5" /> Emergency Block Active
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <strong>Section:</strong> CNB Outer – Line 1
                </p>
                <p>
                  <strong>Window:</strong> 18:20 – 20:00
                </p>
                <p>
                  <strong>Status:</strong> Field teams dispatched
                </p>
                <Progress value={30} indicatorClassName="bg-safe" className="h-2 mt-4" />
                <p className="text-[10px] text-center text-muted-foreground uppercase">
                  Restoration in progress
                </p>
              </CardContent>
            </Card>
          )}

          {/* 10. INCIDENT TIMELINE */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4" /> Incident Command Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-destructive bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-[3px] md:ml-0">
                    <AlertOctagon className="size-3 text-destructive" />
                  </div>
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:text-right md:group-even:text-left">
                    <div className="text-xs font-bold text-foreground">17:24</div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Incident detected
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-joint bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-[3px] md:ml-0">
                    <BrainCircuit className="size-3 text-joint" />
                  </div>
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:text-right md:group-even:text-left">
                    <div className="text-xs font-bold text-foreground">17:25</div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Risk classified (94/100)
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-blue-500 bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-[3px] md:ml-0">
                    <Shield className="size-3 text-blue-500" />
                  </div>
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:text-right md:group-even:text-left">
                    <div className="text-xs font-bold text-foreground">17:26</div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Protection recommended
                    </div>
                  </div>
                </div>

                {showOptions && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-[3px] md:ml-0">
                      <Zap className="size-3 text-primary" />
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:text-right md:group-even:text-left">
                      <div className="text-xs font-bold text-foreground">Just now</div>
                      <div className="text-xs text-primary font-medium">Re-block generated</div>
                    </div>
                  </div>
                )}

                {blockActivated && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-safe bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-[3px] md:ml-0">
                      <CheckCircle2 className="size-3 text-safe" />
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:text-right md:group-even:text-left">
                      <div className="text-xs font-bold text-safe">Just now</div>
                      <div className="text-xs text-safe font-medium">Block Activated</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 13 & 14. RESOURCES & RESPONSE TIME */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="size-4" /> Emergency Response Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">Detect → Assess:</span>{" "}
                  <span className="font-semibold">1m 12s</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Assess → Rec:</span>{" "}
                  <span className="font-semibold">38s</span>
                </div>
                <div className="col-span-2 pt-2 mt-1 border-t flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                    Total Response
                  </span>
                  <Badge variant="outline" className="bg-safe/10 text-safe border-safe/20">
                    4m 41s (Target &lt; 5m)
                  </Badge>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic">
                Demo / simulated response metrics
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="size-4" /> Response Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Engineering Team</span>
                  <span className="text-safe flex items-center text-xs">
                    <CheckCircle2 className="size-3 mr-1" /> Available
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">S&T Team</span>
                  <span className="text-safe flex items-center text-xs">
                    <CheckCircle2 className="size-3 mr-1" /> Available
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">TRD Team</span>
                  <span className="text-warn flex items-center text-xs">
                    <AlertTriangle className="size-3 mr-1" /> 1 team occupied
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Control Room</span>
                  <span className="text-blue-500 flex items-center text-xs">
                    <RadioTower className="size-3 mr-1" /> Notified
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 16. WHAT-IF SIMULATION */}
        <Card className="border-border shadow-sm bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="size-4" /> Emergency What-If Simulator
            </CardTitle>
            <CardDescription className="text-xs">
              Dynamically project alternative response parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 p-3 bg-background rounded-lg border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">If block starts 20 minutes later...</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() => {
                    setWhatIfDelay("+17 min");
                    setWhatIfRisk("HIGHER");
                  }}
                >
                  Simulate
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">
                  Projected Delay
                </p>
                <p className="text-xl font-bold text-destructive">{whatIfDelay}</p>
                <p className="text-[10px] text-muted-foreground">5 trains affected</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">
                  Risk Assessment
                </p>
                <p className="text-xl font-bold text-destructive">{whatIfRisk}</p>
                <Badge
                  variant="outline"
                  className="mt-1 text-[10px] bg-destructive/10 text-destructive border-destructive/20"
                >
                  Not Recommended
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 17. RESTORATION TRACKER */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4" /> Restoration Tracker
            </CardTitle>
            <CardDescription className="text-xs">Live field response monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-safe flex flex-col items-center gap-1">
                <CheckCircle2 className="size-4" /> Incident
              </span>
              <span className="w-8 h-px bg-safe"></span>
              <span className="text-safe flex flex-col items-center gap-1">
                <CheckCircle2 className="size-4" /> Protect
              </span>
              <span className="w-8 h-px bg-safe"></span>
              <span className="text-safe flex flex-col items-center gap-1">
                <CheckCircle2 className="size-4" /> Dispatch
              </span>
              <span className="w-8 h-px bg-border"></span>
              <span className="text-primary flex flex-col items-center gap-1">
                <Loader2 className="size-4 animate-spin" /> Repair
              </span>
              <span className="w-8 h-px bg-border"></span>
              <span className="text-muted-foreground flex flex-col items-center gap-1">
                <XCircle className="size-4" /> Clear
              </span>
            </div>
            <Progress value={60} className="h-1.5 mt-4" />
          </CardContent>
        </Card>
      </div>

      {/* 18. EMERGENCY INCIDENT HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Incident History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emergencyHistory.map((emg) => (
                <TableRow key={emg.id}>
                  <TableCell className="font-medium text-xs">{emg.id}</TableCell>
                  <TableCell className="text-xs">{emg.type}</TableCell>
                  <TableCell className="text-xs">{emg.section}</TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${emg.severity === "HIGH" ? "text-warn border-warn/30" : "text-yellow-500 border-yellow-500/30"}`}
                    >
                      {emg.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{emg.start}</TableCell>
                  <TableCell className="text-xs">{emg.duration}</TableCell>
                  <TableCell className="text-xs">
                    <Badge className="bg-safe/20 text-safe hover:bg-safe/20">Resolved</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI RECOMMENDATION DRAWER */}
      <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
        <SheetContent className="sm:max-w-md border-joint/20 border-l">
          <SheetHeader className="border-b pb-4 mb-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-joint">
              <BrainCircuit className="size-5" /> IR-ABPS Recommendation
            </SheetTitle>
            <SheetDescription>Detailed analysis for SOS-CNB-001</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-secondary/10 rounded-md border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                  Incident
                </p>
                <p className="font-medium">Track fracture</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Risk</p>
                <p className="font-bold text-destructive">94/100</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-2 uppercase text-xs tracking-wider border-b pb-1">
                Why this window?
              </h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="size-4 text-safe shrink-0" /> Lowest predicted train
                  disruption (+8 min avg)
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="size-4 text-safe shrink-0" /> Existing maintenance
                  request overlap (TRD)
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="size-4 text-safe shrink-0" /> Adequate restoration buffer
                  for field team
                </li>
              </ul>
            </div>

            <div className="bg-joint/5 p-4 rounded-lg border border-joint/20">
              <h4 className="font-bold text-joint mb-2">Projected Impact (Option C)</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold">8m</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Avg Delay</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-safe">23m</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Saved</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary">1</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Block Req</p>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter className="mt-8 flex-col sm:flex-col gap-2">
            <Button
              className="w-full bg-primary"
              onClick={() => {
                setAiDrawerOpen(false);
                setApprovalModalOpen(true);
              }}
            >
              APPROVE AI PLAN
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setAiDrawerOpen(false)}>
              CLOSE
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 11. HUMAN APPROVAL MODAL */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="sm:max-w-md border-primary/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" /> Emergency Action Authorization
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs">
              AI recommends — authorized officer decides. Please confirm the selected emergency
              protocol.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-card border rounded-lg p-4 space-y-3 my-2">
            <div className="grid grid-cols-[100px_1fr] text-sm">
              <span className="text-muted-foreground text-xs uppercase">Action</span>
              <span className="font-bold text-primary">Activate Option C</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] text-sm">
              <span className="text-muted-foreground text-xs uppercase">Section</span>
              <span className="font-medium">CNB Outer – Line 1</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] text-sm">
              <span className="text-muted-foreground text-xs uppercase">Window</span>
              <span className="font-medium">18:20 – 20:00</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] text-sm">
              <span className="text-muted-foreground text-xs uppercase">Safety</span>
              <span className="font-bold text-safe">HIGH</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setApprovalModalOpen(false)}>
              CANCEL
            </Button>
            <Button variant="outline" className="text-muted-foreground">
              REQUEST ALT
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 font-bold ml-auto"
              onClick={handleApprove}
            >
              CONFIRM & ACTIVATE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
