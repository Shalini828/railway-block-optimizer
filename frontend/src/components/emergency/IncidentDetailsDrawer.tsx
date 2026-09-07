import { 
  AlertOctagon, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  RadioTower, 
  Wrench, 
  FileText, 
  TrainFront,
  Activity,
  CheckCircle2
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EmergencyIncident } from "@/lib/emergency-data";

interface IncidentDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: EmergencyIncident | null;
  onResolve: (id: string) => void;
  onViewAiPlan: (id: string) => void;
}

export function IncidentDetailsDrawer({
  open,
  onOpenChange,
  incident,
  onResolve,
  onViewAiPlan,
}: IncidentDetailsDrawerProps) {
  if (!incident) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md border-l border-border bg-card/95 backdrop-blur text-left flex flex-col justify-between">
        <div className="space-y-5 pb-6">
          <SheetHeader className="border-b border-border/60 pb-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant={incident.severity === "CRITICAL" ? "destructive" : "outline"}
                className="text-[10px] font-bold tracking-wider uppercase"
              >
                {incident.severity} EMERGENCY
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
            </div>
            <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
              {incident.type}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {incident.location || incident.section} · {incident.line}
            </SheetDescription>
          </SheetHeader>

          {/* Description */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 text-xs text-foreground/90">
            <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
              TELEMETRY LOG
            </p>
            <p>{incident.description}</p>
          </div>

          {/* Spec details grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/20 p-3 rounded-lg border border-border/50">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Detected At
              </span>
              <span className="font-mono font-bold text-foreground mt-0.5 block">
                {incident.detectedTime}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Asset ID
              </span>
              <span className="font-mono font-bold text-foreground mt-0.5 block">
                {incident.assetId}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Risk Score
              </span>
              <span className="font-mono font-bold text-destructive mt-0.5 block">
                {incident.riskScore} / 100
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Train Exposure
              </span>
              <span className="font-mono font-bold text-amber-400 mt-0.5 block">
                {incident.trainExposure} trains
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Est. Restoration
              </span>
              <span className="font-mono font-bold text-foreground mt-0.5 block">
                {incident.estimatedRestoration}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Restoration ETA
              </span>
              <span className="font-mono font-bold text-safe mt-0.5 block">
                {incident.etaRestoration}
              </span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded border border-safe/30 bg-safe/5 text-xs">
              <div className="flex items-center gap-2">
                <RadioTower className="size-4 text-safe" />
                <span className="font-semibold text-foreground">Central Control</span>
              </div>
              <Badge className="bg-safe/20 text-safe hover:bg-safe/20 text-[10px]">
                Notified &amp; Logged
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded border border-blue-500/30 bg-blue-500/5 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-blue-400" />
                <span className="font-semibold text-foreground">Traffic Status</span>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[10px]">
                {incident.trafficStatus}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded border border-amber-500/30 bg-amber-500/5 text-xs">
              <div className="flex items-center gap-2">
                <Wrench className="size-4 text-amber-400" />
                <span className="font-semibold text-foreground">Field Crew</span>
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[10px]">
                Dispatched On-Site
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border mt-auto space-y-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              onViewAiPlan(incident.id);
            }}
            className="w-full text-xs h-9 bg-primary text-primary-foreground font-semibold"
          >
            VIEW AI RE-BLOCK PLAN
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onResolve(incident.id);
            }}
            className="w-full text-xs h-9 border-safe/40 text-safe hover:bg-safe/10 hover:text-safe font-semibold"
          >
            <CheckCircle2 className="size-4 mr-1.5" /> RESOLVE EMERGENCY BLOCK
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
