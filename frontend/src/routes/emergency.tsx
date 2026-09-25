import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
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
  Building2,
  FileSpreadsheet,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

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
import { useLanguage } from "@/context/LanguageContext";
import { useAbps } from "@/context/AbpsContext";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      {
        title: "Emergency Incident & Caution Order (TSR) Desk | IR-ABPS",
      },
      {
        name: "description",
        content:
          "Official Indian Railways Emergency Incident Management, Traffic Protection Directives, and Immediate Line Block Orders.",
      },
    ],
  }),
  component: EmergencyPage,
});

interface Emergency {
  id: string;
  type: string;
  section: string;
  line: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  startedAt: Date;
  status: string;
  resolvedAt?: Date | null;
  controlNotified: boolean;
  trafficProtectionStatus: string;
}

interface ActivityEvent {
  id: string;
  time: Date;
  text: string;
  detail?: string;
}

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

function EmergencyPage() {
  const { t } = useLanguage();
  const { role, can } = useAbps();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);

  const allowedEmergencyTypes = useMemo(() => {
    if (role.id === "engineering") {
      return EMERGENCY_TYPES.filter((t) => ["Track", "Engineering", "General"].includes(t.group));
    }
    if (role.id === "traction") {
      return EMERGENCY_TYPES.filter((t) => ["Traction", "General"].includes(t.group));
    }
    if (role.id === "signal") {
      return EMERGENCY_TYPES.filter((t) => ["S&T", "General"].includes(t.group));
    }
    return EMERGENCY_TYPES;
  }, [role.id]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSection, setNewSection] = useState("");
  const [newType, setNewType] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [detailsDrawer, setDetailsDrawer] = useState<string | null>(null);

  const fetchEmergencies = async () => {
    try {
      setIsLoading(true);

      // Use the shared API client so authentication/base URL handling stays
      // consistent with the rest of the application.
      const response = await apiFetch("/emergency/", {
        method: "GET",
      });

      const rawText = await response.text();

      console.log("EMERGENCY GET STATUS:", response.status);
      console.log("EMERGENCY GET RESPONSE:", rawText);

      let data: any;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(`Backend returned invalid JSON (${response.status}): ${rawText}`);
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || `Emergency API failed with status ${response.status}`,
        );
      }

      // The emergency backend has returned more than one valid envelope
      // shape during development. Accept all of them so the UI stays
      // compatible with the actual /emergency/ response.
      const emergencyRows = Array.isArray(data)
        ? data
        : Array.isArray(data?.emergencies)
          ? data.emergencies
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.results)
                ? data.results
                : [];

      const mappedEmergencies: Emergency[] = emergencyRows
        .map((item: any, index: number) => {
          const id =
            item?.id ??
            item?.incident_id ??
            item?.emergency_id ??
            item?.incidentId ??
            `EMG-${index + 1}`;

          const type = item?.type ?? item?.emergency_type ?? item?.incident_type ?? "Unknown Hazard";
          const startedAtValue = item?.started_at ?? item?.created_at ?? item?.startedAt;

          return {
            id: String(id),
            type: String(type),
            section: String(item?.section ?? "Unknown Section"),
            line: String(item?.line ?? "Main Line"),
            severity: (item?.severity ?? "HIGH") as Emergency["severity"],
            startedAt: startedAtValue ? new Date(startedAtValue) : new Date(),
            status: String(item?.status ?? "ACTIVE").toUpperCase(),
            resolvedAt: (item?.resolved_at ?? item?.resolvedAt)
              ? new Date(item?.resolved_at ?? item?.resolvedAt)
              : null,
            controlNotified: Boolean(item?.control_notified ?? item?.controlNotified),
            trafficProtectionStatus: String(
              item?.traffic_protection_status ??
                item?.trafficProtectionStatus ??
                "PENDING",
            ),
          };
        })
        .filter((item: Emergency) => !Number.isNaN(item.startedAt.getTime()));

      setEmergencies(mappedEmergencies);

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
          time: new Date(emergency.startedAt.getTime() + 60000),
          text: "Emergency block recorded",
          detail: emergency.id,
        });

        if (emergency.controlNotified) {
          generatedActivity.push({
            id: `${emergency.id}-control`,
            time: new Date(emergency.startedAt.getTime() + 120000),
            text: "Control notification recorded",
            detail: "Section Controller ack stored",
          });
        }

        generatedActivity.push({
          id: `${emergency.id}-protection`,
          time: new Date(emergency.startedAt.getTime() + 180000),
          text: "Traffic protection status recorded",
          detail: emergency.trafficProtectionStatus,
        });

        if (["RESOLVED", "CLOSED", "CLEARED"].includes(String(emergency.status).toUpperCase())) {
          const resolvedTime =
            emergency.resolvedAt && !Number.isNaN(emergency.resolvedAt.getTime())
              ? emergency.resolvedAt
              : new Date(emergency.startedAt.getTime() + 240000);

          generatedActivity.push({
            id: `${emergency.id}-resolved`,
            time: resolvedTime,
            text: "Emergency block resolved",
            detail: emergency.id,
          });
        }
      });

      generatedActivity.sort((a, b) => b.time.getTime() - a.time.getTime());

      setActivity(generatedActivity);
    } catch (error) {
      console.error("Emergency API error:", error);

      toast.error("Unable to load emergency incident registry", {
        description: error instanceof Error ? error.message : "Unknown backend error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const activeEmergencies = emergencies.filter(
    (e) => !["RESOLVED", "CLOSED", "CLEARED"].includes(String(e.status).toUpperCase()),
  );
  const resolvedEmergencies = emergencies.filter(
    (e) => ["RESOLVED", "CLOSED", "CLEARED"].includes(String(e.status).toUpperCase()),
  );

  const criticalCount = activeEmergencies.filter((e) => e.severity === "CRITICAL").length;
  const notifiedCount = activeEmergencies.filter((e) => e.controlNotified).length;
  const protectedCount = activeEmergencies.filter(
    (e) => e.trafficProtectionStatus === "CONFIRMED",
  ).length;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-50 text-[#800000] border-red-300";
      case "HIGH":
        return "bg-amber-50 text-[#D97706] border-amber-300";
      case "MEDIUM":
        return "bg-sky-50 text-[#003366] border-sky-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "text-[#800000]";
      case "HIGH":
        return "text-[#D97706]";
      case "MEDIUM":
        return "text-[#003366]";
      default:
        return "text-slate-800";
    }
  };

  const handleInitiateClick = () => {
    if (!newSection || !newType) {
      toast.error("Missing Information", {
        description: "Please select both section and emergency type.",
      });
      return;
    }
    setConfirmModal(true);
  };

  const confirmInitiateSOS = async () => {
    setConfirmModal(false);
    setIsInitiating(true);

    try {
      const severity =
        newType.includes("Fracture") ||
        newType.includes("Hazard") ||
        newType.includes("Failure")
          ? "CRITICAL"
          : "HIGH";

      const response = await apiFetch("/emergency/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emergency_type: newType,
          section: newSection,
          line: "Main Line",
          severity,
        }),
      });

      const rawText = await response.text();

      console.log("EMERGENCY CREATE STATUS:", response.status);
      console.log("EMERGENCY CREATE RESPONSE:", rawText);

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(`Invalid backend response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || `Emergency creation failed (${response.status})`,
        );
      }

      const incidentId =
        data?.emergency?.id ??
        data?.emergency?.incident_id ??
        data?.incident?.id ??
        data?.incident?.incident_id ??
        data?.incident_id ??
        data?.id ??
        data?.emergency_id ??
        "New emergency";

      setNewSection("");
      setNewType("");

      // Read the registry again after the POST so the UI reflects PostgreSQL.
      await fetchEmergencies();

      toast.success("Emergency block created successfully", {
        description: `${incidentId} has been recorded in the emergency register.`,
      });
    } catch (error) {
      console.error("Create emergency error:", error);

      toast.error("Emergency creation failed", {
        description: error instanceof Error ? error.message : "Backend connection failed.",
      });
    } finally {
      setIsInitiating(false);
    }
  };

  const confirmResolveBlock = async () => {
    if (!resolveModal) return;

    const blockToResolve = emergencies.find((e) => e.id === resolveModal);

    if (!blockToResolve) {
      toast.error("Resolution failed", {
        description: "Emergency incident could not be found.",
      });
      return;
    }

    try {
      setIsInitiating(true);

      const response = await apiFetch(`/emergency/${encodeURIComponent(resolveModal)}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmed: true,
        }),
      });

      const data = await response.json();

      console.log("RESOLVE EMERGENCY RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data?.detail || data?.message || "Failed to resolve emergency");
      }

      setEmergencies((current) =>
        current.map((emergency) =>
          emergency.id === resolveModal
            ? { ...emergency, status: "RESOLVED", resolvedAt: new Date() }
            : emergency,
        ),
      );

      setResolveModal(null);
      setDetailsDrawer(null);

      await fetchEmergencies();

      toast.success("Block Resolution Recorded", {
        description: `${blockToResolve.id} marked as resolved in central register.`,
      });
    } catch (error) {
      console.error("Resolve emergency error:", error);

      toast.error("Resolution failed", {
        description: error instanceof Error ? error.message : "Unable to connect to backend.",
      });
    } finally {
      setIsInitiating(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins <= 0) return "Just now";
    return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeDrawerBlock = detailsDrawer ? emergencies.find((e) => e.id === detailsDrawer) : null;

  const activeResolveBlock = resolveModal ? emergencies.find((e) => e.id === resolveModal) : null;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. OFFICIAL GOVT BANNER */}
      <div className="rounded-[2px] border border-[#800000]/40 bg-white shadow-sm overflow-hidden">
        <div className="bg-[#800000] px-5 py-3 text-white flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#FF9933]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-[2px] bg-white/10 border border-white/20">
              <Siren className="size-5 text-[#FF9933] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-black/40 px-2 py-0.5 rounded-[2px]">
                  FORM IR-SOS-EMERG-2025
                </span>
                <span className="text-xs text-white/80 font-serif">
                  {t(
                    "RAILWAY BOARD • EMERGENCY BLOCK & SAFETY CONTROL DESK",
                    "रेलवे बोर्ड • आपातकालीन ब्लॉक एवं संरक्षा नियंत्रण कक्ष",
                  )}
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-bold font-serif tracking-tight text-white mt-0.5">
                {t(
                  "Emergency Block (SOS) & Caution Order (TSR) Command Center",
                  "आपातकालीन ब्लॉक (एसओएस) एवं संरक्षा नियंत्रण केंद्र",
                )}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-[#FF9933] hover:bg-[#e68524] text-slate-950 font-bold text-xs uppercase tracking-wider rounded-[2px] h-9 px-4 shadow-sm"
              onClick={() => {
                const panel = document.getElementById("sos-panel");
                if (panel) {
                  panel.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <AlertOctagon className="size-4 mr-1.5" /> Issue Urgent SOS Block
            </Button>
          </div>
        </div>
        <div className="p-3 bg-red-50/60 border-t border-red-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <p>
            Critical protocol interface for rail fracture, OHE snap, signalling blackout, and track
            obstruction. Immediately advises Section Controller and alerts Control Office (COA).
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#800000]">
            <Building2 className="size-3.5 text-[#800000]" />
            CONTROL DESK: NR-CENTRAL-DLI • SAFETY DIRECTIVE G&SR CH-IV
          </div>
        </div>
      </div>

      {/* 2. EMERGENCY STATUS STRIP */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[2px] border border-slate-300 bg-white p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Active Emergency Blocks
            </span>
            <span className="text-2xl font-mono font-bold text-[#003366]">
              {isLoading ? "—" : emergencies.length}
            </span>
          </div>
          <div className="p-2 rounded-[2px] bg-slate-100 text-slate-600 border border-slate-200">
            <AlertTriangle className="size-5" />
          </div>
        </div>

        <div
          className={`rounded-[2px] border p-3.5 shadow-sm flex items-center justify-between ${
            criticalCount > 0 ? "border-[#800000]/40 bg-red-50/50" : "border-slate-300 bg-white"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Critical Line Hazards
            </span>
            <span
              className={`text-2xl font-mono font-bold ${
                criticalCount > 0 ? "text-[#800000]" : "text-slate-700"
              }`}
            >
              {isLoading ? "—" : criticalCount}
            </span>
          </div>
          <div
            className={`p-2 rounded-[2px] border ${
              criticalCount > 0
                ? "bg-red-100 text-[#800000] border-red-300"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            <AlertOctagon className="size-5" />
          </div>
        </div>

        <div className="rounded-[2px] border border-slate-300 bg-white p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Control Notified
            </span>
            <span className="text-2xl font-mono font-bold text-[#137547]">
              {isLoading ? "—" : notifiedCount}
            </span>
          </div>
          <div className="p-2 rounded-[2px] bg-emerald-50 text-[#137547] border border-emerald-200">
            <RadioTower className="size-5" />
          </div>
        </div>

        <div className="rounded-[2px] border border-slate-300 bg-white p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Traffic Protection
            </span>
            <span
              className={`text-lg font-bold font-mono ${
                protectedCount > 0 ? "text-[#003366]" : "text-slate-500"
              }`}
            >
              {isLoading ? "CHECKING..." : protectedCount > 0 ? "ENFORCED" : "STANDBY"}
            </span>
          </div>
          <div
            className={`p-2 rounded-[2px] border ${
              protectedCount > 0
                ? "bg-sky-50 text-[#003366] border-sky-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            <ShieldCheck className="size-5" />
          </div>
        </div>
      </div>

      {/* 3. MAIN SOS ACTION PANEL */}
      <div
        id="sos-panel"
        className="rounded-[2px] border-2 border-[#800000]/50 bg-white shadow-md overflow-hidden"
      >
        <div className="bg-[#800000] px-4 py-2.5 text-white flex items-center justify-between border-b-2 border-[#FF9933]">
          <div className="flex items-center gap-2">
            <AlertOctagon className="size-4 text-[#FF9933]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              IMMEDIATE SECTION BLOCK IMPOSITION ORDER (SOS)
            </span>
          </div>
          <span className="text-[10px] text-white/90 font-mono bg-black/30 px-2 py-0.5 rounded-[2px]">
            AUTHORITY: SECTION CONTROLLER
          </span>
        </div>

        <div className="p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            {/* SECTION */}
            <div className="flex-1 w-full space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-[1px] bg-[#800000] text-[10px] font-bold text-white">
                  1
                </span>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Select Affected Section / Corridor
                </label>
              </div>

              <Select value={newSection} onValueChange={setNewSection}>
                <SelectTrigger className="w-full bg-white border-slate-300 focus:border-[#800000] text-xs h-9 rounded-[2px]">
                  <SelectValue placeholder="Select affected section..." />
                </SelectTrigger>
                <SelectContent className="rounded-[2px] border-slate-300">
                  {SECTIONS.map((section) => (
                    <SelectItem key={section} value={section} className="text-xs">
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* EMERGENCY TYPE */}
            <div className="flex-1 w-full space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-[1px] bg-[#800000] text-[10px] font-bold text-white">
                  2
                </span>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Emergency Incident Classification
                </label>
              </div>

              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-full bg-white border-slate-300 focus:border-[#800000] text-xs h-9 rounded-[2px]">
                  <SelectValue placeholder="Select emergency type..." />
                </SelectTrigger>
                <SelectContent className="rounded-[2px] border-slate-300">
                  {Array.from(new Set(allowedEmergencyTypes.map((type) => type.group))).map(
                    (group) => (
                      <div key={group}>
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100">
                          {group}
                        </div>
                        {allowedEmergencyTypes
                          .filter((type) => type.group === group)
                          .map((type) => (
                            <SelectItem key={type.value} value={type.value} className="text-xs">
                              {type.value}
                            </SelectItem>
                          ))}
                      </div>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* INITIATE */}
            <div className="w-full lg:w-auto space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-[1px] bg-[#800000] text-[10px] font-bold text-white">
                  3
                </span>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Record Block Order
                </label>
              </div>

              <Button
                size="sm"
                onClick={handleInitiateClick}
                className="w-full lg:w-[200px] bg-[#800000] hover:bg-[#600000] text-white font-bold tracking-wider text-xs uppercase h-9 rounded-[2px] shadow-sm"
                disabled={isInitiating}
              >
                {isInitiating ? (
                  "Recording Directive..."
                ) : (
                  <>
                    <ShieldAlert className="mr-1.5 size-4" />
                    IMPOSE SOS BLOCK
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-[#800000] bg-red-50 p-2.5 rounded-[2px] border border-red-200">
            <Info className="size-4 shrink-0 text-[#800000]" />
            <p>
              <strong>Indian Railways Safety Note:</strong> Immediate emergency blocking generates
              high-priority caution orders in the Section Controller console. Physical protection by
              detonators/red banner flags must be executed as per G&SR Rule 3.68.
            </p>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* ACTIVE EMERGENCY BLOCKS */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-slate-100 px-4 py-2.5 border border-slate-300 rounded-[2px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[#003366]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#003366]">
                ACTIVE EMERGENCY BLOCKS & TSR ADVISORIES ({activeEmergencies.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">REAL-TIME DATABASE FEED</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center border border-slate-300 rounded-[2px] bg-white text-slate-500">
              <Activity className="size-8 mx-auto mb-2 text-[#003366] animate-pulse" />
              <p className="font-bold text-slate-800 text-xs">
                Loading incident register from PostgreSQL...
              </p>
            </div>
          ) : activeEmergencies.length === 0 ? (
            <div className="p-8 text-center border border-slate-300 rounded-[2px] bg-white text-slate-600">
              <ShieldCheck className="size-8 mx-auto mb-2 text-[#137547]" />
              <p className="font-bold text-slate-800 text-sm">
                No Active Emergency Blocks on Corridor
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Normal traffic operation is currently maintained across all monitored sections.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeEmergencies.map((emergency) => (
                <div
                  key={emergency.id}
                  className={`rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col justify-between border-t-4 ${
                    emergency.severity === "CRITICAL"
                      ? "border-t-[#800000]"
                      : emergency.severity === "HIGH"
                        ? "border-t-[#D97706]"
                        : "border-t-[#003366]"
                  }`}
                >
                  <div className="bg-slate-50 p-3 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold uppercase tracking-wider rounded-[2px] ${getSeverityBadge(
                          emergency.severity,
                        )}`}
                      >
                        {emergency.severity} HAZARD
                      </Badge>
                      <span className="text-[10px] font-mono font-bold text-slate-600">
                        {emergency.id}
                      </span>
                    </div>
                    <h3
                      className="text-xs font-bold text-slate-900 truncate"
                      title={emergency.type}
                    >
                      {emergency.type}
                    </h3>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                      <Map className="size-3 shrink-0 text-slate-400" />
                      {emergency.section} • {emergency.line}
                    </p>
                  </div>

                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 uppercase font-bold text-[9px]">
                        Logged Time
                      </span>
                      <span className="font-medium font-mono text-slate-800 flex items-center gap-1">
                        <Clock className="size-3 text-slate-400" />
                        {getTimeAgo(emergency.startedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 uppercase font-bold text-[9px]">
                        Section Control
                      </span>
                      <span className="font-bold font-mono text-[#137547] flex items-center gap-1">
                        <RadioTower className="size-3" />
                        {emergency.controlNotified ? "NOTIFIED" : "PENDING"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 uppercase font-bold text-[9px]">
                        Protection
                      </span>
                      <span className="font-bold font-mono text-[#003366] flex items-center gap-1">
                        <ShieldCheck className="size-3" />
                        {emergency.trafficProtectionStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] font-bold uppercase rounded-[2px] h-7 border-slate-300 text-slate-800"
                        onClick={() => setDetailsDrawer(emergency.id)}
                      >
                        Docket Details
                      </Button>
                      {can("emergency.resolve") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] font-bold uppercase rounded-[2px] h-7 border-emerald-400 bg-emerald-50 text-[#137547] hover:bg-emerald-100"
                          onClick={() => setResolveModal(emergency.id)}
                        >
                          {t("Resolve Block", "ब्लॉक सुलझाएं")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolvedEmergencies.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="bg-emerald-50 px-4 py-2.5 border border-emerald-200 rounded-[2px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#137547]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#137547]">
                    RECENTLY RESOLVED BLOCKS ({resolvedEmergencies.length})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#137547]">CLEARANCE RECORDED</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {resolvedEmergencies.map((emergency) => (
                  <div
                    key={`resolved-${emergency.id}`}
                    className="rounded-[2px] border border-emerald-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between border-t-4 border-t-[#137547]"
                  >
                    <div className="bg-emerald-50/60 p-3 border-b border-emerald-100">
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold uppercase tracking-wider rounded-[2px] bg-emerald-50 text-[#137547] border-emerald-300"
                        >
                          RESOLVED
                        </Badge>
                        <span className="text-[10px] font-mono font-bold text-slate-600">{emergency.id}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 truncate" title={emergency.type}>
                        {emergency.type}
                      </h3>
                      <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                        <Map className="size-3 shrink-0 text-slate-400" />
                        {emergency.section} • {emergency.line}
                      </p>
                    </div>

                    <div className="p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 uppercase font-bold text-[9px]">Status</span>
                        <span className="font-bold font-mono text-[#137547] flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          CLEARANCE CONFIRMED
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 uppercase font-bold text-[9px]">Resolved</span>
                        <span className="font-medium font-mono text-slate-800">
                          {emergency.resolvedAt ? formatTime(emergency.resolvedAt) : "Recorded"}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-[11px] font-bold uppercase rounded-[2px] h-7 border-emerald-300 text-[#137547] bg-emerald-50 hover:bg-emerald-100"
                        onClick={() => setDetailsDrawer(emergency.id)}
                      >
                        VIEW RESOLUTION DETAILS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* INCIDENT ACTIVITY + PROTOCOL */}
        <div className="space-y-4">
          <div className="rounded-[2px] border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col h-[360px]">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center gap-2">
              <Clock className="size-4 text-[#003366]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#003366]">
                EMERGENCY DESK CHRONOLOGY
              </span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {activity.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs">
                  No recent incident activity recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 8).map((event, index) => (
                    <div key={event.id} className="flex gap-2.5 text-xs">
                      <div className="mt-1 size-2 rounded-[1px] bg-[#800000] shrink-0" />
                      <div className="flex-1 border-b border-slate-100 pb-2">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-800">{event.text}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatTime(event.time)}
                          </span>
                        </div>
                        {event.detail && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{event.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2px] border border-slate-300 bg-white p-4 shadow-sm space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#003366] font-bold uppercase tracking-wider text-xs border-b border-slate-200 pb-1.5">
              <Shield className="size-4 text-[#003366]" />
              Standard Operating Procedure (G&SR)
            </div>
            <div className="space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="size-3.5 text-[#137547] shrink-0 mt-0.5" />
                <span>
                  Confirm location with Station Master and Section Controller immediately.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="size-3.5 text-[#137547] shrink-0 mt-0.5" />
                <span>Impose Temporary Speed Restriction (TSR) or absolute block in COA.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="size-3.5 text-[#137547] shrink-0 mt-0.5" />
                <span>
                  Do not clear block until authorized written memo is received from field engineer.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INITIATE BLOCK MODAL */}
      <Dialog open={confirmModal} onOpenChange={setConfirmModal}>
        <DialogContent className="sm:max-w-md bg-white border border-[#800000]/40 rounded-[2px] p-0 overflow-hidden shadow-lg">
          <div className="bg-[#800000] text-white px-4 py-3 flex items-center gap-2 border-b-2 border-[#FF9933]">
            <AlertOctagon className="size-4 text-[#FF9933]" />
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-white">
              Confirm Emergency Block Imposition
            </DialogTitle>
          </div>
          <div className="p-4 space-y-3">
            <DialogDescription className="text-xs text-slate-700">
              You are about to record an emergency line block order in the official Indian Railways
              system:
            </DialogDescription>
            <div className="p-3 bg-red-50 border border-red-200 rounded-[2px] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">SECTION:</span>
                <span className="font-bold text-slate-900">{newSection}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">INCIDENT TYPE:</span>
                <span className="font-bold text-[#800000]">{newType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LINE:</span>
                <span className="font-bold text-slate-800">Main Up/Down Line</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              This action will register immediate protection status and broadcast to the Section
              Controller desk.
            </p>
          </div>
          <DialogFooter className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[2px] border-slate-300 text-xs"
              onClick={() => setConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#800000] hover:bg-[#600000] text-white font-bold text-xs uppercase tracking-wider rounded-[2px]"
              onClick={confirmInitiateSOS}
              disabled={isInitiating}
            >
              {isInitiating ? "Recording..." : "Authorize & Impose Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESOLVE BLOCK MODAL */}
      <Dialog open={!!resolveModal} onOpenChange={(open) => !open && setResolveModal(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-[#137547]/40 rounded-[2px] p-0 overflow-hidden shadow-lg">
          <div className="bg-[#137547] text-white px-4 py-3 flex items-center gap-2 border-b-2 border-[#FF9933]">
            <ShieldCheck className="size-4 text-[#FF9933]" />
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-white">
              Certify Emergency Block Clearance
            </DialogTitle>
          </div>
          <div className="p-4 space-y-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[2px] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">BLOCK REF:</span>
                <span className="font-bold text-[#003366]">{activeResolveBlock?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SECTION:</span>
                <span className="font-bold text-slate-800">{activeResolveBlock?.section}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">INCIDENT:</span>
                <span className="font-bold text-slate-800">{activeResolveBlock?.type}</span>
              </div>
            </div>
            <p className="text-xs text-slate-700 font-semibold">
              {t(
                "Has physical track fitness memo been received from the Senior Section Engineer (SSE)?",
                "क्या वरिष्ठ अनुभाग अभियंता (एसएसई) से भौतिक ट्रैक फिटनेस मेमो प्राप्त हुआ है?",
              )}
            </p>
            <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-[2px] text-xs font-bold text-[#137547]">
              {t(
                "Confirm the section is safe and normal working can resume.",
                "पुष्टि करें कि अनुभाग सुरक्षित है और सामान्य कार्य फिर से शुरू हो सकता है।",
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {t(
                "Confirming clearance will restore line availability and notify the Section Controller.",
                "निकासी की पुष्टि करने से लाइन की उपलब्धता बहाल हो जाएगी और अनुभाग नियंत्रक को सूचित किया जाएगा।",
              )}
            </p>
          </div>
          <DialogFooter className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[2px] border-slate-300 text-xs"
              onClick={() => setResolveModal(null)}
            >
              Keep Active
            </Button>
            <Button
              size="sm"
              className="bg-[#137547] hover:bg-[#0f5c37] text-white font-bold text-xs uppercase tracking-wider rounded-[2px]"
              onClick={confirmResolveBlock}
            >
              Certify & Clear Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAILS DRAWER */}
      <Sheet open={!!detailsDrawer} onOpenChange={(open) => !open && setDetailsDrawer(null)}>
        <SheetContent className="w-full sm:max-w-md border-l border-[#003366]/30 bg-white p-0 overflow-y-auto">
          <div className="bg-[#800000] text-white p-4 border-b-2 border-[#FF9933]">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#FF9933]">
              <AlertOctagon className="size-3.5" />
              EMERGENCY INCIDENT DOCKET
            </div>
            <SheetTitle className="text-base font-bold text-white mt-1">
              Incident Order: {activeDrawerBlock?.id}
            </SheetTitle>
            <SheetDescription className="text-xs text-white/80 font-mono mt-0.5">
              Section: {activeDrawerBlock?.section}
            </SheetDescription>
          </div>

          {activeDrawerBlock && (
            <div className="p-5 space-y-5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-[2px] border border-slate-300 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">INCIDENT TYPE:</span>
                  <span className="font-bold text-[#800000]">{activeDrawerBlock.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">LINE:</span>
                  <span className="font-bold text-slate-800">{activeDrawerBlock.line}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">STARTED AT:</span>
                  <span className="font-bold text-slate-800">
                    {formatTime(activeDrawerBlock.startedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ACTIVE DURATION:</span>
                  <span className="font-bold text-slate-800">
                    {getTimeAgo(activeDrawerBlock.startedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span
                    className={`font-bold ${
                      ["RESOLVED", "CLOSED", "CLEARED"].includes(
                        String(activeDrawerBlock.status).toUpperCase(),
                      )
                        ? "text-[#137547]"
                        : "text-[#D97706]"
                    }`}
                  >
                    {String(activeDrawerBlock.status).toUpperCase()}
                  </span>
                </div>
                {activeDrawerBlock.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">RESOLVED AT:</span>
                    <span className="font-bold text-[#137547]">
                      {formatTime(activeDrawerBlock.resolvedAt)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-[2px] border border-emerald-200 bg-emerald-50 flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <RadioTower className="size-3.5 text-[#137547]" /> Control Desk Status
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold uppercase bg-white border-emerald-300 text-[#137547]"
                  >
                    {activeDrawerBlock.controlNotified ? "Notified" : "Pending"}
                  </Badge>
                </div>
                <div className="p-2.5 rounded-[2px] border border-sky-200 bg-sky-50 flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-[#003366]" /> Traffic Protection
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold uppercase bg-white border-sky-300 text-[#003366]"
                  >
                    {activeDrawerBlock.trafficProtectionStatus}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[2px] space-y-1">
                <span className="font-bold text-[#D97706] uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Info className="size-3" /> Mandatory Safety Requirement
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Maintain speed restriction or total block until authorized field clearance is
                  certified by the concerned Section Engineer.
                </p>
              </div>

              {can("emergency.resolve") &&
                !["RESOLVED", "CLOSED", "CLEARED"].includes(
                  String(activeDrawerBlock.status).toUpperCase(),
                ) && (
                <div className="pt-2">
                  <Button
                    className="w-full bg-[#137547] hover:bg-[#0f5c37] text-white font-bold text-xs uppercase tracking-wider rounded-[2px] h-9 gap-1.5"
                    onClick={() => {
                      setDetailsDrawer(null);
                      setTimeout(() => setResolveModal(activeDrawerBlock.id), 200);
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Certify Block Resolution
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
