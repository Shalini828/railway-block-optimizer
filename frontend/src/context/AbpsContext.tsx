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

type Train = {
  id: string;
  name: string;
  type: string;
  status: string;
  corridor: string;
  nextStation: string;
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
  optimize: () => { clusters: number; saved: number; conflicts: number };
  resolveConflict: (id: string) => void;
  approve: (id: string) => void;
  approveAll: () => void;
  signedOff: string[];
  savedMinutes: number;
};

const AbpsContext = createContext<Ctx | null>(null);

const STORE_KEY = "ir-abps-session";

export function AbpsProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(ROLES[0] as Role);
  const [signedIn, setSignedIn] = useState(false);
  const [reqs, setReqs] = useState<Requisition[]>(REQUISITIONS);
  const [trains, setTrains] = useState<Train[]>([]);
  const [plan, setPlan] = useState<AiPlanItem[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [signedOff, setSignedOff] = useState<string[]>([]);
  const [counter, setCounter] = useState(9000);
  const [restored, setRestored] = useState(false);

  // Restore session after hydration so a page reload keeps the planning state.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as {
          roleId?: RoleId;
          signedIn?: boolean;
          reqs?: Requisition[];
          plan?: AiPlanItem[];
          conflicts?: Conflict[];
          signedOff?: string[];
        };
        const found = ROLES.find((r) => r.id === s.roleId);
        if (found) setRoleState(found);
        if (s.signedIn) setSignedIn(true);
        if (s.reqs) setReqs(s.reqs);
        if (s.plan) setPlan(s.plan);
        if (s.conflicts) setConflicts(s.conflicts);
        if (s.signedOff) setSignedOff(s.signedOff);
      }
    } catch {
      /* ignore corrupt session snapshot */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify({ roleId: role.id, signedIn, reqs, plan, conflicts, signedOff }),
    );
  }, [restored, role, signedIn, reqs, plan, conflicts, signedOff]);

  const setRole = (id: RoleId) => {
    const found = ROLES.find((r) => r.id === id);
    if (found) setRoleState(found);
  };

  useEffect(() => {
  fetch("http://127.0.0.1:8000/trains/")
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to fetch trains");
      }
      return res.json();
    })
    .then((data: Train[]) => {
      setTrains(data);
    })
    .catch((error) => {
      console.error("Train API error:", error);
    });
}, []);

  const value: Ctx = {
  role,
  setRole,
  trains,
    signedIn,
    signIn: (id) => {
      setRole(id);
      setSignedIn(true);
    },
    signOut: () => setSignedIn(false),
    reqs,
    addReq: (r) => {
      const id = `REQ-${r.dept}-${counter}`;
      setCounter((c) => c + 1);
      setReqs((prev) => [
        { ...r, id, status: "Pending AI Scheduling" as const, score: criticalityScore({ ...r, id, status: "Pending AI Scheduling" } as Requisition) },
        ...prev,
      ]);
    },
    plan,
    conflicts,
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
  };

  return <AbpsContext.Provider value={value}>{children}</AbpsContext.Provider>;
}

export function useAbps() {
  const ctx = useContext(AbpsContext);
  if (!ctx) throw new Error("useAbps must be used inside AbpsProvider");
  return ctx;
}

export function useKpis() {
  const { reqs, savedMinutes, plan } = useAbps();
  return useMemo(() => {
    const scheduled = reqs.filter((r) => r.slot).length;
    return {
      availability: (96.4 + Math.min(savedMinutes / 400, 2.1)).toFixed(1),
      scheduled,
      monthly: scheduled * 4 + 12,
      shadowHours: (savedMinutes / 60).toFixed(1),
      punctuality: Math.round(savedMinutes * 1.8 + plan.length * 12),
    };
  }, [reqs, savedMinutes, plan]);
}
