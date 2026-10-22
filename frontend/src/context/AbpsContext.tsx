import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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

import { apiFetch, setAuthToken, setUnauthorizedHandler } from "@/lib/api";

export type Train = {
  id: string;

  name: string;

  type: string;

  status: string;

  corridor: string;

  nextStation: string;
};

export type AuthUser = {
  role_id: RoleId;

  name: string;

  title: string;

  dept: string | null;

  scope: "network" | "department";

  system: string;
};

export type DepartmentKpis = {
  asset_availability_percent: number;

  pending_tasks: number;

  critical_tasks_or_defects: number;

  blocks_this_week: number;
};

export type Ctx = {
  role: Role;

  user: AuthUser | null;

  token: string | null;

  permissions: string[];

  scope: "network" | "department";

  dept: string | null;

  authReady: boolean;

  can: (perm: string) => boolean;

  trains: Train[];

  setRole: (id: RoleId) => void;

  signedIn: boolean;

  signIn: (id: RoleId, password?: string) => Promise<boolean>;

  signOut: () => Promise<void>;

  reqs: Requisition[];

  reqsLoaded: boolean;

  reqsError: string | null;

  visibleReqs: Requisition[];

  addReq: (r: Omit<Requisition, "id" | "status">) => Promise<void>;

  plan: AiPlanItem[];

  visiblePlan: AiPlanItem[];

  conflicts: Conflict[];

  visibleConflicts: Conflict[];

  optimize: () => { clusters: number; saved: number; conflicts: number };

  resolveConflict: (id: string) => void;

  approve: (id: string) => void;

  approveAll: () => void;

  signedOff: string[];

  savedMinutes: number;

  isDemoMode: boolean;

  refreshAll: () => Promise<Requisition[] | null>;

  kpis: {
    availability: string;

    scheduled: number;

    blockHours: string;

    trainDelay: number;

    scope?: string;

    department_kpis?: DepartmentKpis;
  };
};

const AbpsContext = createContext<Ctx | null>(null);

const STORE_KEY = "ir-abps-session";

const AUTH_STORE_KEY = "ir-abps-auth";

