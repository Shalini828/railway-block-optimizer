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
  visibleReqs: Requisition[];
  addReq: (r: Omit<Requisition, "id" | "status">) => void;
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

  const [reqs, setReqs] = useState<Requisition[]>(REQUISITIONS);
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
  const [counter, setCounter] = useState(9000);
  const [restored, setRestored] = useState(false);

  // Setup unauth handler
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSignedIn(false);
      setTokenState(null);
      setUser(null);
      setPermissions([]);
      setAuthToken(null);
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
          if (s.reqs) setReqs(s.reqs);
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
              if (matchingRole) {
                setRoleState(matchingRole);
              }
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

  const scope: "network" | "department" = user?.scope ?? (role.id === "engineering" || role.id === "traction" || role.id === "signal" ? "department" : "network");
  const dept = user?.dept ?? (role.id === "engineering" ? "TMS" : role.id === "traction" ? "TDMS" : role.id === "signal" ? "SMMS" : null);

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
      setSignedIn(true);

      const matchingRole = ROLES.find((r) => r.id === authUser.role_id) || ROLES[0];
      setRoleState(matchingRole);

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
      sessionStorage.removeItem(AUTH_STORE_KEY);
    }
  };

  // Fetch KPIs and Trains only when authenticated token changes
  useEffect(() => {
    if (!token || !signedIn) return;

    apiFetch("/dashboard/kpis")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard KPIs");
        return res.json();
      })
      .then((data) => {
        setKpis({
          availability: String(data.kpis?.overall_asset_availability ?? 0),
          scheduled: data.kpis?.scheduled_blocks ?? 0,
          blockHours: String(data.kpis?.shadow_block_savings ?? 0),
          trainDelay: data.kpis?.punctuality_impact_index ?? 0,
          scope: data.scope,
          department_kpis: data.department_kpis,
        });
      })
      .catch((error) => {
        console.error("Dashboard KPI API error:", error);
      });

    apiFetch("/trains/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch trains");
        return res.json();
      })
      .then((data: Train[]) => {
        setTrains(data);
      })
      .catch((error) => {
        console.error("Train API error:", error);
      });
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
      return conflicts.filter((c) => inScopeReqIds.has(c.req1) || inScopeReqIds.has(c.req2));
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
    visibleReqs,
    addReq: (r) => {
      const id = `REQ-${r.dept}-${counter}`;
      setCounter((c) => c + 1);
      setReqs((prev) => [
        {
          ...r,
          id,
          status: "Pending AI Scheduling" as const,
          score: criticalityScore({ ...r, id, status: "Pending AI Scheduling" } as Requisition),
        },
        ...prev,
      ]);
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
      return {
        clusters: res.plan.filter((p) => p.reqIds.length > 1).length,
        saved: res.plan.reduce((s, p) => s + p.savedMinutes, 0),
        conflicts: res.conflicts.length,
      };
    },
    resolveConflict: (id) => {
      setConflicts((prev) => prev.map((c) => (c.id === id ? { ...c, resolved: true } : c)));
    },
    approve: (id) => {
      setSignedOff((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setReqs((prev) =>
        prev.map((r) => (r.clusterId === id ? { ...r, status: "Approved" as const } : r)),
      );
    },
    approveAll: () => {
      setSignedOff(plan.map((p) => p.clusterId));
      setReqs((prev) =>
        prev.map((r) =>
          r.status === "Clustered / Shadowed" ? { ...r, status: "Approved" as const } : r,
        ),
      );
    },
    signedOff,
    savedMinutes: plan.reduce((s, p) => s + p.savedMinutes, 0),
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
