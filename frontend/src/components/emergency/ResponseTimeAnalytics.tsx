import { Clock, CheckCircle2, TrendingDown, Target, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RESPONSE_PERFORMANCE_METRICS } from "@/lib/emergency-data";

export function ResponseTimeAnalytics() {
  const m = RESPONSE_PERFORMANCE_METRICS;

  return (
    <div className="rounded-xl border border-border/80 bg-card/70 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-safe" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Emergency Response Performance
          </h3>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-safe/30 text-safe bg-safe/10">
          <CheckCircle2 className="size-3 mr-1" /> {m.status}
        </Badge>
      </div>

      {/* Target Comparison Banner */}
      <div className="mb-4 rounded-lg border border-safe/30 bg-safe/10 p-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            TOTAL CRITICAL PATH TIME
          </span>
          <span className="text-xl font-mono font-bold text-safe">
            {m.totalResponse}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            DIVISIONAL SLA TARGET
          </span>
          <span className="text-xs font-mono font-semibold text-foreground">
            {m.target} (Max threshold)
          </span>
        </div>
      </div>

      {/* Stage Benchmarks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
            Detection → Assess
          </span>
          <span className="font-mono font-bold text-foreground mt-0.5 block">
            {m.detectionToAssessment}
          </span>
          <span className="text-[10px] text-safe font-mono">Sensors sync</span>
        </div>

        <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
            Assess → Recommend
          </span>
          <span className="font-mono font-bold text-foreground mt-0.5 block">
            {m.assessmentToRecommendation}
          </span>
          <span className="text-[10px] text-primary font-mono">AI Brain solver</span>
        </div>

        <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
            Recommend → Approval
          </span>
          <span className="font-mono font-bold text-foreground mt-0.5 block">
            {m.recommendationToApproval}
          </span>
          <span className="text-[10px] text-amber-400 font-mono">Officer decision</span>
        </div>

        <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
            Approval → Protect
          </span>
          <span className="font-mono font-bold text-foreground mt-0.5 block">
            {m.approvalToProtection}
          </span>
          <span className="text-[10px] text-safe font-mono">Interlock locked</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="italic flex items-center gap-1">
          <Info className="size-3" /> Demo / simulated response metrics
        </span>
        <span className="font-mono text-safe">Target: {m.target}</span>
      </div>
    </div>
  );
}
