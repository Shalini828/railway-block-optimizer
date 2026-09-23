import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Network,
  GitFork,
  TrainFront,
  Wrench,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  Radio,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  Flame,
  Activity,
  Milestone,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { CORRIDORS, REQUISITIONS, TRAIN_PATHS, type Requisition } from "@/lib/abps-data";
import { toast } from "sonner";

// Route Search Params definition
interface ImpactDnaSearchParams {
  blockId?: string;
  lens?: "senior_officer" | "planning" | "maintenance" | "traffic" | "field";
}

export const Route = createFileRoute("/impact-dna")({
  validateSearch: (search: Record<string, unknown>) => {
    const blockId =
      typeof search["blockId"] === "string"
        ? search["blockId"]
        : undefined;

    const lensValue = search["lens"];

    const lens =
      typeof lensValue === "string" &&
      ["senior_officer", "planning", "maintenance", "traffic", "field"].includes(
        lensValue,
      )
        ? (lensValue as ImpactDnaSearchParams["lens"])
        : undefined;

    return {
      ...(blockId !== undefined ? { blockId } : {}),
      ...(lens !== undefined ? { lens } : {}),
    };
  },

  head: () => ({
    meta: [
      {
        title: "Railway Impact DNA | AI Causal Network | IR-ABPS",
      },
      {
        name: "description",
        content:
          "AI Causal Network and explainable operations visualization tracing how maintenance block decisions propagate through the Indian Railways network.",
      },
    ],
  }),

  component: RailwayImpactDnaPage,
});

// Normalized Block Type for Causal Analysis
interface ImpactBlock {
  block_id: string;
  corridor_id: string;
  corridor_name: string;
  block_date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  utilization_percent: number;
  train_impact_score: number;
  optimization_score: number;
  asset_count: number;
  train_movements_count: number;
  passenger_movements_count: number;
  freight_pressure_score: number;
  downstream_corridors_count: number;
  network_pressure: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity_level: "LOCAL" | "CORRIDOR" | "REGIONAL" | "NETWORK";
  ai_confidence: string;
  tasks: Array<{
    task_id: string;
    department: string;
    task_type: string;
    description: string;
    priority: number;
    chainage?: string;
    criticality?: "High" | "Medium" | "Low";
  }>;
  trains: Array<{
    train_id: string;
    train_name: string;
    train_type: "Express" | "Passenger" | "Freight" | "Special";
    scheduled_time: string;
    estimated_delay_min: number;
  }>;
  downstream_names: string[];
  hidden_dependencies: string[];
  explanation: string;
}

// Node types in Causal Network
type NodeType =
  "block" | "asset" | "corridor" | "train" | "freight" | "station" | "downstream" | "network";

interface NetworkNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  stage: number; // 1 to 6
  icon: string;
  dept?: string;
  status?: "normal" | "warning" | "critical" | "active";
  details?: Record<string, string | number>;
}

interface NetworkEdge {
  from: string;
  to: string;
  label?: string;
  stage: number; // activated at this stage
  dashed?: boolean;
}

