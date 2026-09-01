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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ============================================================
// ROUTE
// ============================================================

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

// ============================================================
// TYPES
// ============================================================

type KPIData = {
  overall_asset_availability: number;
  scheduled_blocks: number;
  shadow_block_savings: number;
  punctuality_impact_index: number;
};

type CorridorStatus = {
  id: string;
  name: string;
  from: string;
  to: string;
  trains_running: number;
  window: string;
  traffic_intensity: number;
  tracks: string[];
};

type UrgentRisk = {
  id: string;
  title: string;
  severity: string;
  location: string;
  description: string;
};

type TrainForecast = {
  id: string;
  train: string;
  corridor: string;
  status: string;
  time?: string;
  expected?: string;
};

type RequisitionPipeline = {
  pending_ai_scheduling: number;
  clustered_shadowed: number;
  approved: number;
  active: number;
  completed: number;
};

type DashboardResponse = {
  status: string;

  kpis: KPIData;

  corridor_status: CorridorStatus[];

  urgent_risks: UrgentRisk[];

  train_forecast: TrainForecast[];

  requisition_pipeline: RequisitionPipeline;
};

// ============================================================
// DASHBOARD
// ============================================================

function DashboardPage() {
  const [dashboardData, setDashboardData] =
    useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // ==========================================================
  // FETCH DASHBOARD DATA
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "http://127.0.0.1:8000/dashboard/kpis",
        );

        if (!response.ok) {
          throw new Error(
            `Dashboard API returned ${response.status}`,
          );
        }

        const data: DashboardResponse =
          await response.json();

        if (cancelled) return;

        console.log(
          "Dashboard API data:",
          data,
        );

        setDashboardData(data);
      } catch (err) {
        console.error(
          "Error fetching dashboard data:",
          err,
        );

        if (!cancelled) {
          setError(
            "Unable to load dashboard data from the backend.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Loading dashboard data...
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR STATE
  // ==========================================================

  if (error || !dashboardData) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Central Executive Dashboard"
          subtitle="Unified COA + BDMS uptime centre for the New Delhi – Varanasi corridor."
        />

        <Card>
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-3 size-8 text-destructive" />

              <p className="text-sm font-medium">
                {error ||
                  "Dashboard data is unavailable."}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Make sure the FastAPI backend is running on
                127.0.0.1:8000.
              </p>

              <Button
                className="mt-4"
                onClick={() =>
                  window.location.reload()
                }
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    kpis: apiKpis,
    corridor_status,
    urgent_risks,
    train_forecast,
    requisition_pipeline,
  } = dashboardData;

  // ==========================================================
  // KPI CARDS
  // ==========================================================

  const kpis = [
    {
      label: "Overall Asset Availability",
      value: `${apiKpis.overall_asset_availability}%`,
      note: "Track + Signal + OHE composite",
      icon: Gauge,
      tone: "text-safe",
    },

    {
      label: "Scheduled Blocks",
      value: `${apiKpis.scheduled_blocks} / wk`,
      note: "Projected this month",
      icon: Layers,
      tone: "text-trd",
    },

    {
      label: "Shadow Block Savings",
      value: `${apiKpis.shadow_block_savings} hrs`,
      note: "Gained via joint coordinated work",
      icon: Clock,
      tone: "text-joint",
    },

    {
      label: "Punctuality Impact Index",
      value: `${apiKpis.punctuality_impact_index} min`,
      note: "Train delay minutes saved",
      icon: TrainFront,
      tone: "text-warn",
    },
  ];

  // ==========================================================
  // PIPELINE DATA
  // ==========================================================

  const pipeline = [
    {
      label: "Pending AI Scheduling",
      value:
        requisition_pipeline.pending_ai_scheduling,
    },

    {
      label: "Clustered / Shadowed",
      value:
        requisition_pipeline.clustered_shadowed,
    },

    {
      label: "Approved",
      value: requisition_pipeline.approved,
    },

    {
      label: "Active",
      value: requisition_pipeline.active,
    },

    {
      label: "Completed",
      value: requisition_pipeline.completed,
    },
  ];

  const pipelineTotal = Math.max(
    pipeline.reduce(
      (sum, item) => sum + item.value,
      0,
    ),
    1,
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      {/* =====================================================
          HEADER
      ====================================================== */}

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

      {/* =====================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>

                <k.icon
                  className={`size-4 ${k.tone}`}
                />
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

      {/* =====================================================
          CORRIDOR + RISK
      ====================================================== */}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">

        {/* ===================================================
            LIVE CORRIDOR STATUS
        ==================================================== */}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Live Corridor Status Feed
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            {corridor_status.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No corridor data available.
              </p>
            ) : (
              corridor_status.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-secondary/30 p-4"
                >

                  {/* Corridor heading */}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {c.name}
                    </p>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {c.trains_running} trains running
                      </Badge>

                      <Badge className="bg-safe/20 text-safe">
                        Window {c.window}
                      </Badge>
                    </div>
                  </div>

                  {/* Tracks */}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.tracks.map((track) => (
                      <span
                        key={track}
                        className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {track}
                      </span>
                    ))}
                  </div>

                  {/* Traffic intensity */}

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Traffic intensity
                      </span>

                      <span>
                        {c.traffic_intensity}%
                      </span>
                    </div>

                    <Progress
                      value={c.traffic_intensity}
                      className="mt-1.5 h-1.5"
                    />
                  </div>
                </div>
              ))
            )}

          </CardContent>
        </Card>

        {/* ===================================================
            URGENT RISK RADAR
        ==================================================== */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />

              Urgent Risk Radar
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">

            {urgent_risks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No urgent risks detected.
              </p>
            ) : (
              urgent_risks.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border p-3"
                >

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {r.title}
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
                    {r.id} · {r.location}
                  </p>

                  <p className="mt-2 text-xs">
                    {r.description}
                  </p>

                </div>
              ))
            )}

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

      {/* =====================================================
          TRAIN FORECAST + PIPELINE
      ====================================================== */}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">

        {/* ===================================================
            COA TRAIN PATH FORECAST
        ==================================================== */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              COA Train Path Forecast
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">

            {train_forecast.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No train forecast available.
              </p>
            ) : (
              train_forecast.map((train) => (
                <div
                  key={train.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >

                  <span>
                    <span className="font-medium">
                      {train.train}
                    </span>
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {train.corridor} ·{" "}

                    {train.time
                      ? train.time
                      : train.expected
                        ? train.expected
                        : ""}{" "}

                    ·{" "}

                    <span
                      className={
                        train.status === "On Time"
                          ? "text-safe"
                          : train.status === "Expected"
                            ? "text-warn"
                            : "text-muted-foreground"
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

        {/* ===================================================
            BDMS REQUISITION PIPELINE
        ==================================================== */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Requisition Pipeline (BDMS)
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">

            {pipeline.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3"
              >

                <span className="w-44 text-xs text-muted-foreground">
                  {item.label}
                </span>

                <Progress
                  value={
                    (item.value /
                      pipelineTotal) *
                    100
                  }
                  className="h-2"
                />

                <span className="w-6 text-right text-xs">
                  {item.value}
                </span>

              </div>
            ))}

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