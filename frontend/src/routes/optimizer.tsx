import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrainCircuit, Layers, Sparkles, TimerReset, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, deptColor } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import { DAYS, DEPT_LABEL, criticalityScore, fmt } from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/optimizer")({
  head: () => ({
    meta: [
      { title: "IR-ABPS Optimization Engine | AI Block Planner" },
      {
        name: "description",
        content:
          "Run criticality scoring, shadow maintenance clustering and corridor window matching to auto-generate mega blocks.",
      },
      { property: "og:title", content: "IR-ABPS Optimization Engine" },
      {
        property: "og:description",
        content:
          "AI engine that clusters TMS, SMMS and TDMS work into coordinated mega blocks without cancelling trains.",
      },
    ],
  }),
  component: OptimizerPage,
});

type AiTask = {
  task_id: string;
  asset_id: string;
  department: string;
  task_type: string;
  description: string;
  due_date: string | null;
  estimated_duration_min: number;
  overdue_days: number;
  safety_risk: number;
  ai_priority_score: number;
  priority_category: string;
  task_status: string;
};

function OptimizerPage() {
  const { reqs, plan, conflicts, optimize } = useAbps();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Idle");
  const [drawer, setDrawer] = useState(false);

  const [aiTasks, setAiTasks] = useState<AiTask[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/maintenance-tasks")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch AI maintenance priorities");
        }
        return response.json();
      })
      .then((data) => {
        setAiTasks(data);
        setAiLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setAiError("Unable to load AI priorities");
        setAiLoading(false);
      });
  }, []);

  const pending = reqs.filter((r) => r.status === "Pending AI Scheduling");

  const run = () => {
    setRunning(true);
    setProgress(0);
    const stages = [
      "Ingesting TMS / SMMS / TDMS requisitions…",
      "Computing criticality scores…",
      "Clustering shadow maintenance windows…",
      "Matching COA corridor slack intervals…",
      "Validating express & freight paths…",
    ];
    let i = 0;
    const timer = setInterval(() => {
      setStage(stages[i] ?? "Finalising plan…");
      setProgress(((i + 1) / stages.length) * 100);
      i += 1;
      if (i >= stages.length) {
        clearInterval(timer);
        const res = optimize();
        setRunning(false);
        setStage("Optimization complete");
        setDrawer(true);
        toast.success(
          `${res.clusters} mega blocks formed · ${res.saved} min saved · ${res.conflicts} conflicts flagged`,
        );
      }
    }, 550);
  };

  return (
    <>
      <PageHeader
        title="AI Automatic Block Optimization Engine"
        subtitle="Criticality scoring → shadow maintenance clustering → corridor window matching."
        action={
          <Button onClick={run} disabled={running}>
            <BrainCircuit className="size-4" />
            {running ? "Optimising…" : "Run IR-ABPS Optimization Engine"}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Engine Execution Console</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{stage}</p>
            <Progress value={progress} className="mt-3 h-2" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label="Pending inputs" value={String(pending.length)} icon={Layers} />
              <Stat label="Mega blocks" value={String(plan.filter((p) => p.reqIds.length > 1).length)} icon={Sparkles} />
              <Stat
                label="Downtime saved"
                value={`${plan.reduce((s, p) => s + p.savedMinutes, 0)} min`}
                icon={TimerReset}
              />
            </div>
            <div className="mt-5 space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Criticality scoring queue
              </p>
              {[...reqs]
                .sort((a, b) => (b.score ?? criticalityScore(b)) - (a.score ?? criticalityScore(a)))
                .slice(0, 6)
                .map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <Badge variant="outline" className={deptColor[r.dept]}>
                      {r.dept}
                    </Badge>
                    <span className="w-40 truncate text-xs">{r.assetId}</span>
                    <Progress value={r.score ?? criticalityScore(r)} className="h-1.5" />
                    <span className="w-8 text-right text-xs">
                      {r.score ?? criticalityScore(r)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Algorithms in play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Algo
              title="Criticality Scoring"
              body="Score = f(asset deterioration, safety hazard, TSR risk, days overdue), normalised to 100."
            />
            <Algo
              title="Shadow Maintenance Clustering"
              body="Overlapping TMS / SMMS / TDMS requests on the same section & line collapse into one Mega Block, removing redundant shutdowns."
            />
            <Algo
              title="Corridor Window Matching"
              body="Slack intervals between COA passenger timetables and goods paths are selected so Rajdhani / Vande Bharat / express paths are never cancelled."
            />
            <Button variant="outline" className="w-full" onClick={() => setDrawer(true)}>
              Open AI recommendation drawer
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              AI Maintenance Priority
            </CardTitle>
          </CardHeader>

          <CardContent>
            {aiLoading && (
              <p className="text-sm text-muted-foreground">
                Loading AI priorities...
              </p>
            )}

            {aiError && (
              <p className="text-sm text-destructive">
                {aiError}
              </p>
            )}

            {!aiLoading && !aiError && aiTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No maintenance tasks found.
              </p>
            )}

            {!aiLoading && !aiError && aiTasks.length > 0 && (
              <div className="space-y-3">
                {aiTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.task_id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {task.task_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.asset_id} · {task.department}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={
                          task.priority_category === "CRITICAL"
                            ? "text-destructive"
                            : task.priority_category === "HIGH"
                              ? "text-warn"
                              : task.priority_category === "MEDIUM"
                                ? "text-primary"
                                : ""
                        }
                      >
                        {task.priority_category}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Progress
                        value={task.ai_priority_score}
                        className="h-2"
                      />

                      <span className="w-14 text-right text-xs font-semibold">
                        {task.ai_priority_score.toFixed(2)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      AI risk-based maintenance priority
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>AI Recommendation Drawer</SheetTitle>
            <SheetDescription>
              Generated schedule with explanations and expected train delay impact.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-8">
            {plan.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No plan yet — run the optimization engine.
              </p>
            )}
            {plan.map((p) => (
              <div key={p.clusterId} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {p.clusterId} · {p.section} {p.line}
                  </p>
                  <Badge
                    variant="outline"
                    className={p.depts.length > 1 ? deptColor["JOINT"] : deptColor[p.depts[0] ?? "TMS"]}
                  >
                    {p.depts.length > 1 ? "Joint Coordinated" : DEPT_LABEL[p.depts[0]!]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {DAYS[p.day]} · {fmt(p.start)} – {fmt(p.end)} · {p.reqIds.length} requisition(s)
                </p>
                <p className="mt-2 text-xs">{p.explanation}</p>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="text-safe">Saved {p.savedMinutes} min downtime</span>
                  <span className="text-warn">Expected delay {p.expectedDelay} min</span>
                </div>
              </div>
            ))}
            {conflicts.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <p className="flex items-center gap-2 font-medium text-destructive">
                  <TriangleAlert className="size-4" /> {conflicts.length} corridor conflict(s)
                  detected
                </p>
                <Button asChild size="sm" className="mt-2">
                  <Link to="/conflicts">Resolve in workflow</Link>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-1.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Algo({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}