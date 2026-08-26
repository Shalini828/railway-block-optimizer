import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  ClipboardList,
  Clock,
  Gauge,
  Layers,
  ShieldAlert,
  TrainFront,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useAbps, useKpis } from "@/context/AbpsContext";
import { CORRIDORS, RISK_RADAR, TRAIN_PATHS, fmt } from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home | IR-ABPS Railway Block Planning" },
      { name: "description", content: "AI-powered automatic block planning to maximise asset availability on Indian Railways." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { signedIn } = useAbps();

  // Show the actual dashboard if the user is logged in
  if (signedIn) {
    return <Dashboard />;
  }

  // Otherwise, show the landing page
  return <LandingPage />;
}

function LandingPage() {
  const features = [
    {
      title: "Requisition Portal",
      description: "Submit and track TMS, SMMS, and TDMS maintenance requests.",
      icon: ClipboardList,
      link: "/requests",
      color: "text-blue-500",
    },
    {
      title: "AI Optimizer Engine",
      description: "Run advanced clustering algorithms to generate shadow blocks.",
      icon: BrainCircuit,
      link: "/optimizer",
      color: "text-purple-500",
    },
    {
      title: "Gantt Planner",
      description: "Visualize 7-day tactical and 30-day strategic corridor blocks.",
      icon: CalendarRange,
      link: "/planner",
      color: "text-emerald-500",
    },
    {
      title: "Impact Analytics",
      description: "Measure asset uptime trends and operational efficiency gains.",
      icon: BarChart3,
      link: "/analytics",
      color: "text-amber-500",
    },
  ];

  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-20 text-center shadow-sm">
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary blur-3xl"></div>
        </div>
        <div className="relative z-10 flex max-w-3xl flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <TrainFront className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            AI-Powered Automatic <br className="hidden sm:block" />
            <span className="text-primary">Block Planning System</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Maximising asset availability for Indian Railways by intelligently clustering maintenance windows, eliminating redundant shutdowns, and avoiding express path conflicts.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link to="/optimizer">
                Run AI Optimizer <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link to="/conflicts">
                <ShieldAlert className="mr-2 h-4 w-4" /> View Conflicts
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Access Modules */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feat) => (
          <Link key={feat.title} to={feat.link} className="group outline-none">
            <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/50 transition-colors group-hover:bg-secondary">
                  <feat.icon className={`h-6 w-6 ${feat.color}`} />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {feat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feat.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Dashboard() {
  const kpi = useKpis();
  const { reqs } = useAbps();

  const kpis = [
    {
      label: "Overall Asset Availability",
      value: `${kpi.availability}%`,
      note: "Track + Signal + OHE composite",
      icon: Gauge,
      tone: "text-safe",
    },
    {
      label: "Scheduled Blocks",
      value: `${kpi.scheduled} / wk`,
      note: `${kpi.monthly} projected this month`,
      icon: Layers,
      tone: "text-trd",
    },
    {
      label: "Shadow Block Savings",
      value: `${kpi.shadowHours} hrs`,
      note: "Gained via joint coordinated work",
      icon: Clock,
      tone: "text-joint",
    },
    {
      label: "Punctuality Impact Index",
      value: `${kpi.punctuality} min`,
      note: "Train delay minutes saved",
      icon: TrainFront,
      tone: "text-warn",
    },
  ];

  return (
    <>
      <PageHeader
        title="Central Executive Dashboard"
        subtitle="Unified COA + BDMS uptime centre for the New Delhi – Varanasi corridor. Live feeds from TMS, SMMS and TDMS."
        action={
          <Button asChild>
            <Link to="/optimizer">
              Run Optimization Engine <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <k.icon className={`size-4 ${k.tone}`} />
              </div>
              <p className="mt-3 text-2xl font-semibold">{k.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Live Corridor Status Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CORRIDORS.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{c.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.activeTrains} trains running</Badge>
                    <Badge className="bg-safe/20 text-safe">Window {c.openWindow}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.lines.map((l) => (
                    <span
                      key={l}
                      className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {l}
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Traffic intensity</span>
                    <span>{c.intensity}%</span>
                  </div>
                  <Progress value={c.intensity} className="mt-1.5 h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" /> Urgent Risk Radar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {RISK_RADAR.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.kind}</p>
                  <Badge
                    className={
                      r.severity === "Critical"
                        ? "bg-destructive/20 text-destructive"
                        : r.severity === "High"
                          ? "bg-warn/20 text-warn"
                          : "bg-trd/20 text-trd"
                    }
                  >
                    {r.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.asset} · {r.section}
                </p>
                <p className="mt-2 text-xs">{r.detail}</p>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link to="/requests">Open requisition ledger</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">COA Train Path Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {TRAIN_PATHS.map((t) => (
              <div
                key={t.no}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{t.no}</span>{" "}
                  <span className="text-muted-foreground">{t.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.line} · {fmt(t.start)}–{fmt(t.end)} ·{" "}
                  <span className={t.kind === "Freight" ? "text-warn" : "text-trd"}>
                    {t.kind}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requisition Pipeline (BDMS)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(
              [
                "Pending AI Scheduling",
                "Clustered / Shadowed",
                "Approved",
                "Active",
                "Completed",
              ] as const
            ).map((s) => {
              const n = reqs.filter((r) => r.status === s).length;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-44 text-xs text-muted-foreground">{s}</span>
                  <Progress value={(n / Math.max(reqs.length, 1)) * 100} className="h-2" />
                  <span className="w-6 text-right text-xs">{n}</span>
                </div>
              );
            })}
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link to="/planner">View Gantt planner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}