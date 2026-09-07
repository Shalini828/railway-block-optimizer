import { 
  Sparkles, 
  BrainCircuit, 
  Clock, 
  ShieldCheck, 
  TrainFront, 
  Wrench, 
  CheckCircle2, 
  FileText, 
  TrendingDown,
  AlertTriangle
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
import type { ReblockOption, EmergencyIncident } from "@/lib/emergency-data";

interface AIRecommendationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: EmergencyIncident;
  selectedOption: ReblockOption;
  onApprovePlan: () => void;
}

export function AIRecommendationDrawer({
  open,
  onOpenChange,
  incident,
  selectedOption,
  onApprovePlan,
}: AIRecommendationDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md border-l border-border bg-card/95 backdrop-blur text-left flex flex-col justify-between">
        <div className="space-y-5 pb-6">
          <SheetHeader className="border-b border-border/60 pb-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold">
                <Sparkles className="size-3 mr-1" /> DECISION SUPPORT EXPLANATION
              </Badge>
              <Badge variant="destructive" className="text-[10px] font-mono">
                {incident.severity}
              </Badge>
            </div>
            <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
              IR-ABPS Emergency Recommendation
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Multi-criteria mathematical optimization rationale and corridor risk analysis.
            </SheetDescription>
          </SheetHeader>

          {/* Incident Quick Snapshot */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 p-3 rounded-lg border border-border/60">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                INCIDENT
              </span>
              <span className="font-bold text-foreground mt-0.5 block">
                {incident.type} ({incident.id})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                RISK RATING
              </span>
              <span className="font-bold text-destructive mt-0.5 block font-mono">
                {incident.riskScore} / 100 (Critical)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                AFFECTED ASSETS
              </span>
              <span className="font-bold text-foreground mt-0.5 block">
                3 assets (Track + TRD + S&amp;T)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                TRAIN EXPOSURE
              </span>
              <span className="font-bold text-amber-400 mt-0.5 block font-mono">
                {incident.trainExposure} scheduled trains
              </span>
            </div>
          </div>

          {/* Recommended Window Section */}
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                RECOMMENDED BLOCK WINDOW
              </span>
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                ★ OPTION C
              </Badge>
            </div>
            <p className="text-2xl font-mono font-bold text-foreground">
              18:20 – 20:00
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Duration: 1h 40m</span>
              <span className="text-safe font-semibold">Safety Score: 95/100</span>
            </div>
          </div>

          {/* WHY THIS WINDOW? */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <BrainCircuit className="size-3.5 text-primary" /> WHY THIS WINDOW?
            </h4>
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 text-xs space-y-2 text-foreground/90">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-safe shrink-0 mt-0.5" />
                <span>
                  <strong>Lowest predicted train disruption:</strong> Diverts secondary freight to loop lines and preserves Rajdhani express slots with minimal speed regulation.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-safe shrink-0 mt-0.5" />
                <span>
                  <strong>Existing maintenance request overlap:</strong> Synchronizes emergency track repair with 2 pending S&amp;T point inspections to avoid repetitive future blocks.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-safe shrink-0 mt-0.5" />
                <span>
                  <strong>Adequate restoration buffer:</strong> Provides a 25-minute buffer margin for ultrasonic weld testing before pilot train clearance.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-safe shrink-0 mt-0.5" />
                <span>
                  <strong>High safety margin:</strong> Complete track and overhead traction isolation under automatic interlocking lockouts.
                </span>
              </div>
            </div>
          </div>

          {/* PROJECTED IMPACT */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              PROJECTED IMPACT SUMMARY
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Projected Delay
                </span>
                <span className="text-base font-mono font-bold text-foreground mt-0.5 block">
                  +8 min
                </span>
              </div>
              <div className="p-2.5 rounded bg-safe/10 border border-safe/30">
                <span className="text-[10px] text-safe uppercase font-bold block">
                  Punctuality Saved
                </span>
                <span className="text-base font-mono font-bold text-safe mt-0.5 block">
                  23 min
                </span>
              </div>
              <div className="p-2.5 rounded bg-primary/10 border border-primary/30">
                <span className="text-[10px] text-primary uppercase font-bold block">
                  Coordination
                </span>
                <span className="text-base font-mono font-bold text-primary mt-0.5 block">
                  3 → 1 block
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <p className="font-semibold flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
              Safety Verification Required
            </p>
            <p className="text-[11px] text-amber-400/90 mt-0.5">
              Advisory output only. Officer authorization will transmit block requests directly to Divisional Train Control.
            </p>
          </div>
        </div>

        {/* Footer Action Button */}
        <div className="pt-4 border-t border-border mt-auto">
          <Button
            onClick={onApprovePlan}
            className="w-full gap-2 bg-safe text-safe-foreground hover:bg-safe/90 font-bold text-xs h-10 shadow-md"
          >
            <CheckCircle2 className="size-4" />
            <span>APPROVE PLAN &amp; AUTHORIZE BLOCK</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
