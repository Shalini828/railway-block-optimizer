import { CheckCircle2, ShieldCheck, Clock, TrainFront, Star, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReblockOption } from "@/lib/emergency-data";

interface ReblockOptionCardProps {
  option: ReblockOption;
  isSelected: boolean;
  onSelect: (option: ReblockOption) => void;
  onQuickAuthorize?: (option: ReblockOption) => void;
}

export function ReblockOptionCard({
  option,
  isSelected,
  onSelect,
  onQuickAuthorize,
}: ReblockOptionCardProps) {
  const isRecommended = option.isAiRecommended;

  return (
    <div
      onClick={() => onSelect(option)}
      className={`relative cursor-pointer rounded-xl border p-4 sm:p-5 transition-all flex flex-col justify-between ${
        isSelected
          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-primary"
          : isRecommended
          ? "border-primary/50 bg-card/90 hover:border-primary/80"
          : "border-border/80 bg-card/60 hover:border-border hover:bg-card/80"
      }`}
    >
      {/* Recommended Tag */}
      {isRecommended && (
        <div className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
          <Star className="size-3 fill-current" />
          ★ AI RECOMMENDED
        </div>
      )}

      <div>
        {/* Header with Title and Operational Score */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-muted-foreground">
                {option.id}
              </span>
              <h4 className="text-sm font-bold text-foreground tracking-tight">
                {option.name.replace(/^OPTION [ABC] — /, "")}
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{option.description}</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              OPERATIONAL SCORE
            </span>
            <span className={`text-lg font-mono font-bold ${
              option.operationalScore >= 90 ? "text-safe" : "text-amber-400"
            }`}>
              {option.operationalScore}
              <span className="text-xs text-muted-foreground font-normal">/100</span>
            </span>
          </div>
        </div>

        {/* Window Banner */}
        <div className="my-3 rounded-lg border border-border/70 bg-secondary/30 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="size-3.5 text-primary" /> Proposed Window
            </span>
            <span className="font-mono font-bold text-foreground text-sm">
              {option.window}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Duration: {option.duration}</span>
            <span className="text-safe font-semibold">Safety: {option.safety}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="rounded border border-border/60 bg-secondary/15 p-2">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
              Train Impact
            </span>
            <span className="font-mono font-bold text-foreground mt-0.5 block">
              {option.trainImpact}
            </span>
          </div>
          <div className="rounded border border-border/60 bg-secondary/15 p-2">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
              {option.affectedRequests ? "Coordinated Tasks" : "Affected Trains"}
            </span>
            <span className="font-mono font-bold text-foreground mt-0.5 block">
              {option.affectedRequests ? `${option.affectedRequests} requests bundled` : `${option.affectedTrains} trains`}
            </span>
          </div>
        </div>

        {/* Bullet details */}
        <ul className="space-y-1 text-[11px] text-muted-foreground mb-4">
          {option.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Select button */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {option.recommendationTag}
        </span>
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className={`h-7 text-xs ${
            isSelected
              ? "bg-primary text-primary-foreground"
              : "border-border text-foreground hover:bg-secondary"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(option);
          }}
        >
          {isSelected ? (
            <>
              <CheckCircle2 className="mr-1 size-3.5" /> SELECTED
            </>
          ) : (
            "SELECT OPTION"
          )}
        </Button>
      </div>
    </div>
  );
}
