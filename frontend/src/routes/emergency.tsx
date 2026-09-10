import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertOctagon,
  ShieldAlert,
  Siren,
  RadioTower,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Map,
  Shield,
  Info,
  Activity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// =========================================================
// ROUTE
// =========================================================

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      {
        title: "Emergency Blocking | IR-ABPS",
      },
      {
        name: "description",
        content:
          "Emergency incident management and traffic protection recommendations across the railway corridor.",
      },
    ],
  }),

  component: EmergencyPage,
});


// =========================================================
// TYPES
// =========================================================

interface Emergency {
  id: string;
  type: string;
  section: string;
  line: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  startedAt: Date;
  status: string;
  controlNotified: boolean;
  trafficProtectionStatus: string;
}


interface ActivityEvent {
  id: string;
  time: Date;
  text: string;
  detail?: string;
}


// =========================================================
// CONSTANTS
// =========================================================

const API_BASE_URL = "http://localhost:8000";


const SECTIONS = [
  "New Delhi (NDLS) - Ghaziabad (GZB)",
  "Ghaziabad (GZB) - Kanpur (CNB)",
  "Kanpur (CNB) - Prayagraj (PRYJ)",
  "Prayagraj (PRYJ) - Varanasi (BSB)",
  "CNB Outer",
  "NDLS Station Limits",
];


const EMERGENCY_TYPES = [
  {
    value: "Track Fracture",
    group: "Track",
  },
  {
    value: "OHE Snapping",
    group: "Traction",
  },
  {
    value: "Signal Failure",
    group: "S&T",
  },
  {
    value: "Point Machine Failure",
    group: "S&T",
  },
  {
    value: "Bridge/Structure Risk",
    group: "Engineering",
  },
  {
    value: "Obstruction on Track",
    group: "Operations",
  },
  {
    value: "Other Critical Hazard",
    group: "General",
  },
];


// =========================================================
// PAGE
// =========================================================

