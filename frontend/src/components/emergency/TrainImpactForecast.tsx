import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { TrainFront, Clock, Sparkles, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TrainImpactItem } from "@/lib/emergency-data";

interface TrainImpactForecastProps {
  trainData: TrainImpactItem[];
}

export function TrainImpactForecast({ trainData }: TrainImpactForecastProps) {
  // Chart formatted data
  const chartData = trainData.map(t => ({
    name: `${t.trainNo}`,
    trainName: t.name,
    "Current Delay (Unplanned)": t.currentDelay,
    "AI Re-Block Delay": t.aiReblockDelay,
  }));

  const measurableDelayCount = trainData.filter(t => t.aiReblockDelay >= 2).length;

  return (
    <div className="mb-8 rounded-xl border border-border/80 bg-card/70 p-5 sm:p-6 shadow-sm">
      {/* Header with KPI callouts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <TrainFront className="size-4 text-primary" />
              Train Impact Forecast
            </h3>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-semibold">
              HEADWAY SIMULATION
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Expected train punctuality delays before vs. after AI re-blocking across affected corridor sectors.
          </p>
        </div>

        {/* Highlight Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">ANALYZED</span>
            <span className="font-bold text-foreground">7 trains analysed</span>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
            <span className="block text-[10px] uppercase font-bold text-amber-400/80">MEASURABLE IMPACT</span>
            <span className="font-bold">{measurableDelayCount} projected to experience measurable delay</span>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="mt-5 grid lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 h-64 sm:h-72 w-full pt-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="size-3.5" /> Delay Comparison (Minutes): Unplanned Ad-Hoc vs. AI Re-Blocked
          </p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.36 0.025 260 / 0.4)" />
              <XAxis 
                dataKey="name" 
                stroke="oklch(0.72 0.02 255)" 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                stroke="oklch(0.72 0.02 255)" 
                fontSize={11} 
                tickLine={false} 
                unit="m" 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "oklch(0.235 0.022 260)", 
                  borderColor: "oklch(0.36 0.025 260)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff"
                }} 
              />
              <Legend 
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} 
              />
              <Bar 
                dataKey="Current Delay (Unplanned)" 
                fill="oklch(0.6 0.22 25)" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="AI Re-Block Delay" 
                fill="oklch(0.68 0.16 245)" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Table for Hackathon presentation */}
        <div className="lg:col-span-5 rounded-lg border border-border/70 bg-secondary/15 overflow-hidden">
          <div className="bg-secondary/40 p-3 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Analyzed Express &amp; Rajdhani Rakes
            </span>
            <span className="text-[10px] text-safe font-mono font-bold flex items-center gap-1">
              <TrendingDown className="size-3" /> 59m Total Saved
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold text-muted-foreground h-8">TRAIN</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground h-8 text-right">UNPLANNED</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground h-8 text-right">AI RE-BLOCK</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground h-8 text-right">SAVED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainData.map((t) => (
                  <TableRow key={t.trainNo} className="border-border/40 hover:bg-secondary/30">
                    <TableCell className="py-2 text-xs">
                      <span className="font-mono font-bold text-foreground block">{t.trainNo}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[140px] block" title={t.name}>
                        {t.name}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-xs font-mono text-destructive font-bold text-right">
                      +{t.currentDelay} min
                    </TableCell>
                    <TableCell className="py-2 text-xs font-mono text-primary font-bold text-right">
                      +{t.aiReblockDelay} min
                    </TableCell>
                    <TableCell className="py-2 text-xs font-mono text-safe font-bold text-right">
                      -{t.savedDelay} min
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
