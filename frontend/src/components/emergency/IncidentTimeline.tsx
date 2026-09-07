import { 
  AlertTriangle, 
  AlertOctagon, 
  ShieldCheck, 
  RadioTower, 
  BrainCircuit, 
  UserCheck, 
  CheckCircle2, 
  Wrench, 
  Clock,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TimelineEvent } from "@/lib/emergency-data";

interface IncidentTimelineProps {
  events: TimelineEvent[];
}

export function IncidentTimeline({ events }: IncidentTimelineProps) {
  const getIcon = (type: TimelineEvent["iconType"], status: TimelineEvent["status"]) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="size-3.5 text-amber-400" />;
      case "risk":
        return <AlertOctagon className="size-3.5 text-destructive" />;
      case "shield":
        return <ShieldCheck className="size-3.5 text-blue-400" />;
      case "broadcast":
        return <RadioTower className="size-3.5 text-primary" />;
      case "bot":
        return <BrainCircuit className="size-3.5 text-primary" />;
      case "user":
        return <UserCheck className="size-3.5 text-amber-400" />;
      case "check":
        return <CheckCircle2 className="size-3.5 text-safe" />;
      case "tool":
        return <Wrench className="size-3.5 text-primary" />;
      case "clock":
        return <Clock className="size-3.5 text-muted-foreground" />;
      default:
        return <CheckCircle2 className="size-3.5 text-safe" />;
    }
  };

  const getBorderColor = (status: TimelineEvent["status"]) => {
    switch (status) {
      case "completed":
        return "border-safe/40 bg-safe/10";
      case "in-progress":
        return "border-primary/50 bg-primary/20 animate-pulse";
      case "pending":
        return "border-border bg-secondary/50";
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card/70 p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Incident Command Timeline
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
            LIVE LOG
          </Badge>
        </div>

        {/* Chronological Event Tree */}
        <div className="space-y-4 relative pl-2 pr-1">
          {events.map((evt, idx) => {
            const isLast = idx === events.length - 1;

            return (
              <div key={evt.id} className="relative flex gap-3 group">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`absolute left-[13px] top-6 bottom-[-16px] w-[2px] transition-colors ${
                      evt.status === "completed"
                        ? "bg-safe/40"
                        : evt.status === "in-progress"
                        ? "bg-primary/50"
                        : "bg-border/60"
                    }`}
                  />
                )}

                {/* Node Icon */}
                <div
                  className={`relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border shadow-xs transition-all ${getBorderColor(
                    evt.status
                  )}`}
                >
                  {getIcon(evt.iconType, evt.status)}
                </div>

                {/* Event Details */}
                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-foreground">
                      {evt.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded border border-border/40">
                      {evt.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {evt.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Acoustic + Axle Counter Feed</span>
        <span className="font-mono text-safe">Live telemetry synchronized</span>
      </div>
    </div>
  );
}
