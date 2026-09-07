import { Link } from "@tanstack/react-router";
import { 
  CheckCircle2, 
  CircleDot, 
  Circle, 
  Clock, 
  BarChart3, 
  ArrowRight,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RestorationStage } from "@/lib/emergency-data";

interface RestorationTrackerProps {
  stages: RestorationStage[];
  eta?: string;
}

export function RestorationTracker({
  stages,
  eta = "19:55",
}: RestorationTrackerProps) {
  return (
    <div className="mb-8 rounded-xl border border-border/80 bg-card/70 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Wrench className="size-4 text-primary" />
              Restoration Tracker &amp; Milestone Pipeline
            </h3>
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
              FIELD LINK
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sequential tracking from initial acoustic detection to post-repair ultrasonic safety clearance and line release.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          <span className="text-xs font-mono text-muted-foreground">Expected Line Release:</span>
          <span className="text-xs font-mono font-bold text-safe bg-safe/10 px-2 py-0.5 rounded border border-safe/30">
            ETA {eta}
          </span>
        </div>
      </div>

      {/* Horizontal Milestone Pipeline */}
      <div className="my-6 overflow-x-auto pb-2">
        <div className="min-w-[700px] flex items-center justify-between relative">
          {/* Background Connecting Bar */}
          <div className="absolute top-4 left-6 right-6 h-1 bg-border/80 z-0"></div>

          {stages.map((st, idx) => {
            const isDone = st.status === "completed";
            const isCurrent = st.status === "current";

            return (
              <div
                key={st.step}
                className="relative z-10 flex flex-col items-center text-center w-24 group"
              >
                {/* Node icon / indicator */}
                <div
                  className={`flex size-8 items-center justify-center rounded-full border-2 transition-all shadow-sm ${
                    isDone
                      ? "border-safe bg-safe text-safe-foreground"
                      : isCurrent
                      ? "border-primary bg-primary text-primary-foreground animate-pulse ring-4 ring-primary/20"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4" />
                  ) : isCurrent ? (
                    <CircleDot className="size-4" />
                  ) : (
                    <Circle className="size-3.5 opacity-50" />
                  )}
                </div>

                {/* Stage Title */}
                <span
                  className={`mt-2 text-[11px] font-bold uppercase tracking-wider block ${
                    isCurrent
                      ? "text-primary"
                      : isDone
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {st.name}
                </span>

                {/* Status subtext */}
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {isDone ? "✓ " + (st.time || "Done") : isCurrent ? "● In progress" : "○ Pending"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Link To Later Impact Analytics Page (Requirement 17) */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Connected to Post-Block Impact Analytics
            </h4>
            <p className="text-xs text-muted-foreground">
              Following line clearance, all downtime minutes, coordinated asset uptime gains, and speed recovery metrics are automatically archived into Impact Analytics.
            </p>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0"
        >
          <Link to="/analytics">
            <span>View Impact Analytics</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
