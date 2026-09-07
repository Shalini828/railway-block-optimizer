import { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  RadioTower, 
  Wrench, 
  BrainCircuit, 
  CheckCircle2, 
  ExternalLink,
  Activity,
  AlertTriangle,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EmergencyIncident } from "@/lib/emergency-data";

interface ActiveEmergencyBlocksProps {
  emergencies: EmergencyIncident[];
  onViewIncident: (id: string) => void;
  onViewAiPlan: (id: string) => void;
  onResolveBlock: (id: string) => void;
  onCreateNew?: () => void;
}

export function ActiveEmergencyBlocks({
  emergencies,
  onViewIncident,
  onViewAiPlan,
  onResolveBlock,
  onCreateNew,
}: ActiveEmergencyBlocksProps) {
  const getTimeAgo = (date: Date) => {
    const mins = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
    return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  };

  return (
    <div className="mb-8 rounded-xl border border-border/80 bg-card/70 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="size-4 text-destructive" />
              Active Emergency Blocks ({emergencies.length})
            </h3>
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
              LIVE DISPATCH
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time track isolation status with field crew deployment and coordinated restoration advisory.
          </p>
        </div>

        {onCreateNew && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateNew}
            className="gap-1.5 text-xs border-dashed border-border hover:bg-secondary h-8 sm:self-center"
          >
            <Plus className="size-3.5" />
            <span>New Crisis Block</span>
          </Button>
        )}
      </div>

      {emergencies.length === 0 ? (
        <div className="my-8 flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-lg bg-secondary/10">
          <ShieldCheck className="size-10 text-safe mb-2 opacity-70" />
          <p className="font-bold text-foreground">No active emergency blocks</p>
          <p className="text-xs text-muted-foreground mt-1">
            Corridor currently operating under nominal timetable conditions.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 mt-5">
          {emergencies.map((emg) => {
            const isCritical = emg.severity === "CRITICAL";

            return (
              <div
                key={emg.id}
                className={`relative rounded-xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
                  isCritical
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive/80"
                    : "border-border/80 bg-card/60 hover:border-border"
                }`}
              >
                {/* Header bar */}
                <div className={`p-4 pb-3 border-b ${
                  isCritical ? "bg-destructive/10 border-destructive/20" : "bg-secondary/30 border-border/50"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isCritical ? "destructive" : "outline"}
                        className={`text-[10px] font-bold tracking-wider uppercase ${
                          !isCritical ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : ""
                        }`}
                      >
                        {emg.severity}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {emg.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                      <Clock className="size-3" />
                      <span>Started: {getTimeAgo(emg.startedAt)}</span>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-foreground tracking-tight">
                    {emg.type.toUpperCase()}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <MapPin className="size-3 text-destructive shrink-0" />
                    <span className="font-medium text-foreground">{emg.location || emg.section}</span>
                    <span>·</span>
                    <span>{emg.line}</span>
                  </p>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3">
                  {/* Status Indicator Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Current Status
                      </span>
                      <span className="font-bold text-blue-400 flex items-center gap-1">
                        <ShieldCheck className="size-3" /> {emg.trafficStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Impact Level
                      </span>
                      <span className={`font-bold ${isCritical ? "text-destructive" : "text-amber-400"}`}>
                        {emg.severity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Control Room
                      </span>
                      <span className="font-bold text-safe flex items-center gap-1">
                        <RadioTower className="size-3" /> {emg.controlNotified ? "NOTIFIED" : "PENDING"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Field Team
                      </span>
                      <span className="font-bold text-safe flex items-center gap-1">
                        <Wrench className="size-3" /> {emg.fieldTeamDispatched ? "DISPATCHED" : "EN ROUTE"}
                      </span>
                    </div>
                  </div>

                  {/* Restoration & AI Recommendation row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-secondary/30 border border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Restoration Target
                      </span>
                      <span className="font-mono font-bold text-safe">
                        ETA {emg.etaRestoration || "19:55"} ({emg.estimatedRestoration || "2h 40m"})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        AI Recommendation
                      </span>
                      <span className="font-mono font-bold text-primary">
                        {emg.aiRecommendation || "RE-BLOCK REQUIRED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Buttons Footer */}
                <div className="p-4 pt-2 border-t border-border/50 bg-secondary/10 grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => onViewIncident(emg.id)}
                  >
                    VIEW INCIDENT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={() => onViewAiPlan(emg.id)}
                  >
                    VIEW AI PLAN
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-safe/40 text-safe hover:bg-safe/10 hover:text-safe"
                    onClick={() => onResolveBlock(emg.id)}
                  >
                    RESOLVE BLOCK
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
