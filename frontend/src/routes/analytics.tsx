import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { useAbps } from "@/context/AbpsContext";
import { DAYS, DEPT_LABEL, fmt } from "@/lib/abps-data";
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
type AnalyticsData = {
  asset_availability_percent: number;
  total_assets: number;
  operational_assets: number;
  scheduled_blocks: number;
  total_block_hours: number;
  train_delay_impact_minutes: number;
  average_optimization_score: number;
  single_department_blocks: number;
  coordinated_blocks: number;
  total_maintenance_tasks: number;
  pending_maintenance_tasks: number;
  completed_maintenance_tasks: number;
  critical_maintenance_tasks: number;

    department_availability: {
    department: string;
    total_assets: number;
    operational_assets: number;
    availability_percent: number;
  }[];

    post_block_report: {
    block_id: string;
    corridor_name: string;
    source_station: string;
    destination_station: string;
    block_date: string;
    start_time: string;
    end_time: string;
    duration_min: number;
    train_impact_score: number;
    optimization_score: number;
    block_status: string;
    departments: string;
  }[];
};
function AnalyticsPage() {
  const { reqs } = useAbps();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/analytics/")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch analytics");
        }
        return res.json();
      })
      .then((data: AnalyticsData) => {
        setAnalytics(data);
      })
      .catch((error) => {
        console.error("Analytics API error:", error);
        toast.error("Could not load analytics.");
      });
  }, []);
     const blockMixData = analytics
    ? [
        {
          type: "Blocks",
          single: analytics.single_department_blocks,
          coordinated: analytics.coordinated_blocks,
        },
      ]
    : [];
    const departmentAvailability = analytics
  ? analytics.department_availability.map((item) => ({
      department: item.department,
      availability: item.availability_percent,
    }))
  : [];

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
  <Kpi
    label="Asset availability"
    value={
      analytics
        ? `${analytics.asset_availability_percent}%`
        : "Loading..."
    }
  />

  <Kpi
    label="Total block hours"
    value={
      analytics
        ? `${analytics.total_block_hours} hrs`
        : "Loading..."
    }
  />

  <Kpi
    label="Train delay impact"
    value={
      analytics
        ? `${analytics.train_delay_impact_minutes} min`
        : "Loading..."
    }
  />
</div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
  Asset availability by department
</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={departmentAvailability}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="department" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                />
                <Legend />
                <Line
  type="monotone"
  dataKey="availability"
  name="Asset availability"
  stroke="var(--primary)"
  strokeWidth={2}
/>
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
              <BarChart data={blockMixData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="type" stroke="var(--muted-foreground)" fontSize={12} />
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
                <TableHead>Block ID</TableHead>
<TableHead>Route</TableHead>
<TableHead>Departments</TableHead>
<TableHead>Window</TableHead>
<TableHead>Duration</TableHead>
<TableHead>Train Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
  {analytics?.post_block_report.map((p) => (
    <TableRow key={p.block_id}>
      <TableCell className="text-xs font-medium">
        {p.block_id}
      </TableCell>

      <TableCell className="text-xs">
        {p.source_station} → {p.destination_station}
      </TableCell>

      <TableCell className="text-xs">
        {p.departments}
      </TableCell>

      <TableCell className="text-xs">
        {p.block_date} {p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)}
      </TableCell>

      <TableCell className="text-xs">
        {p.duration_min} min
      </TableCell>

      <TableCell className="text-xs text-warn">
        {p.train_impact_score}
      </TableCell>
    </TableRow>
  ))}

  {(!analytics || analytics.post_block_report.length === 0) && (
    <TableRow>
      <TableCell
        colSpan={6}
        className="text-center text-sm text-muted-foreground"
      >
        Loading post-block report...
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
