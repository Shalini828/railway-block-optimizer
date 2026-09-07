import { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  BrainCircuit, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  TrainFront, 
  Wrench, 
  ChevronRight,
  Sparkles,
  ArrowRight,
  Radio,
  FileSearch,
  CheckCircle2,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { EmergencyIncident } from "@/lib/emergency-data";

interface IncidentCommandConsoleProps {
  incident: EmergencyIncident;
  onViewAiReasoning: () => void;
  onJumpToReblock: () => void;
}

export function IncidentCommandConsole({
  incident,
  onViewAiReasoning,
  onJumpToReblock,
}: IncidentCommandConsoleProps) {
  // Live elapsed timer state
  const [elapsedMinutes, setElapsedMinutes] = useState(37);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMinutes(prev => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-destructive/40 bg-card/80 shadow-md">
      {/* Top Banner with High-Priority Incident Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-destructive/20 text-destructive border border-destructive/40">
            <Radio className="size-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                Active Incident Command Console
              </span>
              <span className="rounded bg-destructive text-destructive-foreground px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {incident.severity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time telemetry and decision-support link for primary corridor disruption
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="border-border bg-secondary/60 text-xs font-mono">
            ID: <span className="font-bold text-foreground ml-1">{incident.id}</span>
          </Badge>
          <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            <span className="size-1.5 rounded-full bg-blue-400"></span>
            TRAFFIC PROTECTED
          </div>
        </div>
      </div>

      {/* Main Console Split Grid */}
      <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
        {/* LEFT SIDE: Incident Information (7 Cols) */}
        <div className="p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  INCIDENT CLASSIFICATION
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-0.5">
                  <span className="text-destructive font-mono">⚠</span> {incident.type.toUpperCase()}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <MapPin className="size-3.5 text-destructive shrink-0" />
                  <span className="font-semibold text-foreground">{incident.location}</span>
                  <span>·</span>
                  <span>{incident.line}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  DETECTED
                </p>
                <p className="text-xl font-mono font-bold text-foreground">
                  {incident.detectedTime}
                </p>
                <p className="text-[11px] font-mono text-amber-400">
                  {elapsedMinutes}m elapsed
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded-lg border border-border/60">
              {incident.description}
            </p>

            {/* Incident Spec Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border/70 bg-secondary/20 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  ASSET IDENTIFIER
                </span>
                <span className="text-sm font-mono font-bold text-foreground mt-0.5 block">
                  {incident.assetId}
                </span>
                <span className="text-[10px] text-muted-foreground">Ultrasonic Monitored</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-secondary/20 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  RISK RATING
                </span>
                <span className="text-sm font-bold text-destructive mt-0.5 flex items-center gap-1">
                  5 / 5 <span className="text-[10px] uppercase font-mono">(CRITICAL)</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Immediate track risk</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-secondary/20 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  AFFECTED CORRIDOR
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5 block font-mono">
                  {incident.affectedCorridor}
                </span>
                <span className="text-[10px] text-muted-foreground">Main line passenger artery</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-secondary/20 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  TRAIN EXPOSURE
                </span>
                <span className="text-sm font-bold text-amber-400 mt-0.5 flex items-center gap-1.5">
                  <TrainFront className="size-3.5" /> {incident.trainExposure} scheduled trains
                </span>
                <span className="text-[10px] text-muted-foreground">3 within next 60 mins</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-secondary/20 p-2.5 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  ESTIMATED RESTORATION
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-mono font-bold text-foreground">
                    {incident.estimatedRestoration}
                  </span>
                  <span className="text-xs font-mono text-safe font-semibold">
                    ETA: {incident.etaRestoration}
                  </span>
                </div>
                <div className="w-full bg-secondary/60 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-primary h-full rounded-full" style={{ width: "35%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-safe"></span>
              <span>Central Control Notified</span>
              <span>·</span>
              <span className="size-2 rounded-full bg-safe"></span>
              <span>Field Team Dispatched</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onJumpToReblock}
              className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10"
            >
              <span>Explore Re-Block Options</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* RIGHT SIDE: IR-ABPS AI Assessment (5 Cols) */}
        <div className="p-5 sm:p-6 lg:col-span-5 bg-primary/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary border border-primary/30">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    IR-ABPS AI Assessment
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    Autonomous Multi-Factor Threat Engine
                  </span>
                </div>
              </div>
              <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-primary/30 text-[10px]">
                CONFIDENCE {incident.confidence}%
              </Badge>
            </div>

            {/* Risk Score Visual Gauge */}
            <div className="rounded-lg border border-border/80 bg-card/90 p-4 shadow-sm mb-4">
              <div className="flex items-end justify-between mb-1.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    RISK SCORE
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-mono font-bold text-destructive">
                      {incident.riskScore}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="font-bold text-[10px] uppercase tracking-wider">
                    {incident.severity}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">Severe Speed Degradation</p>
                </div>
              </div>

              {/* Multi-segment Risk Bar */}
              <div className="w-full bg-secondary/70 h-2.5 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                <div className="bg-safe h-full rounded-l" style={{ width: "30%" }}></div>
                <div className="bg-warn h-full" style={{ width: "30%" }}></div>
                <div className="bg-destructive h-full rounded-r" style={{ width: "34%" }}></div>
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-mono">
                <span>0 (Nominal)</span>
                <span>50 (Moderate)</span>
                <span className="text-destructive font-bold">94 (Critical)</span>
              </div>
            </div>

            {/* AI Reasoning Explanation (WHY) */}
            <div className="space-y-2 mb-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FileSearch className="size-3.5 text-primary" /> AI REASONING &amp; ROOT CAUSES:
              </p>
              <ul className="space-y-1.5 text-xs text-foreground/90 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-bold mt-0.5">•</span>
                  <span><strong>Track fracture detected:</strong> 14mm rail web fissure on high-density Up Main.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span><strong>Passenger corridor affected:</strong> CNB → ALD carries 34 Rajdhani &amp; Express rakes daily.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span><strong>7 trains potentially exposed:</strong> Headway cascade will trigger unmanaged speed restrictions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span><strong>Existing maintenance window unavailable:</strong> Next scheduled shadow block is 14 hours away.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-safe font-bold mt-0.5">•</span>
                  <span><strong>Adjacent engineering request can be coordinated:</strong> Overlapping with 2 pending S&amp;T tasks.</span>
                </li>
              </ul>
            </div>

            {/* AI Recommendation Summary */}
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 mb-4 text-xs">
              <p className="font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Sparkles className="size-3.5" /> Recommended Response:
              </p>
              <p className="text-foreground mt-1 font-medium">
                Immediate protective block + coordinated engineering response to prevent corridor gridlock.
              </p>
            </div>
          </div>

          {/* Drawer Trigger Button */}
          <Button
            onClick={onViewAiReasoning}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-9 shadow-sm"
          >
            <BrainCircuit className="size-4" />
            <span>VIEW AI REASONING &amp; CONSTRAINTS</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
