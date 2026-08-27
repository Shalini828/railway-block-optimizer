import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import { useAbps, useKpis } from "@/context/AbpsContext";
import { BLOCK_MIX, DAYS, DEPT_LABEL, UPTIME_SERIES, fmt } from "@/lib/abps-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Post-Block Impact Analytics | IR-ABPS" },
      {
        name: "description",
        content:
          "Asset uptime vs downtime for track, signalling and OHE, coordinated-block efficiency metrics and schedule exports.",
      },
      { property: "og:title", content: "Post-Block Impact Analytics" },
      {
        property: "og:description",
        content: "Measure asset availability gains from AI-coordinated railway block planning.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { reqs, plan } = useAbps();
  const kpi = useKpis();

  const download = (kind: "CSV" | "PDF") => {
    const rows = [
      ["Requisition", "Dept", "Asset", "Section", "Line", "Day", "Start", "End", "Status"],
      ...reqs.map((r) => [
        r.id,
        r.dept,
        r.assetId,
        r.section,
        r.line,
        r.slot ? DAYS[r.slot.day] ?? "" : "",
        r.slot ? fmt(r.slot.start) : "",
        r.slot ? fmt(r.slot.end) : "",
        r.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "CSV" ? "ir-abps-schedule.csv" : "ir-abps-schedule.pdf.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${kind} schedule export generated.`);
  };

  return (
    <>
      <PageHeader
        title="Analytics & Post-Block Operational Impact"
        subtitle="Asset uptime trends, coordinated-block efficiency and exportable schedules for divisional review."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => download("CSV")}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button onClick={() => download("PDF")}>
              <FileText className="size-4" /> Export PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Asset availability" value={`${kpi.availability}%`} />
        <Kpi label="Shadow savings" value={`${kpi.shadowHours} hrs`} />
        <Kpi label="Delay minutes saved" value={`${kpi.punctuality} min`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset uptime — Track / Signal / OHE</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={UPTIME_SERIES}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[92, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="track" stroke="var(--eng)" strokeWidth={2} />
                <Line type="monotone" dataKey="signal" stroke="var(--snt)" strokeWidth={2} />
                <Line type="monotone" dataKey="ohe" stroke="var(--trd)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Single-department vs coordinated shadow blocks
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BLOCK_MIX}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                />
                <Legend />
                <Bar dataKey="single" name="Single-dept blocks" fill="var(--warn)" radius={4} />
                <Bar
                  dataKey="coordinated"
                  name="Coordinated blocks"
                  fill="var(--joint)"
                  radius={4}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Post-block report — executed & planned blocks</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster</TableHead>
                <TableHead>Section / Line</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Downtime saved</TableHead>
                <TableHead>Expected delay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.map((p) => (
                <TableRow key={p.clusterId}>
                  <TableCell className="text-xs font-medium">{p.clusterId}</TableCell>
                  <TableCell className="text-xs">
                    {p.section} · {p.line}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.depts.map((d) => DEPT_LABEL[d]).join(", ")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {DAYS[p.day]} {fmt(p.start)}–{fmt(p.end)}
                  </TableCell>
                  <TableCell className="text-xs text-safe">{p.savedMinutes} min</TableCell>
                  <TableCell className="text-xs text-warn">{p.expectedDelay} min</TableCell>
                </TableRow>
              ))}
              {plan.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Run the optimization engine to generate the impact report.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
