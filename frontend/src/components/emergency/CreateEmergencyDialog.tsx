import { useState } from "react";
import { Siren, AlertOctagon, ShieldAlert, Sparkles, MapPin, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTIONS_LIST, EMERGENCY_TYPES_LIST } from "@/lib/emergency-data";

interface CreateEmergencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    section: string;
    type: string;
    line: string;
    description: string;
  }) => void;
}

export function CreateEmergencyDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateEmergencyDialogProps) {
  const [section, setSection] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [line, setLine] = useState<string>("Line 1 (Up Main)");
  const [description, setDescription] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!section || !type) return;

    onSubmit({
      section,
      type,
      line,
      description: description || `Urgent ${type} reported on ${section} (${line}). Immediate traffic protection advisory generated.`,
    });

    // Reset
    setSection("");
    setType("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-destructive/40 bg-card text-left">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <Siren className="size-5 animate-pulse" />
              <DialogTitle className="text-lg font-bold">
                Initiate Emergency Response &amp; Protective Block
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Report an active corridor hazard to trigger automated risk classification, signal protection, and AI re-blocking options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            {/* Affected Section */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                1. Affected Corridor Section *
              </Label>
              <Select value={section} onValueChange={setSection} required>
                <SelectTrigger className="w-full text-xs bg-background border-border">
                  <SelectValue placeholder="Select affected corridor section..." />
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

            {/* Emergency Type */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                2. Emergency Incident Classification *
              </Label>
              <Select value={type} onValueChange={setType} required>
                <SelectTrigger className="w-full text-xs bg-background border-border">
                  <SelectValue placeholder="Select emergency hazard..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(EMERGENCY_TYPES_LIST.map((t) => t.group))).map((group) => (
                    <div key={group}>
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/50">
                        {group}
                      </div>
                      {EMERGENCY_TYPES_LIST.filter((t) => t.group === group).map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.value}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Track Line */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                3. Affected Line / Track
              </Label>
              <Input
                value={line}
                onChange={(e) => setLine(e.target.value)}
                placeholder="e.g. Up Main, Down Main, Line 2"
                className="text-xs bg-background border-border h-9"
              />
            </div>

            {/* Field Notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                4. Field Sensor / Report Telemetry Notes
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observed symptom, acoustic alert reading, or pilot report..."
                className="text-xs bg-background border-border h-9"
              />
            </div>

            {/* Safety Disclaimer */}
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-destructive/90 flex items-start gap-2">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <p>
                <strong>Immediate Protective Action:</strong> Submitting will register the incident, dispatch telemetry to Central Operations Control, and run the IR-ABPS Brain to generate candidate re-block slots.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!section || !type}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold tracking-wider text-xs shadow-md"
            >
              <ShieldAlert className="mr-1.5 size-4" /> INITIATE EMERGENCY RESPONSE
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
