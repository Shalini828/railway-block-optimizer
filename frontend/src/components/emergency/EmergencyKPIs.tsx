import { 
  AlertOctagon, 
  AlertTriangle, 
  ShieldCheck, 
  BrainCircuit, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EmergencyKPIsProps {
  activeCount: number;
  criticalCount: number;
  protectedSectionsCount: number;
  aiRecommendationsCount: number;
  delayAvoidedMinutes: number;
}

export function EmergencyKPIs({
  activeCount = 2,
  criticalCount = 1,
  protectedSectionsCount = 2,
  aiRecommendationsCount = 3,
  delayAvoidedMinutes = 46,
}: EmergencyKPIsProps) {
  return (
    <div className="mb-8 grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {/* 1. ACTIVE EMERGENCIES */}
      <Card className="border-border/80 bg-card/60 shadow-sm transition-all hover:border-border">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              ACTIVE EMERGENCIES
            </p>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-foreground">
                {activeCount}
              </span>
              <span className="inline-flex items-center text-[11px] font-semibold text-amber-400">
                <ArrowUpRight className="size-3 mr-0.5" /> +1 in last hour
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active corridor disruptions</p>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">Status</span>
            <span className="font-semibold text-amber-400">Live Response</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. CRITICAL INCIDENTS */}
      <Card className={`border-border/80 shadow-sm transition-all ${criticalCount > 0 ? "border-destructive/40 bg-destructive/10" : "bg-card/60"}`}>
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              CRITICAL INCIDENTS
            </p>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive/20 text-destructive border border-destructive/30">
              <AlertOctagon className="size-4 animate-pulse" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-destructive">
                {criticalCount}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/20 px-1.5 py-0.5 rounded">
                Priority 1
              </span>
            </div>
            <p className="text-[11px] text-destructive/90 mt-0.5 font-medium">
              Requires immediate review
            </p>
          </div>
          <div className="pt-2 border-t border-destructive/20 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">Safety Hazard</span>
            <span className="font-bold text-destructive">Track Discontinuity</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. TRAFFIC PROTECTED */}
      <Card className="border-border/80 bg-card/60 shadow-sm transition-all hover:border-border">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              TRAFFIC PROTECTED
            </p>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-blue-400">
                {protectedSectionsCount}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">sections</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Protected by active blocks
            </p>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">Signal Interlock</span>
            <span className="font-semibold text-blue-400">Locked at DANGER</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. AI RE-BLOCK RECOMMENDATIONS */}
      <Card className="border-border/80 bg-card/60 shadow-sm transition-all hover:border-primary/40">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              AI RE-BLOCK RECOMMENDATIONS
            </p>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary border border-primary/30">
              <BrainCircuit className="size-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-primary">
                {aiRecommendationsCount}
              </span>
              <span className="text-xs font-semibold text-primary/80">options generated</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Awaiting officer review
            </p>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">IR-ABPS Brain</span>
            <span className="font-semibold text-primary">Option C Recommended</span>
          </div>
        </CardContent>
      </Card>

      {/* 5. ESTIMATED DELAY AVOIDED */}
      <Card className="border-border/80 bg-card/60 shadow-sm transition-all hover:border-safe/40 col-span-2 sm:col-span-1">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              ESTIMATED DELAY AVOIDED
            </p>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-safe/15 text-safe border border-safe/30">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-safe">
                {delayAvoidedMinutes}
              </span>
              <span className="text-xs font-semibold text-safe">min</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Projected impact reduction
            </p>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">Punctuality Saving</span>
            <span className="font-semibold text-safe flex items-center gap-1">
              <TrendingDown className="size-3" /> ↓ 74% Delay
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
