import { useState } from "react";
import { AlertOctagon, TrainFront, CheckCircle2, AlertTriangle, ShieldCheck, Activity, MapPin, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CorridorNode } from "@/lib/emergency-data";

interface CorridorStatusProps {
  nodes: CorridorNode[];
  onSelectNode?: (node: CorridorNode) => void;
}

export function CorridorStatus({ nodes, onSelectNode }: CorridorStatusProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("c2"); // Defaults to CNB

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[1];

  const handleSelect = (node: CorridorNode) => {
    setSelectedNodeId(node.id);
    if (onSelectNode) onSelectNode(node);
  };

  return (
    <div className="mb-8 rounded-xl border border-border/80 bg-card/70 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              Corridor Topology &amp; Hazard Mapping
            </h3>
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-mono">
              NORTH CENTRAL CORRIDOR
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time track section status from New Delhi (NDLS) to Varanasi (BSB). Click any station node to inspect telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive animate-ping"></span>
            <span className="font-semibold text-destructive">Incident Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400"></span>
            <span>Restricted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-safe"></span>
            <span>Normal</span>
          </div>
        </div>
      </div>

      {/* Track Schematic Railway Line Visualization */}
      <div className="py-8 px-2 overflow-x-auto">
        <div className="min-w-[650px] relative">
          {/* Main Track Line (Double railway steel rails) */}
          <div className="absolute top-[34px] left-[5%] right-[5%] h-1 bg-border/80 rounded z-0"></div>
          <div className="absolute top-[38px] left-[5%] right-[5%] h-0.5 bg-primary/40 rounded z-0"></div>

          {/* Connected Station Nodes */}
          <div className="flex justify-between items-start relative z-10">
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isCritical = node.status === "CRITICAL";
              const isRestricted = node.status === "Restricted";

              return (
                <div
                  key={node.id}
                  onClick={() => handleSelect(node)}
                  className="flex flex-col items-center cursor-pointer group text-center w-28"
                >
                  {/* Station Code & Node Badge */}
                  <div
                    className={`relative flex size-12 items-center justify-center rounded-xl border-2 transition-all shadow-md ${
                      isSelected
                        ? isCritical
                          ? "border-destructive bg-destructive/20 ring-4 ring-destructive/20 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                          : "border-primary bg-primary/20 ring-4 ring-primary/20"
                        : isCritical
                        ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
                        : isRestricted
                        ? "border-amber-500/80 bg-amber-500/10 text-amber-400"
                        : "border-safe/60 bg-card hover:border-safe"
                    }`}
                  >
                    <span className="font-mono font-bold text-xs">
                      {node.code}
                    </span>

                    {/* Active Incident Warning Pulsing Pin */}
                    {isCritical && (
                      <span className="absolute -top-2 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                        !
                      </span>
                    )}
                  </div>

                  {/* Station Name & Status */}
                  <div className="mt-2.5 space-y-0.5">
                    <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      {node.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider ${
                        isCritical
                          ? "border-destructive/40 text-destructive bg-destructive/10"
                          : isRestricted
                          ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                          : "border-safe/40 text-safe bg-safe/10"
                      }`}
                    >
                      {node.status}
                    </Badge>
                  </div>

                  {/* Incident Indicator Callout for CNB */}
                  {node.hasIncident && (
                    <div className="mt-2 flex flex-col items-center animate-bounce">
                      <span className="text-[10px] font-bold text-destructive flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                        🔴 INCIDENT ZONE
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        LINE 1 LOCKED
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Segment Inspection Card */}
      <div className="mt-3 rounded-lg border border-border/70 bg-secondary/20 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              Segment Telemetry: {selectedNode.name} ({selectedNode.code})
            </span>
            {selectedNode.activeBlock && (
              <Badge variant="destructive" className="text-[10px] font-mono">
                BLOCK ZONE ACTIVE ({selectedNode.incidentId})
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Click another station node above to inspect corridor health.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-xs">
          <div className="p-2.5 rounded bg-card/60 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              TRAFFIC STATUS
            </span>
            <span className={`font-semibold mt-0.5 block ${
              selectedNode.status === "CRITICAL" ? "text-destructive" : selectedNode.status === "Restricted" ? "text-amber-400" : "text-safe"
            }`}>
              {selectedNode.trafficLevel}
            </span>
          </div>

          <div className="p-2.5 rounded bg-card/60 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              ACTIVE BLOCK
            </span>
            <span className="font-semibold mt-0.5 block text-foreground">
              {selectedNode.activeBlock ? "Yes (Emergency)" : "None"}
            </span>
          </div>

          <div className="p-2.5 rounded bg-card/60 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              TRAINS IN TRANSIT
            </span>
            <span className="font-mono font-bold mt-0.5 block text-foreground flex items-center gap-1">
              <TrainFront className="size-3.5 text-primary" /> {selectedNode.trainCount} rakes
            </span>
          </div>

          <div className="p-2.5 rounded bg-card/60 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              HAZARD RATING
            </span>
            <span className={`font-mono font-bold mt-0.5 block ${
              selectedNode.risk === "5/5" ? "text-destructive" : "text-foreground"
            }`}>
              {selectedNode.risk}
            </span>
          </div>

          <div className="p-2.5 rounded bg-card/60 border border-border/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              TRACK AVAILABILITY
            </span>
            <span className="font-mono font-bold mt-0.5 block text-foreground">
              {selectedNode.availability}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
