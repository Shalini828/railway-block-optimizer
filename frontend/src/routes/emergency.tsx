import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Import Structured Data & Types
import {
  INITIAL_EMERGENCIES,
  INCIDENT_TIMELINE,
  AI_REBLOCK_OPTIONS,
  CORRIDOR_NODES,
  TRAIN_IMPACT_DATA,
  RESPONSE_RESOURCES,
  RESTORATION_STAGES,
  PROTOCOL_STEPS,
  EMERGENCY_HISTORY_DATA,
  type EmergencyIncident,
  type ReblockOption,
  type TimelineEvent,
  type HistoricalEmergency,
} from "@/lib/emergency-data";

// Import Modular Components
import { EmergencyHeader } from "@/components/emergency/EmergencyHeader";
import { WorkflowStoryBanner } from "@/components/emergency/WorkflowStoryBanner";
import { EmergencyKPIs } from "@/components/emergency/EmergencyKPIs";
import { IncidentCommandConsole } from "@/components/emergency/IncidentCommandConsole";
import { ReblockOptimizer } from "@/components/emergency/ReblockOptimizer";
import { EmergencyImpactComparison } from "@/components/emergency/EmergencyImpactComparison";
import { ApprovalGate } from "@/components/emergency/ApprovalGate";
import { CorridorStatus } from "@/components/emergency/CorridorStatus";
import { TrainImpactForecast } from "@/components/emergency/TrainImpactForecast";
import { ActiveEmergencyBlocks } from "@/components/emergency/ActiveEmergencyBlocks";
import { IncidentTimeline } from "@/components/emergency/IncidentTimeline";
import { EmergencyProtocol } from "@/components/emergency/EmergencyProtocol";
import { ResponseTimeAnalytics } from "@/components/emergency/ResponseTimeAnalytics";
import { ResponseResources } from "@/components/emergency/ResponseResources";
import { WhatIfSimulator } from "@/components/emergency/WhatIfSimulator";
import { RestorationTracker } from "@/components/emergency/RestorationTracker";
import { EmergencyHistory } from "@/components/emergency/EmergencyHistory";

// Modals & Drawers
import { CreateEmergencyDialog } from "@/components/emergency/CreateEmergencyDialog";
import { ActivationConfirmModal } from "@/components/emergency/ActivationConfirmModal";
import { ResolveBlockDialog } from "@/components/emergency/ResolveBlockDialog";
import { AIRecommendationDrawer } from "@/components/emergency/AIRecommendationDrawer";
import { IncidentDetailsDrawer } from "@/components/emergency/IncidentDetailsDrawer";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Response & Re-Blocking Command Center | IR-ABPS" },
      {
        name: "description",
        content:
          "AI-assisted incident assessment, traffic protection, and emergency block planning across the railway corridor.",
      },
    ],
  }),
  component: EmergencyResponsePage,
});