function EmergencyPage() {

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [emergencies, setEmergencies] = useState<Emergency[]>([]);

  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [newSection, setNewSection] = useState("");

  const [newType, setNewType] = useState("");

  const [isInitiating, setIsInitiating] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);

  const [resolveModal, setResolveModal] = useState<string | null>(null);

  const [detailsDrawer, setDetailsDrawer] = useState<string | null>(null);


  // -------------------------------------------------------
  // FETCH EMERGENCIES FROM BACKEND
  // -------------------------------------------------------

  const fetchEmergencies = async () => {

    try {

      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/emergency/`
      );


      if (!response.ok) {

        throw new Error(
          `Failed to fetch emergency incidents (${response.status})`
        );

      }


      const data = await response.json();


      if (!data.emergencies) {

        throw new Error(
          "Invalid emergency API response"
        );

      }


      const mappedEmergencies: Emergency[] =
        data.emergencies.map((item: any) => ({
          id: item.id,
          type: item.type,
          section: item.section,
          line: item.line,
          severity: item.severity,
          startedAt: new Date(item.started_at),
          status: item.status,
          controlNotified: item.control_notified,
          trafficProtectionStatus:
            item.traffic_protection_status,
        }));


      setEmergencies(mappedEmergencies);


      // ---------------------------------------------------
      // Generate activity from real DB incidents
      // ---------------------------------------------------

      const generatedActivity: ActivityEvent[] = [];


      mappedEmergencies.forEach((emergency) => {

        generatedActivity.push({
          id: `${emergency.id}-reported`,
          time: emergency.startedAt,
          text: `${emergency.type} reported`,
          detail: emergency.section,
        });


        generatedActivity.push({
          id: `${emergency.id}-initiated`,
          time: new Date(
            emergency.startedAt.getTime() + 60000
          ),
          text: "Emergency block recorded",
          detail: emergency.id,
        });


        if (emergency.controlNotified) {

          generatedActivity.push({
            id: `${emergency.id}-control`,
            time: new Date(
              emergency.startedAt.getTime() + 120000
            ),
            text: "Control notification recorded",
            detail: "Control notification status stored",
          });

        }


        generatedActivity.push({
          id: `${emergency.id}-protection`,
          time: new Date(
            emergency.startedAt.getTime() + 180000
          ),
          text: "Traffic protection status recorded",
          detail:
            emergency.trafficProtectionStatus,
        });

      });


      generatedActivity.sort(
        (a, b) =>
          b.time.getTime() - a.time.getTime()
      );


      setActivity(generatedActivity);

    } catch (error) {

      console.error(
        "Emergency API error:",
        error
      );


      toast.error(
        "Unable to load emergency data",
        {
          description:
            "Please check that the backend is running.",
        }
      );

    } finally {

      setIsLoading(false);

    }

  };


  // -------------------------------------------------------
  // INITIAL LOAD
  // -------------------------------------------------------

  useEffect(() => {

    fetchEmergencies();

  }, []);


  // -------------------------------------------------------
  // DERIVED DATA
  // -------------------------------------------------------

  const criticalCount =
    emergencies.filter(
      (emergency) =>
        emergency.severity === "CRITICAL"
    ).length;


  const notifiedCount =
    emergencies.filter(
      (emergency) =>
        emergency.controlNotified
    ).length;


  const protectedCount =
    emergencies.filter(
      (emergency) =>
        emergency.trafficProtectionStatus ===
        "CONFIRMED"
    ).length;


  // -------------------------------------------------------
  // SEVERITY BADGE
  // -------------------------------------------------------

  const getSeverityBadge = (
    severity: string
  ) => {

    switch (severity) {

      case "CRITICAL":
        return "bg-destructive text-destructive-foreground border-destructive/20";

      case "HIGH":
        return "bg-warn text-warn-foreground border-warn/20";

      case "MEDIUM":
        return "bg-yellow-500 text-yellow-950 border-yellow-500/20";

      default:
        return "bg-secondary text-foreground border-border";

    }

  };


  // -------------------------------------------------------
  // SEVERITY TEXT COLOR
  // -------------------------------------------------------

  const getSeverityColor = (
    severity: string
  ) => {

    switch (severity) {

      case "CRITICAL":
        return "text-destructive";

      case "HIGH":
        return "text-warn";

      case "MEDIUM":
        return "text-yellow-500";

      default:
        return "text-foreground";

    }

  };


  // -------------------------------------------------------
  // INITIATE BUTTON
  // -------------------------------------------------------

  const handleInitiateClick = () => {

    if (!newSection || !newType) {

      toast.error(
        "Missing Information",
        {
          description:
            "Please select both section and emergency type.",
        }
      );

      return;

    }


    setConfirmModal(true);

  };


  // -------------------------------------------------------
  // CREATE EMERGENCY THROUGH BACKEND
  // -------------------------------------------------------

  const confirmInitiateSOS = async () => {

    setConfirmModal(false);

    setIsInitiating(true);


    try {

      // Determine severity from incident type

      const severity =
        newType.includes("Fracture") ||
        newType.includes("Hazard") ||
        newType.includes("Failure")
          ? "CRITICAL"
          : "HIGH";


      const response = await fetch(
        `${API_BASE_URL}/emergency/`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            emergency_type: newType,
            section: newSection,
            line: "Main Line",
            severity: severity,
          }),
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
            "Failed to create emergency incident"
        );

      }


      // Clear form

      const createdIncident =
        data.emergency;


      setNewSection("");

      setNewType("");


      // Reload from PostgreSQL

      await fetchEmergencies();


      toast.success(
        "Emergency incident recorded",
        {
          description:
            `${createdIncident.id} created for ${createdIncident.section}.`,
        }
      );

    } catch (error) {

      console.error(
        "Create emergency error:",
        error
      );


      toast.error(
        "Emergency creation failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "Unable to connect to backend.",
        }
      );

    } finally {

      setIsInitiating(false);

    }

  };


  // -------------------------------------------------------
  // RESOLVE EMERGENCY THROUGH BACKEND
  // -------------------------------------------------------

  const confirmResolveBlock = async () => {

    if (!resolveModal) {
      return;
    }


    const blockToResolve =
      emergencies.find(
        (emergency) =>
          emergency.id === resolveModal
      );


    if (!blockToResolve) {
      return;
    }


    try {

      const response = await fetch(
        `${API_BASE_URL}/emergency/${resolveModal}/resolve`,
        {
          method: "PATCH",
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
            "Failed to resolve emergency"
        );

      }


      // Close UI

      setResolveModal(null);

      setDetailsDrawer(null);


      // Reload active incidents from PostgreSQL

      await fetchEmergencies();


      toast.success(
        "Block Resolution Recorded",
        {
          description:
            `${blockToResolve.id} has been marked as resolved.`,
        }
      );

    } catch (error) {

      console.error(
        "Resolve emergency error:",
        error
      );


      toast.error(
        "Resolution failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "Unable to connect to backend.",
        }
      );

    }

  };


  // -------------------------------------------------------
  // TIME AGO
  // -------------------------------------------------------

  const getTimeAgo = (
    date: Date
  ) => {

    const mins = Math.floor(
      (Date.now() - date.getTime()) /
        60000
    );


    if (mins < 0) {
      return "Just now";
    }


    if (mins === 0) {
      return "Just now";
    }


    return `${mins} min${
      mins !== 1 ? "s" : ""
    } ago`;

  };


  // -------------------------------------------------------
  // FORMAT TIME
  // -------------------------------------------------------

  const formatTime = (
    date: Date
  ) => {

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  };


  // -------------------------------------------------------
  // ACTIVE DRAWER / RESOLVE BLOCK
  // -------------------------------------------------------

  const activeDrawerBlock =
    detailsDrawer
      ? emergencies.find(
          (emergency) =>
            emergency.id === detailsDrawer
        )
      : null;


  const activeResolveBlock =
    resolveModal
      ? emergencies.find(
          (emergency) =>
            emergency.id === resolveModal
        )
      : null;


  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">

        <div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Emergency Blocking (SOS)
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Emergency incident management and
            traffic protection recommendations
            across the corridor.
          </p>

        </div>


        <Button
          className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
          size="lg"
          onClick={() => {

            const panel =
              document.getElementById(
                "sos-panel"
              );

            if (panel) {

              panel.scrollIntoView({
                behavior: "smooth",
              });

            }

          }}
        >

          <Siren className="size-4 animate-pulse" />

          Trigger New SOS Block

        </Button>

      </div>


      {/* =====================================================
          EMERGENCY STATUS STRIP
      ====================================================== */}

      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">

        {/* ACTIVE BLOCKS */}

        <Card className="shadow-sm bg-secondary/5 border-border">

          <CardContent className="p-4 flex items-center justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Active Emergency Blocks
              </p>

              <p className="text-2xl font-mono font-bold text-foreground">
                {isLoading ? "—" : emergencies.length}
              </p>

            </div>

            <div className="p-2 rounded-full bg-secondary text-muted-foreground">

              <AlertTriangle className="size-5" />

            </div>

          </CardContent>

        </Card>


        {/* CRITICAL */}

        <Card
          className={`shadow-sm border-border ${
            criticalCount > 0
              ? "bg-destructive/10"
              : "bg-secondary/5"
          }`}
        >

          <CardContent className="p-4 flex items-center justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Critical Incidents
              </p>

              <p
                className={`text-2xl font-mono font-bold ${
                  criticalCount > 0
                    ? "text-destructive"
                    : "text-foreground"
                }`}
              >
                {isLoading ? "—" : criticalCount}
              </p>

            </div>

            <div
              className={`p-2 rounded-full ${
                criticalCount > 0
                  ? "bg-destructive/20 text-destructive"
                  : "bg-secondary text-muted-foreground"
              }`}
            >

              <AlertOctagon className="size-5" />

            </div>

          </CardContent>

        </Card>


        {/* CONTROL NOTIFIED */}

        <Card className="shadow-sm bg-secondary/5 border-border">

          <CardContent className="p-4 flex items-center justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Control Notified
              </p>

              <p className="text-2xl font-mono font-bold text-safe">
                {isLoading ? "—" : notifiedCount}
              </p>

            </div>

            <div className="p-2 rounded-full bg-safe/10 text-safe">

              <RadioTower className="size-5" />

            </div>

          </CardContent>

        </Card>


        {/* TRAFFIC PROTECTION */}

        <Card className="shadow-sm bg-secondary/5 border-border">

          <CardContent className="p-4 flex items-center justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Traffic Protection
              </p>

              <p
                className={`text-xl font-bold ${
                  protectedCount > 0
                    ? "text-blue-500"
                    : "text-muted-foreground"
                }`}
              >
                {isLoading
                  ? "LOADING"
                  : protectedCount > 0
                  ? "ACTIVE"
                  : "STANDBY"}
              </p>

            </div>

            <div
              className={`p-2 rounded-full ${
                protectedCount > 0
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-secondary text-muted-foreground"
              }`}
            >

              <ShieldCheck className="size-5" />

            </div>

          </CardContent>

        </Card>

      </div>


      {/* =====================================================
          MAIN SOS ACTION PANEL
      ====================================================== */}

      <Card
        id="sos-panel"
        className="mb-8 border-destructive/50 bg-destructive/5 shadow-md overflow-hidden"
      >

        <div className="bg-destructive/10 border-b border-destructive/20 p-4 flex items-center justify-between">

          <div>

            <h2 className="text-base font-bold text-destructive flex items-center gap-2">

              <AlertOctagon className="size-5" />

              IMMEDIATE SOS ACTION

            </h2>

            <p className="text-xs text-destructive/80 mt-1">
              Use only for critical incidents
              requiring immediate traffic
              protection review.
            </p>

          </div>

        </div>


        <CardContent className="p-6">

          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end">

            {/* SECTION */}

            <div className="flex-1 w-full space-y-2">

              <div className="flex items-center gap-2 mb-1">

                <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold text-destructive">
                  1
                </span>

                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Select Affected Section
                </label>

              </div>


              <Select
                value={newSection}
                onValueChange={setNewSection}
              >

                <SelectTrigger className="w-full bg-background border-destructive/30 focus:ring-destructive/50">

                  <SelectValue placeholder="Select affected section..." />

                </SelectTrigger>


                <SelectContent>

                  {SECTIONS.map(
                    (section) => (

                      <SelectItem
                        key={section}
                        value={section}
                      >
                        {section}
                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>


            {/* EMERGENCY TYPE */}

            <div className="flex-1 w-full space-y-2">

              <div className="flex items-center gap-2 mb-1">

                <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold text-destructive">
                  2
                </span>

                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Select Emergency Type
                </label>

              </div>


              <Select
                value={newType}
                onValueChange={setNewType}
              >

                <SelectTrigger className="w-full bg-background border-destructive/30 focus:ring-destructive/50">

                  <SelectValue placeholder="Select emergency type..." />

                </SelectTrigger>


                <SelectContent>

                  {Array.from(
                    new Set(
                      EMERGENCY_TYPES.map(
                        (type) =>
                          type.group
                      )
                    )
                  ).map((group) => (

                    <div key={group}>

                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50">
                        {group}
                      </div>


                      {EMERGENCY_TYPES
                        .filter(
                          (type) =>
                            type.group ===
                            group
                        )
                        .map((type) => (

                          <SelectItem
                            key={type.value}
                            value={type.value}
                          >
                            {type.value}
                          </SelectItem>

                        ))}

                    </div>

                  ))}

                </SelectContent>

              </Select>

            </div>


            {/* INITIATE */}

            <div className="w-full lg:w-auto space-y-2">

              <div className="flex items-center gap-2 mb-1">

                <span className="flex size-5 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-bold text-destructive">
                  3
                </span>

                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Initiate Traffic Block
                </label>

              </div>


              <Button
                size="lg"
                variant="destructive"
                onClick={
                  handleInitiateClick
                }
                className="w-full lg:w-[220px] font-bold tracking-wider text-sm h-10 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
                disabled={isInitiating}
              >

                {isInitiating ? (
                  <>
                    Saving incident...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="mr-2 size-5" />
                    INITIATE BLOCK
                  </>
                )}

              </Button>

            </div>

          </div>


          {/* SAFETY WARNING */}

          <div className="mt-5 flex items-center gap-2 text-xs text-destructive/80 bg-destructive/10 p-2.5 rounded border border-destructive/20">

            <Info className="size-4 shrink-0" />

            <p>
              <strong>Safety:</strong>{" "}
              Emergency incidents are recorded
              in IR-ABPS and generate a
              traffic-protection recommendation
              for authorized railway personnel.
              This prototype does not directly
              control signalling or interlocking
              systems.
            </p>

          </div>

        </CardContent>

      </Card>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">

        {/* ===================================================
            ACTIVE EMERGENCY BLOCKS
        ==================================================== */}

        <div className="lg:col-span-2 space-y-4">

          <div className="flex items-center justify-between border-b border-border pb-2">

            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">

              <Activity className="size-4" />

              Active Emergency Blocks

            </h3>


            <div className="flex items-center gap-3 text-xs text-muted-foreground">

              <span className="font-semibold">
                {isLoading
                  ? "Loading..."
                  : `${emergencies.length} active`}
              </span>

              <span>·</span>

              <span>
                Last updated:{" "}
                {isLoading
                  ? "Loading..."
                  : "Just now"}
              </span>

            </div>

          </div>


          {/* LOADING */}

          {isLoading ? (

            <div className="flex flex-col items-center justify-center p-12 text-center border border-border border-dashed rounded-lg bg-secondary/5">

              <Activity className="size-10 text-primary mb-3 animate-pulse" />

              <p className="font-semibold text-foreground">
                Loading emergency data...
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Fetching current incidents
                from PostgreSQL.
              </p>

            </div>

          ) : emergencies.length === 0 ? (

            /* NO ACTIVE INCIDENTS */

            <div className="flex flex-col items-center justify-center p-12 text-center border border-border border-dashed rounded-lg bg-secondary/5">

              <ShieldCheck className="size-10 text-safe mb-3 opacity-50" />

              <p className="font-semibold text-foreground">
                No active emergency blocks
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Corridor currently operating
                under normal emergency status.
              </p>

            </div>

          ) : (

            /* EMERGENCY CARDS */

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">

              {emergencies.map(
                (emergency) => (

                  <Card
                    key={emergency.id}
                    className={`shadow-sm border-t-4 overflow-hidden flex flex-col ${
                      emergency.severity ===
                      "CRITICAL"
                        ? "border-t-destructive"
                        : emergency.severity ===
                          "HIGH"
                        ? "border-t-warn"
                        : "border-t-yellow-500"
                    }`}
                  >

                    {/* HEADER */}

                    <CardHeader className="bg-secondary/10 p-4 pb-3">

                      <div className="flex items-center justify-between mb-2">

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold tracking-wider ${getSeverityBadge(
                            emergency.severity
                          )}`}
                        >
                          {emergency.severity}
                        </Badge>


                        <span className="text-xs font-mono text-muted-foreground">
                          {emergency.id}
                        </span>

                      </div>


                      <CardTitle
                        className="text-base font-bold truncate"
                        title={emergency.type}
                      >
                        {emergency.type}
                      </CardTitle>


                      <CardDescription
                        className="text-xs flex items-center gap-1.5 mt-1 truncate"
                        title={`${emergency.section} · ${emergency.line}`}
                      >

                        <Map className="size-3 shrink-0" />

                        {emergency.section} ·{" "}
                        {emergency.line}

                      </CardDescription>

                    </CardHeader>


                    {/* BODY */}

                    <CardContent className="p-4 pt-3 flex-1 flex flex-col justify-between">

                      <div className="space-y-3 mb-4">

                        {/* STARTED */}

                        <div className="flex justify-between items-center text-xs">

                          <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                            Started
                          </span>

                          <span className="font-medium flex items-center gap-1">

                            <Clock className="size-3" />

                            {getTimeAgo(
                              emergency.startedAt
                            )}

                          </span>

                        </div>


                        {/* IMPACT */}

                        <div className="flex justify-between items-center text-xs">

                          <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                            Impact
                          </span>

                          <span
                            className={`font-bold ${getSeverityColor(
                              emergency.severity
                            )}`}
                          >
                            {emergency.severity}
                          </span>

                        </div>


                        {/* CONTROL */}

                        <div className="flex justify-between items-center text-xs">

                          <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                            Control
                          </span>


                          <span
                            className={`font-bold flex items-center gap-1 ${
                              emergency.controlNotified
                                ? "text-safe"
                                : "text-muted-foreground"
                            }`}
                          >

                            <RadioTower className="size-3" />

                            {emergency.controlNotified
                              ? "NOTIFIED"
                              : "PENDING"}

                          </span>

                        </div>


                        {/* TRAFFIC STATUS */}

                        <div className="flex justify-between items-center text-xs">

                          <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                            Traffic Status
                          </span>


                          <span className="font-bold text-blue-500 flex items-center gap-1">

                            <ShieldCheck className="size-3" />

                            {emergency.trafficProtectionStatus}

                          </span>

                        </div>

                      </div>


                      {/* ACTIONS */}

                      <div className="grid grid-cols-2 gap-2 mt-auto">

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() =>
                            setDetailsDrawer(
                              emergency.id
                            )
                          }
                        >
                          VIEW DETAILS
                        </Button>


                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs border-safe/30 text-safe hover:bg-safe/10 hover:text-safe"
                          onClick={() =>
                            setResolveModal(
                              emergency.id
                            )
                          }
                        >
                          RESOLVE BLOCK
                        </Button>

                      </div>

                    </CardContent>

                  </Card>

                )
              )}

            </div>

          )}

        </div>


        {/* ===================================================
            INCIDENT ACTIVITY + PROTOCOL
        ==================================================== */}

        <div className="space-y-6">

          {/* ACTIVITY */}

          <Card className="shadow-sm border-border flex flex-col h-[400px]">

            <CardHeader className="p-4 border-b border-border/50 bg-secondary/5">

              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">

                <Clock className="size-4" />

                Emergency Activity

              </CardTitle>

            </CardHeader>


            <CardContent className="p-4 flex-1 overflow-y-auto">

              {activity.length === 0 ? (

                <div className="h-full flex items-center justify-center text-center">

                  <div>

                    <Clock className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />

                    <p className="text-sm text-muted-foreground">
                      No emergency activity
                    </p>

                  </div>

                </div>

              ) : (

                <div className="space-y-4">

                  {activity
                    .slice(0, 8)
                    .map(
                      (event, index) => (

                        <div
                          key={event.id}
                          className="flex gap-3 relative"
                        >

                          {index !==
                            activity.slice(
                              0,
                              8
                            ).length -
                              1 && (

                            <div className="absolute left-[9px] top-5 bottom-[-16px] w-[2px] bg-border" />

                          )}


                          <div className="mt-0.5 size-5 shrink-0 rounded-full bg-secondary border-2 border-background flex items-center justify-center z-10">

                            <div className="size-1.5 rounded-full bg-muted-foreground" />

                          </div>


                          <div className="flex-1 pb-1">

                            <div className="flex justify-between items-start">

                              <p className="text-sm font-medium text-foreground">
                                {event.text}
                              </p>

                              <span className="text-[10px] text-muted-foreground font-mono">
                                {formatTime(
                                  event.time
                                )}
                              </span>

                            </div>


                            {event.detail && (

                              <p className="text-xs text-muted-foreground mt-0.5">
                                {event.detail}
                              </p>

                            )}

                          </div>

                        </div>

                      )
                    )}

                </div>

              )}

            </CardContent>

          </Card>


          {/* PROTOCOL */}

          <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">

            <CardHeader className="p-4 pb-2">

              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-blue-500">

                <Shield className="size-4" />

                Emergency Protocol

              </CardTitle>

            </CardHeader>


            <CardContent className="p-4 pt-0 space-y-2.5">

              <div className="flex items-start gap-2 text-xs">

                <CheckCircle2 className="size-3.5 text-blue-500 shrink-0 mt-0.5" />

                <span className="text-muted-foreground">
                  Verify affected section before
                  initiating a block.
                </span>

              </div>


              <div className="flex items-start gap-2 text-xs">

                <CheckCircle2 className="size-3.5 text-blue-500 shrink-0 mt-0.5" />

                <span className="text-muted-foreground">
                  Emergency incident triggers
                  control-room notification
                  status recording.
                </span>

              </div>


              <div className="flex items-start gap-2 text-xs">

                <CheckCircle2 className="size-3.5 text-blue-500 shrink-0 mt-0.5" />

                <span className="text-muted-foreground">
                  Maintain protection until
                  authorized field clearance.
                </span>

              </div>

            </CardContent>

          </Card>

        </div>

      </div>


      {/* =====================================================
          INITIATE BLOCK MODAL
      ====================================================== */}

      <Dialog
        open={confirmModal}
        onOpenChange={setConfirmModal}
      >

        <DialogContent className="sm:max-w-md border-destructive/30 bg-card">

          <DialogHeader>

            <DialogTitle className="flex items-center gap-2 text-destructive">

              <AlertOctagon className="size-5" />

              Confirm Emergency Block

            </DialogTitle>


            <DialogDescription className="text-foreground pt-2">

              You're about to record an emergency
              block recommendation. The incident
              and protection status will be stored
              for review by authorized railway
              personnel.

            </DialogDescription>

          </DialogHeader>


          <div className="my-2 p-4 rounded-md bg-destructive/10 border border-destructive/20 space-y-3">

            <div className="grid grid-cols-[100px_1fr] items-start text-sm">

              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">
                Affected Section
              </span>

              <span className="font-bold text-foreground">
                {newSection}
              </span>

            </div>


            <div className="grid grid-cols-[100px_1fr] items-start text-sm">

              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">
                Emergency
              </span>

              <span className="font-bold text-foreground">
                {newType}
              </span>

            </div>


            <div className="grid grid-cols-[100px_1fr] items-start text-sm">

              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">
                Impact
              </span>

              <Badge
                variant="outline"
                className="w-fit text-[10px] border-destructive/30 text-destructive"
              >
                {newType.includes(
                  "Fracture"
                ) ||
                newType.includes(
                  "Hazard"
                ) ||
                newType.includes(
                  "Failure"
                )
                  ? "CRITICAL"
                  : "HIGH"}
              </Badge>

            </div>

          </div>


          <DialogFooter className="flex sm:justify-between gap-3 sm:gap-0 mt-2">

            <Button
              variant="ghost"
              onClick={() =>
                setConfirmModal(false)
              }
            >
              CANCEL
            </Button>


            <Button
              variant="destructive"
              onClick={
                confirmInitiateSOS
              }
              className="font-bold tracking-wider text-xs"
              disabled={isInitiating}
            >
              {isInitiating
                ? "SAVING..."
                : "CONFIRM & RECORD BLOCK"}
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* =====================================================
          RESOLVE BLOCK MODAL
      ====================================================== */}

      <Dialog
        open={!!resolveModal}
        onOpenChange={(open) =>
          !open &&
          setResolveModal(null)
        }
      >

        <DialogContent className="sm:max-w-md border-safe/30 bg-card">

          <DialogHeader>

            <DialogTitle className="flex items-center gap-2 text-safe">

              <ShieldCheck className="size-5" />

              Resolve Emergency Block?

            </DialogTitle>

          </DialogHeader>


          <div className="my-2 p-4 rounded-md bg-secondary/10 border border-border space-y-3">

            <div className="grid grid-cols-[100px_1fr] items-start text-sm">

              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">
                Section
              </span>

              <span className="font-bold text-foreground">
                {activeResolveBlock?.section}
              </span>

            </div>


            <div className="grid grid-cols-[100px_1fr] items-start text-sm">

              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider mt-0.5">
                Incident
              </span>

              <span className="font-bold text-foreground">
                {activeResolveBlock?.type}
              </span>

            </div>

          </div>


          <div className="py-2">

            <p className="font-semibold text-sm">
              Has field clearance been
              received?
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Resolving this incident will
              update its status in the IR-ABPS
              database.
            </p>

          </div>


          <DialogFooter className="flex sm:justify-between gap-3 sm:gap-0 mt-4">

            <Button
              variant="outline"
              onClick={() =>
                setResolveModal(null)
              }
            >
              KEEP BLOCK ACTIVE
            </Button>


            <Button
              onClick={
                confirmResolveBlock
              }
              className="bg-safe text-safe-foreground hover:bg-safe/90 font-bold tracking-wider text-xs"
            >
              CONFIRM RESOLUTION
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* =====================================================
          DETAILS DRAWER
      ====================================================== */}

      <Sheet
        open={!!detailsDrawer}
        onOpenChange={(open) =>
          !open &&
          setDetailsDrawer(null)
        }
      >

        <SheetContent className="w-full overflow-y-auto sm:max-w-md border-l border-border">

          <SheetHeader className="border-b border-border/50 pb-4 mb-4 text-left">

            <Badge
              variant="outline"
              className={`w-fit mb-2 text-[10px] font-bold tracking-wider ${
                activeDrawerBlock
                  ? getSeverityBadge(
                      activeDrawerBlock.severity
                    )
                  : ""
              }`}
            >
              {activeDrawerBlock?.severity}{" "}
              EMERGENCY
            </Badge>


            <SheetTitle className="text-xl">
              Emergency Incident
            </SheetTitle>


            <SheetDescription className="font-mono text-xs mt-1">
              {activeDrawerBlock?.id}
            </SheetDescription>

          </SheetHeader>


          {activeDrawerBlock && (

            <div className="space-y-6 pb-8">

              {/* INCIDENT INFORMATION */}

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-secondary/10 p-4 rounded-lg border border-border/50">

                <div className="col-span-2">

                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Affected Section
                  </p>

                  <p className="font-medium text-foreground">
                    {activeDrawerBlock.section}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Line
                  </p>

                  <p className="font-medium text-foreground">
                    {activeDrawerBlock.line}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Emergency Type
                  </p>

                  <p className="font-medium text-foreground">
                    {activeDrawerBlock.type}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Started
                  </p>

                  <p className="font-medium text-foreground">
                    {formatTime(
                      activeDrawerBlock.startedAt
                    )}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Duration
                  </p>

                  <p className="font-medium text-foreground">
                    {getTimeAgo(
                      activeDrawerBlock.startedAt
                    ).replace(
                      " ago",
                      ""
                    )}
                  </p>

                </div>

              </div>


              {/* STATUS */}

              <div className="space-y-3">

                <div className="flex items-center justify-between p-3 rounded border border-safe/20 bg-safe/5">

                  <div className="flex items-center gap-2">

                    <RadioTower className="size-4 text-safe" />

                    <span className="text-sm font-semibold">
                      Control Status
                    </span>

                  </div>


                  <Badge className="bg-safe/20 text-safe hover:bg-safe/20">

                    {activeDrawerBlock.controlNotified
                      ? "Notified"
                      : "Pending"}

                  </Badge>

                </div>


                <div className="flex items-center justify-between p-3 rounded border border-blue-500/20 bg-blue-500/5">

                  <div className="flex items-center gap-2">

                    <ShieldCheck className="size-4 text-blue-500" />

                    <span className="text-sm font-semibold">
                      Traffic Status
                    </span>

                  </div>


                  <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/20">

                    {activeDrawerBlock.trafficProtectionStatus}

                  </Badge>

                </div>

              </div>


              {/* RECOMMENDATION */}

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3">

                <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />

                <div>

                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">
                    Recommended Action
                  </p>

                  <p className="text-sm text-foreground">
                    Maintain emergency block
                    until authorized field
                    clearance is received.
                  </p>

                </div>

              </div>


              {/* TIMELINE */}

              <div>

                <p className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-border/50 pb-2">
                  Incident Timeline
                </p>


                <div className="space-y-4 px-2">

                  <TimelineNode
                    text="Incident Detected"
                    active={true}
                  />


                  <TimelineNode
                    text="Emergency Block Recorded"
                    active={true}
                  />


                  <TimelineNode
                    text="Control Notification Recorded"
                    active={
                      activeDrawerBlock.controlNotified
                    }
                  />


                  <TimelineNode
                    text="Traffic Protection Status Recorded"
                    active={
                      activeDrawerBlock.trafficProtectionStatus !==
                      "PENDING"
                    }
                  />


                  <TimelineNode
                    text="Awaiting Field Clearance"
                    active={false}
                    isLast={true}
                  />

                </div>

              </div>


              {/* RESOLVE */}

              <div className="pt-4 border-t border-border">

                <Button
                  className="w-full bg-safe text-safe-foreground hover:bg-safe/90 font-bold"
                  onClick={() => {

                    setDetailsDrawer(null);

                    setTimeout(
                      () =>
                        setResolveModal(
                          activeDrawerBlock.id
                        ),
                      200
                    );

                  }}
                >

                  <CheckCircle2 className="mr-2 size-4" />

                  RESOLVE BLOCK

                </Button>

              </div>

            </div>

          )}

        </SheetContent>

      </Sheet>

    </>
  );
}


// =========================================================
// TIMELINE NODE
// =========================================================

function TimelineNode({
  text,
  active,
  isLast = false,
}: {
  text: string;
  active: boolean;
  isLast?: boolean;
}) {

  return (

    <div className="flex gap-3 relative">

      {!isLast && (

        <div
          className={`absolute left-[7px] top-5 bottom-[-16px] w-[2px] ${
            active
              ? "bg-primary"
              : "bg-border"
          }`}
        />

      )}


      <div
        className={`mt-0.5 size-4 shrink-0 rounded-full border-2 bg-background flex items-center justify-center z-10 ${
          active
            ? "border-primary"
            : "border-muted-foreground"
        }`}
      >

        {active && (
          <div className="size-1.5 rounded-full bg-primary" />
        )}

      </div>


      <div className="pb-2">

        <p
          className={`text-sm ${
            active
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {text}
        </p>

      </div>

    </div>

  );
}