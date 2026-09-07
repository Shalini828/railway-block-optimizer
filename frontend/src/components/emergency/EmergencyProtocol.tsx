import { CheckCircle2, Clock, ShieldCheck, ArrowRight, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProtocolStep } from "@/lib/emergency-data";

interface EmergencyProtocolProps {
  steps: ProtocolStep[];
  currentStepIndex?: number;
}

export function EmergencyProtocol({
  steps,
  currentStepIndex = 7, // Step 7: Obtain authorized approval
}: EmergencyProtocolProps) {
  const completedCount = steps.filter(s => s.status === "completed").length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-xl border border-border/80 bg-card/70 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Emergency Response Protocol
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            10-point standardized crisis mitigation procedure under Indian Railways SOP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-foreground">
            Step {currentStepIndex} of 10
          </span>
          <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px]">
            {progressPercent}% COMPLETE
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1 font-mono">
          <span>Verification &amp; Protection</span>
          <span className="text-primary font-bold">Officer Approval</span>
          <span>Field Restoration</span>
        </div>
        <Progress value={progressPercent} className="h-2 bg-secondary" />
      </div>

      {/* 10 Steps Grid / List */}
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div
              key={step.step}
              className={`p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                isCurrent
                  ? "border-primary bg-primary/10 ring-1 ring-primary/50 shadow-xs"
                  : isCompleted
                  ? "border-safe/30 bg-safe/5"
                  : "border-border/60 bg-secondary/20 opacity-70"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <div className="flex size-5 items-center justify-center rounded-full bg-safe/20 text-safe">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                ) : isCurrent ? (
                  <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-bold animate-pulse">
                    {step.step}
                  </div>
                ) : (
                  <div className="flex size-5 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground font-mono text-[10px]">
                    {step.step}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                    {step.step}. {step.title}
                  </p>
                  {isCurrent && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-1 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
