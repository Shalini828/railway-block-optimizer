import { TrendingDown, ArrowDownRight, Layers, ShieldAlert, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function EmergencyImpactComparison() {
  return (
    <div className="mb-8 rounded-xl border border-border/80 bg-card/70 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Re-Blocking Impact Simulation
            </h3>
            <Badge variant="outline" className="border-safe/30 text-safe text-[10px] font-semibold bg-safe/10">
              BENCHMARK
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparative analysis between legacy ad-hoc blocking vs. IR-ABPS AI synchronized emergency re-blocking.
          </p>
        </div>

        <span className="text-[11px] font-mono text-amber-400/90 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20 sm:self-center">
          Projected simulation — requires officer approval
        </span>
      </div>

      <div className="grid md:grid-cols-12 gap-4 mt-5">
        {/* Without Optimization (Col 5) */}
        <div className="md:col-span-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-destructive/20 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                <AlertCircle className="size-3.5" /> WITHOUT OPTIMIZATION (UNPLANNED)
              </span>
              <Badge variant="destructive" className="text-[10px]">
                HIGH DISRUPTION
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-destructive/20">
                <span className="text-muted-foreground">Cumulative Train Delay</span>
                <span className="font-mono font-bold text-destructive text-sm">31 min</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-destructive/20">
                <span className="text-muted-foreground">Affected Passenger Trains</span>
                <span className="font-mono font-bold text-destructive text-sm">7 trains</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-destructive/20">
                <span className="text-muted-foreground">Separate Work Windows</span>
                <span className="font-mono font-bold text-destructive text-sm">3 windows</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-destructive/20">
                <span className="text-muted-foreground">Estimated Network Disruption</span>
                <span className="font-bold text-destructive">HIGH (Spillover to PRYJ)</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            *Sequential uncoordinated blocks cause Rajdhani expresses to hold at outer home signals.
          </p>
        </div>

        {/* Visual Improvement Indicators (Col 2) */}
        <div className="md:col-span-2 flex flex-col justify-center items-center gap-3 p-3 rounded-lg border border-border/60 bg-secondary/20 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            PROJECTED GAINS
          </span>

          <div className="rounded-md bg-safe/10 border border-safe/30 px-3 py-2 w-full">
            <span className="text-base sm:text-lg font-mono font-bold text-safe block flex items-center justify-center gap-1">
              <TrendingDown className="size-4" /> ↓ 74%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Projected Delay
            </span>
          </div>

          <div className="rounded-md bg-safe/10 border border-safe/30 px-3 py-2 w-full">
            <span className="text-base sm:text-lg font-mono font-bold text-safe block flex items-center justify-center gap-1">
              <TrendingDown className="size-4" /> ↓ 67%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Affected Trains
            </span>
          </div>

          <div className="rounded-md bg-primary/10 border border-primary/30 px-3 py-2 w-full">
            <span className="text-base sm:text-lg font-mono font-bold text-primary block">
              3 → 1
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Work Windows
            </span>
          </div>
        </div>

        {/* With AI Re-Block (Col 5) */}
        <div className="md:col-span-5 rounded-lg border border-safe/30 bg-safe/5 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-safe/20 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-safe flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> WITH AI RE-BLOCK (OPTION C)
              </span>
              <Badge className="bg-safe/20 text-safe hover:bg-safe/20 text-[10px]">
                OPTIMIZED / LOW
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-safe/20">
                <span className="text-muted-foreground">Cumulative Train Delay</span>
                <span className="font-mono font-bold text-safe text-sm">8 min</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-safe/20">
                <span className="text-muted-foreground">Affected Passenger Trains</span>
                <span className="font-mono font-bold text-safe text-sm">3 trains</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-safe/20">
                <span className="text-muted-foreground">Coordinated Windows</span>
                <span className="font-mono font-bold text-safe text-sm">1 bundled window</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-safe/20">
                <span className="text-muted-foreground">Estimated Network Disruption</span>
                <span className="font-bold text-safe">LOW (Contained locally)</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 italic">
            *Emergency track fracture repair bundled with pending S&amp;T maintenance in a single scheduled slot.
          </p>
        </div>
      </div>
    </div>
  );
}
