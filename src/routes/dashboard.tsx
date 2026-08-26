import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Gauge,
  Layers,
  TrainFront,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useAbps, useKpis } from "@/context/AbpsContext";
import { CORRIDORS, RISK_RADAR, TRAIN_PATHS, fmt } from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Control Dashboard | IR-ABPS" },
      {
        name: "description",
        content:
          "Unified COA + BDMS uptime centre for the New Delhi – Varanasi corridor.",
      },
      { property: "og:title", content: "Control Dashboard | IR-ABPS" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
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