import { useState } from "react";
import { 
  BrainCircuit, 
  Sparkles, 
  Clock, 
  TrainFront, 
  AlertOctagon, 
  CheckCircle2, 
  RefreshCw,
  Layers,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReblockOptionCard } from "./ReblockOptionCard";
import type { ReblockOption } from "@/lib/emergency-data";

interface ReblockOptimizerProps {
  options: ReblockOption[];
  selectedOption: ReblockOption;
  onSelectOption: (option: ReblockOption) => void;
  onGenerateOptions?: () => void;
  isGenerating?: boolean;
}

export function ReblockOptimizer({
  options,
  selectedOption,
  onSelectOption,
  onGenerateOptions,
  isGenerating = false,
}: ReblockOptimizerProps) {
  const [hasGenerated, setHasGenerated] = useState(true);

  const handleGenerate = () => {
    if (onGenerateOptions) {
      onGenerateOptions();
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-primary/30 bg-card/90 p-5 sm:p-6 shadow-md relative overflow-hidden">
      {/* Decorative subtle background ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              <BrainCircuit className="size-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              AI Emergency Re-Blocking
            </h2>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold tracking-wider">
              OPTIMIZATION ENGINE
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate the safest available emergency block window while minimizing network disruption.
          </p>
        </div>

        {/* Generate Re-block Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all sm:self-start h-9"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>SYNCHRONIZING PATHS...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              <span>GENERATE RE-BLOCK OPTIONS</span>
            </>
          )}
        </Button>
      </div>

      {/* CURRENT SITUATION STRIP */}
      <div className="my-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/80 bg-secondary/30 p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              CURRENT BLOCK
            </span>
            <span className="text-xs font-semibold text-foreground mt-0.5 block">
              CNB Outer – Line 1
            </span>
          </div>
          <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] bg-destructive/10">
            FRACTURE ACTIVE
          </Badge>
        </div>

        <div className="rounded-lg border border-border/80 bg-secondary/30 p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              CURRENT WINDOW
            </span>
            <span className="text-xs font-semibold text-destructive mt-0.5 block">
              No emergency window
            </span>
          </div>
          <Clock className="size-4 text-muted-foreground" />
        </div>

        <div className="rounded-lg border border-border/80 bg-secondary/30 p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              TRAIN CONFLICT
            </span>
            <span className="text-xs font-bold text-amber-400 mt-0.5 block">
              7 trains exposed
            </span>
          </div>
          <TrainFront className="size-4 text-amber-400" />
        </div>
      </div>

      {/* Loading state skeleton during path evaluation */}
      {isGenerating ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5">
          <RefreshCw className="size-8 text-primary animate-spin" />
          <div>
            <p className="text-sm font-bold text-foreground">Evaluating Corridor Slot Permutations...</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulating dynamic Rajdhani loop overtakes and engineering crew dispatch windows.
            </p>
          </div>
        </div>
      ) : (
        /* The 3 AI Options Grid */
        <div className="grid md:grid-cols-3 gap-4 pt-1">
          {options.map((opt) => (
            <ReblockOptionCard
              key={opt.id}
              option={opt}
              isSelected={selectedOption.id === opt.id}
              onSelect={onSelectOption}
            />
          ))}
        </div>
      )}

      {/* Selection Notification Banner */}
      <div className="mt-5 rounded-lg border border-safe/30 bg-safe/10 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-safe shrink-0" />
          <span className="text-foreground">
            Active Selection: <strong>{selectedOption.name}</strong> ({selectedOption.window}, {selectedOption.duration})
          </span>
          {selectedOption.isAiRecommended && (
            <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px] ml-1">
              AI CHOICE
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground text-[11px] font-mono">
          Ready for Officer Authorization below ↓
        </span>
      </div>
    </div>
  );
}
