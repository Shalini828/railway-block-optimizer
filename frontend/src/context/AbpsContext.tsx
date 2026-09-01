import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  REQUISITIONS,
  ROLES,
  criticalityScore,
  runOptimizer,
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

  optimize: () => {
    clusters: number;
    saved: number;
    conflicts: number;
  };

  getBackendRecommendation: (
    corridor: string,
    date: string,
    start: string,
    end: string,
    blockId?: string,
  ) => Promise<BackendRecommendation>;

  backendRecommendation: BackendRecommendation | null;

  recommendationLoading: boolean;

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

const API_BASE_URL = "http://127.0.0.1:8000";

// =========================================================
// HELPER: NORMALIZE TRAIN API RESPONSE
// =========================================================

function normalizeTrains(data: unknown): Train[] {
  // Case 1:
  // Backend directly returns:
  // [
  //   {...},
  //   {...}
  // ]
  if (Array.isArray(data)) {
    return data as Train[];
  }

  // Case 2:
  // Backend returns:
  // {
  //   trains: [...]
  // }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { trains?: unknown }).trains)
  ) {
    return (data as { trains: Train[] }).trains;
  }

  // Case 3:
  // Backend returns:
  // {
  //   data: [...]
  // }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as { data: Train[] }).data;
  }

  // Case 4:
  // Backend returns:
  // {
  //   results: [...]
  // }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { results?: unknown }).results)
  ) {
    return (data as { results: Train[] }).results;
  }

  // Unknown response shape.
  console.error("Unexpected trains API response:", data);

  return [];
}

// =========================================================
// PROVIDER
// =========================================================

