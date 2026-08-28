import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { CORRIDORS, RISK_RADAR } from "@/lib/abps-data";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      {
        property: "og:title",
        content: "Control Dashboard | IR-ABPS",
      },
    ],
  }),

  component: DashboardPage,
});

type Train = {
  id: string;
  name: string;
  type: string;
  status: string;
  corridor: string;
  nextStation: string;
};

function DashboardPage() {
  const kpi = useKpis();

  // Only get requisitions from AbpsContext.
  // Trains are fetched directly from the backend API below.
  const { reqs } = useAbps();

  const [trains, setTrains] = useState<Train[]>([]);
  const [loadingTrains, setLoadingTrains] = useState(true);

  // Fetch live train data from FastAPI backend
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
        console.error("Error fetching trains:", error);
      })
      .finally(() => {
        setLoadingTrains(false);
      });
  }, []);

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
      {/* ================= HEADER ================= */}

      <PageHeader
        title="Central Executive Dashboard"
        subtitle="Unified COA + BDMS uptime centre for the New Delhi – Varanasi corridor. Live feeds from TMS, SMMS and TDMS."
        action={
          <Button asChild>
            <Link to="/optimizer">
              Run Optimization Engine
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {/* ================= KPI CARDS ================= */}

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

              <p className="mt-3 text-2xl font-semibold">
                {k.value}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {k.note}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ================= CORRIDOR + RISK ================= */}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* LIVE CORRIDOR STATUS */}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Live Corridor Status Feed
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {CORRIDORS.map((c) => {
              const runningTrains = trains.filter(
                (t) =>
                  t.corridor === c.id &&
                  t.status === "Running",
              ).length;

              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-secondary/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {c.name}
                    </p>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {loadingTrains
                          ? "Loading..."
                          : `${runningTrains} trains running`}
                      </Badge>

                      <Badge className="bg-safe/20 text-safe">
                        Window {c.openWindow}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.lines.map((line) => (
                      <span
                        key={line}
                        className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {line}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Traffic intensity</span>
                      <span>{c.intensity}%</span>
                    </div>

                    <Progress
                      value={c.intensity}
                      className="mt-1.5 h-1.5"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* URGENT RISK RADAR */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              Urgent Risk Radar
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {RISK_RADAR.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {r.kind}
                  </p>

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

                <p className="mt-2 text-xs">
                  {r.detail}
                </p>
              </div>
            ))}

            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <Link to="/requests">
                Open requisition ledger
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ================= TRAIN FORECAST + PIPELINE ================= */}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* COA TRAIN PATH FORECAST */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              COA Train Path Forecast
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {loadingTrains ? (
              <p className="text-sm text-muted-foreground">
                Loading train data...
              </p>
            ) : trains.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No train data available.
              </p>
            ) : (
              trains.map((train) => (
                <div
                  key={train.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">
                      {train.id}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {train.name}
                    </span>
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {train.corridor} · {train.nextStation} ·{" "}
                    <span
                      className={
                        train.status === "Running"
                          ? "text-safe"
                          : "text-warn"
                      }
                    >
                      {train.status}
                    </span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* BDMS REQUISITION PIPELINE */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Requisition Pipeline (BDMS)
            </CardTitle>
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
            ).map((status) => {
              const count = reqs.filter(
                (r) => r.status === status,
              ).length;

              return (
                <div
                  key={status}
                  className="flex items-center gap-3"
                >
                  <span className="w-44 text-xs text-muted-foreground">
                    {status}
                  </span>

                  <Progress
                    value={
                      (count / Math.max(reqs.length, 1)) * 100
                    }
                    className="h-2"
                  />

                  <span className="w-6 text-right text-xs">
                    {count}
                  </span>
                </div>
              );
            })}

            <Button
              asChild
              variant="outline"
              className="mt-2 w-full"
            >
              <Link to="/planner">
                View Gantt planner
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}