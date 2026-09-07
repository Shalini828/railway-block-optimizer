import { useState, useMemo } from "react";
import { Search, Filter, History, Clock, FileText, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import type { HistoricalEmergency } from "@/lib/emergency-data";

interface EmergencyHistoryProps {
  historyData: HistoricalEmergency[];
}

export function EmergencyHistory({ historyData }: EmergencyHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"All" | "Critical" | "High" | "Resolved" | "Active">("All");

  const filteredHistory = useMemo(() => {
    return historyData.filter((item) => {
      // Filter tab
      if (filterTab === "Critical" && item.severity !== "CRITICAL") return false;
      if (filterTab === "High" && item.severity !== "HIGH") return false;
      if (filterTab === "Resolved" && item.status !== "Resolved") return false;
      if (filterTab === "Active" && item.status !== "Active") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          item.resolution.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [historyData, filterTab, searchQuery]);

  return (
    <div className="mb-8 rounded-xl border border-border/80 bg-card/70 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Emergency Incident History &amp; Audit Log
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historical log of past corridor emergency disconnections and AI-optimized re-blocking resolutions.
          </p>
        </div>

        <span className="text-xs font-mono text-muted-foreground sm:self-center">
          Showing {filteredHistory.length} of {historyData.length} records
        </span>
      </div>

      {/* Filters and Search toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {(["All", "Critical", "High", "Resolved", "Active"] as const).map((tab) => (
            <Button
              key={tab}
              variant={filterTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterTab(tab)}
              className={`h-7 text-xs ${
                filterTab === tab
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search incidents or sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background border-border"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/70 overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/40">
            <TableRow className="border-border/60">
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">INCIDENT ID</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">TYPE</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">SECTION</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">SEVERITY</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">START</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">DURATION</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">TRAIN IMPACT</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9">RESOLUTION</TableHead>
              <TableHead className="text-[10px] font-bold text-muted-foreground h-9 text-right">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-xs text-muted-foreground">
                  No matching emergency records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((item) => (
                <TableRow key={item.id} className="border-border/50 hover:bg-secondary/20 text-xs">
                  <TableCell className="font-mono font-bold text-foreground py-2.5">
                    {item.id}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground py-2.5">
                    {item.type}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2.5 max-w-[180px] truncate" title={item.section}>
                    {item.section}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold tracking-wider ${
                        item.severity === "CRITICAL"
                          ? "border-destructive/30 text-destructive bg-destructive/10"
                          : item.severity === "HIGH"
                          ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                          : "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
                      }`}
                    >
                      {item.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2.5 font-mono text-[11px]">
                    {item.start}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2.5 font-mono text-[11px]">
                    {item.duration}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-foreground py-2.5">
                    {item.trainImpact}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2.5 max-w-[180px] truncate" title={item.resolution}>
                    {item.resolution}
                  </TableCell>
                  <TableCell className="text-right py-2.5">
                    <Badge
                      variant={item.status === "Active" ? "destructive" : "outline"}
                      className={`text-[9px] font-bold ${
                        item.status === "Resolved" ? "border-safe/40 text-safe bg-safe/10" : ""
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
