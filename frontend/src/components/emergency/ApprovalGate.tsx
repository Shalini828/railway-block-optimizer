import { useState } from "react";
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  Lock, 
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReblockOption } from "@/lib/emergency-data";

interface ApprovalGateProps {
  selectedOption: ReblockOption;
  onReviewPlan: () => void;
  onApproveBlock: (option: ReblockOption) => void;
  onReject: () => void;
  onRequestAlternative: () => void;
  isApproved?: boolean;
}

export function ApprovalGate({
  selectedOption,
  onReviewPlan,
  onApproveBlock,
  onReject,
  onRequestAlternative,
  isApproved = false,
}: ApprovalGateProps) {
  return (
    <div className="mb-8 rounded-xl border border-primary/50 bg-gradient-to-b from-primary/10 via-card/90 to-card p-5 sm:p-6 shadow-md relative overflow-hidden">
      {/* Trust & Safety Guardrail Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-primary/20">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40">
            <UserCheck className="size-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              Emergency Action Authorization
            </h3>
            <p className="text-xs text-muted-foreground">
              Formal railway decision-support gate. All block executions require authenticated human sign-off.
            </p>
          </div>
        </div>

        {/* Safety Boundary Tag */}
        <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 flex items-center gap-1.5 sm:self-center">
          <Lock className="size-3.5" />
          <span>AI recommends — authorized officer decides.</span>
        </div>
      </div>

      {/* Decision Summary Box */}
      <div className="my-5 rounded-lg border border-border/80 bg-secondary/30 p-4 sm:p-5">
        <div className="grid md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                AI RECOMMENDATION
              </span>
              {selectedOption.isAiRecommended && (
                <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px]">
                  ★ PRIMARY ENGINE PICK
                </Badge>
              )}
            </div>

            <h4 className="text-lg font-bold text-foreground">
              Activate {selectedOption.name} ({selectedOption.window})
            </h4>

            <div className="space-y-1 text-xs text-foreground/90">
              <p>
                <strong className="text-muted-foreground">Reason:</strong> Lowest projected train impact while maintaining required safety protection.
              </p>
              <p>
                <strong className="text-muted-foreground">Expected benefit:</strong>{" "}
                <span className="text-safe font-bold font-mono">23 min projected delay reduction</span>{" "}
                across passenger rakes with zero Rajdhani cancellations.
              </p>
              <p>
                <strong className="text-muted-foreground">Safety Assurance:</strong> Automatic signal lockout to DANGER on CNB Line 1 + axle counter verification.
              </p>
            </div>
          </div>

          <div className="md:col-span-4 rounded-lg border border-border/60 bg-card/80 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-[11px]">Proposed Window</span>
              <span className="font-mono font-bold text-foreground">{selectedOption.window}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-[11px]">Duration</span>
              <span className="font-mono font-bold text-foreground">{selectedOption.duration}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-[11px]">Projected Delay</span>
              <span className="font-mono font-bold text-safe">{selectedOption.trainImpact}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-[11px]">Safety Buffer</span>
              <span className="font-bold text-safe">{selectedOption.safety}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReviewPlan}
            className="text-xs h-9 border-border hover:bg-secondary gap-1.5"
          >
            <FileText className="size-3.5" />
            <span>REVIEW PLAN</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRequestAlternative}
            className="text-xs h-9 border-border hover:bg-secondary gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>REQUEST ALTERNATIVE</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            className="text-xs h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <XCircle className="size-3.5" />
            <span>REJECT</span>
          </Button>
        </div>

        {/* Primary Approval Button */}
        <Button
          size="default"
          onClick={() => onApproveBlock(selectedOption)}
          disabled={isApproved}
          className={`font-bold tracking-wider text-xs px-5 h-9 shadow-md transition-all ${
            isApproved
              ? "bg-safe text-safe-foreground cursor-default"
              : "bg-safe text-safe-foreground hover:bg-safe/90 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
          }`}
        >
          {isApproved ? (
            <>
              <CheckCircle2 className="mr-1.5 size-4" />
              EMERGENCY BLOCK AUTHORIZED
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 size-4" />
              APPROVE EMERGENCY BLOCK
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
