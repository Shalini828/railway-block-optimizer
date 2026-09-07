import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileText, Siren, BarChart3, Activity, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { EmergencyResponsePage } from "./emergency";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Impact Analytics & Emergency Command | IR-ABPS" },
      {
        name: "description",
        content:
          "AI-assisted emergency re-blocking command center, asset uptime vs downtime, coordinated-block efficiency metrics, and schedule exports.",
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

const DEFAULT_ANALYTICS: AnalyticsData = {
  asset_availability_percent: 94.2,
  total_assets: 184,
  operational_assets: 173,
  scheduled_blocks: 28,
  total_block_hours: 42.5,
  train_delay_impact_minutes: 8,
  average_optimization_score: 93.6,
  single_department_blocks: 6,
  coordinated_blocks: 22,
  total_maintenance_tasks: 45,
  pending_maintenance_tasks: 4,
  completed_maintenance_tasks: 38,
  critical_maintenance_tasks: 3,
  department_availability: [
    { department: "Track (TMS)", total_assets: 68, operational_assets: 64, availability_percent: 94.1 },
    { department: "Signaling (SMMS)", total_assets: 58, operational_assets: 56, availability_percent: 96.5 },
    { department: "Traction (TDMS)", total_assets: 58, operational_assets: 53, availability_percent: 91.4 },
  ],
  post_block_report: [
    {
      block_id: "BLK-CNB-001",
      corridor_name: "CNB-PRYJ High Density Corridor",
      source_station: "CNB",
      destination_station: "ALD",
      block_date: "Today",
      start_time: "18:20",
      end_time: "20:00",
      duration_min: 100,
      train_impact_score: 8,
      optimization_score: 95,
      block_status: "Scheduled / Protected",
      departments: "TMS + SMMS + TDMS",
    },
    {
      block_id: "BLK-NDLS-042",
      corridor_name: "NDLS-GZB Corridor",
      source_station: "NDLS",
      destination_station: "GZB",
      block_date: "Yesterday",
      start_time: "11:00",
      end_time: "13:30",
      duration_min: 150,
      train_impact_score: 12,
      optimization_score: 91,
      block_status: "Completed",
      departments: "TMS + TDMS",
    },
    {
      block_id: "BLK-ALD-019",
      corridor_name: "Prayagraj West Approaches",
      source_station: "ALD",
      destination_station: "DDU",
      block_date: "04 Sep",
      start_time: "02:00",
      end_time: "05:00",
      duration_min: 180,
      train_impact_score: 5,
      optimization_score: 96,
      block_status: "Completed",
      departments: "TMS + SMMS",
    },
  ],
};

function AnalyticsPage() {
  const { reqs } = useAbps();
  const [viewMode, setViewMode] = useState<"emergency" | "post-block">("emergency");
  const [analytics, setAnalytics] = useState<AnalyticsData>(DEFAULT_ANALYTICS);

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
        console.warn("Analytics API unavailable, using simulated decision-support metrics:", error);
        setAnalytics(DEFAULT_ANALYTICS);
      });
  }, []);

  const blockMixData = [
    {
      type: "Blocks",
      single: analytics.single_department_blocks,
      coordinated: analytics.coordinated_blocks,
    },
  ];

  const departmentAvailability = analytics.department_availability.map((item) => ({
    department: item.department,
    availability: item.availability_percent,
  }));

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
      {/* Top Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === "emergency" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("emergency")}
            className={`h-9 gap-2 text-xs font-bold tracking-tight shadow-sm transition-all ${
              viewMode === "emergency"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/40 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                : "border-border hover:bg-secondary text-foreground"
            }`}
          >
            <Siren className="size-4 animate-pulse text-destructive-foreground" />
            <span>Emergency Response &amp; Re-Blocking Command Center</span>
            <Badge className="ml-1 bg-destructive-foreground/20 text-destructive-foreground text-[9px] uppercase">
              LIVE (SOS-CNB-001)
            </Badge>
          </Button>

          <Button
            variant={viewMode === "post-block" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("post-block")}
            className={`h-9 gap-2 text-xs font-semibold border-border ${
              viewMode === "post-block"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="size-4" />
            <span>Post-Block Asset &amp; Downtime Analytics</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => download("CSV")} className="text-xs h-8">
            <Download className="mr-1 size-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => download("PDF")} className="text-xs h-8">
            <FileText className="mr-1 size-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {/* VIEW MODE 1: EMERGENCY COMMAND CENTER */}
      {viewMode === "emergency" ? (
        <EmergencyResponsePage />
      ) : (
        /* VIEW MODE 2: POST-BLOCK ASSET & DOWNTIME ANALYTICS */
        <div className="space-y-6">
          <PageHeader
            title="Analytics & Post-Block Operational Impact"
            subtitle="Asset uptime trends, coordinated-block efficiency and exportable schedules for divisional review."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi label="Asset availability" value={`${analytics.asset_availability_percent}%`} />
            <Kpi label="Total block hours" value={`${analytics.total_block_hours} hrs`} />
            <Kpi label="Train delay impact" value={`${analytics.train_delay_impact_minutes} min`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Department availability (%)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentAvailability} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.36 0.025 260 / 0.4)" />
                    <XAxis dataKey="department" stroke="oklch(0.72 0.02 255)" fontSize={12} tickLine={false} />
                    <YAxis stroke="oklch(0.72 0.02 255)" fontSize={12} domain={[80, 100]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.235 0.022 260)", borderColor: "oklch(0.36 0.025 260)" }} />
                    <Bar dataKey="availability" fill="oklch(0.68 0.16 245)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Block Execution Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={blockMixData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.36 0.025 260 / 0.4)" />
                    <XAxis dataKey="type" stroke="oklch(0.72 0.02 255)" fontSize={12} tickLine={false} />
                    <YAxis stroke="oklch(0.72 0.02 255)" fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "oklch(0.235 0.022 260)", borderColor: "oklch(0.36 0.025 260)" }} />
                    <Legend />
                    <Bar dataKey="single" name="Single-dept" fill="oklch(0.78 0.16 78)" stackId="a" />
                    <Bar dataKey="coordinated" name="Coordinated" fill="oklch(0.68 0.19 300)" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Post-Block Corridor History</CardTitle>
            </CardHeader>
            <CardContent>
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
                  {analytics.post_block_report.map((p) => (
                    <TableRow key={p.block_id}>
                      <TableCell className="text-xs font-medium font-mono">{p.block_id}</TableCell>
                      <TableCell className="text-xs">{p.source_station} → {p.destination_station}</TableCell>
                      <TableCell className="text-xs">{p.departments}</TableCell>
                      <TableCell className="text-xs">{p.block_date} {p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)}</TableCell>
                      <TableCell className="text-xs">{p.duration_min} min</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-safe">{p.train_impact_score} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
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
