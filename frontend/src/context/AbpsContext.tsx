import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  REQUISITIONS,
  ROLES,
  criticalityScore,
  type AiPlanItem,
  type Conflict,
  type Requisition,
  type Role,
  type RoleId,
} from "@/lib/abps-data";

// =========================================================
// TYPES
// =========================================================

export type Train = {
  id: string;
  name: string;
  type: string;
  status: string;
  corridor: string;
  nextStation: string;
};

export type WindowRecommendation = {
  start: string;
  end: string;
  duration_minutes: number;
  train_conflicts: number;
  utilization_percent: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  optimization_score: number;
};

export type BackendRecommendation = {
  status: string;

  requested_window?: {
    corridor: string;
    date: string;
    start: string;
    end: string;
    duration_minutes: number;
  };

  recommendation?: string;

  total_candidates_evaluated?: number;

  recommended_windows?: WindowRecommendation[];

  message?: string;
};

type Ctx = {
  role: Role;

  trains: Train[];

  setRole: (id: RoleId) => void;

  signedIn: boolean;
  signIn: (id: RoleId) => void;
  signOut: () => void;

  reqs: Requisition[];
  addReq: (r: Omit<Requisition, "id" | "status">) => void;

  plan: AiPlanItem[];

  conflicts: Conflict[];

  optimize: () => Promise<{
    clusters: number;
    saved: number;
    conflicts: number;
  }>;

  resolveConflict: (id: string) => void;

  approve: (id: string) => void;

  approveAll: () => void;

  signedOff: string[];

  savedMinutes: number;

  kpis: {
    availability: string;
    scheduled: number;
    blockHours: string;
    trainDelay: number;
  };
};

// =========================================================
// CONTEXT
// =========================================================

const AbpsContext = createContext<Ctx | null>(null);

// =========================================================
// CONSTANTS
// =========================================================

const STORE_KEY = "ir-abps-session";

