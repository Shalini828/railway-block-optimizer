import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarRange, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import {
  CORRIDORS,
  DAYS,
  DEPT_LABEL,
  TRAIN_PATHS,
  fmt,
  type Requisition,
} from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Corridor Gantt & Timeline Planner | IR-ABPS" },
      {
        name: "description",
        content:
          "Weekly tactical and monthly strategic Gantt views of coordinated railway maintenance blocks with conflict indicators.",
      },
      { property: "og:title", content: "Corridor Gantt & Timeline Planner" },
      {
        property: "og:description",
        content: "Interactive 7-day and 30-day block planning grid for Indian Railways corridors.",
      },
    ],
  }),
  component: PlannerPage,
});

const HOURS = Array.from({ length: 25 }, (_, i) => i);

function deptBg(r: Requisition, joint: boolean) {
  if (joint) return "var(--joint)";
  return r.dept === "TMS" ? "var(--eng)" : r.dept === "SMMS" ? "var(--snt)" : "var(--trd)";
}

function PlannerPage() {
  const { reqs } = useAbps();
  const [view, setView] = useState<"week" | "month">("week");
  const [sel, setSel] = useState<Requisition | null>(null);

  const scheduled = reqs.filter((r) => r.slot);

  const clusterCount = (r: Requisition) =>
    r.clusterId ? reqs.filter((x) => x.clusterId === r.clusterId).length : 1;

  const conflictFor = (r: Requisition) =>
    r.slot
      ? TRAIN_PATHS.find(
          (t) =>
            t.section === r.section &&
            t.line === r.line &&
            t.day === r.slot!.day &&
            r.slot!.start < t.end &&
            r.slot!.end > t.start,
        )
      : undefined;

  return (
    <>
      <PageHeader
        title="Visual Interactive Gantt & Corridor Timeline"
        subtitle="Colour-coded by department: Engineering (amber), S&T (emerald), TRD (sky), Joint block (violet), train windows (slate)."
        action={
          <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")}>
            <TabsList>
              <TabsTrigger value="week">Weekly Tactical (7d × 24h)</TabsTrigger>
              <TabsTrigger value="month">Monthly Strategic (30d)</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {[
          ["Engineering (TMS)", "var(--eng)"],
          ["S&T (SMMS)", "var(--snt)"],
          ["Traction (TDMS)", "var(--trd)"],
          ["Joint Coordinated Block", "var(--joint)"],
          ["Passenger / Freight window", "var(--traffic)"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="size-3 rounded" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {scheduled.length === 0 && (
        <Card className="mb-4 border-warn/40 bg-warn/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <span>No blocks scheduled yet. Run the AI engine to populate the plan.</span>
            <Button asChild size="sm">
              <Link to="/optimizer">Run IR-ABPS engine</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {view === "week" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="size-4" /> Weekly Tactical Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="mb-1 flex pl-16 text-[10px] text-muted-foreground">
                {HOURS.slice(0, 24).map((h) => (
                  <div key={h} className="flex-1">
                    {h}
                  </div>
                ))}
              </div>
              {DAYS.map((d, di) => (
                <div key={d} className="mb-1.5 flex items-center">
                  <div className="w-16 text-xs text-muted-foreground">{d}</div>
                  <div className="relative h-10 flex-1 rounded border border-border bg-secondary/30">
                    {TRAIN_PATHS.filter((t) => t.day === di).map((t) => (
                      <div
                        key={t.no + t.line}
                        title={`${t.no} ${t.name} (${t.kind})`}
                        className="absolute top-0 h-full rounded opacity-60"
                        style={{
                          left: `${(t.start / 24) * 100}%`,
                          width: `${((t.end - t.start) / 24) * 100}%`,
                          background: "var(--traffic)",
                        }}
                      />
                    ))}
                    {scheduled
                      .filter((r) => r.slot?.day === di)
                      .map((r, i) => {
                        const joint = clusterCount(r) > 1;
                        const clash = conflictFor(r);
                        return (
                          <button
                            key={r.id}
                            onClick={() => setSel(r)}
                            className="absolute flex items-center gap-1 overflow-hidden rounded px-1.5 text-[10px] font-medium text-primary-foreground ring-offset-background transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring"
                            style={{
                              left: `${(r.slot!.start / 24) * 100}%`,
                              width: `${((r.slot!.end - r.slot!.start) / 24) * 100}%`,
                              top: joint ? 2 : 4 + (i % 2) * 16,
                              height: joint ? 34 : 14,
                              background: deptBg(r, joint),
                            }}
                          >
                            {clash && <TriangleAlert className="size-3 shrink-0" />}
                            <span className="truncate">
                              {joint ? r.clusterId : r.dept} {r.assetId}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Strategic Overhaul Plan (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
              {Array.from({ length: 30 }, (_, i) => i).map((d) => {
                const items = scheduled.filter((r) => r.slot!.day % 7 === d % 7 && d % 7 !== 5);
                return (
                  <div
                    key={d}
                    className="min-h-20 rounded border border-border bg-secondary/30 p-1.5"
                  >
                    <p className="text-[10px] text-muted-foreground">Day {d + 1}</p>
                    {items.slice(0, 3).map((r) => (
                      <button
                        key={r.id + d}
                        onClick={() => setSel(r)}
                        className="mt-1 w-full truncate rounded px-1 text-left text-[9px] text-primary-foreground"
                        style={{ background: deptBg(r, clusterCount(r) > 1) }}
                      >
                        {r.assetId}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Corridor freight & express path guardrails</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {CORRIDORS.map((c) => (
            <div key={c.id} className="rounded-md border border-border px-3 py-2 text-xs">
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground">
                Protected window outside {c.openWindow} · intensity {c.intensity}%
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sel?.clusterId ? `${sel.clusterId} · ${sel.id}` : sel?.id}</DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-2 text-sm">
              <p>{sel.work}</p>
              <p className="text-xs text-muted-foreground">
                {DEPT_LABEL[sel.dept]} · {sel.assetId} · {sel.chainage}
              </p>
              <p className="text-xs">
                {DAYS[sel.slot!.day]} {fmt(sel.slot!.start)} – {fmt(sel.slot!.end)} on {sel.line} (
                {sel.section})
              </p>
              <div className="flex gap-2">
                <Badge variant="outline">{sel.blockType}</Badge>
                <Badge variant="outline">{sel.status}</Badge>
                {clusterCount(sel) > 1 && (
                  <Badge className="bg-joint/20 text-joint">
                    Joint block · {clusterCount(sel)} works
                  </Badge>
                )}
              </div>
              {conflictFor(sel) ? (
                <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  Conflict: breaches path of {conflictFor(sel)!.no} ({conflictFor(sel)!.name}).
                  Resolve in the conflict workflow.
                </p>
              ) : (
                <p className="rounded border border-safe/40 bg-safe/10 p-2 text-xs text-safe">
                  Clear of all scheduled express and freight paths.
                </p>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to="/conflicts">Open approval workflow</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