export function AbpsProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(ROLES[0] as Role);

  const [user, setUser] = useState<AuthUser | null>(null);

  const [token, setTokenState] = useState<string | null>(null);

  const [permissions, setPermissions] = useState<string[]>([]);

  const [signedIn, setSignedIn] = useState(false);

  const [authReady, setAuthReady] = useState(false);

  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const [reqs, setReqs] = useState<Requisition[]>(REQUISITIONS);

  const [reqsLoaded, setReqsLoaded] = useState(false);

  const [reqsError, setReqsError] = useState<string | null>(null);

  const [trains, setTrains] = useState<Train[]>([]);

  const [kpis, setKpis] = useState<{
    availability: string;

    scheduled: number;

    blockHours: string;

    trainDelay: number;

    scope?: string;

    department_kpis?: DepartmentKpis;
  }>({
    availability: "0.0",

    scheduled: 0,

    blockHours: "0.0",

    trainDelay: 0,
  });

  const [plan, setPlan] = useState<AiPlanItem[]>([]);

  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const [signedOff, setSignedOff] = useState<string[]>([]);

  const [restored, setRestored] = useState(false);

  const refreshAll = async (): Promise<Requisition[] | null> => {
    setReqsLoaded(false);
    setReqsError(null);
    try {
      const [kpiRes, trainRes, reqsRes] = await Promise.all([
        apiFetch("/dashboard/kpis"),

        apiFetch("/trains/"),

        apiFetch("/block-requests/"),
      ]);

      if (kpiRes.ok) {
        const data = await kpiRes.json();

        setIsDemoMode(Boolean(data.is_demo));

        setKpis({
          availability: String(data.kpis?.overall_asset_availability ?? 0),

          scheduled: data.kpis?.scheduled_blocks ?? 0,

          blockHours: String(data.kpis?.shadow_block_savings ?? 0),

          trainDelay: data.kpis?.punctuality_impact_index ?? 0,

          scope: data.scope,

          department_kpis: data.department_kpis,
        });
      }

      if (trainRes.ok) {
        const trainData = await trainRes.json();

        const trainList = Array.isArray(trainData)
          ? trainData
          : Array.isArray(trainData?.trains)
            ? trainData.trains
            : [];

        setTrains(trainList);
      }

      if (reqsRes.ok) {
        const reqData = await reqsRes.json();

        const rows = Array.isArray(reqData)
          ? reqData
          : Array.isArray(reqData?.requests)
            ? reqData.requests
            : [];
        const isDemoResponse = Boolean(reqData?.is_demo) ||
          rows.some((item: any) => item?.is_demo || item?.data_source === "SYNTHETIC_DEMO");
        setIsDemoMode(isDemoResponse);
        if (isDemoResponse) {
          setReqs([]);
          setReqsError("The backend returned demonstration requisitions; PostgreSQL data is unavailable.");
          setReqsLoaded(true);
          return null;
        }

        // Always mirror the backend response, including an empty list.
        // Do not hide BR-AUTO records: these are real backend requisitions.
        const mapped: Requisition[] = rows.map((item: any) => {
          const minutes = Number(item?.requested_duration_min ?? item?.duration_min ?? 0);

          const rawCriticality = item?.criticality;

          const crit =
            typeof rawCriticality === "number"
              ? rawCriticality >= 5
                ? "Critical"
                : rawCriticality >= 4
                  ? "High"
                : rawCriticality >= 3
                  ? "Medium"
                  : "Low"
              : ["critical", "high"].includes(String(rawCriticality ?? "").toLowerCase())
                ? (String(rawCriticality).toLowerCase() === "critical" ? "Critical" : "High")
                : String(rawCriticality ?? "").toLowerCase() === "medium"
                  ? "Medium"
                  : "Low";

          const daysOverdue = Number(item?.days_overdue ?? item?.overdue_days ?? 0);

          const tsrRisk = Boolean(item?.tsr_risk ?? item?.safety_risk ?? false);

          const blockType = (item?.block_type as any) ?? "Traffic Block";

          const rawStatus = String(item?.request_status ?? "")
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");
          const reviewStatus = String(item?.review_status ?? "").trim().toUpperCase();

          const status: Requisition["status"] =
            ["OPTIMIZED", "OPTIMISED", "CLUSTERED", "SHADOWED", "SCHEDULED"].includes(rawStatus)
              ? "Clustered / Shadowed"
              : ["APPROVED", "APPROVE", "ACCEPTED"].includes(rawStatus) ||
                  (rawStatus === "PENDING" && reviewStatus === "APPROVED")
                ? "Approved"
                : ["ACTIVE", "IN_PROGRESS", "INPROGRESS", "STARTED"].includes(rawStatus)
                ? "Active"
                : ["COMPLETED", "CLOSED", "DONE"].includes(rawStatus)
                  ? "Completed"
                  : ["CANCELLED", "CANCELED"].includes(rawStatus)
                    ? "Cancelled"
                    : rawStatus === "REJECTED"
                      ? "Rejected"
                      : "Pending AI Scheduling";

          const deptStr = String(
  item?.department ??
  item?.department_code ??
  item?.department_id ??
  item?.dept ??
  ""
).toUpperCase();

          const dept: Requisition["dept"] = deptStr.includes("SMMS") || deptStr.includes("TEAM-002") || deptStr === "S&T"
            ? "SMMS"
            : deptStr.includes("TDMS") || deptStr.includes("TEAM-003")
              ? "TDMS"
              : "TMS";

          return {
            id: String(item?.request_id ?? item?.id ?? "REQ-UNKNOWN"),

            backendId: String(item?.request_id ?? item?.id ?? ""),

            dept,

            assetId: String(
  item?.asset_id ??
  item?.asset_tag ??
  item?.assetId ??
  item?.task_id ??
  "ASSET-01"
),

            work: String(item?.description ?? item?.work ?? "Track maintenance"),

            section: String(item?.corridor_id ?? item?.section_id ?? "—"),

            line: String(item?.line ?? "—"),

            chainage: String(item?.chainage ?? "—"),

            blockType,

            duration: Number.isFinite(minutes) && minutes > 0 ? minutes / 60 : 0,

            crew: Number(item?.crew ?? item?.crew_strength ?? 0),

            criticality: crit,

            daysOverdue,

            tsrRisk,

            status,

            backendStatus: rawStatus,

            optimizationEligible: rawStatus === "PENDING",

            reviewStatus,

            score: item?.score
              ? Number(item.score)
              : criticalityScore({
                  criticality: crit,

                  daysOverdue,

                  tsrRisk,

                  blockType,
                } as Requisition),

            requestedBy: String(item?.requested_by ?? "SSE / Incharge"),
          };
        });

        setReqs(mapped);
        setReqsLoaded(true);
        setReqsError(null);
        return mapped;
      }

      const responseError = await reqsRes.json().catch(() => null);
      const message = responseError?.detail ?? responseError?.message ?? `Could not load requisitions (${reqsRes.status})`;
      setReqs([]);
      setReqsError(String(message));
      setReqsLoaded(true);
      return null;
    } catch (e) {
      console.warn("refreshAll failed:", e);
      const message = e instanceof Error ? e.message : "Could not load requisitions";
      setReqs([]);
      setReqsError(message);
      setReqsLoaded(true);
      return null;
    }
  };

  // Setup unauth handler

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSignedIn(false);

      setTokenState(null);

      setUser(null);

      setPermissions([]);

      setAuthToken(null);

      setReqs(REQUISITIONS);

      setReqsLoaded(false);

      setReqsError(null);

      setIsDemoMode(true);

      sessionStorage.removeItem(AUTH_STORE_KEY);
    });
  }, []);

  // Restore session & verify token

  useEffect(() => {
    async function restoreSession() {
      try {
        // 1. Restore local mock ledger / planning state

        const raw = sessionStorage.getItem(STORE_KEY);

        if (raw) {
          const s = JSON.parse(raw);

          if (s.plan) setPlan(s.plan);

          if (s.conflicts) setConflicts(s.conflicts);

          if (s.signedOff) setSignedOff(s.signedOff);
        }

        // 2. Restore auth token & verify with /auth/me

        const authRaw = sessionStorage.getItem(AUTH_STORE_KEY);

        if (authRaw) {
          const authData = JSON.parse(authRaw);

          if (authData.token) {
            setAuthToken(authData.token);

            const res = await apiFetch("/auth/me");

            if (res.ok) {
              const meData = await res.json();

              setTokenState(authData.token);

              setUser(meData.user);

              setPermissions(meData.permissions || []);

              setSignedIn(true);

              const matchingRole = ROLES.find((r) => r.id === meData.user.role_id);

              setRoleState(matchingRole ?? (ROLES[0] as Role));
            } else {
              // Token invalid

              setAuthToken(null);

              sessionStorage.removeItem(AUTH_STORE_KEY);
            }
          }
        }
      } catch (e) {
        console.warn("Session restore failed", e);

        setAuthToken(null);

        sessionStorage.removeItem(AUTH_STORE_KEY);
      } finally {
        setRestored(true);

        setAuthReady(true);
      }
    }

    restoreSession();
  }, []);

  // Sync state to storage

  useEffect(() => {
    if (!restored) return;

    sessionStorage.setItem(
      STORE_KEY,

      JSON.stringify({ roleId: role.id, signedIn, reqs, plan, conflicts, signedOff }),
    );
  }, [restored, role, signedIn, reqs, plan, conflicts, signedOff]);

  // Deprecated manual role setter (does not grant permissions)

  const setRole = (id: RoleId) => {
    const found = ROLES.find((r) => r.id === id);

    if (found) setRoleState(found);
  };

  const can = (perm: string): boolean => {
    if (!permissions || permissions.length === 0) return false;

    return permissions.includes(perm);
  };

  const scope: "network" | "department" =
    user?.scope ??
    (role.id === "engineering" || role.id === "traction" || role.id === "signal"
      ? "department"
      : "network");

  const dept =
    user?.dept ??
    (role.id === "engineering"
      ? "TMS"
      : role.id === "traction"
        ? "TDMS"
        : role.id === "signal"
          ? "SMMS"
          : null);

  // Authenticated signIn

  const signIn = async (id: RoleId, password: string = "12345"): Promise<boolean> => {
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ role_id: id, password }),
      });

      if (!res.ok) {
        let errMsg = "Security credentials invalid. Please enter valid password (12345).";

        try {
          const errData = await res.json();

          if (errData.detail) errMsg = errData.detail;
        } catch {
          // ignore
        }

        throw new Error(errMsg);
      }

      const data = await res.json();

      const accessToken = data.access_token;

      const authUser = data.user;

      const userPerms = data.permissions || [];

      setAuthToken(accessToken);

      setTokenState(accessToken);

      setUser(authUser);

      setPermissions(userPerms);

      setReqsLoaded(false);

      setReqsError(null);

      setSignedIn(true);

      const matchingRole = ROLES.find((r) => r.id === authUser.role_id);

      setRoleState(matchingRole || ROLES[0]!);

      sessionStorage.setItem(
        AUTH_STORE_KEY,

        JSON.stringify({
          token: accessToken,

          user: authUser,

          permissions: userPerms,
        }),
      );

      return true;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Authentication server unreachable. Please check backend connection.");
      }

      throw err;
    }
  };

  // Authenticated signOut

  const signOut = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // fire and forget
    } finally {
      setAuthToken(null);

      setTokenState(null);

      setUser(null);

      setPermissions([]);

      setSignedIn(false);

      setReqs(REQUISITIONS);

      setReqsLoaded(false);

      setReqsError(null);

      setIsDemoMode(true);

      sessionStorage.removeItem(AUTH_STORE_KEY);
    }
  };

  // Fetch KPIs, Trains and Requisitions when authenticated token changes

  useEffect(() => {
    if (!token || !signedIn) return;

    void refreshAll();
  }, [token, signedIn]);

  // Scoped selectors for department roles

  const visibleReqs = useMemo(() => {
    if (scope === "department" && dept) {
      return reqs.filter((r) => r.dept === dept);
    }

    return reqs;
  }, [reqs, scope, dept]);

  const visiblePlan = useMemo(() => {
    if (scope === "department" && dept) {
      return plan.filter((p) =>
        p.reqIds.some((id) => {
          const matchingReq = reqs.find((r) => r.id === id);

          return matchingReq ? matchingReq.dept === dept : false;
        }),
      );
    }

    return plan;
  }, [plan, reqs, scope, dept]);

  const visibleConflicts = useMemo(() => {
    if (scope === "department" && dept) {
      const inScopeReqIds = new Set(reqs.filter((r) => r.dept === dept).map((r) => r.id));
      return conflicts.filter((conflict) => {
        const conflictData = conflict as unknown as Record<string, unknown>;
        const req1 = String(
          conflictData["req1"] ??
            conflictData["request_id_1"] ??
            conflictData["req_id_1"] ??
            conflictData["request1"] ??
            "",
        );
        const req2 = String(
          conflictData["req2"] ??
            conflictData["request_id_2"] ??
            conflictData["req_id_2"] ??
            conflictData["request2"] ??
            "",
        );
        return inScopeReqIds.has(req1) || inScopeReqIds.has(req2);
      });
    }

    return conflicts;
  }, [conflicts, reqs, scope, dept]);

  const value: Ctx = {
    role,

    user,

    token,

    permissions,

    scope,

    dept,

    authReady,

    can,

    trains,

    setRole,

    signedIn,

    signIn,

    signOut,

    reqs,

    reqsLoaded,

    reqsError,

    visibleReqs,

    addReq: async (r) => {
      const response = await apiFetch("/block-requests/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: r.assetId,
          section: r.section,
          dept: r.dept,
          // FastAPI accepts duration in hours and converts it to minutes.
          duration: r.duration,
          criticality: r.criticality,
          blockType: r.blockType,
          work: r.work,
          requestedBy: r.requestedBy,
          tsrRisk: r.tsrRisk,
          daysOverdue: r.daysOverdue,
          crew: r.crew,
          line: r.line,
          chainage: r.chainage,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail ?? `Submission failed with status ${response.status}`);
      }
      const refreshed = await refreshAll();
      const savedId = String(data?.request_id ?? data?.requisition?.request_id ?? "");
      if (!savedId || !refreshed?.some((item) => item.backendId === savedId)) {
        throw new Error(
          savedId
            ? `Requisition ${savedId} was accepted but could not be confirmed in the ledger after refresh.`
            : "Requisition was accepted but the server did not return its saved ID.",
        );
      }
    },
    plan,

    visiblePlan,

    conflicts,

    visibleConflicts,

    optimize: () => {
      const res = runOptimizer(reqs);

      setReqs(res.updated);

      setPlan(res.plan);

      setConflicts(res.conflicts);

      // Trigger backend optimizer run asynchronously

      apiFetch("/optimization/", { method: "POST" })
        .then(() => refreshAll())

        .catch((err) => console.warn("Backend optimizer trigger error:", err));

      return {
        clusters: res.plan.filter((p) => p.reqIds.length > 1).length,

        saved: res.plan.reduce((s, p) => s + p.savedMinutes, 0),

        conflicts: res.conflicts.length,
      };
    },

    resolveConflict: (id) => {
      setConflicts((prev) => prev.map((c) => (c.id === id ? { ...c, resolved: true } : c)));

      apiFetch(`/conflicts/${id}/resolve`, { method: "POST" }).catch(() => {});
    },

    approve: (id) => {
      setSignedOff((prev) => (prev.includes(id) ? prev : [...prev, id]));

      setReqs((prev) =>
        prev.map((r) => (r.clusterId === id ? { ...r, status: "Approved" as const } : r)),
      );

      apiFetch(`/optimized-plan/${id}/approve`, {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({}),
      }).catch((e) => console.warn("Approve API error:", e));
    },

    approveAll: () => {
      setSignedOff(plan.map((p) => p.clusterId));

      setReqs((prev) =>
        prev.map((r) =>
          r.status === "Clustered / Shadowed" ? { ...r, status: "Approved" as const } : r,
        ),
      );

      plan.forEach((p) => {
        apiFetch(`/optimized-plan/${p.clusterId}/approve`, {
          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({}),
        }).catch(() => {});
      });
    },

    signedOff,

    savedMinutes: plan.reduce((s, p) => s + p.savedMinutes, 0),

    isDemoMode,

    refreshAll,

    kpis,
  };

  return <AbpsContext.Provider value={value}>{children}</AbpsContext.Provider>;
}

export function useAbps() {
  const ctx = useContext(AbpsContext);

  if (!ctx) throw new Error("useAbps must be used inside AbpsProvider");

  return ctx;
}

export function useKpis() {
  const { kpis } = useAbps();

  return useMemo(() => {
    return {
      availability: kpis.availability,

      scheduled: kpis.scheduled,

      monthly: kpis.scheduled * 4,

      shadowHours: kpis.blockHours,

      punctuality: kpis.trainDelay,

      department_kpis: kpis.department_kpis,

      scope: kpis.scope,
    };
  }, [kpis]);
}