export function AbpsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [role, setRoleState] = useState<Role>(
    ROLES[0] as Role
  );

  const [signedIn, setSignedIn] = useState(false);

  const [reqs, setReqs] = useState<Requisition[]>(
    REQUISITIONS
  );

  const [trains, setTrains] = useState<Train[]>([]);

  const [kpis, setKpis] = useState({
    availability: "0.0",
    scheduled: 0,
    blockHours: "0.0",
    trainDelay: 0,
  });

  const [plan, setPlan] = useState<AiPlanItem[]>([]);

  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const [signedOff, setSignedOff] = useState<string[]>([]);

  const [counter, setCounter] = useState(9000);

  const [restored, setRestored] = useState(false);

  // ==========================================
  // LOAD DASHBOARD KPIs
  // ==========================================

  useEffect(() => {
    fetch("http://127.0.0.1:8000/dashboard/kpis")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            "Failed to fetch dashboard KPIs"
          );
        }

        return res.json();
      })
      .then((data) => {
        setKpis({
          availability: String(
            data.asset_availability_percent
          ),
          scheduled: data.scheduled_blocks,
          blockHours: String(
            data.total_block_hours
          ),
          trainDelay:
            data.train_delay_impact_minutes,
        });
      })
      .catch((error) => {
        console.error(
          "Dashboard KPI API error:",
          error
        );
      });
  }, []);

  // ==========================================
  // RESTORE SESSION
  // ==========================================

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem(STORE_KEY);

      if (raw) {
        const s = JSON.parse(raw) as {
          roleId?: RoleId;
          signedIn?: boolean;
          reqs?: Requisition[];
          plan?: AiPlanItem[];
          conflicts?: Conflict[];
          signedOff?: string[];
        };

        const found = ROLES.find(
          (r) => r.id === s.roleId
        );

        if (found) {
          setRoleState(found);
        }

        if (s.signedIn) {
          setSignedIn(true);
        }

        if (s.reqs) {
          setReqs(s.reqs);
        }

        if (s.plan) {
          setPlan(s.plan);
        }

        if (s.conflicts) {
          setConflicts(s.conflicts);
        }

        if (s.signedOff) {
          setSignedOff(s.signedOff);
        }
      }
    } catch {
      // Ignore corrupt session snapshot
    }

    setRestored(true);
  }, []);

  // ==========================================
  // SAVE SESSION
  // ==========================================

  useEffect(() => {
    if (!restored) return;

    sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        roleId: role.id,
        signedIn,
        reqs,
        plan,
        conflicts,
        signedOff,
      })
    );
  }, [
    restored,
    role,
    signedIn,
    reqs,
    plan,
    conflicts,
    signedOff,
  ]);

  // ==========================================
  // ROLE
  // ==========================================

  const setRole = (id: RoleId) => {
    const found = ROLES.find(
      (r) => r.id === id
    );

    if (found) {
      setRoleState(found);
    }
  };

  // ==========================================
  // LOAD TRAINS
  // ==========================================

  useEffect(() => {
    fetch("http://127.0.0.1:8000/trains/")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            "Failed to fetch trains"
          );
        }

        return res.json();
      })
      .then((data: Train[]) => {
        setTrains(data);
      })
      .catch((error) => {
        console.error(
          "Train API error:",
          error
        );
      });
  }, []);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value: Ctx = {
    role,

    setRole,

    trains,

    // ========================================
    // AUTH
    // ========================================

    signedIn,

    signIn: (id) => {
      setRole(id);
      setSignedIn(true);
    },

    signOut: () => {
      setSignedIn(false);
    },

    // ========================================
    // REQUESTS
    // ========================================

    reqs,

    addReq: (r) => {
      const id = `REQ-${r.dept}-${counter}`;

      setCounter((c) => c + 1);

      setReqs((prev) => [
        {
          ...r,
          id,
          status:
            "Pending AI Scheduling" as const,
          score: criticalityScore({
            ...r,
            id,
            status:
              "Pending AI Scheduling",
          } as Requisition),
        },
        ...prev,
      ]);
    },

    // ========================================
    // PLAN
    // ========================================

    plan,

    // ========================================
    // CONFLICTS
    // ========================================

    conflicts,

    // ========================================
    // REAL AI OPTIMIZATION API
    // ========================================

    optimize: async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/optimization/",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Optimization API failed"
          );
        }

        const data = await response.json();

        if (data.status !== "success") {
          throw new Error(
            data.message ||
              "Optimization failed"
          );
        }

        // ====================================
        // BACKEND BLOCKS
        // ====================================

        const apiBlocks =
          data.blocks ?? [];

        // ====================================
        // CONVERT BACKEND DATA
        // INTO FRONTEND AiPlanItem
        // ====================================

        const convertedPlan: AiPlanItem[] =
          apiBlocks.map((block: any) => {
            // --------------------------------
            // START TIME
            // --------------------------------

            const startParts =
              block.start.split(":");

            const start =
              Number(startParts[0]) * 60 +
              Number(startParts[1]);

            // --------------------------------
            // END TIME
            // --------------------------------

            const endParts =
              block.end.split(":");

            const end =
              Number(endParts[0]) * 60 +
              Number(endParts[1]);

            // --------------------------------
            // DATE → DAY
            // Monday = 0
            // Tuesday = 1
            // ...
            // Sunday = 6
            // --------------------------------

            const date = new Date(
              `${block.date}T00:00:00`
            );

            const day =
              (date.getDay() + 6) % 7;

            // --------------------------------
            // FRONTEND PLAN OBJECT
            // --------------------------------

            return {
              clusterId:
                block.block_id,

              section:
                block.corridor_name,

              line:
                `${block.source_station} → ${block.destination_station}`,

              depts:
                block.departments as AiPlanItem["depts"],

              reqIds:
                block.request_ids ?? [],

              day,

              start,

              end,

              savedMinutes:
                block.saved_minutes ?? 0,

              explanation:
                `AI optimized ${block.number_of_tasks} maintenance task(s) ` +
                `with ${block.utilization}% block utilization. ` +
                `${block.number_of_departments} department(s) coordinated.`,

              expectedDelay:
                block.expected_delay ?? 0,
            };
          });

        // ====================================
        // UPDATE FRONTEND PLAN
        // ====================================

        setPlan(convertedPlan);

        // ====================================
        // CONFLICTS
        // ====================================

        // We will connect the backend
        // conflict structure separately.
        setConflicts([]);

        // ====================================
        // SUCCESS MESSAGE
        // ====================================

        toast.success(
          `Optimization completed: ${data.requests_processed} requests → ${data.blocks_generated} blocks`
        );

        // ====================================
        // RETURN SUMMARY
        // ====================================

        return {
          clusters:
            convertedPlan.filter(
              (p) =>
                p.reqIds.length > 1
            ).length,

          saved:
            convertedPlan.reduce(
              (sum, p) =>
                sum + p.savedMinutes,
              0
            ),

          conflicts: 0,
        };
      } catch (error) {
        console.error(
          "Optimization API error:",
          error
        );

        toast.error(
          "Could not run the optimization engine."
        );

        return {
          clusters: 0,
          saved: 0,
          conflicts: 0,
        };
      }
    },

    // ========================================
    // RESOLVE CONFLICT
    // ========================================

    resolveConflict: (id) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                resolved: true,
              }
            : c
        )
      );
    },

    // ========================================
    // APPROVE
    // ========================================

    approve: (id) => {
      setSignedOff((prev) =>
        prev.includes(id)
          ? prev
          : [...prev, id]
      );

      setReqs((prev) =>
        prev.map((r) =>
          r.clusterId === id
            ? {
                ...r,
                status:
                  "Approved" as const,
              }
            : r
        )
      );
    },

    // ========================================
    // APPROVE ALL
    // ========================================

    approveAll: () => {
      setSignedOff(
        plan.map((p) => p.clusterId)
      );

      setReqs((prev) =>
        prev.map((r) =>
          r.status ===
          "Clustered / Shadowed"
            ? {
                ...r,
                status:
                  "Approved" as const,
              }
            : r
        )
      );
    },

    // ========================================
    // SIGNED OFF
    // ========================================

    signedOff,

    // ========================================
    // SAVED MINUTES
    // ========================================

    savedMinutes: plan.reduce(
      (sum, p) =>
        sum + p.savedMinutes,
      0
    ),

    // ========================================
    // KPIs
    // ========================================

    kpis,
  };

  return (
    <AbpsContext.Provider value={value}>
      {children}
    </AbpsContext.Provider>
  );
}

// ==========================================
// useAbps
// ==========================================

export function useAbps() {
  const ctx = useContext(
    AbpsContext
  );

  if (!ctx) {
    throw new Error(
      "useAbps must be used inside AbpsProvider"
    );
  }

  return ctx;
}

// ==========================================
// useKpis
// ==========================================

export function useKpis() {
  const { kpis } = useAbps();

  return useMemo(() => {
    return {
      availability:
        kpis.availability,

      scheduled:
        kpis.scheduled,

      monthly:
        kpis.scheduled * 4,

      shadowHours:
        kpis.blockHours,

      punctuality:
        kpis.trainDelay,
    };
  }, [kpis]);
}