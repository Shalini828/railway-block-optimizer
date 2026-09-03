import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  ShieldAlert,
  Siren,
  TrainFront,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAbps } from "@/context/AbpsContext";
import { ROLES, type RoleId } from "@/lib/abps-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NAV = [
  { to: "/dashboard", label: "Control Dashboard", icon: LayoutDashboard },
  { to: "/requests", label: "Requisition Portal", icon: ClipboardList },
  { to: "/optimizer", label: "IR-ABPS Brain", icon: BrainCircuit },
  { to: "/planner", label: "Gantt Planner", icon: CalendarRange },
  { to: "/conflicts", label: "Conflicts & Approvals", icon: ShieldAlert },
  { to: "/maintenance-tasks", label: "Maintenance Tasks", icon: ClipboardList },
  { to: "/analytics", label: "Impact Analytics", icon: BarChart3 },
  { to: "/emergency", label: "Emergency Blocking", icon: Siren },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { role, signedIn, signIn, signOut } = useAbps();
  const location = useLocation();

  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>("admin");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isHomePage = location.pathname === "/";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "12345") {
      setErrorMsg("");
      setPassword("");
      signIn(selectedRoleId);
      toast.success("Authenticated successfully.");
    } else {
      setErrorMsg("Incorrect password. Please enter the valid role password.");
    }
  };

  // 1. NOT SIGNED IN & NOT ON HOME PAGE -> SHOW LOGIN SCREEN
  if (!signedIn && !isHomePage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-panel)]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ background: "var(--gradient-brain)" }}>
              <TrainFront className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">IR-ABPS Control Access</h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Automatic Block Planning System
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-select">Select Access Role</Label>
              <Select
                value={selectedRoleId}
                onValueChange={(val) => {
                  setSelectedRoleId(val as RoleId);
                  setErrorMsg("");
                }}
              >
                <SelectTrigger id="role-select" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role-password">Role Password</Label>
              <div className="relative">
                <Input
                  id="role-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter role password"
                  className="pr-10"
                  required
                />
                <Lock className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
              </div>
              {errorMsg && (
                <p className="text-xs font-medium text-destructive">{errorMsg}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              <KeyRound className="mr-2 size-4" /> Sign In
            </Button>

            <div className="pt-2 text-center">
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
                ← Back to Homepage
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. PUBLIC LANDING HEADER FOR HOMEPAGE (ONLY VISIBLE WHEN LOGGED OUT)
  if (isHomePage && !signedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-6 py-4 backdrop-blur">
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-md p-1.5" style={{ background: "var(--gradient-brain)" }}>
              <TrainFront className="size-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">IR-ABPS</span>
          </Link>
          <Button asChild size="sm">
            <Link to="/dashboard">Sign In to Dashboard</Link>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
          {children}
        </main>
      </div>
    );
  }

  // 3. AUTHENTICATED DASHBOARD LAYOUT
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
              activeOptions={{ exact: n.to === "/dashboard" }}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-safe"></span>
              </span>
              COA feed active
            </div>
            <span className="font-medium text-foreground">NDLS → BSB</span>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <p className="text-sm font-semibold uppercase text-foreground">{role.title}</p>
              <p className="text-xs text-muted-foreground">
                {role.name} · Access: {role.system}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-safe sm:flex">
                <span className="relative flex size-2">
                  <span className="relative inline-flex size-2 rounded-full bg-safe"></span>
                </span>
                SYSTEM OPERATIONAL
              </div>
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut className="size-4" /> Sign Out
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/dashboard" }}
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