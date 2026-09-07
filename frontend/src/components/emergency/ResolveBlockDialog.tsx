import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EmergencyIncident } from "@/lib/emergency-data";

interface ResolveBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: EmergencyIncident | null;
  onConfirm: () => void;
}

export function ResolveBlockDialog({
  open,
  onOpenChange,
  incident,
  onConfirm,
}: ResolveBlockDialogProps) {
  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-safe/40 bg-card text-left">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-safe">
            <ShieldCheck className="size-5" /> Resolve Emergency Block?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Confirm field restoration clearance before releasing track locks back to regular train operations.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-4 rounded-lg bg-secondary/20 border border-border/70 space-y-2.5 text-xs">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Incident ID:
            </span>
            <span className="font-mono font-bold text-foreground">{incident.id}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Emergency Type:
            </span>
            <span className="font-bold text-foreground">{incident.type}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              Section / Track:
            </span>
            <span className="font-medium text-foreground text-right">{incident.location || incident.section}</span>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <p className="font-semibold text-foreground">
            Has SSE/P.Way or field engineer safety certification been received?
          </p>
          <p className="text-muted-foreground text-[11px]">
            Resolving this block will transition signals from DANGER back to automatic line clear and update the train timetable status.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            KEEP BLOCK ACTIVE
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="bg-safe text-safe-foreground hover:bg-safe/90 font-bold tracking-wider text-xs shadow-md"
          >
            <CheckCircle2 className="mr-1.5 size-4" /> CONFIRM RESOLUTION
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