// Helper to compute port-anchored geometric paths for railway topology edges
function getEdgeGeometry(source: NetworkNode, target: NetworkNode) {
  const sw = (source.width || 215) / 2;
  const sh = (source.height || 60) / 2;
  const tw = (target.width || 215) / 2;
  const th = (target.height || 60) / 2;

  // 1. Asset -> Block (Smooth horizontal S-curve)
  if (source.id.startsWith("asset-") && target.id === "node-block") {
    const sx = source.x + sw;
    const sy = source.y;
    const tx = target.x - tw;
    const ty = target.y;
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;
    return {
      d: `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`,
      midX: midX - 10,
      midY,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 2. Train Express (Top) -> Block (Straight vertical)
  if (source.id === "train-express" && target.id === "node-block") {
    const sx = source.x;
    const sy = source.y + sh;
    const tx = target.x;
    const ty = target.y - th;
    return {
      d: `M ${sx} ${sy} L ${tx} ${ty}`,
      midX: sx,
      midY: (sy + ty) / 2,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 3. Block -> Train Right (Straight horizontal)
  if (source.id === "node-block" && target.id === "train-right") {
    const sx = source.x + sw;
    const sy = source.y;
    const tx = target.x - tw;
    const ty = target.y;
    return {
      d: `M ${sx} ${sy} L ${tx} ${ty}`,
      midX: (sx + tx) / 2,
      midY: sy,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 4. Block -> Corridor (Vertical Spine)
  if (source.id === "node-block" && target.id === "node-corridor") {
    const sx = source.x;
    const sy = source.y + sh;
    const tx = target.x;
    const ty = target.y - th;
    return {
      d: `M ${sx} ${sy} L ${tx} ${ty}`,
      midX: sx,
      midY: (sy + ty) / 2,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 5. Corridor -> Passenger (Left bifurcation curve)
  if (source.id === "node-corridor" && target.id === "node-passenger") {
    const sx = source.x;
    const sy = source.y + sh;
    const tx = target.x;
    const ty = target.y - th;
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;
    return {
      d: `M ${sx} ${sy} C ${sx} ${sy + 35}, ${tx} ${ty - 35}, ${tx} ${ty}`,
      midX,
      midY,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 6. Corridor -> Freight (Right bifurcation curve)
  if (source.id === "node-corridor" && target.id === "node-freight") {
    const sx = source.x;
    const sy = source.y + sh;
    const tx = target.x;
    const ty = target.y - th;
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;
    return {
      d: `M ${sx} ${sy} C ${sx} ${sy + 35}, ${tx} ${ty - 35}, ${tx} ${ty}`,
      midX,
      midY,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 7. Passenger -> Downstream (Straight vertical)
  if (source.id === "node-passenger" && target.id === "node-downstream") {
    const sx = source.x;
    const sy = source.y + sh;
    const tx = target.x;
    const ty = target.y - th;
    return {
      d: `M ${sx} ${sy} L ${tx} ${ty}`,
      midX: sx,
      midY: (sy + ty) / 2,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 8. Freight -> Network (Straight vertical)
  if (source.id === "node-freight" && target.id === "node-network") {
    const sx = source.x;
    const sy = source.y + sh;
    const tx = target.x;
    const ty = target.y - th;
    return {
      d: `M ${sx} ${sy} L ${tx} ${ty}`,
      midX: sx,
      midY: (sy + ty) / 2,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // 9. Downstream <-> Network (Horizontal Sync)
  if (source.id === "node-downstream" && target.id === "node-network") {
    const sx = source.x + sw;
    const sy = source.y;
    const tx = target.x - tw;
    const ty = target.y;
    return {
      d: `M ${sx} ${sy} L ${tx} ${ty}`,
      midX: (sx + tx) / 2,
      midY: sy,
      sourcePoint: { x: sx, y: sy },
      targetPoint: { x: tx, y: ty },
    };
  }

  // General fallback with port boundary clipping
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  const sx = isHorizontal ? (dx > 0 ? source.x + sw : source.x - sw) : source.x;
  const sy = isHorizontal ? source.y : dy > 0 ? source.y + sh : source.y - sh;
  const tx = isHorizontal ? (dx > 0 ? target.x - tw : target.x + tw) : target.x;
  const ty = isHorizontal ? target.y : dy > 0 ? target.y - th : target.y + th;
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  return {
    d: `M ${sx} ${sy} Q ${midX} ${midY} ${tx} ${ty}`,
    midX,
    midY,
    sourcePoint: { x: sx, y: sy },
    targetPoint: { x: tx, y: ty },
  };
}

function RailwayImpactDnaPage() {
  const search = useSearch({ from: "/impact-dna" });
  const { role, user } = useAbps();
  const { t } = useLanguage();

  // Role perspective lens
  const [activeLens, setActiveLens] = useState<
    "senior_officer" | "planning" | "maintenance" | "traffic" | "field"
  >(
    search.lens ||
      (role.id === "engineering"
        ? "maintenance"
        : role.id === "control"
          ? "traffic"
          : "senior_officer"),
  );

  // Loaded blocks state
  const [blocks, setBlocks] = useState<ImpactBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Trace animation state
  const [isTracing, setIsTracing] = useState(false);
  const [traceProgress, setTraceProgress] = useState(100);
  const [activeStage, setActiveStage] = useState(6); // 1 to 6 (default 6: complete)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 1. Build default fallback blocks from mock dataset
  const fallbackBlocks = useMemo<ImpactBlock[]>(() => {
    return [
      {
        block_id: "OPT-2026-09-01-006",
        corridor_id: "C04",
        corridor_name: "Kanpur Central (CNB) – Prayagraj Jn (ALD)",
        block_date: "2026-09-22",
        start_time: "10:30",
        end_time: "12:30",
        duration_min: 120,
        utilization_percent: 88,
        train_impact_score: 24,
        optimization_score: 84.5,
        asset_count: 5,
        train_movements_count: 7,
        passenger_movements_count: 4,
        freight_pressure_score: 18,
        downstream_corridors_count: 2,
        network_pressure: "MEDIUM",
        severity_level: "NETWORK",
        ai_confidence: "Moderate (83.4%)",
        tasks: [
          {
            task_id: "TSK-ENG-982",
            department: "TMS",
            task_type: "IMR Rail Fracture Flaw Rectification",
            description: "USFD flaw rectification on Down Main track bed",
            priority: 92,
            chainage: "KM 380/02 - 385/06",
            criticality: "High",
          },
          {
            task_id: "TSK-OHE-112",
            department: "TDMS",
            task_type: "Cantilever Adjustment & Hot Spot",
            description: "Thermovision flagged 118°C at dropper, mast alignment",
            priority: 85,
            chainage: "KM 381/04 - 384/00",
            criticality: "High",
          },
          {
            task_id: "TSK-SIG-401",
            department: "SMMS",
            task_type: "Axle Counter & Point Machine Overhaul",
            description: "Interlocking overhaul and detection contacts replacement",
            priority: 76,
            chainage: "KM 382/00 - 383/02",
            criticality: "Medium",
          },
          {
            task_id: "TSK-ENG-1147",
            department: "TMS",
            task_type: "Deep Screening Ballast Tamping",
            description: "Tamping ballast bed to remove 7mm track unevenness",
            priority: 68,
            chainage: "KM 383/05 - 384/10",
            criticality: "Medium",
          },
          {
            task_id: "TSK-TRD-540",
            department: "TDMS",
            task_type: "OHE Section Insulator Replacement",
            description: "Replace worn porcelain insulator on crossover span",
            priority: 64,
            chainage: "KM 384/12 - 385/00",
            criticality: "Low",
          },
        ],
        trains: [
          {
            train_id: "12951",
            train_name: "Mumbai Rajdhani Express",
            train_type: "Express",
            scheduled_time: "10:45",
            estimated_delay_min: 12,
          },
          {
            train_id: "22435",
            train_name: "Vande Bharat Express (NDLS-BSB)",
            train_type: "Express",
            scheduled_time: "11:15",
            estimated_delay_min: 0,
          },
          {
            train_id: "12801",
            train_name: "Purushottam Express",
            train_type: "Passenger",
            scheduled_time: "11:50",
            estimated_delay_min: 18,
          },
          {
            train_id: "04123",
            train_name: "Prayagraj Special Express",
            train_type: "Special",
            scheduled_time: "12:10",
            estimated_delay_min: 15,
          },
          {
            train_id: "GDS-4412",
            train_name: "Coal Rake (DDU → NDLS Power Grid)",
            train_type: "Freight",
            scheduled_time: "11:00",
            estimated_delay_min: 35,
          },
          {
            train_id: "GDS-7781",
            train_name: "Container Rake (CNB Logistic Park)",
            train_type: "Freight",
            scheduled_time: "12:00",
            estimated_delay_min: 20,
          },
          {
            train_id: "GDS-9904",
            train_name: "Petroleum BTPN Tank Rake",
            train_type: "Freight",
            scheduled_time: "12:25",
            estimated_delay_min: 10,
          },
        ],
        downstream_names: ["C05 Prayagraj – Pt. DDU Jn", "BSB Varanasi Junction Loop"],
        hidden_dependencies: [
          "Express movement 12951 (Mumbai Rajdhani) overlaps the proposed block window margin by 15 mins.",
          "Freight pressure is concentrated near the selected corridor; 3 goods rakes queued for freight loop line.",
          "Downstream corridor C05 occupancy may increase by +18% during line possession due to diverted paths.",
        ],
        explanation:
          "This maintenance window consolidates 5 maintenance assets on C04. The selected window intersects 7 scheduled train movements and has moderate operational pressure. Two downstream corridor relationships require attention before final approval.",
      },
      {
        block_id: "OPT-2026-09-01-002",
        corridor_id: "C01",
        corridor_name: "New Delhi (NDLS) – Ghaziabad – Kanpur (CNB)",
        block_date: "2026-09-23",
        start_time: "11:00",
        end_time: "13:30",
        duration_min: 150,
        utilization_percent: 92,
        train_impact_score: 31,
        optimization_score: 87.2,
        asset_count: 4,
        train_movements_count: 9,
        passenger_movements_count: 6,
        freight_pressure_score: 22,
        downstream_corridors_count: 1,
        network_pressure: "HIGH",
        severity_level: "REGIONAL",
        ai_confidence: "High (91.8%)",
        tasks: [
          {
            task_id: "TSK-ENG-772",
            department: "TMS",
            task_type: "Turnout Point Inspection & Weld Repair",
            description: "Ultrasonic testing and weld build-up on crossover 42B",
            priority: 95,
            chainage: "KM 122/04 - 124/00",
            criticality: "High",
          },
          {
            task_id: "TSK-OHE-331",
            department: "TDMS",
            task_type: "Contact Wire Renewal",
            description: "Tension check and dropper realignment across 3 bays",
            priority: 78,
            chainage: "KM 123/00 - 124/10",
            criticality: "Medium",
          },
        ],
        trains: [
          {
            train_id: "12004",
            train_name: "Lucknow Shatabdi",
            train_type: "Express",
            scheduled_time: "11:20",
            estimated_delay_min: 8,
          },
          {
            train_id: "12424",
            train_name: "Dibrugarh Rajdhani",
            train_type: "Express",
            scheduled_time: "12:10",
            estimated_delay_min: 14,
          },
        ],
        downstream_names: ["C02 Kanpur Central Yard"],
        hidden_dependencies: [
          "High-speed Shatabdi path requires speed restriction buffer at KM 122.",
          "Overhead power cut intersects adjacent Line 3 Up feeder circuit.",
        ],
        explanation:
          "High-density primary trunk block on C01. Consolidates 4 critical track and power works during daylight slack, holding secondary freight at Ghaziabad siding.",
      },
      {
        block_id: "OPT-2026-09-01-008",
        corridor_id: "C03",
        corridor_name: "Prayagraj (ALD) – Pt. DDU Jn (DDU)",
        block_date: "2026-09-24",
        start_time: "12:00",
        end_time: "14:15",
        duration_min: 135,
        utilization_percent: 79,
        train_impact_score: 16,
        optimization_score: 79.0,
        asset_count: 3,
        train_movements_count: 4,
        passenger_movements_count: 2,
        freight_pressure_score: 12,
        downstream_corridors_count: 2,
        network_pressure: "LOW",
        severity_level: "CORRIDOR",
        ai_confidence: "Moderate (80.1%)",
        tasks: [
          {
            task_id: "TSK-ENG-312",
            department: "TMS",
            task_type: "Girder Bridge Bearing Greasing",
            description: "Annual structural scrutiny on Yamuna Bridge piers",
            priority: 70,
            chainage: "KM 528/04 - 528/09",
            criticality: "Medium",
          },
        ],
        trains: [
          {
            train_id: "GDS-3301",
            train_name: "Bulk Grain Freight Rake",
            train_type: "Freight",
            scheduled_time: "12:45",
            estimated_delay_min: 15,
          },
        ],
        downstream_names: ["C04 DDU East Yard", "BSB Mainline"],
        hidden_dependencies: [
          "Freight loop isolation clears path for express traffic with zero passenger detention.",
        ],
        explanation:
          "Isolated bridge inspection block on C03. Minimal ripple effect on passenger timetable; single freight rake scheduled for loop detention.",
      },
    ];
  }, []);

  // 2. Fetch saved optimization blocks from PostgreSQL API & enrich with AI intelligence
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const response = await apiFetch("/optimized-plan/");
        interface ApiBlockTask {
          task_id?: string;
          department?: string;
          task_type?: string;
          description?: string;
          priority_score?: number | string;
        }

        interface ApiTrainConflict {
          train_id?: string;
          train_name?: string;
          train_type?: "Express" | "Passenger" | "Freight" | "Special";
          departure_time?: string;
          estimated_delay_min?: number | string;
        }

        interface ApiSavedBlock {
          block_id?: string;
          corridor_id?: string;
          block_date?: string;
          start_time?: string;
          end_time?: string;
          duration_min?: number | string;
          utilization_percent?: number | string;
          train_impact_score?: number | string;
          optimization_score?: number | string;
          number_of_tasks?: number | string;
          task_count?: number | string;
          tasks?: ApiBlockTask[];
          train_conflicts?: number | string;
          conflicts?: ApiTrainConflict[];
        }

        interface ApiIntelligenceData {
          traffic_summary?: {
            passenger_trains?: number;
            goods_trains?: number;
            special_trains?: number;
            express_trains?: number;
          };
          intelligence?: {
            asset_risk?: {
              risk_score?: number;
              priority_category?: string;
            };
            traffic_impact?: {
              traffic_impact_score?: number;
              disruption_level?: string;
            };
            goods_demand?: {
              predicted_goods_train_demand?: number;
              demand_level?: string;
            };
            overall_assessment?: {
              pressure_score?: number;
              overall_level?: string;
            };
          };
          traffic_intelligence?: {
            assessment?: {
              train_impact_score?: number;
              estimated_delay_min?: number;
              risk_level?: string;
              conflicts?: Array<{
                train_id?: string;
                train_number?: string;
                train_name?: string;
                train_type?: string;
                severity?: string;
                overlap_minutes?: number;
                estimated_delay_min?: number;
                source?: string;
                operational_priority?: number;
              }>;
            };
          };
          ai_explanation?: {
            score?: number;
            why_selected?: string[];
            metrics?: {
              duration_min?: number;
              utilization_percent?: number;
              train_impact_score?: number;
              number_of_tasks?: number;
              number_of_departments?: number;
            };
          };
        }

        if (!response.ok) {
          throw new Error("Unable to fetch saved plan");
        }
        const payload = (await response.json()) as { blocks?: ApiSavedBlock[] };
        const savedBlocks = payload.blocks || [];
        
        
        if (savedBlocks.length > 0) {
          const initialBlockId =
  search.blockId && savedBlocks.some((b) => String(b.block_id) === search.blockId)
    ? search.blockId
    : String(savedBlocks[0]?.block_id || "");
          const mapped: ImpactBlock[] = await Promise.all(
            savedBlocks.map(async (b: ApiSavedBlock, index: number) => {
              const blockId = String(b.block_id || `OPT-${index + 1}`);
              let intelligenceData: ApiIntelligenceData | null = null;

              if (blockId === initialBlockId) {
  try {
    const intRes = await apiFetch(`/ai/blocks/${blockId}/intelligence`);
    if (intRes.ok) {
      intelligenceData = (await intRes.json()) as ApiIntelligenceData;
    }
  } catch {
    // optional intelligence fetch failure handled gracefully
  }
}

              const assetCount = Number(b.number_of_tasks ?? b.task_count ?? b.tasks?.length ?? 5);
              const trainCount = Number(b.train_conflicts ?? b.conflicts?.length ?? 7);
              const pCount =
                intelligenceData?.traffic_summary?.passenger_trains ??
                Math.max(2, Math.round(trainCount * 0.6));
              const fScore =
                intelligenceData?.intelligence?.goods_demand?.predicted_goods_train_demand ?? 18;
              const tScore = Number(
                intelligenceData?.traffic_intelligence?.assessment?.train_impact_score ??
                  intelligenceData?.intelligence?.traffic_impact?.traffic_impact_score ??
                  b.train_impact_score ??
                  24,
              );
              const netPressure = intelligenceData?.intelligence?.overall_assessment?.overall_level
                ? (intelligenceData.intelligence.overall_assessment.overall_level.toUpperCase() as
                    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
                : tScore > 35
                  ? "HIGH"
                  : tScore > 18
                    ? "MEDIUM"
                    : "LOW";

              const corrId = b.corridor_id || `C0${(index % 4) + 1}`;
              const corrName = CORRIDORS.find((c) => c.id === corrId)?.name || `Corridor ${corrId}`;

              const downstreamList =
                corrId === "C01" || corrId === "NDLS-CNB"
                  ? ["C02 Kanpur Central Yard", "Ghaziabad Outer"]
                  : corrId === "C02" || corrId === "CNB-ALD"
                    ? ["C03 Prayagraj Jn Bypass", "Subedarganj Yard"]
                    : ["C04 Pt. DDU Jn Junction", "Varanasi Line"];

              const hiddenDeps = intelligenceData?.ai_explanation?.why_selected?.length
                ? intelligenceData.ai_explanation.why_selected
                : [
                    `Express movement overlaps the proposed block window margin by ${Math.max(10, Math.round(tScore * 0.5))} mins.`,
                    `Freight pressure is concentrated near ${corrId}; scheduled goods rakes require siding regulation.`,
                    `Downstream corridor occupancy may increase by +${Math.round(tScore * 0.75)}% during line possession.`,
                  ];

              return {
                block_id: blockId,
                corridor_id: corrId,
                corridor_name: corrName,
                block_date: b.block_date || "2026-09-22",
                start_time: b.start_time || "10:30",
                end_time: b.end_time || "12:30",
                duration_min: Number(b.duration_min) || 120,
                utilization_percent: Number(b.utilization_percent) || 85,
                train_impact_score: tScore,
                optimization_score: Number(b.optimization_score) || 82,
                asset_count: assetCount,
                train_movements_count: trainCount,
                passenger_movements_count: pCount,
                freight_pressure_score: fScore,
                downstream_corridors_count: downstreamList.length,
                network_pressure: netPressure,
                severity_level:
                  netPressure === "HIGH"
                    ? "NETWORK"
                    : netPressure === "MEDIUM"
                      ? "REGIONAL"
                      : "CORRIDOR",
                ai_confidence: "Moderate (84.2%)",
                tasks: (b.tasks || []).map((t: ApiBlockTask) => ({
                  task_id: t.task_id || "TSK-001",
                  department: t.department || "TMS",
                  task_type: t.task_type || "Track Rectification",
                  description: t.description || "Essential scheduled maintenance",
                  priority: Number(t.priority_score) || 75,
                })),
                trains: (b.conflicts || []).map((c: ApiTrainConflict) => ({
  train_id: c.train_id || "TRN-901",
  train_name: c.train_name || "Express Passenger",
  train_type: c.train_type || "Express",
  scheduled_time: c.departure_time || "11:00",
  estimated_delay_min: Number(c.estimated_delay_min) || 15,
})),
                downstream_names: downstreamList,
                hidden_dependencies: hiddenDeps,
                explanation: `This maintenance window consolidates ${assetCount} maintenance assets on ${corrId}. The selected window intersects ${trainCount} scheduled train movements and has ${netPressure.toLowerCase()} operational pressure. ${downstreamList.length} downstream corridor relationships require attention before final approval.`,
              };
            }),
          );

          if (!cancelled && mapped.length > 0) {
            setBlocks(mapped);
            // If URL specified a blockId, select it; otherwise default to first
            const matching = search.blockId && mapped.find((b) => b.block_id === search.blockId);
            setSelectedBlockId(matching ? matching.block_id : mapped[0]?.block_id ?? "");
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Using high-fidelity railway simulation blocks fallback:", err);
      }

      if (!cancelled) {
        setBlocks(fallbackBlocks);
        const matching =
          search.blockId && fallbackBlocks.find((b) => b.block_id === search.blockId);
        setSelectedBlockId(
  matching ? matching.block_id : fallbackBlocks[0]?.block_id ?? "",
);
        setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [fallbackBlocks, search.blockId]);

  // Selected block
  const selectedBlock = useMemo<ImpactBlock>(() => {
  const block =
    blocks.find((b) => b.block_id === selectedBlockId) ??
    blocks[0] ??
    fallbackBlocks[0];

  if (!block) {
    throw new Error("No Impact DNA block is available");
  }

  return block;
}, [blocks, selectedBlockId, fallbackBlocks]);

useEffect(() => {
  if (!selectedBlockId) return;

  let cancelled = false;

  async function loadSelectedBlockIntelligence() {
    try {
      const response = await apiFetch(
        `/ai/blocks/${selectedBlockId}/intelligence`,
      );

      if (!response.ok) return;

      const intelligence = await response.json();

      if (cancelled) return;

      setBlocks((currentBlocks) =>
        currentBlocks.map((block) => {
          if (block.block_id !== selectedBlockId) {
            return block;
          }

          const trafficScore = Number(
            intelligence.traffic_intelligence?.assessment?.train_impact_score ??
              intelligence.intelligence?.traffic_impact?.traffic_impact_score ??
              block.train_impact_score,
          );

          const freightScore = Number(
            intelligence.intelligence?.goods_demand
              ?.predicted_goods_train_demand ??
              block.freight_pressure_score,
          );

          const pressure =
            intelligence.intelligence?.overall_assessment?.overall_level;

          return {
            ...block,
            train_impact_score: trafficScore,
            freight_pressure_score: freightScore,
            passenger_movements_count:
              intelligence.traffic_summary?.passenger_trains ??
              block.passenger_movements_count,
            train_movements_count:
              intelligence.traffic_summary?.express_trains ??
              block.train_movements_count,
            network_pressure: pressure
              ? (pressure.toUpperCase() as "LOW" | "MEDIUM" | "HIGH")
              : block.network_pressure,
            hidden_dependencies:
              intelligence.ai_explanation?.why_selected?.length
                ? intelligence.ai_explanation.why_selected
                : block.hidden_dependencies,
          };
        }),
      );
    } catch (error) {
      console.error(
        `Failed to load intelligence for ${selectedBlockId}`,
        error,
      );
    }
  }

  void loadSelectedBlockIntelligence();

  return () => {
    cancelled = true;
  };
}, [selectedBlockId]);

  // Handle Trace Block Impact Animation
  const handleTraceImpact = useCallback(() => {
    if (isTracing) return;
    setIsTracing(true);
    setTraceProgress(10);
    setActiveStage(1);
    toast.info("Tracing Causal Propagation...", {
      description: `Analyzing operational network cascade for ${selectedBlock.block_id}`,
    });

    const stages = [
      { stage: 1, progress: 16, delay: 400 },
      { stage: 2, progress: 34, delay: 900 },
      { stage: 3, progress: 52, delay: 1500 },
      { stage: 4, progress: 70, delay: 2100 },
      { stage: 5, progress: 88, delay: 2700 },
      { stage: 6, progress: 100, delay: 3300 },
    ];

    stages.forEach(({ stage, progress, delay }) => {
      setTimeout(() => {
        setActiveStage(stage);
        setTraceProgress(progress);
        if (stage === 6) {
          setIsTracing(false);
          toast.success("Impact DNA Cascade Computed", {
            description: `Network propagation traced across ${selectedBlock.downstream_corridors_count} downstream corridors.`,
          });
        }
      }, delay);
    });
  }, [isTracing, selectedBlock]);

  // Construct Network Nodes & Edges dynamically based on selected block & perspective lens
  const { nodes, edges } = useMemo(() => {
    const b = selectedBlock;
    const isFieldLens = activeLens === "field";

    // Center coordinates in a 1200 x 640 widescreen topology
    const centerX = 600;
    const centerY = 210;

    const n: NetworkNode[] = [];
    const e: NetworkEdge[] = [];

    // 1. Central Node: Maintenance Block (Illuminated Core Command)
    n.push({
      id: "node-block",
      type: "block",
      label: b.block_id,
      sublabel: `${b.corridor_id} • ${b.start_time}–${b.end_time}`,
      x: centerX,
      y: centerY,
      width: 250,
      height: 78,
      stage: 1,
      icon: "wrench",
      status: "active",
      details: {
        "Block ID": b.block_id,
        Corridor: b.corridor_id,
        "Time Window": `${b.start_time} to ${b.end_time} (${b.duration_min} min)`,
        Utilization: `${b.utilization_percent}%`,
        Score: `${b.optimization_score}/100`,
        "Primary Authority": isFieldLens ? "Field SSE P.Way Clear" : "COA / Chief Controller",
      },
    });

    // 2. Upstream / Inputs: Critical Assets (Left column, balanced vertical distribution)
    const assetCount = Math.min(b.asset_count, 4);
    const assetTasks = b.tasks.length
      ? b.tasks
      : [
          {
            task_id: "ASSET-01",
            department: "TMS",
            task_type: "IMR Rail Fracture Flaw",
            description: "USFD Class flaw",
            priority: 92,
            chainage: "KM 380/02",
          },
          {
            task_id: "ASSET-02",
            department: "TDMS",
            task_type: "OHE Mast 112 Dropper",
            description: "Hot spot dropper 118°C",
            priority: 85,
            chainage: "KM 381/04",
          },
          {
            task_id: "ASSET-03",
            department: "SMMS",
            task_type: "Point Machine 119 Interlock",
            description: "Interlock overhaul",
            priority: 76,
            chainage: "KM 382/00",
          },
          {
            task_id: "ASSET-04",
            department: "TMS",
            task_type: "Deep Screening Ballast Bed",
            description: "Unevenness tamping",
            priority: 68,
            chainage: "KM 383/05",
          },
        ];

    const assetSpacing = assetCount <= 1 ? 0 : Math.min(88, 270 / (assetCount - 1));
    const startY = assetCount <= 1 ? centerY : centerY - ((assetCount - 1) * assetSpacing) / 2;

    assetTasks.slice(0, assetCount).forEach((task, idx) => {
      const assetY = startY + idx * assetSpacing;
      const assetId = `asset-${idx}`;
      n.push({
        id: assetId,
        type: "asset",
        label: task.task_type.length > 22 ? task.task_type.slice(0, 20) + "..." : task.task_type,
        sublabel: `${task.department} • ${task.chainage || "KM 380"}`,
        x: 175,
        y: assetY,
        width: 215,
        height: 62,
        stage: 2,
        dept: task.department,
        icon: "alert",
        status: task.priority > 80 ? "critical" : "warning",
        details: {
          Asset: task.task_id,
          Department: task.department,
          Scope: task.description,
          Priority: `${task.priority}/100`,
          Chainage: task.chainage || "Corridor Track Span",
        },
      });
      e.push({
        from: assetId,
        to: "node-block",
        label: `${task.department} DEFECT`,
        stage: 2,
      });
    });

    // 3. Train Movements: Top / Right Branches
    // Express Train (Top - Path Intersect)
    n.push({
      id: "train-express",
      type: "train",
      label: "12951 Mumbai Rajdhani",
      sublabel: "Express • Overlap 15 min",
      x: centerX,
      y: 65,
      width: 230,
      height: 56,
      stage: 3,
      icon: "train",
      status: "warning",
      details: {
        Train: "12951 Mumbai Rajdhani",
        Category: "Superfast Premium Express",
        "Slot Overlap": "10:45 – 11:00",
        "Regulation Action": "Caution order 45 kmph on Loop line",
      },
    });
    e.push({
      from: "train-express",
      to: "node-block",
      label: "PATH INTERSECT",
      stage: 3,
      dashed: true,
    });

    // Scheduled Train Movement (Right - Headway Clearance)
    n.push({
      id: "train-right",
      type: "train",
      label: "22435 Vande Bharat Exp",
      sublabel: "Cleared on Up Main line",
      x: 1010,
      y: centerY,
      width: 220,
      height: 60,
      stage: 3,
      icon: "train",
      status: "normal",
      details: {
        Train: "22435 Vande Bharat Express",
        Status: "Parallel track separation active",
        "Speed Imposed": "None (Full clearance on Up Main)",
      },
    });
    e.push({
      from: "node-block",
      to: "train-right",
      label: "HEADWAY CLEAR",
      stage: 3,
    });

    // 4. Local Corridor (Spine Below Block)
    n.push({
      id: "node-corridor",
      type: "corridor",
      label: `Corridor ${b.corridor_id}`,
      sublabel:
        b.corridor_name.length > 30 ? b.corridor_name.slice(0, 28) + "..." : b.corridor_name,
      x: centerX,
      y: 345,
      width: 230,
      height: 62,
      stage: 3,
      icon: "corridor",
      status: "normal",
      details: {
        Corridor: b.corridor_id,
        Name: b.corridor_name,
        "Possession Line": "Down Main Track Line",
        "Track Intensity": "78% Corridor Capacity",
      },
    });
    e.push({
      from: "node-block",
      to: "node-corridor",
      label: "LINE POSSESSION",
      stage: 3,
    });

    // 5. Bifurcation: Passenger vs Freight Flows
    n.push({
      id: "node-passenger",
      type: "train",
      label: "Passenger Traffic Flow",
      sublabel: `${b.passenger_movements_count} Trains • 1 Caution Order`,
      x: 380,
      y: 470,
      width: 220,
      height: 60,
      stage: 4,
      icon: "train",
      status: "normal",
      details: {
        "Passenger Paths": `${b.passenger_movements_count} regular movements`,
        "Punctuality Risk": "Low (Minor 8-12 min speed slack absorbed)",
      },
    });
    e.push({
      from: "node-corridor",
      to: "node-passenger",
      label: "TIMETABLE SLACK",
      stage: 4,
    });

    n.push({
      id: "node-freight",
      type: "freight",
      label: "Freight Rake Pressure",
      sublabel: `Index ${b.freight_pressure_score} • Coal & Container`,
      x: 820,
      y: 470,
      width: 220,
      height: 60,
      stage: 4,
      icon: "freight",
      status: b.freight_pressure_score > 20 ? "critical" : "warning",
      details: {
        "Freight Pressure": `${b.freight_pressure_score} Index`,
        "Queued Rakes": "3 Rakes (Coal DDU → NDLS Power)",
        "Siding Routing": "Freight Loop Line 3 allocated",
      },
    });
    e.push({
      from: "node-corridor",
      to: "node-freight",
      label: "LOOP REGULATED",
      stage: 4,
    });

    // 6. Downstream Corridors & Network Pressure
    const downName = b.downstream_names[0] || "C05 Prayagraj – DDU Corridor";
    n.push({
      id: "node-downstream",
      type: "downstream",
      label: downName.length > 24 ? downName.slice(0, 22) + "..." : downName,
      sublabel: "Downstream Headway Buffer",
      x: 380,
      y: 575,
      width: 220,
      height: 56,
      stage: 5,
      icon: "corridor",
      status: "normal",
      details: {
        "Downstream Section": downName,
        "Inflow Headway": "+14 min buffer between blocks",
        "Interchange Junction": "CNB East Cabin Clearance",
      },
    });
    e.push({
      from: "node-passenger",
      to: "node-downstream",
      label: "CORRIDOR HANDOVER",
      stage: 5,
    });

    n.push({
      id: "node-network",
      type: "network",
      label: "Network Operational Pressure",
      sublabel: `Risk Level: ${b.network_pressure} (${b.severity_level})`,
      x: 820,
      y: 575,
      width: 220,
      height: 56,
      stage: 6,
      icon: "network",
      status:
        b.network_pressure === "HIGH"
          ? "critical"
          : b.network_pressure === "MEDIUM"
            ? "warning"
            : "normal",
      details: {
        "Network Ripple Risk": b.network_pressure,
        "Systemic Detention":
          b.network_pressure === "HIGH"
            ? "High across 2 divisions"
            : "Localized to adjacent block section",
        "AI Recommendation": "Approved subject to Controller TSR validation",
      },
    });
    e.push({
      from: "node-freight",
      to: "node-network",
      label: "SIDING QUEUE",
      stage: 6,
    });

    // Horizontal connection at bottom: Downstream Corridor <--> Network Pressure
    e.push({
      from: "node-downstream",
      to: "node-network",
      label: "DIVISION SYNC",
      stage: 6,
      dashed: true,
    });

    return { nodes: n, edges: e };
  }, [selectedBlock, activeLens]);

  // Currently inspected node
  const activeInspectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. MAIN SECTION HEADER */}
      <PageHeader
        title={t("RAILWAY IMPACT DNA", "रेलवे प्रभाव डीएनए")}
        subtitle={t(
          "AI Causal Network • Explainable Railway Operations — Trace how a maintenance decision propagates through the railway network.",
          "एआई कारणात्मक नेटवर्क • व्याख्या योग्य रेलवे परिचालन — पता लगाएं कि रखरखाव निर्णय रेलवे नेटवर्क में कैसे प्रसारित होता है।",
        )}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge
              variant="outline"
              className="bg-[#003366] text-white border-[#003366] text-[11px] font-bold px-3 py-1 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Radio className="size-3 text-[#FF9933] animate-pulse" />
              {t("LIVE CAUSAL ENGINE", "सक्रिय कारणात्मक इंजन")}
            </Badge>
          </div>
        }
      />

      {/* BLOCK SELECTOR & TRACE PRIMARY ACTION */}
      <Card className="border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                {t("SELECTED BLOCK:", "चयनित ब्लॉक:")}
              </div>

              {/* Block Dropdown */}
              <div className="w-full sm:w-[320px]">
                <Select
                  value={selectedBlockId}
                  onValueChange={(val) => {
                    setSelectedBlockId(val);
                    setSelectedNodeId(null);
                    // Reset animation to 6
                    setActiveStage(6);
                    setTraceProgress(100);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-mono font-bold border-2 border-slate-300 dark:border-slate-700 rounded-[2px] bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Select Optimized Block" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((b) => (
                      <SelectItem key={b.block_id} value={b.block_id} className="text-xs font-mono">
                        <span className="font-bold text-[#003366] dark:text-sky-400">
                          {b.block_id}
                        </span>
                        {" — "}
                        <span>
                          {b.corridor_id} ({b.start_time}–{b.end_time})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick block meta pill */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-[2px] border border-border font-bold">
                  {selectedBlock.corridor_id}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-[2px] border border-border font-mono">
                  {selectedBlock.start_time} — {selectedBlock.end_time}
                </span>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 rounded-[2px] border border-blue-200 dark:border-blue-800 font-semibold">
                  {selectedBlock.asset_count} Assets • {selectedBlock.train_movements_count} Train
                  Movements
                </span>
              </div>
            </div>

            {/* Primary Action Button: TRACE BLOCK IMPACT */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
              <Button
                onClick={handleTraceImpact}
                disabled={isTracing}
                className="w-full sm:w-auto h-10 px-5 bg-[#003366] hover:bg-[#002244] text-white font-extrabold uppercase tracking-wider text-xs rounded-[2px] shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <GitFork className={`size-4 ${isTracing ? "animate-spin" : ""}`} />
                {isTracing
                  ? t("TRACING PROPAGATION...", "प्रसार का पता लगाया जा रहा है...")
                  : t("TRACE BLOCK IMPACT", "ब्लॉक प्रभाव ट्रेस करें")}
              </Button>
            </div>
          </div>

          {/* 6. TRACE IMPACT PROGRESS EXPERIENCE */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t("TRACING NETWORK IMPACT", "नेटवर्क प्रभाव का पता लगाना")}:
                </span>
                <span className="text-[11px] font-mono font-extrabold text-[#003366] dark:text-sky-400">
                  {traceProgress}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {activeStage === 1 && "• Stage 1: BLOCK SELECTED"}
                  {activeStage === 2 && "• Stage 2: ASSET DEPENDENCIES"}
                  {activeStage === 3 && "• Stage 3: TRAIN MOVEMENTS"}
                  {activeStage === 4 && "• Stage 4: FREIGHT / PASSENGER PRESSURE"}
                  {activeStage === 5 && "• Stage 5: DOWNSTREAM CORRIDORS"}
                  {activeStage === 6 && "• Stage 6: NETWORK IMPACT COMPLETE"}
                </span>
              </div>

              {/* Step indicator badges */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6].map((stg) => (
                  <div
                    key={stg}
                    className={`size-2 rounded-full transition-all ${
                      activeStage >= stg
                        ? "bg-[#FF9933] ring-2 ring-[#FF9933]/30"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-[1px] overflow-hidden">
              <div
                className="bg-[#FF9933] h-full transition-all duration-500 ease-out"
                style={{ width: `${traceProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. IMPACT HOPS INDICATOR */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-[2px] border-l-4 border-[#FF9933] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Milestone className="size-5 text-[#FF9933] shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("CAUSAL PROPAGATION REACH", "कारणात्मक प्रसार पहुंच")}
            </div>
            <div className="text-sm font-extrabold uppercase tracking-wide text-white">
              {t("IMPACT DEPTH: 4 HOPS", "प्रभाव गहराई: 4 हॉप्स")}
            </div>
          </div>
        </div>

        {/* 4 Hop steps */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold">
          <div
            className={`px-2.5 py-1 rounded-[2px] border flex items-center gap-1.5 ${
              activeStage >= 1
                ? "bg-[#003366] border-sky-400 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <span className="size-4 rounded-full bg-[#FF9933] text-black text-[10px] font-black flex items-center justify-center">
              1
            </span>
            <span>{t("Maintenance Block", "अनुरक्षण ब्लॉक")}</span>
          </div>

          <ChevronRight className="size-3.5 text-slate-500" />

          <div
            className={`px-2.5 py-1 rounded-[2px] border flex items-center gap-1.5 ${
              activeStage >= 3
                ? "bg-[#003366] border-sky-400 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <span className="size-4 rounded-full bg-[#FF9933] text-black text-[10px] font-black flex items-center justify-center">
              2
            </span>
            <span>{t("Local Corridor", "स्थानीय कॉरिडोर")}</span>
          </div>

          <ChevronRight className="size-3.5 text-slate-500" />

          <div
            className={`px-2.5 py-1 rounded-[2px] border flex items-center gap-1.5 ${
              activeStage >= 4
                ? "bg-[#003366] border-sky-400 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <span className="size-4 rounded-full bg-[#FF9933] text-black text-[10px] font-black flex items-center justify-center">
              3
            </span>
            <span>{t("Train Movements", "ट्रेन आवागमन")}</span>
          </div>

          <ChevronRight className="size-3.5 text-slate-500" />

          <div
            className={`px-2.5 py-1 rounded-[2px] border flex items-center gap-1.5 ${
              activeStage >= 5
                ? "bg-[#003366] border-sky-400 text-white"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <span className="size-4 rounded-full bg-[#FF9933] text-black text-[10px] font-black flex items-center justify-center">
              4
            </span>
            <span>{t("Downstream Network", "डाउनस्ट्रीम नेटवर्क")}</span>
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH NETWORK VISUALIZATION CANVAS */}
      <div className="space-y-4">
        <Card className="border-2 border-[#003366] bg-[#07111e] text-slate-100 rounded-[2px] overflow-hidden shadow-lg">
          <CardHeader className="bg-[#001f3f] px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                <Network className="size-4 text-[#FF9933]" />
                {t("OPERATIONAL CAUSAL NETWORK CANVAS", "परिचालन कारणात्मक नेटवर्क कैनवास")}
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-300 mt-0.5">
                {t(
                  "Digital Twin Railway Topology • Live Cascade Flow • Click any node to inspect parameters",
                  "डिजिटल ट्विन रेलवे टोपोलॉजी • लाइव कैस्केड फ्लो • मापदंडों का निरीक्षण करने के लिए किसी भी नोड पर क्लिक करें",
                )}
              </CardDescription>
            </div>

            {/* Canvas Legend & Controls */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
                <span className="size-2 rounded-full bg-[#FF9933] shadow-[0_0_6px_#FF9933]" /> 🔧
                Block
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-red-300">
                <span className="size-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" /> 🔴
                Asset
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" /> 🟢
                Train
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300">
                <span className="size-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" /> 🟣
                Freight
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/40 border border-sky-500/30 text-sky-300">
                <span className="size-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" /> 🔵
                Corridor
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
                <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" /> 🟠
                Pressure
              </span>
            </div>
          </CardHeader>

          {/* Interactive SVG Railway Canvas (Expansive Widescreen) */}
          <div className="relative w-full aspect-[16/8.5] min-h-[580px] lg:min-h-[640px] bg-gradient-to-b from-[#040a16] via-[#071324] to-[#040914] overflow-hidden select-none">
            {/* Radar Grid & Concentric Track Sleeper Background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
              <defs>
                <pattern id="radarGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path
                    d="M 48 0 L 0 0 0 48"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="0.5"
                    strokeOpacity="0.4"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#radarGrid)" />
              {/* Concentric radar range rings centered on the main block node (600, 210) */}
              <circle
                cx="50%"
                cy="33%"
                r="130"
                fill="none"
                stroke="#0284c7"
                strokeWidth="0.75"
                strokeDasharray="3,6"
                opacity="0.3"
              />
              <circle
                cx="50%"
                cy="33%"
                r="260"
                fill="none"
                stroke="#0284c7"
                strokeWidth="0.75"
                strokeDasharray="4,8"
                opacity="0.2"
              />
              <circle
                cx="50%"
                cy="33%"
                r="400"
                fill="none"
                stroke="#0284c7"
                strokeWidth="0.75"
                strokeDasharray="6,12"
                opacity="0.15"
              />
            </svg>

            {/* Primary SVG Railway Topology Graph */}
            <svg
              viewBox="0 0 1200 640"
              className="w-full h-full select-none"
              style={{ filter: "drop-shadow(0 0 16px rgba(0,0,0,0.6))" }}
            >
              <defs>
                {/* Glow & Card Gradients */}
                <linearGradient id="cardGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d1b2f" />
                  <stop offset="100%" stopColor="#060c18" />
                </linearGradient>

                <linearGradient id="blockCardGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e1808" />
                  <stop offset="100%" stopColor="#09101d" />
                </linearGradient>

                <radialGradient id="blockAura" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FF9933" stopOpacity="0.28" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#050b14" stopOpacity="0" />
                </radialGradient>

                {/* Marker arrows for edges */}
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#334155" />
                </marker>

                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#FF9933" />
                </marker>

                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#10b981" />
                </marker>

                <marker
                  id="arrow-purple"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#c084fc" />
                </marker>
              </defs>

              {/* Ambient radial glow behind central block */}
              <circle cx="600" cy="210" r="160" fill="url(#blockAura)" pointerEvents="none" />

              {/* 1. RENDER EDGES / RAILWAY TRACKS */}
              {edges.map((edge, idx) => {
                const source = nodes.find((n) => n.id === edge.from);
                const target = nodes.find((n) => n.id === edge.to);
                if (!source || !target) return null;

                const isEdgeActive = activeStage >= edge.stage;
                const geom = getEdgeGeometry(source, target);

                let strokeColor = "#334155";
                let markerId = "url(#arrow-default)";
                if (isEdgeActive) {
                  if (edge.to === "train-right" || edge.to === "node-passenger") {
                    strokeColor = "#10b981";
                    markerId = "url(#arrow-emerald)";
                  } else if (edge.to === "node-freight") {
                    strokeColor = "#c084fc";
                    markerId = "url(#arrow-purple)";
                  } else {
                    strokeColor = "#FF9933";
                    markerId = "url(#arrow-active)";
                  }
                }

                const labelW = (edge.label?.length || 8) * 6.5 + 14;

                return (
                  <g key={`edge-${idx}`}>
                    {/* Layer 1: Railway Track Bed Underlay (Dark ballast bed) */}
                    <path
                      d={geom.d}
                      fill="none"
                      stroke="#050d1a"
                      strokeWidth="9"
                      strokeLinecap="round"
                    />

                    {/* Layer 2: Railway Ties / Sleepers (Ties dash pattern) */}
                    <path
                      d={geom.d}
                      fill="none"
                      stroke={isEdgeActive ? strokeColor : "#1e293b"}
                      strokeWidth="4"
                      strokeDasharray="4,4"
                      opacity={isEdgeActive ? 0.8 : 0.3}
                    />

                    {/* Layer 3: Central Signal Beam */}
                    <path
                      d={geom.d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isEdgeActive ? "2" : "1.2"}
                      strokeDasharray={edge.dashed ? "6,4" : undefined}
                      markerEnd={markerId}
                      className={isEdgeActive ? "transition-all duration-500" : ""}
                    />

                    {/* Layer 4: Port Connection Pins at endpoints */}
                    <circle
                      cx={geom.sourcePoint.x}
                      cy={geom.sourcePoint.y}
                      r="2.5"
                      fill={isEdgeActive ? strokeColor : "#334155"}
                      stroke="#050b14"
                      strokeWidth="1"
                    />
                    <circle
                      cx={geom.targetPoint.x}
                      cy={geom.targetPoint.y}
                      r="2.5"
                      fill={isEdgeActive ? strokeColor : "#334155"}
                      stroke="#050b14"
                      strokeWidth="1"
                    />

                    {/* Layer 5: Traveling Signal Pulse (When active/tracing) */}
                    {isEdgeActive && (
                      <circle
                        r="3.5"
                        fill="#ffffff"
                        style={{ filter: `drop-shadow(0 0 5px ${strokeColor})` }}
                      >
                        <animateMotion
                          path={geom.d}
                          dur={isTracing ? "1.6s" : "3.2s"}
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* Layer 6: High-Contrast Edge Label Pill */}
                    {edge.label && (
                      <g className="select-none pointer-events-none">
                        <rect
                          x={geom.midX - labelW / 2}
                          y={geom.midY - 8.5}
                          width={labelW}
                          height="17"
                          rx="3"
                          fill="#060e1c"
                          stroke={isEdgeActive ? strokeColor : "#1e293b"}
                          strokeWidth="1"
                          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
                        />
                        <text
                          x={geom.midX}
                          y={geom.midY + 3.5}
                          fill={isEdgeActive ? "#fcd34d" : "#94a3b8"}
                          fontSize="7.5"
                          fontWeight="800"
                          textAnchor="middle"
                          className="font-mono uppercase tracking-wider select-none"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 2. RENDER DIGITAL TWIN NODES */}
              {nodes.map((node) => {
                const isNodeActive = activeStage >= node.stage;
                const isSelected = selectedNodeId === node.id;

                let borderColor = "#0284c7";
                let badgeBg = "#002b4d";
                let glowColor = "rgba(56, 189, 248, 0.5)";
                let statusBeaconColor = "#10b981";

                if (node.type === "block") {
                  borderColor = "#FF9933";
                  badgeBg = "#003366";
                  glowColor = "rgba(255, 153, 51, 0.7)";
                  statusBeaconColor = "#FF9933";
                } else if (node.type === "asset") {
                  borderColor = node.status === "critical" ? "#ef4444" : "#f97316";
                  badgeBg = node.status === "critical" ? "#450a0a" : "#431407";
                  glowColor =
                    node.status === "critical"
                      ? "rgba(239, 68, 68, 0.6)"
                      : "rgba(249, 115, 22, 0.5)";
                  statusBeaconColor = node.status === "critical" ? "#ef4444" : "#f97316";
                } else if (node.type === "train") {
                  borderColor = node.status === "warning" ? "#f59e0b" : "#10b981";
                  badgeBg = node.status === "warning" ? "#451a03" : "#064e3b";
                  glowColor =
                    node.status === "warning"
                      ? "rgba(245, 158, 11, 0.6)"
                      : "rgba(16, 185, 129, 0.5)";
                  statusBeaconColor = node.status === "warning" ? "#f59e0b" : "#10b981";
                } else if (node.type === "freight") {
                  borderColor = "#c084fc";
                  badgeBg = "#3b0764";
                  glowColor = "rgba(192, 132, 252, 0.6)";
                  statusBeaconColor = "#c084fc";
                } else if (node.type === "corridor" || node.type === "downstream") {
                  borderColor = "#38bdf8";
                  badgeBg = "#0c2540";
                  glowColor = "rgba(56, 189, 248, 0.5)";
                  statusBeaconColor = "#38bdf8";
                } else if (node.type === "network") {
                  borderColor = node.status === "critical" ? "#ef4444" : "#f59e0b";
                  badgeBg = "#3d1203";
                  glowColor = "rgba(245, 158, 11, 0.6)";
                  statusBeaconColor = node.status === "critical" ? "#ef4444" : "#f59e0b";
                }

                const boxW = node.width || (node.type === "block" ? 250 : 220);
                const boxH = node.height || (node.type === "block" ? 78 : 60);
                const boxX = node.x - boxW / 2;
                const boxY = node.y - boxH / 2;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    className="cursor-pointer transition-transform duration-200 hover:scale-[1.025]"
                    style={{
                      transformOrigin: `${node.x}px ${node.y}px`,
                      opacity: isNodeActive ? 1 : 0.3,
                    }}
                  >
                    {/* Glowing outer halo ring for central or selected node */}
                    {(isSelected || node.type === "block") && (
                      <rect
                        x={boxX - 3}
                        y={boxY - 3}
                        width={boxW + 6}
                        height={boxH + 6}
                        rx="6"
                        fill="none"
                        stroke={borderColor}
                        strokeWidth={isSelected ? "2" : "1"}
                        opacity={isSelected ? "1" : "0.5"}
                        style={{ filter: `drop-shadow(0 0 ${isSelected ? 12 : 6}px ${glowColor})` }}
                      />
                    )}

                    {/* Main Node Card Body */}
                    <rect
                      x={boxX}
                      y={boxY}
                      width={boxW}
                      height={boxH}
                      rx="4"
                      fill={
                        node.type === "block" ? "url(#blockCardGradient)" : "url(#cardGradient)"
                      }
                      stroke={borderColor}
                      strokeWidth={isSelected ? "2.5" : "1.2"}
                    />

                    {/* Top Category Strip */}
                    <rect
                      x={boxX}
                      y={boxY}
                      width={boxW}
                      height={18}
                      rx="3"
                      fill={badgeBg}
                      opacity="0.95"
                    />

                    {/* Node Type Label */}
                    <text
                      x={boxX + 8}
                      y={boxY + 12.5}
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="900"
                      className="font-mono uppercase tracking-wider select-none"
                    >
                      {node.type === "block" && "🔧 MAINTENANCE BLOCK"}
                      {node.type === "asset" && `🔴 ${node.dept || "ASSET"} DEFECT`}
                      {node.type === "train" &&
                        (node.id === "train-express"
                          ? "⚠️ TRAIN PATH OVERLAP"
                          : "🟢 TRAIN PATH CLEAR")}
                      {node.type === "freight" && "🟣 FREIGHT RAKE FLOW"}
                      {node.type === "corridor" && "🔵 CORRIDOR TRACK SPINE"}
                      {node.type === "downstream" && "🔵 DOWNSTREAM HANDOVER"}
                      {node.type === "network" && "🟠 NETWORK PRESSURE"}
                    </text>

                    {/* Beacon status indicator circle */}
                    <circle cx={boxX + boxW - 10} cy={boxY + 9} r="3" fill={statusBeaconColor} />
                    <circle
                      cx={boxX + boxW - 10}
                      cy={boxY + 9}
                      r="5.5"
                      fill="none"
                      stroke={statusBeaconColor}
                      strokeWidth="0.75"
                      className="animate-ping opacity-40"
                    />

                    {/* Main Node Label */}
                    <text
                      x={boxX + 10}
                      y={boxY + 34}
                      fill={node.type === "block" ? "#FF9933" : "#ffffff"}
                      fontSize={node.type === "block" ? "13" : "11.5"}
                      fontWeight="800"
                      className="select-none tracking-tight"
                    >
                      {node.label}
                    </text>

                    {/* Sublabel Text */}
                    <text
                      x={boxX + 10}
                      y={boxY + 48}
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="500"
                      className="font-mono select-none"
                    >
                      {node.sublabel}
                    </text>

                    {/* Central block extra operational micro-gauge */}
                    {node.type === "block" && (
                      <g className="select-none font-mono text-[8px]">
                        <rect
                          x={boxX + 10}
                          y={boxY + 56}
                          width={boxW - 20}
                          height="12"
                          rx="2"
                          fill="#030812"
                          stroke="#1e293b"
                        />
                        <rect
                          x={boxX + 10}
                          y={boxY + 56}
                          width={(boxW - 20) * (selectedBlock.utilization_percent / 100)}
                          height="12"
                          rx="2"
                          fill="#0284c7"
                          opacity="0.6"
                        />
                        <text x={boxX + 14} y={boxY + 65} fill="#38bdf8" fontWeight="700">
                          UTIL: {selectedBlock.utilization_percent}% • OPT SCORE:{" "}
                          {selectedBlock.optimization_score}/100
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Node Inspection Tooltip Drawer on canvas */}
            {activeInspectedNode && (
              <div className="absolute bottom-4 right-4 w-84 max-w-[calc(100%-2rem)] bg-slate-950/95 border-2 border-[#FF9933] p-4 rounded-[2px] shadow-2xl backdrop-blur-md z-20 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Eye className="size-3.5 text-[#FF9933]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                      {t("INSPECTED TOPOLOGY NODE", "निरीक्षण किया गया नोड")}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="size-5 rounded flex items-center justify-center text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs font-bold text-[#FF9933] mb-0.5">
                  {activeInspectedNode.label}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-2.5">
                  {activeInspectedNode.sublabel}
                </div>

                {activeInspectedNode.details && (
                  <div className="space-y-1.5 text-[11px] bg-slate-900/80 p-2.5 rounded-[2px] border border-slate-800">
                    {Object.entries(activeInspectedNode.details).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-500 font-medium">{key}:</span>
                        <span className="font-semibold text-slate-100 text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. BLOCK IMPACT DNA & AI INTELLIGENCE (MOVED BELOW THE DIAGRAM) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* BLOCK IMPACT DNA METRICS CARD (COL 7/12) */}
        <div className="xl:col-span-7 space-y-4">
          <Card className="border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-sm">
            <CardHeader className="bg-[#003366] text-white px-5 py-3.5 border-b-2 border-[#FF9933]">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-[#FF9933]" />
                  <span>{t("BLOCK IMPACT DNA METRICS", "ब्लॉक प्रभाव डीएनए मेट्रिक्स")}</span>
                </div>
                <Badge className="bg-[#FF9933] text-black font-extrabold text-[10px] px-2.5 py-0.5 rounded-[2px]">
                  {selectedBlock.block_id}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* 6 Metrics Grid - Spacious 3 columns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. Assets Affected */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2px] hover:border-sky-500 transition-colors">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("Assets affected", "प्रभावित परिसंपत्तियां")}
                    </span>
                    <Wrench className="size-3.5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-[#003366] dark:text-sky-400 mt-1">
                    {selectedBlock.asset_count}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    USFD flaw, OHE, Signals
                  </div>
                </div>

                {/* 2. Train movements */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2px] hover:border-sky-500 transition-colors">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("Train movements", "ट्रेन आवागमन")}
                    </span>
                    <TrainFront className="size-3.5 text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-[#003366] dark:text-sky-400 mt-1">
                    {selectedBlock.train_movements_count}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Scheduled window paths
                  </div>
                </div>

                {/* 3. Passenger movements */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2px] hover:border-emerald-500 transition-colors">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("Passenger movements", "यात्री आवागमन")}
                    </span>
                    <Layers className="size-3.5 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {selectedBlock.passenger_movements_count}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Express & Mail paths
                  </div>
                </div>

                {/* 4. Freight pressure */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2px] hover:border-purple-500 transition-colors">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("Freight pressure", "मालगाड़ी दबाव")}
                    </span>
                    <Flame className="size-3.5 text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                    {selectedBlock.freight_pressure_score}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Predicted rake load index
                  </div>
                </div>

                {/* 5. Traffic impact */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2px] hover:border-amber-500 transition-colors">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("Traffic impact", "यातायात प्रभाव")}
                    </span>
                    <AlertTriangle className="size-3.5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {selectedBlock.train_impact_score}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Cumulative delay metric
                  </div>
                </div>

                {/* 6. Downstream corridors */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2px] hover:border-sky-500 transition-colors">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("Downstream corridors", "डाउनस्ट्रीम कॉरिडोर")}
                    </span>
                    <Network className="size-3.5 text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-[#003366] dark:text-sky-400 mt-1">
                    {selectedBlock.downstream_corridors_count}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Connected divisions
                  </div>
                </div>
              </div>

              {/* Network Pressure Banner */}
              <div className="p-3.5 rounded-[2px] border flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800">
                <div>
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    {t("Network pressure", "नेटवर्क परिचालन दबाव")}
                  </div>
                  <div className="text-xs text-amber-900 dark:text-amber-200 font-medium mt-0.5">
                    Headway absorption on adjacent block section
                  </div>
                </div>
                <Badge
                  className={`font-black text-xs px-2.5 py-0.5 rounded-[2px] ${
                    selectedBlock.network_pressure === "HIGH"
                      ? "bg-red-600 text-white"
                      : selectedBlock.network_pressure === "MEDIUM"
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-600 text-white"
                  }`}
                >
                  {selectedBlock.network_pressure}
                </Badge>
              </div>

              {/* 8. IMPACT SEVERITY SCALE */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                  <span>{t("IMPACT SEVERITY SCALE", "प्रभाव गंभीरता पैमाना")}</span>
                  {selectedBlock.ai_confidence && (
                    <span className="text-[9px] text-slate-500 font-mono">
                      AI Confidence: {selectedBlock.ai_confidence}
                    </span>
                  )}
                </div>

                {/* 4-Step Severity Ladder */}
                <div className="grid grid-cols-4 gap-1.5 text-center font-bold text-[10px]">
                  <div
                    className={`py-1.5 rounded-[2px] border ${
                      selectedBlock.severity_level === "LOCAL" ||
                      selectedBlock.severity_level === "CORRIDOR" ||
                      selectedBlock.severity_level === "REGIONAL" ||
                      selectedBlock.severity_level === "NETWORK"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    LOCAL
                  </div>

                  <div
                    className={`py-1.5 rounded-[2px] border ${
                      selectedBlock.severity_level === "CORRIDOR" ||
                      selectedBlock.severity_level === "REGIONAL" ||
                      selectedBlock.severity_level === "NETWORK"
                        ? "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-300"
                        : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    CORRIDOR
                  </div>

                  <div
                    className={`py-1.5 rounded-[2px] border ${
                      selectedBlock.severity_level === "REGIONAL" ||
                      selectedBlock.severity_level === "NETWORK"
                        ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    REGIONAL
                  </div>

                  <div
                    className={`py-1.5 rounded-[2px] border ${
                      selectedBlock.severity_level === "NETWORK"
                        ? "bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-300 ring-1 ring-red-400"
                        : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    NETWORK
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 5. HIDDEN DEPENDENCIES CARD (COL 5/12) */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-sm h-full flex flex-col">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3.5 border-b border-border">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-[#FF9933]" />
                  {t("AI FOUND", "एआई ने पाया")} {selectedBlock.hidden_dependencies.length}{" "}
                  {t("HIDDEN DEPENDENCIES", "छिपी हुई निर्भरताएं")}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {selectedBlock.corridor_id}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 flex-1">
              {selectedBlock.hidden_dependencies.length > 0 ? (
                <ul className="space-y-3">
                  {selectedBlock.hidden_dependencies.map((dep, idx) => (
                    <li
                      key={idx}
                      className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-[2px] border-l-3 border-[#003366] dark:border-sky-400 shadow-xs"
                    >
                      <span className="font-bold text-[#003366] dark:text-sky-400 mr-1.5">•</span>
                      {dep}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-500 p-4 bg-slate-50 dark:bg-slate-950 rounded-[2px]">
                  {t(
                    "Dependency analysis requires additional traffic intelligence data.",
                    "निर्भरता विश्लेषण के लिए अतिरिक्त यातायात आसूचना डेटा की आवश्यकता है।",
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 7. AI EXPLANATION: WHY THIS BLOCK MATTERS */}
      <Card className="border-2 border-[#003366] bg-white dark:bg-slate-900 rounded-[2px] shadow-sm">
        <CardHeader className="bg-slate-100 dark:bg-slate-800/80 px-5 py-3.5 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#FF9933]" />
            <CardTitle className="text-xs font-black uppercase tracking-wider text-[#003366] dark:text-sky-400">
              {t("WHY THIS BLOCK MATTERS", "यह ब्लॉक क्यों महत्वपूर्ण है")}
            </CardTitle>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-bold">
            {selectedBlock.corridor_name}
          </span>
        </CardHeader>

        <CardContent className="p-5">
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {selectedBlock.explanation}
          </p>

          <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span>
              <strong className="text-slate-700 dark:text-slate-200">Consolidation Ratio:</strong>{" "}
              {selectedBlock.asset_count} works in 1 corridor shutdown window
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-700 dark:text-slate-200">
                Downstream Propagation:
              </strong>{" "}
              {selectedBlock.downstream_names.join(", ")}
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-700 dark:text-slate-200">Decision Status:</strong>{" "}
              Subject to Controller live corridor clearance
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 9. HUMAN-IN-THE-LOOP DECISION SUPPORT NOTICE */}
      <div className="border-2 border-[#003366] bg-[#001f3f] text-white p-5 rounded-[2px] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#FF9933]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#FF9933]">
              {t("HUMAN-IN-THE-LOOP DECISION SUPPORT", "मानव-सत्यापित निर्णय सहायता")}
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {t(
              "RailWise AI explains potential operational dependencies. Final block approval remains with authorized railway personnel.",
              "रेलवाइज एआई संभावित परिचालन निर्भरताओं की व्याख्या करता है। अंतिम ब्लॉक अनुमोदन अधिकृत रेलवे कर्मियों के पास रहता है।",
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            asChild
            variant="outline"
            className="h-9 px-4 text-xs font-bold uppercase tracking-wider border-slate-400 bg-white text-slate-900 hover:bg-slate-100 rounded-[2px] cursor-pointer"
          >
            <Link to="/conflicts">{t("REVIEW BLOCK", "ब्लॉक की समीक्षा करें")}</Link>
          </Button>

          <Button
            asChild
            className="h-9 px-4 text-xs font-extrabold uppercase tracking-wider bg-[#FF9933] hover:bg-[#e68a2e] text-black rounded-[2px] cursor-pointer shadow-sm"
          >
            <Link to="/optimizer">{t("VIEW OPTIMIZED PLAN", "अनुकूलित योजना देखें")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
