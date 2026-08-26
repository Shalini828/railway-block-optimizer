import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, TriangleAlert, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, deptColor } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import { DAYS, DEPT_LABEL, fmt } from "@/lib/abps-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/conflicts")({
  head: () => ({
    meta: [
      { title: "Conflict Resolution & Block Approvals | IR-ABPS" },
      {
        name: "description",
        content:
          "Automated corridor conflict detection, 1-click AI resolution with before/after comparison, and Chief Controller digital sign-off.",
      },
      { property: "og:title", content: "Conflict Resolution & Block Approvals" },
      {
        property: "og:description",
        content: "Resolve freight and express path conflicts and authorise blocks digitally.",
      },
    ],
  }),
  component: ConflictsPage,
});

function ConflictsPage() {
  const { conflicts, resolveConflict, plan, approve, approveAll, signedOff, role } = useAbps();
  const isAdmin = role.id === "admin";

  return (
    <>
      <PageHeader
        title="Conflict Resolution & Approval Workflow"
        subtitle="Automated detections against COA train paths, with AI shift suggestions and Chief Controller authorisation."
        action={
          isAdmin && plan.length > 0 ? (
            <Button
              onClick={() => {
                approveAll();
                toast.success("All mega blocks authorised and stamped by DRM Planning.");
              }}
            >
              <ShieldCheck className="size-4" /> Authorise all blocks
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 text-destructive" /> Automated Conflict Detections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflicts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No conflicts detected. Run the optimization engine to re-scan the corridor.
              </p>
            )}
            {conflicts.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{c.message}</p>
                  <Badge
                    className={c.resolved ? "bg-safe/20 text-safe" : "bg-destructive/20 text-destructive"}
                  >
                    {c.resolved ? "Resolved" : "Open"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Affected: {c.reqIds.join(", ")}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded border border-border bg-secondary/30 p-2 text-xs">
                    <p className="text-muted-foreground">Before</p>
                    <p>{c.before}</p>
                  </div>
                  <div className="rounded border border-safe/40 bg-safe/10 p-2 text-xs">
                    <p className="text-muted-foreground">After AI resolution</p>
                    <p>{c.after}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={c.resolved}
                  onClick={() => {
                    resolveConflict(c.id);
                    toast.success(`Block shifted by +${c.shiftMins} mins into train gap window.`);
                  }}
                >
                  <Wand2 className="size-4" /> {c.suggestion}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-safe" /> Chief Controller Approval Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isAdmin && (
              <p className="rounded border border-warn/40 bg-warn/10 p-2 text-xs text-warn">
                Read-only: approval authority rests with Chief Section Controller / DRM Planning.
                Switch role from the header to authorise.
              </p>
            )}
            {plan.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No proposed blocks awaiting sign-off.{" "}
                <Link to="/optimizer" className="text-primary underline">
                  Run the engine
                </Link>
                .
              </p>
            )}
            {plan.map((p) => {
              const done = signedOff.includes(p.clusterId);
              return (
                <div key={p.clusterId} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {p.clusterId} · {p.section} {p.line}
                    </p>
                    <Badge
                      variant="outline"
                      className={p.depts.length > 1 ? deptColor["JOINT"] : deptColor[p.depts[0] ?? "TMS"]}
                    >
                      {p.depts.length > 1
                        ? `Joint · ${p.depts.join(" + ")}`
                        : DEPT_LABEL[p.depts[0]!]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {DAYS[p.day]} {fmt(p.start)} – {fmt(p.end)} · saves {p.savedMinutes} min ·
                    expected delay {p.expectedDelay} min
                  </p>
                  <Separator className="my-2" />
                  {done ? (
                    <div className="flex items-center gap-2 rounded border border-safe/40 bg-safe/10 px-2 py-1.5 text-xs text-safe">
                      <CheckCircle2 className="size-4" />
                      Digitally authorised — DRM/PLG · BDMS stamp {p.clusterId}/AUTH
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isAdmin}
                      onClick={() => {
                        approve(p.clusterId);
                        toast.success(`${p.clusterId} authorised with digital stamp.`);
                      }}
                    >
                      Approve & apply digital stamp
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
