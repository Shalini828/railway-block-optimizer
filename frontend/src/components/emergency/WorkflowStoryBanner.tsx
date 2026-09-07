import { 
  AlertOctagon, 
  BrainCircuit, 
  TrainFront, 
  Sliders, 
  Star, 
  UserCheck, 
  ShieldCheck, 
  Wrench, 
  BarChart3, 
  ChevronRight,
  Sparkles
} from "lucide-react";

export function WorkflowStoryBanner() {
  const steps = [
    { label: "INCIDENT", sub: "Track Fracture", icon: AlertOctagon, color: "text-destructive" },
    { label: "AI RISK", sub: "Score: 94/100", icon: BrainCircuit, color: "text-primary" },
    { label: "IMPACT", sub: "7 Trains Exposed", icon: TrainFront, color: "text-amber-400" },
    { label: "OPTIMIZATION", sub: "3 Re-Block Windows", icon: Sliders, color: "text-primary" },
    { label: "AI CHOICE", sub: "Option C Rec.", icon: Star, color: "text-safe" },
    { label: "APPROVAL", sub: "Officer Gate", icon: UserCheck, color: "text-amber-400" },
    { label: "PROTECTION", sub: "Signals Locked", icon: ShieldCheck, color: "text-blue-400" },
    { label: "RESTORATION", sub: "Field Tracking", icon: Wrench, color: "text-primary" },
    { label: "ANALYTICS", sub: "↓74% Delay Saved", icon: BarChart3, color: "text-safe" },
  ];

  return (
    <div className="mb-8 rounded-xl border border-primary/30 bg-card/60 p-3.5 sm:p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            End-to-End Decision Support Workflow
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          Detect → Assess → Optimize → Approve → Protect → Restore
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[820px] flex items-center justify-between">
          {steps.map((st, i) => {
            const Icon = st.icon;
            const isLast = i === steps.length - 1;

            return (
              <div key={st.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-secondary/30 px-2.5 py-1.5 rounded-lg border border-border/60">
                  <Icon className={`size-3.5 ${st.color} shrink-0`} />
                  <div className="leading-tight text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground block">
                      {st.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono block">
                      {st.sub}
                    </span>
                  </div>
                </div>

                {!isLast && (
                  <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
