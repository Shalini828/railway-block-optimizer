import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  AlertOctagon, ShieldAlert, Siren, Zap, RadioTower, TrainFront,
  AlertTriangle, ShieldCheck, Clock, CheckCircle2, Map, Shield,
  ChevronRight, Info, PlusCircle, Activity
} from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Blocking | IR-ABPS" },
      { name: "description", content: "Initiate emergency disconnections and view active crisis blocks across the corridor." }
    ],
  }),
  component: EmergencyPage,
});

interface Emergency {
  id: string;
  type: string;
  section: string;
  line: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  startedAt: Date;
  controlNotified: boolean;
  trafficProtected: boolean;
}

interface ActivityEvent {
  id: string;
  time: Date;
  text: string;
  detail?: string;
}

const SECTIONS = [
  "New Delhi (NDLS) - Ghaziabad (GZB)",
  "Ghaziabad (GZB) - Kanpur (CNB)",
  "Kanpur (CNB) - Prayagraj (PRYJ)",
  "Prayagraj (PRYJ) - Varanasi (BSB)",
  "CNB Outer",
  "NDLS Station Limits"
];

const EMERGENCY_TYPES = [
  { value: "Track Fracture", group: "Track" },
  { value: "OHE Snapping", group: "Traction" },
  { value: "Signal Failure", group: "S&T" },
  { value: "Point Machine Failure", group: "S&T" },
  { value: "Bridge/Structure Risk", group: "Engineering" },
  { value: "Obstruction on Track", group: "Operations" },
  { value: "Other Critical Hazard", group: "General" },
];

// Initial mock data that can be manipulated in state
const INITIAL_EMERGENCIES: Emergency[] = [
  {
    id: "SOS-NDLS-002",
    type: "OHE Snapping",
    section: "New Delhi (NDLS) - Ghaziabad (GZB)",
    line: "Line 2",
    severity: "HIGH",
    startedAt: new Date(Date.now() - 10 * 60000), // 10 mins ago
    controlNotified: true,
    trafficProtected: true,
  },
  {
    id: "SOS-CNB-001",
    type: "Track Fracture",
    section: "CNB Outer",
    line: "Line 1",
    severity: "CRITICAL",
    startedAt: new Date(Date.now() - 25 * 60000), // 25 mins ago
    controlNotified: true,
    trafficProtected: true,
  },
];

const INITIAL_ACTIVITY: ActivityEvent[] = [
  { id: "e1", time: new Date(Date.now() - 25 * 60000), text: "Track fracture reported", detail: "CNB Outer" },
  { id: "e2", time: new Date(Date.now() - 24 * 60000), text: "Emergency block initiated", detail: "SOS-CNB-001" },
  { id: "e3", time: new Date(Date.now() - 23 * 60000), text: "Control notified", detail: "Automated alert sent" },
  { id: "e4", time: new Date(Date.now() - 22 * 60000), text: "Traffic protection confirmed", detail: "Signals set to DANGER" },
  { id: "e5", time: new Date(Date.now() - 10 * 60000), text: "OHE Snapping detected", detail: "NDLS - GZB" },
  { id: "e6", time: new Date(Date.now() - 9 * 60000), text: "Emergency block initiated", detail: "SOS-NDLS-002" },
  { id: "e7", time: new Date(Date.now() - 8 * 60000), text: "Traffic protection confirmed", detail: "Signals set to DANGER" },
];

