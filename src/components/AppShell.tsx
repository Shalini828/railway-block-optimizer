import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  TrainFront,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAbps } from "@/context/AbpsContext";
import { ROLES } from "@/lib/abps-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/", label: "Control Dashboard", icon: LayoutDashboard },
  { to: "/requests", label: "Requisition Portal", icon: ClipboardList },
  { to: "/optimizer", label: "IR-ABPS Brain", icon: BrainCircuit },
  { to: "/planner", label: "Gantt Planner", icon: CalendarRange },
  { to: "/conflicts", label: "Conflicts & Approvals", icon: ShieldAlert },
  { to: "/analytics", label: "Impact Analytics", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, signedIn, signIn, signOut } = useAbps();
  const location = useLocation();

  const isHomePage = location.pathname === "/";

  // 1. NOT SIGNED IN & NOT ON HOME PAGE -> SHOW LOGIN SCREEN
  if (!signedIn && !isHomePage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-panel)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ background: "var(--gradient-brain)" }}>
              <TrainFront className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">IR-ABPS Control Access</h1>
              <p className="text-sm text-muted-foreground">
                AI-Powered Automatic Block Planning System — Indian Railways
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Select a role to enter the control room. Role-based access controls which
            approvals and department ledgers are available.
          </p>
          <div className="mt-5 grid gap-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => signIn(r.id)}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3 text-left transition-colors hover:border-primary hover:bg-accent"
              >
                <span>
                  <span className="block text-sm font-medium">{r.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.name} · {r.system}
                  </span>
                </span>
                <Badge variant="outline">1-Click Switch</Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. NOT SIGNED IN & ON HOME PAGE -> SHOW PUBLIC LANDING PAGE 
  if (!signedIn && isHomePage) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="rounded-md p-1.5" style={{ background: "var(--gradient-brain)" }}>
               <TrainFront className="size-5 text-primary-foreground" />
             </div>
             <span className="font-semibold tracking-tight">IR-ABPS</span>
           </div>
           {/* Directs to a protected route to force the login prompt */}
           <Button asChild size="sm">
             <Link to="/optimizer">Sign In to Dashboard</Link>
           </Button>
        </header>
        <main className="flex-1 px-4 py-10 sm:px-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    );
  }

  // 3. SIGNED IN -> SHOW FULL SIDEBAR DASHBOARD LAYOUT
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <div className="rounded-md p-1.5" style={{ background: "var(--gradient-brain)" }}>
            <TrainFront className="size-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">IR-ABPS</p>
            <p className="text-[11px] text-muted-foreground">Block Planning Suite</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:bg-accent/60" }}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-safe" />
            COA feed live · NDLS–BSB
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <p className="text-sm font-semibold">{role.title}</p>
              <p className="text-xs text-muted-foreground">
                {role.name} · Access: {role.system}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden gap-1 sm:flex">
                {ROLES.map((r) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant={r.id === role.id ? "default" : "outline"}
                    onClick={() => setRole(r.id)}
                  >
                    {r.dept}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut className="size-4" /> Exit
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export const deptColor: Record<string, string> = {
  TMS: "bg-eng/20 text-eng border-eng/40",
  SMMS: "bg-snt/20 text-snt border-snt/40",
  TDMS: "bg-trd/20 text-trd border-trd/40",
  JOINT: "bg-joint/20 text-joint border-joint/40",
};