import { useState, useMemo } from "react";
import { 
  Sliders, 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  TrainFront, 
  ShieldCheck, 
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { SECTIONS_LIST } from "@/lib/emergency-data";

export function WhatIfSimulator() {
  const [severity, setSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM">("CRITICAL");
  const [section, setSection] = useState<string>("CNB Outer – Line 1");
  const [durationMinutes, setDurationMinutes] = useState<number>(100); // 1h 40m
  const [startDelayMinutes, setStartDelayMinutes] = useState<number>(0); // Starts now vs later
  const [priorityMode, setPriorityMode] = useState<"Dynamic Pacing" | "Strict Priority" | "Freight Hold">("Dynamic Pacing");

  // Dynamic simulation calculations
  const simulation = useMemo(() => {
    // Base values
    let baseDelay = 8;
    let baseTrains = 3;
    let baseSafety = 95;
    let baseOperational = 95;

    // Severity factor
    if (severity === "CRITICAL") {
      baseDelay += 2;
    } else if (severity === "HIGH") {
      baseDelay -= 1;
      baseSafety += 2;
    } else {
      baseDelay -= 3;
      baseSafety += 3;
    }

    // Duration penalty/benefit
    const durationDelta = durationMinutes - 100;
    const addedDelayFromDuration = Math.round(durationDelta * 0.15);
    const addedTrains = durationMinutes > 130 ? 2 : durationMinutes > 110 ? 1 : 0;

    // Start time offset factor (If block starts 20 minutes later...)
    const offsetDelay = Math.round(startDelayMinutes * 0.45);
    const offsetTrains = startDelayMinutes >= 30 ? 3 : startDelayMinutes >= 15 ? 2 : 0;

    // Priority mode adjustments
    let priorityBonus = 0;
    if (priorityMode === "Strict Priority") {
      priorityBonus = -2;
      baseOperational -= 4; // Freight suffers
    } else if (priorityMode === "Freight Hold") {
      priorityBonus = -3;
      baseOperational -= 6;
    }

    const projectedDelay = Math.max(2, baseDelay + addedDelayFromDuration + offsetDelay + priorityBonus);
    const affectedTrains = Math.min(14, Math.max(1, baseTrains + addedTrains + offsetTrains));
    const safetyScore = Math.min(99, Math.max(65, baseSafety - Math.round(startDelayMinutes * 0.3)));
    const operationalScore = Math.min(99, Math.max(50, baseOperational - Math.round(startDelayMinutes * 0.5) - Math.abs(durationDelta * 0.1)));
    
    // Recovery time calculation
    const recoveryHours = Math.floor((durationMinutes + projectedDelay * 2) / 60);
    const recoveryMins = (durationMinutes + projectedDelay * 2) % 60;
    const recoveryTime = `${recoveryHours}h ${recoveryMins}m`;

    // Dynamic advice
    let advice = "Optimal configuration. Balances passenger transit and engineering feasibility.";
    let recommendation: "Highly Recommended" | "Recommended" | "Caution" | "Not Recommended" = "Highly Recommended";
    let isRecommended = true;

    if (startDelayMinutes >= 20) {
      advice = `Starting ${startDelayMinutes} minutes later will cause trailing Rajdhani rakes to bunch at outer home signals. Extended delay +${projectedDelay} min projected.`;
      recommendation = "Not Recommended";
      isRecommended = false;
    } else if (durationMinutes > 150) {
      advice = "Extended duration impacts prime evening freight slots. Consider split execution.";
      recommendation = "Caution";
      isRecommended = false;
    } else if (startDelayMinutes > 0) {
      advice = `Minor start delay of +${startDelayMinutes}m increases cumulative passenger delay to +${projectedDelay}m.`;
      recommendation = "Recommended";
      isRecommended = true;
    }

    return {
      projectedDelay,
      affectedTrains,
      safetyScore,
      operationalScore,
      recoveryTime,
      advice,
      recommendation,
      isRecommended,
    };
  }, [severity, section, durationMinutes, startDelayMinutes, priorityMode]);

  const handleReset = () => {
    setSeverity("CRITICAL");
    setSection("CNB Outer – Line 1");
    setDurationMinutes(100);
    setStartDelayMinutes(0);
    setPriorityMode("Dynamic Pacing");
  };

  return (
    <div className="mb-8 rounded-xl border border-primary/40 bg-card/75 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Emergency What-If Simulator
            </h3>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold">
              DYNAMIC SENSITIVITY ENGINE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test different emergency window start times, durations, and priorities to simulate downstream network repercussions in real-time.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="text-xs h-8 gap-1.5 border-border hover:bg-secondary sm:self-center"
        >
          <RefreshCw className="size-3.5" />
          <span>Reset Defaults</span>
        </Button>
      </div>

      {/* Simulator Interface: Left Controls, Right Dynamic Telemetry */}
      <div className="grid lg:grid-cols-12 gap-6 mt-5 items-start">
        {/* Left Side: Interactive Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4 rounded-lg border border-border/70 bg-secondary/15 p-4 sm:p-5">
          {/* Row 1: Section & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Affected Corridor Section
              </label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger className="w-full text-xs bg-background border-border">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS_LIST.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Emergency Severity
              </label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as "CRITICAL" | "HIGH" | "MEDIUM")}
              >
                <SelectTrigger className="w-full text-xs bg-background border-border">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL" className="text-xs text-destructive font-bold">
                    CRITICAL (Immediate Track Risk)
                  </SelectItem>
                  <SelectItem value="HIGH" className="text-xs text-amber-400 font-bold">
                    HIGH (OHE / Power Tripping)
                  </SelectItem>
                  <SelectItem value="MEDIUM" className="text-xs text-yellow-500 font-bold">
                    MEDIUM (Speed Regulation)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Block Duration Slider */}
          <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="flex items-center justify-between text-xs">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Block Duration
              </label>
              <span className="font-mono font-bold text-foreground">
                {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m ({durationMinutes} mins)
              </span>
            </div>
            <Slider
              value={[durationMinutes]}
              min={60}
              max={240}
              step={10}
              onValueChange={([val]) => setDurationMinutes(val)}
              className="py-1"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
              <span>60 min (Quick weld)</span>
              <span>100 min (AI Recommended)</span>
              <span>240 min (Major repair)</span>
            </div>
          </div>

          {/* Row 3: Start Time Offset Slider (What if starts 20 mins later...) */}
          <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="flex items-center justify-between text-xs">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Start Time Offset (Execution Delay)
              </label>
              <span className={`font-mono font-bold ${
                startDelayMinutes > 0 ? "text-amber-400" : "text-safe"
              }`}>
                {startDelayMinutes === 0 ? "Starts Immediately (18:20)" : `+${startDelayMinutes} minutes later (${18 + Math.floor((20 + startDelayMinutes) / 60)}:${(20 + startDelayMinutes) % 60})`}
              </span>
            </div>
            <Slider
              value={[startDelayMinutes]}
              min={0}
              max={60}
              step={5}
              onValueChange={([val]) => setStartDelayMinutes(val)}
              className="py-1"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
              <span className="text-safe">0m (Immediate)</span>
              <span className="text-amber-400">+20m (Lag)</span>
              <span className="text-destructive">+60m (High Risk)</span>
            </div>
          </div>

          {/* Row 4: Train Priority Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Train Scheduling Priority Model
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(["Dynamic Pacing", "Strict Priority", "Freight Hold"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPriorityMode(mode)}
                  className={`p-2 rounded border text-center font-medium transition-all ${
                    priorityMode === mode
                      ? "border-primary bg-primary/20 text-primary font-bold shadow-xs"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Recalculation Results (5 cols) */}
        <div className="lg:col-span-5 rounded-lg border border-border/80 bg-card p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                SIMULATION OUTPUT
              </span>
              <Badge
                variant={simulation.isRecommended ? "outline" : "destructive"}
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  simulation.isRecommended
                    ? "border-safe/40 text-safe bg-safe/10"
                    : "border-destructive/40 text-destructive bg-destructive/10"
                }`}
              >
                {simulation.recommendation}
              </Badge>
            </div>

            {/* Dynamic Metric Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Projected Delay
                </span>
                <span className={`text-xl font-mono font-bold mt-0.5 block ${
                  simulation.projectedDelay > 15 ? "text-destructive" : simulation.projectedDelay > 10 ? "text-amber-400" : "text-safe"
                }`}>
                  +{simulation.projectedDelay} min
                </span>
                <span className="text-[10px] text-muted-foreground">Cumulative passenger impact</span>
              </div>

              <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Affected Trains
                </span>
                <span className="text-xl font-mono font-bold mt-0.5 block text-foreground">
                  {simulation.affectedTrains} trains
                </span>
                <span className="text-[10px] text-muted-foreground">Regulated &amp; looped</span>
              </div>

              <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Safety Score
                </span>
                <span className="text-xl font-mono font-bold mt-0.5 block text-safe">
                  {simulation.safetyScore} / 100
                </span>
                <span className="text-[10px] text-muted-foreground">Protection compliance</span>
              </div>

              <div className="p-2.5 rounded bg-secondary/30 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Operational Score
                </span>
                <span className={`text-xl font-mono font-bold mt-0.5 block ${
                  simulation.operationalScore >= 85 ? "text-primary" : "text-amber-400"
                }`}>
                  {simulation.operationalScore} / 100
                </span>
                <span className="text-[10px] text-muted-foreground">Corridor throughput</span>
              </div>
            </div>

            {/* Recovery Time */}
            <div className="rounded border border-border/60 bg-secondary/20 p-2.5 text-xs flex justify-between items-center mb-3">
              <span className="text-muted-foreground text-[11px] font-medium">Estimated Full Recovery:</span>
              <span className="font-mono font-bold text-foreground">{simulation.recoveryTime}</span>
            </div>

            {/* AI Dynamic Feedback Box */}
            <div className={`p-3 rounded-lg border text-xs ${
              simulation.isRecommended
                ? "border-safe/30 bg-safe/10 text-foreground"
                : "border-destructive/30 bg-destructive/10 text-foreground"
            }`}>
              <p className="font-bold flex items-center gap-1.5 text-[11px]">
                {simulation.isRecommended ? (
                  <ShieldCheck className="size-3.5 text-safe" />
                ) : (
                  <AlertTriangle className="size-3.5 text-destructive" />
                )}
                {startDelayMinutes > 0 ? `If block starts ${startDelayMinutes} minutes later…` : "Dynamic Optimization Evaluation:"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {simulation.advice}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic border-t border-border/40 pt-2 text-center">
            *Demonstrates simulated sensitivity analysis for live train operations.
          </p>
        </div>
      </div>
    </div>
  );
}
