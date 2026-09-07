import { AlertOctagon, CheckCircle2, ShieldCheck, Clock, TrainFront } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ReblockOption, EmergencyIncident } from "@/lib/emergency-data";

interface ActivationConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: EmergencyIncident;
  selectedOption: ReblockOption;
  onConfirm: () => void;
  isActivating?: boolean;
}

export function ActivationConfirmModal({
  open,
  onOpenChange,
  incident,
  selectedOption,
  onConfirm,
  isActivating = false,
}: ActivationConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-destructive/40 bg-card text-left">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertOctagon className="size-5" /> Confirm Emergency Block?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Authorized sign-off will immediately transmit signal protection orders to central control and activate the optimized re-block window.
          </DialogDescription>
        </DialogHeader>

        {/* Confirmation Details Card */}
        <div className="my-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3 text-xs">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Affected Section:
            </span>
            <span className="font-bold text-foreground text-right">{incident.location || incident.section}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Emergency:
            </span>
            <span className="font-bold text-destructive text-right">{incident.type}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Selected Window:
            </span>
            <span className="font-mono font-bold text-foreground text-right">{selectedOption.window}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Projected Train Impact:
            </span>
            <span className="font-mono font-bold text-safe text-right">{selectedOption.trainImpact}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Safety Rating:
            </span>
            <Badge className="bg-safe/20 text-safe hover:bg-safe/20 text-[10px] font-bold">
              {selectedOption.safety}
            </Badge>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          *Audit record: Sign-off logged under Chief Train Controller credentials with divisional timestamp.
        </p>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isActivating}
            className="text-xs"
          >
            CANCEL
          </Button>

          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isActivating}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold tracking-wider text-xs shadow-md"
          >
            {isActivating ? "COMMITTING SIGNAL LOCKS..." : "CONFIRM & ACTIVATE"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
