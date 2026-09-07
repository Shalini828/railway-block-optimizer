import { 
  Wrench, 
  RadioTower, 
  Zap, 
  ShieldAlert, 
  HeartPulse, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users,
  MapPin
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ResourceItem } from "@/lib/emergency-data";

interface ResponseResourcesProps {
  resources: ResourceItem[];
}

export function ResponseResources({ resources }: ResponseResourcesProps) {
  const getIcon = (dept: ResourceItem["department"]) => {
    switch (dept) {
      case "Engineering":
        return <Wrench className="size-4 text-amber-400" />;
      case "S&T":
        return <RadioTower className="size-4 text-blue-400" />;
      case "TRD":
        return <Zap className="size-4 text-purple-400" />;
      case "Safety":
        return <ShieldAlert className="size-4 text-destructive" />;
      case "Medical":
        return <HeartPulse className="size-4 text-safe" />;
      case "Operations":
        return <Users className="size-4 text-primary" />;
      default:
        return <Wrench className="size-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ResourceItem["status"]) => {
    switch (status) {
      case "Available":
        return (
          <Badge className="bg-safe/20 text-safe hover:bg-safe/20 text-[10px] font-bold border-safe/30">
            ✓ Available
          </Badge>
        );
      case "Occupied":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold border-amber-500/30">
            ⚠ 1 team occupied
          </Badge>
        );
      case "Standby":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[10px] font-bold border-blue-500/30">
            ✓ Standby
          </Badge>
        );
      case "Notified":
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px] font-bold border-primary/30">
            ✓ Notified
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card/70 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Users className="size-4 text-primary" />
            Response Resources Coordination
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time readiness telemetry for civil, electrical, signaling, and relief teams.
          </p>
        </div>
        <span className="text-[11px] font-mono text-safe bg-safe/10 px-2 py-0.5 rounded border border-safe/30">
          6 Divisional Assets Active
        </span>
      </div>

      {/* Grid of 6 Resources */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {resources.map((res) => (
          <div
            key={res.id}
            className="p-3 rounded-lg border border-border/70 bg-secondary/20 flex flex-col justify-between space-y-2 hover:border-border transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded bg-secondary/70 border border-border">
                    {getIcon(res.department)}
                  </div>
                  <span className="font-bold text-foreground text-xs">{res.name}</span>
                </div>
                {getStatusBadge(res.status)}
              </div>

              <div className="mt-2 space-y-1">
                <p className="text-[11px] font-medium text-foreground">{res.unit}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-primary shrink-0" />
                  <span>{res.location}</span>
                </p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-1.5 line-clamp-2">
              {res.details}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