export function AbpsProvider({ children }: { children: ReactNode }) {
  // =======================================================
  // ROLE
  // =======================================================

  const [role, setRoleState] = useState<Role>(
    ROLES[0] as Role,
  );

  // =======================================================
  // AUTH
  // =======================================================

  const [signedIn, setSignedIn] = useState(false);

  // =======================================================
  // REQUISITIONS
  // =======================================================

  const [reqs, setReqs] =
    useState<Requisition[]>(REQUISITIONS);

  // =======================================================
  // TRAINS
  // =======================================================

  const [trains, setTrains] = useState<Train[]>([]);

  // =======================================================
  // PLAN
  // =======================================================

  const [plan, setPlan] =
    useState<AiPlanItem[]>([]);

  // =======================================================
  // CONFLICTS
  // =======================================================

  const [conflicts, setConflicts] =
    useState<Conflict[]>([]);

  // =======================================================
  // APPROVAL
  // =======================================================

  const [signedOff, setSignedOff] =
    useState<string[]>([]);

  // =======================================================
  // REQUEST ID COUNTER
  // =======================================================

  const [counter, setCounter] =
    useState(9000);

  // =======================================================
  // SESSION RESTORE
  // =======================================================

  const [restored, setRestored] =
    useState(false);

  // =======================================================
  // BACKEND RECOMMENDATION
  // =======================================================

  const [backendRecommendation, setBackendRecommendation] =
    useState<BackendRecommendation | null>(null);

  const [recommendationLoading, setRecommendationLoading] =
    useState(false);

  // =======================================================
  // DASHBOARD KPIs
  // =======================================================

  const [kpis, setKpis] = useState({
    availability: "0.0",
    scheduled: 0,
    blockHours: "0.0",
    trainDelay: 0,
  });

  // =========================================================
  // DASHBOARD KPI API
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const loadKpis = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/kpis`,
        );

        if (!response.ok) {
          throw new Error(
            `KPI API returned ${response.status}`,
          );
        }

        const data = await response.json();

        if (cancelled) return;

        setKpis({
          availability: String(
            data.asset_availability_percent ?? "0.0",
          ),

          scheduled: Number(
            data.scheduled_blocks ?? 0,
          ),

          blockHours: String(
            data.total_block_hours ?? "0.0",
          ),

          trainDelay: Number(
            data.train_delay_impact_minutes ?? 0,
          ),
        });
      } catch (error) {
        console.error(
          "Dashboard KPI API error:",
          error,
        );

        // Keep safe default values.
        if (!cancelled) {
          setKpis({
            availability: "0.0",
            scheduled: 0,
            blockHours: "0.0",
            trainDelay: 0,
          });
        }
      }
    };

    loadKpis();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // RESTORE SESSION
  // =========================================================

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

        // Restore role.
        const found = ROLES.find(
          (r) => r.id === s.roleId,
        );

        if (found) {
          setRoleState(found);
        }

        // Restore login.
        if (s.signedIn) {
          setSignedIn(true);
        }

        // Restore requisitions.
        if (Array.isArray(s.reqs)) {
          setReqs(s.reqs);
        }

        // Restore optimization plan.
        if (Array.isArray(s.plan)) {
          setPlan(s.plan);
        }

        // Restore conflicts.
        if (Array.isArray(s.conflicts)) {
          setConflicts(s.conflicts);
        }

        // Restore approvals.
        if (Array.isArray(s.signedOff)) {
          setSignedOff(s.signedOff);
        }
      }
    } catch (error) {
      console.error(
        "Failed to restore session:",
        error,
      );
    }

    setRestored(true);
  }, []);

  // =========================================================
  // SAVE SESSION
  // =========================================================

  useEffect(() => {
    if (!restored) return;

    try {
      sessionStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          roleId: role.id,
          signedIn,
          reqs,
          plan,
          conflicts,
          signedOff,
        }),
      );
    } catch (error) {
      console.error(
        "Failed to save session:",
        error,
      );
    }
  }, [
    restored,
    role,
    signedIn,
    reqs,
    plan,
    conflicts,
    signedOff,
  ]);

  // =========================================================
  // ROLE
  // =========================================================

  const setRole = (id: RoleId) => {
    const found = ROLES.find(
      (r) => r.id === id,
    );

    if (found) {
      setRoleState(found);
    }
  };

  // =========================================================
  // TRAINS API
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const loadTrains = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/trains/`,
        );

        if (!response.ok) {
          throw new Error(
            `Train API returned ${response.status}`,
          );
        }

        const data: unknown =
          await response.json();

        if (cancelled) return;

        // IMPORTANT:
        // Always convert backend response to an array.
        const normalizedTrains =
          normalizeTrains(data);

        setTrains(normalizedTrains);

        console.log(
          "Loaded trains:",
          normalizedTrains.length,
        );
      } catch (error) {
        console.error(
          "Train API error:",
          error,
        );

        if (!cancelled) {
          setTrains([]);
        }
      }
    };

    loadTrains();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // ADD REQUISITION
  // =========================================================

  const addReq = (
    r: Omit<Requisition, "id" | "status">,
  ) => {
    const id = `REQ-${r.dept}-${counter}`;

    setCounter((c) => c + 1);

    const newReq: Requisition = {
      ...r,

      id,

      status: "Pending AI Scheduling",

      score: criticalityScore({
        ...r,
        id,
        status: "Pending AI Scheduling",
      } as Requisition),
    };

    setReqs((prev) => [
      newReq,
      ...prev,
    ]);
  };

  // =========================================================
  // FRONTEND OPTIMIZER
  // =========================================================

  const optimize = () => {
    const res = runOptimizer(reqs);

    setReqs(res.updated);

    setPlan(res.plan);

    setConflicts(res.conflicts);

    return {
      clusters: res.plan.filter(
        (p) => p.reqIds.length > 1,
      ).length,

      saved: res.plan.reduce(
        (s, p) => s + p.savedMinutes,
        0,
      ),

      conflicts:
        res.conflicts.length,
    };
  };

  // =========================================================
  // BACKEND WINDOW RECOMMENDATION
  // =========================================================

  const getBackendRecommendation = async (
    corridor: string,
    date: string,
    start: string,
    end: string,
    blockId?: string,
  ): Promise<BackendRecommendation> => {
    setRecommendationLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/optimization/recommend-windows`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            corridor,
            date,
            start,
            end,
            block_id: blockId ?? null,
          }),
        },
      );

      const data =
        (await response.json()) as BackendRecommendation;

      if (!response.ok) {
        throw new Error(
          data.message ??
            `Backend recommendation request failed (${response.status})`,
        );
      }

      setBackendRecommendation(data);

      return data;
    } catch (error) {
      console.error(
        "Optimization recommendation API error:",
        error,
      );

      const errorResult: BackendRecommendation = {
        status: "error",

        message:
          error instanceof Error
            ? error.message
            : "Failed to get backend recommendation",
      };

      setBackendRecommendation(errorResult);

      return errorResult;
    } finally {
      setRecommendationLoading(false);
    }
  };

  // =========================================================
  // RESOLVE CONFLICT
  // =========================================================

  const resolveConflict = (id: string) => {
    setConflicts((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              resolved: true,
            }
          : c,
      ),
    );
  };

  // =========================================================
  // APPROVE SINGLE BLOCK
  // =========================================================

  const approve = (id: string) => {
    setSignedOff((prev) =>
      prev.includes(id)
        ? prev
        : [...prev, id],
    );

    setReqs((prev) =>
      prev.map((r) =>
        r.clusterId === id
          ? {
              ...r,
              status: "Approved",
            }
          : r,
      ),
    );
  };

  // =========================================================
  // APPROVE ALL
  // =========================================================

  const approveAll = () => {
    setSignedOff(
      plan.map((p) => p.clusterId),
    );

    setReqs((prev) =>
      prev.map((r) =>
        r.status === "Clustered / Shadowed"
          ? {
              ...r,
              status: "Approved",
            }
          : r,
      ),
    );
  };

  // =========================================================
  // CONTEXT VALUE
  // =========================================================

  const value: Ctx = {
    // Role
    role,
    setRole,

    // Trains
    trains,

    // Authentication
    signedIn,

    signIn: (id) => {
      setRole(id);
      setSignedIn(true);
    },

    signOut: () => {
      setSignedIn(false);
    },

    // Requisitions
    reqs,
    addReq,

    // Optimization
    plan,
    conflicts,
    optimize,

    // Backend recommendation
    getBackendRecommendation,
    backendRecommendation,
    recommendationLoading,

    // Conflict
    resolveConflict,

    // Approval
    approve,
    approveAll,
    signedOff,

    // Saved minutes
    savedMinutes: plan.reduce(
      (s, p) => s + p.savedMinutes,
      0,
    ),

    // KPIs
    kpis,
  };

  return (
    <AbpsContext.Provider value={value}>
      {children}
    </AbpsContext.Provider>
  );
}

// =========================================================
// useAbps HOOK
// =========================================================

export function useAbps() {
  const ctx = useContext(AbpsContext);

  if (!ctx) {
    throw new Error(
      "useAbps must be used inside AbpsProvider",
    );
  }

  return ctx;
}

// =========================================================
// useKpis HOOK
// =========================================================

export function useKpis() {
  const { kpis } = useAbps();

  return useMemo(() => {
    return {
      availability: kpis.availability,

      scheduled: kpis.scheduled,

      monthly: kpis.scheduled * 4,

      shadowHours: kpis.blockHours,

      punctuality: kpis.trainDelay,
    };
  }, [kpis]);
}