function EmergencyPage() {
  const [emergencies, setEmergencies] = useState<Emergency[]>(INITIAL_EMERGENCIES);
  const [activity, setActivity] = useState<ActivityEvent[]>(INITIAL_ACTIVITY);

  const [newSection, setNewSection] = useState("");
  const [newType, setNewType] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState(false);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [detailsDrawer, setDetailsDrawer] = useState<string | null>(null);

  // Derived state
  const criticalCount = emergencies.filter(e => e.severity === "CRITICAL").length;
  
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-destructive text-destructive-foreground border-destructive/20";
      case "HIGH": return "bg-warn text-warn-foreground border-warn/20";
      case "MEDIUM": return "bg-yellow-500 text-yellow-950 border-yellow-500/20";
      default: return "bg-secondary text-foreground border-border";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "text-destructive";
      case "HIGH": return "text-warn";
      case "MEDIUM": return "text-yellow-500";
      default: return "text-foreground";
    }
  };

  const handleInitiateClick = () => {
    if (!newSection || !newType) {
      toast.error("Missing Information", { description: "Please select both section and emergency type." });
      return;
    }
    setConfirmModal(true);
  };

  const confirmInitiateSOS = () => {
    setConfirmModal(false);
    setIsInitiating(true);
    
    // Simulate API delay
    setTimeout(() => {
      const id = `SOS-${Math.floor(Math.random() * 900) + 100}`;
      const newEmergency: Emergency = {
        id,
        type: newType,
        section: newSection,
        line: "Main Line", // Simplified for demo
        severity: newType.includes("Fracture") || newType.includes("Disaster") || newType.includes("Hazard") ? "CRITICAL" : "HIGH",
        startedAt: new Date(),
        controlNotified: true,
        trafficProtected: true
      };
      
      const newEvents: ActivityEvent[] = [
        { id: `a_${Date.now()}_1`, time: new Date(), text: `${newType} reported`, detail: newSection },
        { id: `a_${Date.now()}_2`, time: new Date(), text: "Emergency block initiated", detail: id },
        { id: `a_${Date.now()}_3`, time: new Date(), text: "Traffic protection confirmed", detail: "Signals set to DANGER" }
      ];
      
      setEmergencies([newEmergency, ...emergencies]);
      setActivity([...newEvents, ...activity].sort((a, b) => b.time.getTime() - a.time.getTime()));
      setNewSection("");
      setNewType("");
      setIsInitiating(false);
      
      toast.success("Emergency block successfully initiated.", {
        description: `Traffic protected on ${newSection}.`,
      });
    }, 1500);
  };

  const confirmResolveBlock = () => {
    if (!resolveModal) return;
    
    const blockToResolve = emergencies.find(e => e.id === resolveModal);
    if (!blockToResolve) return;
    
    setEmergencies(emergencies.filter(e => e.id !== resolveModal));
    
    const resolveEvent: ActivityEvent = { 
      id: `r_${Date.now()}`, 
      time: new Date(), 
      text: "Emergency block resolved", 
      detail: `${blockToResolve.id} cleared` 
    };
    
    setActivity([resolveEvent, ...activity].sort((a, b) => b.time.getTime() - a.time.getTime()));
    setResolveModal(null);
    setDetailsDrawer(null);
    
    toast.success("Block Resolved", {
      description: `Emergency block ${blockToResolve.id} has been safely resolved.`,
    });
  };

  const getTimeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins === 0) return "Just now";
    return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeDrawerBlock = detailsDrawer ? emergencies.find(e => e.id === detailsDrawer) : null;
  const activeResolveBlock = resolveModal ? emergencies.find(e => e.id === resolveModal) : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Emergency Blocking (SOS)</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Immediate traffic protection and emergency block control across the corridor.
          </p>
        </div>
        <Button 
          className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
          size="lg"
          onClick={() => {
            const panel = document.getElementById("sos-panel");
            if (panel) panel.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Siren className="size-4 animate-pulse" />
          Trigger New SOS Block
        </Button>
      </div>

      {/* EMERGENCY STATUS STRIP */}
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm bg-secondary/5 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Active Emergency Blocks</p>
              <p className="text-2xl font-mono font-bold text-foreground">{emergencies.length}</p>
            </div>
            <div className="p-2 rounded-full bg-secondary text-muted-foreground">
              <AlertTriangle className="size-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={`shadow-sm border-border ${criticalCount > 0 ? 'bg-destructive/10' : 'bg-secondary/5'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Critical Incidents</p>
              <p className={`text-2xl font-mono font-bold ${criticalCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{criticalCount}</p>
            </div>
            <div className={`p-2 rounded-full ${criticalCount > 0 ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
              <AlertOctagon className="size-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm bg-secondary/5 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Control Notified</p>
              <p className="text-2xl font-mono font-bold text-safe">{emergencies.length}</p>
            </div>
            <div className="p-2 rounded-full bg-safe/10 text-safe">
              <RadioTower className="size-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm bg-secondary/5 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Traffic Protection</p>
              <p className={`text-xl font-bold ${emergencies.length > 0 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                {emergencies.length > 0 ? 'ACTIVE' : 'STANDBY'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${emergencies.length > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-secondary text-muted-foreground'}`}>
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN SOS ACTION PANEL */}
      <Card id="sos-panel" className="mb-8 border-destructive/50 bg-destructive/5 shadow-md overflow-hidden">
        <div className="bg-destructive/10 border-b border-destructive/20 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertOctagon className="size-5" />
              IMMEDIATE SOS ACTION
            </h2>
            <p className="text-xs text-destructive/80 mt-1">
              Use only for critical incidents requiring immediate traffic protection.
            </p>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end">
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold text-destructive">1</span>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Select Affected Section</label>
              </div>
              <Select value={newSection} onValueChange={setNewSection}>
                <SelectTrigger className="w-full bg-background border-destructive/30 focus:ring-destructive/50">
                  <SelectValue placeholder="Select affected section..." />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold text-destructive">2</span>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Select Emergency Type</label>
              </div>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-full bg-background border-destructive/30 focus:ring-destructive/50">
                  <SelectValue placeholder="Select emergency type..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(EMERGENCY_TYPES.map(t => t.group))).map(group => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50">{group}</div>
                      {EMERGENCY_TYPES.filter(t => t.group === group).map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.value}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full lg:w-auto space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold text-destructive">3</span>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Initiate Traffic Block</label>
              </div>
              <Button 
                size="lg" 
                variant="destructive" 
                onClick={handleInitiateClick} 
                className="w-full lg:w-[220px] font-bold tracking-wider text-sm h-10 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
                disabled={isInitiating}
              >
                {isInitiating ? (
                  <>Initiating protection...</>
                ) : (
                  <><ShieldAlert className="mr-2 size-5" /> INITIATE BLOCK</>
                )}
              </Button>
            </div>
          </div>
          
          <div className="mt-5 flex items-center gap-2 text-xs text-destructive/80 bg-destructive/10 p-2.5 rounded border border-destructive/20">
            <Info className="size-4 shrink-0" />
            <p><strong>Warning:</strong> Emergency blocks immediately protect the selected section, set signals to danger, and notify central control.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* ACTIVE EMERGENCY BLOCKS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="size-4" />
              Active Emergency Blocks
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold">{emergencies.length} active</span>
              <span>·</span>
              <span>Last updated: Just now</span>
            </div>
          </div>
          
          {emergencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-border border-dashed rounded-lg bg-secondary/5">
              <ShieldCheck className="size-10 text-safe mb-3 opacity-50" />
              <p className="font-semibold text-foreground">No active emergency blocks</p>
              <p className="text-sm text-muted-foreground mt-1">Corridor currently operating under normal emergency status.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {emergencies.map(emg => (
                <Card key={emg.id} className={`shadow-sm border-t-4 overflow-hidden flex flex-col ${getSeverityBadge(emg.severity).replace('text-', 'border-t-').replace('bg-', 'border-t-').split(' ')[0]}`}>
                  <CardHeader className="bg-secondary/10 p-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={`text-[10px] font-bold tracking-wider ${getSeverityBadge(emg.severity)}`}>
                        {emg.severity}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">{emg.id}</span>
                    </div>
                    <CardTitle className="text-base font-bold truncate" title={emg.type}>{emg.type}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1.5 mt-1 truncate" title={`${emg.section} · ${emg.line}`}>
                      <Map className="size-3 shrink-0" /> {emg.section} · {emg.line}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Started</span>
                        <span className="font-medium flex items-center gap-1"><Clock className="size-3" /> {getTimeAgo(emg.startedAt)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Impact</span>
                        <span className={`font-bold ${getSeverityColor(emg.severity)}`}>{emg.severity}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Control</span>
                        <span className="font-bold text-safe flex items-center gap-1"><RadioTower className="size-3" /> NOTIFIED</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Traffic Status</span>
                        <span className="font-bold text-blue-500 flex items-center gap-1"><ShieldCheck className="size-3" /> PROTECTED</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setDetailsDrawer(emg.id)}>
                        VIEW DETAILS
                      </Button>
                      <Button variant="outline" size="sm" className="w-full text-xs border-safe/30 text-safe hover:bg-safe/10 hover:text-safe" onClick={() => setResolveModal(emg.id)}>
                        RESOLVE BLOCK
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* INCIDENT ACTIVITY & SAFETY PROTOCOL */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border flex flex-col h-[400px]">
            <CardHeader className="p-4 border-b border-border/50 bg-secondary/5">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock className="size-4" />
                Emergency Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {activity.slice(0, 8).map((evt, i) => (
                  <div key={evt.id} className="flex gap-3 relative">
                    {i !== activity.slice(0, 8).length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-[-16px] w-[2px] bg-border" />
                    )}
                    <div className="mt-0.5 size-5 shrink-0 rounded-full bg-secondary border-2 border-background flex items-center justify-center z-10">
                      <div className="size-1.5 rounded-full bg-muted-foreground" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-foreground">{evt.text}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">{formatTime(evt.time)}</span>
                      </div>
                      {evt.detail && <p className="text-xs text-muted-foreground mt-0.5">{evt.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-blue-500">
                <Shield className="size-4" />
                Emergency Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2.5">
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Verify affected section before initiating a block.</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Emergency block triggers control-room notification.</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="size-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Maintain protection until authorized field clearance.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* INITIATE BLOCK MODAL */}
      <Dialog open={confirmModal} onOpenChange={setConfirmModal}>
        <DialogContent className="sm:max-w-md border-destructive/30 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="size-5" /> Confirm Emergency Block
            </DialogTitle>
            <DialogDescription className="text-foreground pt-2">
              You're about to initiate an emergency traffic block. All signals in the affected zone will immediately be set to danger.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-2 p-4 rounded-md bg-destructive/10 border border-destructive/20 space-y-3">
            <div className="grid grid-cols-[100px_1fr] items-start text-sm">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">Affected Section</span>
              <span className="font-bold text-foreground">{newSection}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-start text-sm">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">Emergency</span>
              <span className="font-bold text-foreground">{newType}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-start text-sm">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">Impact</span>
              <Badge variant="outline" className={`w-fit text-[10px] border-destructive/30 text-destructive`}>CRITICAL / HIGH</Badge>
            </div>
          </div>
          
          <DialogFooter className="flex sm:justify-between gap-3 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setConfirmModal(false)}>CANCEL</Button>
            <Button variant="destructive" onClick={confirmInitiateSOS} className="font-bold tracking-wider text-xs">CONFIRM & INITIATE BLOCK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESOLVE BLOCK MODAL */}
      <Dialog open={!!resolveModal} onOpenChange={(o) => !o && setResolveModal(null)}>
        <DialogContent className="sm:max-w-md border-safe/30 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-safe">
              <ShieldCheck className="size-5" /> Resolve Emergency Block?
            </DialogTitle>
          </DialogHeader>
          
          <div className="my-2 p-4 rounded-md bg-secondary/10 border border-border space-y-3">
            <div className="grid grid-cols-[100px_1fr] items-start text-sm">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">Section</span>
              <span className="font-bold text-foreground">{activeResolveBlock?.section}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-start text-sm">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">Incident</span>
              <span className="font-bold text-foreground">{activeResolveBlock?.type}</span>
            </div>
          </div>
          
          <div className="py-2">
            <p className="font-semibold text-sm">Has field clearance been received?</p>
            <p className="text-xs text-muted-foreground mt-1">Resolving this block will notify control to resume normal operations.</p>
          </div>
          
          <DialogFooter className="flex sm:justify-between gap-3 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setResolveModal(null)}>KEEP BLOCK ACTIVE</Button>
            <Button onClick={confirmResolveBlock} className="bg-safe text-safe-foreground hover:bg-safe/90 font-bold tracking-wider text-xs">CONFIRM RESOLUTION</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BLOCK DETAILS DRAWER */}
      <Sheet open={!!detailsDrawer} onOpenChange={(o) => !o && setDetailsDrawer(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md border-l border-border">
          <SheetHeader className="border-b border-border/50 pb-4 mb-4 text-left">
            <Badge variant="outline" className={`w-fit mb-2 text-[10px] font-bold tracking-wider ${activeDrawerBlock ? getSeverityBadge(activeDrawerBlock.severity) : ''}`}>
              {activeDrawerBlock?.severity} EMERGENCY
            </Badge>
            <SheetTitle className="text-xl">Emergency Incident</SheetTitle>
            <SheetDescription className="font-mono text-xs mt-1">
              {activeDrawerBlock?.id}
            </SheetDescription>
          </SheetHeader>
          
          {activeDrawerBlock && (
            <div className="space-y-6 pb-8">
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-secondary/10 p-4 rounded-lg border border-border/50">
                <div className="col-span-2">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Affected Section</p>
                  <p className="font-medium text-foreground">{activeDrawerBlock.section}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Line</p>
                  <p className="font-medium text-foreground">{activeDrawerBlock.line}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Emergency Type</p>
                  <p className="font-medium text-foreground">{activeDrawerBlock.type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Started</p>
                  <p className="font-medium text-foreground">{formatTime(activeDrawerBlock.startedAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Duration</p>
                  <p className="font-medium text-foreground">{getTimeAgo(activeDrawerBlock.startedAt).replace(' ago', '')}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded border border-safe/20 bg-safe/5">
                  <div className="flex items-center gap-2">
                    <RadioTower className="size-4 text-safe" />
                    <span className="text-sm font-semibold">Control Status</span>
                  </div>
                  <Badge className="bg-safe/20 text-safe hover:bg-safe/20">Notified</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-blue-500" />
                    <span className="text-sm font-semibold">Traffic Status</span>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20">Protected</Badge>
                </div>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3">
                <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Recommended Action</p>
                  <p className="text-sm text-foreground">Maintain emergency block until field clearance is received.</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Incident Timeline</p>
                <div className="space-y-4 px-2">
                  <TimelineNode text="Incident Detected" active={true} />
                  <TimelineNode text="SOS Block Initiated" active={true} />
                  <TimelineNode text="Control Notified" active={true} />
                  <TimelineNode text="Traffic Protected" active={true} />
                  <TimelineNode text="Awaiting Field Clearance" active={false} isLast={true} />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <Button 
                  className="w-full bg-safe text-safe-foreground hover:bg-safe/90 font-bold" 
                  onClick={() => {
                    setDetailsDrawer(null);
                    setTimeout(() => setResolveModal(activeDrawerBlock.id), 200);
                  }}
                >
                  <CheckCircle2 className="mr-2 size-4" /> RESOLVE BLOCK
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function TimelineNode({ text, active, isLast = false }: { text: string; active: boolean; isLast?: boolean }) {
  return (
    <div className="flex gap-3 relative">
      {!isLast && (
        <div className={`absolute left-[7px] top-5 bottom-[-16px] w-[2px] ${active ? 'bg-primary' : 'bg-border'}`} />
      )}
      <div className={`mt-0.5 size-4 shrink-0 rounded-full border-2 bg-background flex items-center justify-center z-10 ${active ? 'border-primary' : 'border-muted-foreground'}`}>
        {active && <div className="size-1.5 rounded-full bg-primary" />}
      </div>
      <div className="pb-2">
        <p className={`text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{text}</p>
      </div>
    </div>
  );
}
