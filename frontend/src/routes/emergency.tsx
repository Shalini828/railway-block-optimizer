import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, ShieldAlert, Siren, Zap, RadioTower } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/emergency")({
  component: EmergencyPage,
});

const mockActiveEmergencies = [
  {
    id: "EMG-001",
    type: "OHE Snapping",
    location: "NDLS - GZB Section (Line 2)",
    reportedTime: "10 mins ago",
    status: "Active Block",
    impact: "High",
  },
  {
    id: "EMG-002",
    type: "Track Fracture",
    location: "CNB Outer (Line 1)",
    reportedTime: "25 mins ago",
    status: "Active Block",
    impact: "Critical",
  },
];

function EmergencyPage() {
  const handleTriggerSOS = () => {
    toast.error("SOS Emergency Block Initiated!", {
      description: "All signals in the affected zone have been set to DANGER.",
    });
  };

  return (
    <>
      <PageHeader
        title="Emergency Blocking (SOS)"
        subtitle="Initiate immediate emergency disconnections and view active crisis blocks across the corridor."
        action={
          <Button variant="destructive" onClick={handleTriggerSOS} className="gap-2">
            <Siren className="size-4" />
            Trigger New SOS Block
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="size-5" />
              Immediate SOS Action Required
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Use this panel only for critical emergencies requiring immediate cessation of traffic.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Select Section</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option>Select affected section...</option>
                <option>New Delhi (NDLS) - Ghaziabad (GZB)</option>
                <option>Ghaziabad (GZB) - Kanpur (CNB)</option>
                <option>Kanpur (CNB) - Prayagraj (PRYJ)</option>
                <option>Prayagraj (PRYJ) - Varanasi (BSB)</option>
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Emergency Type</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option>Select emergency type...</option>
                <option>OHE Snapping / Tripping</option>
                <option>Track Fracture / Derailment</option>
                <option>Signal Failure (Multi-aspect)</option>
                <option>Natural Disaster / Flooding</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button size="lg" variant="destructive" onClick={handleTriggerSOS} className="w-full sm:w-auto">
                <ShieldAlert className="mr-2 size-5" />
                INITIATE BLOCK
              </Button>
            </div>
          </CardContent>
        </Card>

        {mockActiveEmergencies.map((emg) => (
          <Card key={emg.id} className="border-warn/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="animate-pulse">
                  {emg.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{emg.reportedTime}</span>
              </div>
              <CardTitle className="mt-2 text-lg">{emg.type}</CardTitle>
              <CardDescription>{emg.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="size-4 text-warn" /> Impact: {emg.impact}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <RadioTower className="size-4 text-safe" /> Control Notified
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