export function EmergencyResponsePage() {
  // ----------------------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------------------
  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>(INITIAL_EMERGENCIES);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(INCIDENT_TIMELINE);
  const [reblockOptions, setReblockOptions] = useState<ReblockOption[]>(AI_REBLOCK_OPTIONS);
  const [selectedOption, setSelectedOption] = useState<ReblockOption>(AI_REBLOCK_OPTIONS[2]); // Option C default
  const [historyData, setHistoryData] = useState<HistoricalEmergency[]>(EMERGENCY_HISTORY_DATA);

  // UI Interactive States
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [resolveModalId, setResolveModalId] = useState<string | null>(null);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [incidentDrawerId, setIncidentDrawerId] = useState<string | null>(null);

  // Primary active incident (defaults to SOS-CNB-001)
  const primaryIncident = emergencies.find((e) => e.id === "SOS-CNB-001") || emergencies[0] || INITIAL_EMERGENCIES[0];
  const activeResolveIncident = emergencies.find((e) => e.id === resolveModalId) || null;
  const activeDrawerIncident = emergencies.find((e) => e.id === incidentDrawerId) || null;

  // Derived KPI values
  const activeCount = emergencies.length;
  const criticalCount = emergencies.filter((e) => e.severity === "CRITICAL").length;

  // ----------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------

  // Refresh Telemetry
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated("Just now");
      setIsRefreshing(false);
      toast.success("Telemetry Synced", {
        description: "Axle counters, acoustic monitoring and signal states updated.",
      });
    }, 600);
  };

  // Generate Re-Block Options
  const handleGenerateOptions = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("AI Re-Block Options Synchronized", {
        description: "Evaluated 14 path permutations. Option C selected as optimal choice.",
      });
    }, 1200);
  };

  // Option Selection
  const handleSelectOption = (opt: ReblockOption) => {
    setSelectedOption(opt);
    setIsApproved(false);
    toast.info(`Selected ${opt.name}`, {
      description: `Window: ${opt.window} (${opt.duration}) · Impact: ${opt.trainImpact}`,
    });
  };

  // Approval Gate Trigger
  const handleApproveGate = () => {
    setConfirmModalOpen(true);
  };

  // Confirm and Activate Block
  const handleConfirmActivate = () => {
    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      setIsApproved(true);
      setConfirmModalOpen(false);

      // Add activation event to timeline
      const newEvt: TimelineEvent = {
        id: `t_${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: new Date(),
        iconType: "check",
        title: "Emergency Block Authorized & Activated",
        detail: `Chief Controller authorized ${selectedOption.name} (${selectedOption.window}). Signals set to DANGER.`,
        status: "completed",
      };
      setTimeline([newEvt, ...timeline]);

      toast.success("Emergency Block Authorized & Activated!", {
        description: `Traffic protection active on ${primaryIncident.location}. Coordinated window scheduled.`,
      });
    }, 1000);
  };

  // Reject Option
  const handleRejectPlan = () => {
    setIsApproved(false);
    toast.error("Emergency Plan Rejected", {
      description: "Officer marked plan for revision. Standby protection maintained.",
    });
  };

  // Request Alternative
  const handleRequestAlternative = () => {
    handleGenerateOptions();
  };

  // Create New Crisis Block
  const handleCreateEmergency = (data: {
    section: string;
    type: string;
    line: string;
    description: string;
  }) => {
    const newId = `SOS-COR-${Math.floor(Math.random() * 900) + 100}`;
    const newEmergency: EmergencyIncident = {
      id: newId,
      type: data.type,
      section: data.section,
      line: data.line,
      location: `${data.section} · ${data.line}`,
      severity:
        data.type.includes("Fracture") || data.type.includes("Alarm")
          ? "CRITICAL"
          : "HIGH",
      assetId: `ENG-SEC-${Math.floor(Math.random() * 800) + 100}`,
      detectedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      startedAt: new Date(),
      riskScore: data.type.includes("Fracture") ? 92 : 82,
      confidence: 89,
      affectedCorridor: data.section.slice(0, 15),
      trainExposure: 5,
      estimatedRestoration: "2h 00m",
      etaRestoration: "20:30",
      status: "ACTIVE",
      trafficStatus: "PROTECTED",
      controlNotified: true,
      fieldTeamDispatched: true,
      aiRecommendation: "COORDINATED RE-BLOCK",
      reblockRequired: true,
      description: data.description,
    };

    const newEvt: TimelineEvent = {
      id: `t_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: new Date(),
      iconType: "alert",
      title: `${data.type} Reported (${newId})`,
      detail: `Emergency protection initiated on ${data.section}. Signals set to DANGER.`,
      status: "completed",
    };

    setEmergencies([newEmergency, ...emergencies]);
    setTimeline([newEvt, ...timeline]);

    toast.success("Emergency Response Initiated", {
      description: `Traffic protection active on ${data.section}. Candidate re-blocks computed.`,
    });
  };

  // Resolve Emergency Block
  const handleConfirmResolve = () => {
    if (!resolveModalId) return;
    const blockToResolve = emergencies.find((e) => e.id === resolveModalId);
    if (!blockToResolve) return;

    // Remove from active
    setEmergencies(emergencies.filter((e) => e.id !== resolveModalId));

    // Add to history
    const resolvedItem: HistoricalEmergency = {
      id: blockToResolve.id,
      type: blockToResolve.type,
      section: blockToResolve.location || blockToResolve.section,
      severity: blockToResolve.severity,
      start: `${blockToResolve.detectedTime} (Today)`,
      duration: "1h 45m",
      trainImpact: "+6 min",
      resolution: "Field clearance completed & verified",
      status: "Resolved",
    };
    setHistoryData([resolvedItem, ...historyData]);

    // Timeline event
    const resolveEvt: TimelineEvent = {
      id: `t_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: new Date(),
      iconType: "check",
      title: `Emergency Block Resolved (${blockToResolve.id})`,
      detail: `Ultrasonic clearance confirmed. Track locks removed. Line released to control.`,
      status: "completed",
    };
    setTimeline([resolveEvt, ...timeline]);

    setResolveModalId(null);
    setIncidentDrawerId(null);

    toast.success("Emergency Block Cleared", {
      description: `Block ${blockToResolve.id} resolved. Normal signaling restored.`,
    });
  };

  return (
    <div className="min-h-screen pb-16">
      {/* 1. PAGE HEADER */}
      <EmergencyHeader
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        onCreateResponse={() => setCreateModalOpen(true)}
        isRefreshing={isRefreshing}
      />

      {/* 21. HACKATHON WORKFLOW STORY BANNER */}
      <WorkflowStoryBanner />

      {/* 2. EMERGENCY STATUS KPI ROW */}
      <EmergencyKPIs
        activeCount={activeCount}
        criticalCount={criticalCount}
        protectedSectionsCount={activeCount}
        aiRecommendationsCount={3}
        delayAvoidedMinutes={46}
      />

      {/* 3 & 4. EMERGENCY COMMAND CENTER & AI RISK ASSESSMENT */}
      <IncidentCommandConsole
        incident={primaryIncident}
        onViewAiReasoning={() => setAiDrawerOpen(true)}
        onJumpToReblock={() => {
          const el = document.getElementById("reblock-engine");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* 5. AI EMERGENCY RE-BLOCKING (MAIN WOW FEATURE) */}
      <div id="reblock-engine">
        <ReblockOptimizer
          options={reblockOptions}
          selectedOption={selectedOption}
          onSelectOption={handleSelectOption}
          onGenerateOptions={handleGenerateOptions}
          isGenerating={isGenerating}
        />
      </div>

      {/* 6. BEFORE vs AFTER IMPACT SIMULATION */}
      <EmergencyImpactComparison />

      {/* 11. HUMAN APPROVAL GATE */}
      <ApprovalGate
        selectedOption={selectedOption}
        onReviewPlan={() => setAiDrawerOpen(true)}
        onApproveBlock={handleApproveGate}
        onReject={handleRejectPlan}
        onRequestAlternative={handleRequestAlternative}
        isApproved={isApproved}
      />

      {/* 7. CORRIDOR VISUALIZATION */}
      <CorridorStatus nodes={CORRIDOR_NODES} />

      {/* 8. TRAIN IMPACT PREDICTION */}
      <TrainImpactForecast trainData={TRAIN_IMPACT_DATA} />

      {/* 9. ACTIVE EMERGENCY BLOCKS */}
      <ActiveEmergencyBlocks
        emergencies={emergencies}
        onViewIncident={(id) => setIncidentDrawerId(id)}
        onViewAiPlan={(id) => setAiDrawerOpen(true)}
        onResolveBlock={(id) => setResolveModalId(id)}
        onCreateNew={() => setCreateModalOpen(true)}
      />

      {/* TWO COLUMN SECTION: TIMELINE, PROTOCOL, METRICS, RESOURCES */}
      <div className="grid lg:grid-cols-12 gap-6 mb-8 items-stretch">
        {/* Left Column (5 cols): Incident Timeline & Response Performance */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          <IncidentTimeline events={timeline} />
          <ResponseTimeAnalytics />
        </div>

        {/* Right Column (7 cols): Protocol & Resources Coordination */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          <EmergencyProtocol steps={PROTOCOL_STEPS} currentStepIndex={isApproved ? 8 : 7} />
          <ResponseResources resources={RESPONSE_RESOURCES} />
        </div>
      </div>

      {/* 16. WHAT-IF SIMULATION */}
      <WhatIfSimulator />

      {/* 17. RESTORATION TRACKER */}
      <RestorationTracker stages={RESTORATION_STAGES} eta={primaryIncident.etaRestoration} />

      {/* 18. EMERGENCY INCIDENT HISTORY */}
      <EmergencyHistory historyData={historyData} />

      {/* ----------------------------------------------------
          MODALS & DRAWERS
         ---------------------------------------------------- */}
      {/* 15. AI Recommendation Drawer */}
      <AIRecommendationDrawer
        open={aiDrawerOpen}
        onOpenChange={setAiDrawerOpen}
        incident={primaryIncident}
        selectedOption={selectedOption}
        onApprovePlan={() => {
          setAiDrawerOpen(false);
          handleApproveGate();
        }}
      />

      {/* Incident Details Drawer */}
      <IncidentDetailsDrawer
        open={!!incidentDrawerId}
        onOpenChange={(o) => !o && setIncidentDrawerId(null)}
        incident={activeDrawerIncident}
        onViewAiPlan={() => setAiDrawerOpen(true)}
        onResolve={(id) => setResolveModalId(id)}
      />

      {/* 20. Confirm Emergency Block Activation Modal */}
      <ActivationConfirmModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        incident={primaryIncident}
        selectedOption={selectedOption}
        onConfirm={handleConfirmActivate}
        isActivating={isActivating}
      />

      {/* Create New Emergency Response Dialog */}
      <CreateEmergencyDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateEmergency}
      />

      {/* Resolve Block Confirmation Dialog */}
      <ResolveBlockDialog
        open={!!resolveModalId}
        onOpenChange={(o) => !o && setResolveModalId(null)}
        incident={activeResolveIncident}
        onConfirm={handleConfirmResolve}
      />
    </div>
  );
}
