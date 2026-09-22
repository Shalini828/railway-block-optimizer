import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  TrainFront,
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Edit2,
  Power,
  Search,
  Filter,
  ArrowRight,
  Info,
  CalendarRange,
  Zap,
  Activity,
  Star,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Can } from "@/components/Can";
import { useLanguage } from "@/context/LanguageContext";
import { useAbps } from "@/context/AbpsContext";

export const Route = createFileRoute("/special-trains")({
  head: () => ({
    meta: [
      { title: "Special Train Services & Festival Paths | IR-ABPS" },
      {
        name: "description",
        content:
          "First-class Indian Railways Special, Festival, Military & Seasonal train path management and maintenance conflict coordination.",
      },
    ],
  }),
  component: SpecialTrainsPage,
});

interface SpecialTrainItem {
  special_train_id: string;
  train_number: string;
  train_name: string;
  special_type: string;
  corridor_id: string;
  service_date: string;
  arrival_time: string | null;
  departure_time: string | null;
  direction: string | null;
  operational_priority: number;
  expected_passengers: number;
  reason: string | null;
  active: boolean;
  origin_station: string | null;
  destination_station: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface OverlappingBlock {
  block_id: string;
  corridor_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  overlap_minutes: number;
  utilization_percent: number;
  train_impact_score: number;
  optimization_score: number;
}

interface OverlappingRequest {
  request_id: string;
  task_id: string;
  team_id: string;
  corridor_id: string;
  requested_date: string;
  requested_start: string;
  requested_end: string;
  requested_duration_min: number;
  overlap_minutes: number;
}

interface RecommendedShift {
  block_id: string;
  shift_offset_min: number;
  proposed_start: string;
  proposed_end: string;
  expected_train_conflicts: number;
  rationale: string;
}

interface ImpactData {
  special_train_id: string;
  train_number: string;
  train_name: string;
  special_type: string;
  corridor_id: string;
  service_date: string;
  arrival_time: string;
  departure_time: string;
  operational_priority: number;
  expected_passengers: number;
  active: boolean;
  has_conflicts: boolean;
  overlapping_blocks_count: number;
  overlapping_blocks: OverlappingBlock[];
  overlapping_requests_count: number;
  overlapping_requests: OverlappingRequest[];
  recommended_shift: RecommendedShift | null;
  workflow_note: string;
}

const CORRIDORS = [
  { id: "C01", name: "C01 (NDLS - GZB)" },
  { id: "C02", name: "C02 (GZB - CNB)" },
  { id: "C03", name: "C03 (CNB - PRYJ)" },
  { id: "C04", name: "C04 (PRYJ - DDU)" },
  { id: "C05", name: "C05" },
  { id: "C06", name: "C06" },
  { id: "C07", name: "C07" },
  { id: "C08", name: "C08" },
];

const SPECIAL_TYPES = [
  { value: "FESTIVAL", label: "Festival Special (त्योहार विशेष)", color: "bg-amber-600 text-white" },
  { value: "HOLIDAY", label: "Holiday Special (अवकाश विशेष)", color: "bg-blue-600 text-white" },
  { value: "EVENT", label: "Special Event / Mela (मेला / आयोजन)", color: "bg-purple-600 text-white" },
  { value: "MILITARY", label: "Military Movement (सैन्य परिचालन)", color: "bg-emerald-700 text-white" },
  { value: "RELIEF", label: "Disaster Relief (राहत विशेष)", color: "bg-red-600 text-white" },
  { value: "SEASONAL", label: "Seasonal Rush (मौसमी भीड़)", color: "bg-teal-600 text-white" },
  { value: "OTHER", label: "Other Special (अन्य विशेष)", color: "bg-slate-600 text-white" },
];

function getSpecialTypeBadge(type: string) {
  const match = SPECIAL_TYPES.find((t) => t.value === type.toUpperCase());
  const color = match?.color || "bg-purple-600 text-white";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${color}`}
    >
      <Star className="size-3 fill-current" />
      {type}
    </span>
  );
}

function SpecialTrainsPage() {
  const { t } = useLanguage();
  const { user } = useAbps();

  const [trains, setTrains] = useState<SpecialTrainItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCorridor, setSelectedCorridor] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTrain, setEditingTrain] = useState<SpecialTrainItem | null>(null);
  const [impactTrainId, setImpactTrainId] = useState<string | null>(null);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  // Create Form State
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("FESTIVAL");
  const [formCorridor, setFormCorridor] = useState("C01");
  const [isRange, setIsRange] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [arrTime, setArrTime] = useState("08:00");
  const [depTime, setDepTime] = useState("10:30");
  const [direction, setDirection] = useState("UP");
  const [priority, setPriority] = useState(4);
  const [passengers, setPassengers] = useState(1200);
  const [originStation, setOriginStation] = useState("");
  const [destStation, setDestStation] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch special trains
  const fetchTrains = async () => {
  try {
    setLoading(true);

    const params = new URLSearchParams();

    if (selectedCorridor !== "ALL") {
      params.append("corridor_id", selectedCorridor);
    }

    if (dateFilter) {
      params.append("from", dateFilter);
      params.append("to", dateFilter);
    }

    if (statusFilter === "ACTIVE") {
      params.append("active", "true");
    }

    if (statusFilter === "INACTIVE") {
      params.append("active", "false");
    }

    const qs = params.toString();
    const endpoint = qs ? `/special-trains/?${qs}` : "/special-trains/";

    const response = await apiFetch(endpoint);

    if (!response.ok) {
      throw new Error(
        `Failed to load special trains (${response.status})`
      );
    }

    const res = await response.json();

    if (res && res.special_trains) {
      setTrains(res.special_trains);
    } else {
      setTrains([]);
    }

  } catch (err: any) {
    toast.error(
      err.message ||
      t(
        "Failed to load special trains",
        "विशेष रेलगाड़ी सूची लोड करने में त्रुटि"
      )
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchTrains();
  }, [selectedCorridor, dateFilter, statusFilter]);

  // Filtered in-memory list
  const displayedTrains = useMemo(() => {
    return trains.filter((item) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.train_number.toLowerCase().includes(q) ||
        item.train_name.toLowerCase().includes(q) ||
        item.special_train_id.toLowerCase().includes(q) ||
        item.corridor_id.toLowerCase().includes(q) ||
        item.special_type.toLowerCase().includes(q)
      );
    });
  }, [trains, searchTerm]);

  // Open Impact Sheet
  const openImpactSheet = async (id: string) => {
    setImpactTrainId(id);
    setImpactData(null);
    setImpactLoading(true);
    try {
      const response = await apiFetch(`/special-trains/${id}/impact`);

if (!response.ok) {
  throw new Error(`Impact analysis failed (${response.status})`);
}

const data = await response.json();
setImpactData(data);
    } catch (err: any) {
      toast.error(t("Failed to calculate special train impact", "विशेष रेलगाड़ी प्रभाव गणना विफल"));
    } finally {
      setImpactLoading(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (item: SpecialTrainItem) => {
    const newStatus = !item.active;
    try {
      await apiFetch(`/special-trains/${item.special_train_id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: newStatus }),
      });
      toast.success(
        newStatus
          ? t(`Special train ${item.train_number} activated`, `विशेष रेलगाड़ी ${item.train_number} सक्रिय की गई`)
          : t(`Special train ${item.train_number} deactivated`, `विशेष रेलगाड़ी ${item.train_number} निष्क्रिय की गई`)
      );
      setTrains((prev) =>
        prev.map((t) => (t.special_train_id === item.special_train_id ? { ...t, active: newStatus } : t))
      );
    } catch (err: any) {
      toast.error(err.message || t("Status update failed", "स्थिति अद्यतन विफल"));
    }
  };

  // Submit Create / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTrain) {
        // PUT
        await apiFetch(`/special-trains/${editingTrain.special_train_id}`, {
          method: "PUT",
          body: JSON.stringify({
            train_number: formNumber,
            train_name: formName,
            special_type: formType,
            corridor_id: formCorridor,
            service_date: formDate,
            arrival_time: arrTime.length === 5 ? `${arrTime}:00` : arrTime,
            departure_time: depTime.length === 5 ? `${depTime}:00` : depTime,
            direction,
            operational_priority: Number(priority),
            expected_passengers: Number(passengers),
            origin_station: originStation || null,
            destination_station: destStation || null,
            reason: reason || null,
          }),
        });
        toast.success(t("Special train updated successfully", "विशेष रेलगाड़ी सफलतापूर्वक अद्यतन की गई"));
      } else {
        // POST
        const payload: any = {
          train_number: formNumber,
          train_name: formName,
          special_type: formType,
          corridor_id: formCorridor,
          arrival_time: arrTime.length === 5 ? `${arrTime}:00` : arrTime,
          departure_time: depTime.length === 5 ? `${depTime}:00` : depTime,
          direction,
          operational_priority: Number(priority),
          expected_passengers: Number(passengers),
          origin_station: originStation || null,
          destination_station: destStation || null,
          reason: reason || null,
          active: true,
        };
        if (isRange) {
          payload.service_date_from = fromDate;
          payload.service_date_to = toDate;
        } else {
          payload.service_date = formDate;
        }
        const response = await apiFetch("/special-trains/", {
  method: "POST",
  body: JSON.stringify(payload),
});

if (!response.ok) {
  throw new Error(`Failed to create special train (${response.status})`);
}

const res = await response.json();

toast.success(
  t(
    `Successfully created ${res.created_count} special train service(s)`,
    `${res.created_count} विशेष रेलगाड़ी सेवाएं सफलतापूर्वक बनाई गईं`
  )
);
      }
      setCreateDialogOpen(false);
      setEditingTrain(null);
      resetForm();
      fetchTrains();
    } catch (err: any) {
      toast.error(err.message || t("Operation failed", "प्रक्रिया विफल"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormNumber("");
    setFormName("");
    setFormType("FESTIVAL");
    setFormCorridor("C01");
    setIsRange(false);
    setFormDate("");
    setFromDate("");
    setToDate("");
    setArrTime("08:00");
    setDepTime("10:30");
    setDirection("UP");
    setPriority(4);
    setPassengers(1200);
    setOriginStation("");
    setDestStation("");
    setReason("");
  };

  const openEditModal = (item: SpecialTrainItem) => {
    setEditingTrain(item);
    setFormNumber(item.train_number);
    setFormName(item.train_name);
    setFormType(item.special_type);
    setFormCorridor(item.corridor_id);
    setIsRange(false);
    setFormDate(item.service_date);
    setArrTime(item.arrival_time ? item.arrival_time.slice(0, 5) : "08:00");
    setDepTime(item.departure_time ? item.departure_time.slice(0, 5) : "10:30");
    setDirection(item.direction || "UP");
    setPriority(item.operational_priority);
    setPassengers(item.expected_passengers);
    setOriginStation(item.origin_station || "");
    setDestStation(item.destination_station || "");
    setReason(item.reason || "");
    setCreateDialogOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <PageHeader
        title={t("Special Train Services & Festival Path Management", "विशेष रेलगाड़ी सेवाएं एवं उत्सव पथ प्रबंधन")}
        subtitle={t(
          "First-class Indian Railways Special Train scheduling, constraint profile assignment, and autonomous corridor conflict analysis.",
          "भारतीय रेल विशेष रेलगाड़ी समय-सारिणी, प्रतिबंध प्रोफाइल निर्धारण एवं स्वायत्त कॉरिडोर विवाद विश्लेषण।"
        )}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTrains}
              disabled={loading}
              className="h-8 text-xs font-semibold"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              {t("Refresh", "ताज़ा करें")}
            </Button>
            <Can
              perm="special_trains.manage"
              fallback="disable"
              reason={t(
                "Special train management is restricted to Control Office and Administration.",
                "विशेष रेलगाड़ी प्रबंधन नियंत्रण कार्यालय एवं प्रशासन तक सीमित है।"
              )}
            >
              <Button
                size="sm"
                onClick={() => {
                  setEditingTrain(null);
                  resetForm();
                  setCreateDialogOpen(true);
                }}
                className="bg-[#003366] hover:bg-[#002244] text-white font-bold h-8 text-xs rounded-[2px]"
              >
                <Plus className="size-3.5 mr-1.5" />
                {t("Add Special Train", "विशेष रेलगाड़ी जोड़ें")}
              </Button>
            </Can>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-[2px] border-border/80 shadow-xs bg-card">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("Total Services", "कुल विशेष रेल")}
              </p>
              <p className="text-2xl font-black text-[#003366] dark:text-[#60a5fa] mt-0.5">
                {trains.length}
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-[#003366] dark:text-[#60a5fa] rounded-[2px]">
              <TrainFront className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2px] border-border/80 shadow-xs bg-card">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("Active Paths", "सक्रिय पथ")}
              </p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                {trains.filter((t) => t.active).length}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-[2px]">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2px] border-border/80 shadow-xs bg-card">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("High Priority (4-5)", "उच्च प्राथमिकता (4-5)")}
              </p>
              <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-0.5">
                {trains.filter((t) => t.operational_priority >= 4).length}
              </p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded-[2px]">
              <Star className="size-5 fill-current" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2px] border-border/80 shadow-xs bg-card">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("Expected Pax Volume", "अपेक्षित यात्री संख्या")}
              </p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
                {trains.reduce((acc, curr) => acc + (curr.expected_passengers || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-[2px]">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="rounded-[2px] border-border/80 shadow-xs bg-card">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("Search number, name, ID...", "गाड़ी संख्या, नाम, पहचान...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-[2px]"
                />
              </div>

              {/* Corridor select */}
              <Select value={selectedCorridor} onValueChange={setSelectedCorridor}>
                <SelectTrigger className="w-full sm:w-44 h-8 text-xs rounded-[2px]">
                  <SelectValue placeholder={t("All Corridors", "सभी कॉरिडोर")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("All Corridors", "सभी कॉरिडोर")}</SelectItem>
                  {CORRIDORS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status select */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-8 text-xs rounded-[2px]">
                  <SelectValue placeholder={t("All Status", "सभी स्थिति")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("All Status", "सभी स्थिति")}</SelectItem>
                  <SelectItem value="ACTIVE">{t("Active Only", "केवल सक्रिय")}</SelectItem>
                  <SelectItem value="INACTIVE">{t("Inactive Only", "केवल निष्क्रिय")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-36 h-8 text-xs rounded-[2px]"
              />

              {dateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter("")}
                  className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {t("Clear Date", "दिनांक हटाएं")}
                </Button>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground font-mono self-end md:self-center">
              {displayedTrains.length} {t("service(s) displayed", "सेवाएं प्रदर्शित")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Special Trains Data Table */}
      <Card className="rounded-[2px] border-border/80 shadow-xs bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-3">{t("Train & Identity", "रेलगाड़ी एवं पहचान")}</th>
                <th className="p-3">{t("Type & Class", "प्रकार एवं श्रेणी")}</th>
                <th className="p-3">{t("Corridor & Route", "कॉरिडोर एवं मार्ग")}</th>
                <th className="p-3">{t("Service Date", "सेवा दिनांक")}</th>
                <th className="p-3">{t("Path Timing", "पथ समय")}</th>
                <th className="p-3 text-center">{t("Priority", "प्राथमिकता")}</th>
                <th className="p-3 text-right">{t("Pax Volume", "यात्री संख्या")}</th>
                <th className="p-3 text-center">{t("Status", "स्थिति")}</th>
                <th className="p-3 text-right">{t("Actions", "कार्यवाही")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-[#003366]" />
                    {t("Loading special trains database...", "विशेष रेलगाड़ी डेटा लोड हो रहा है...")}
                  </td>
                </tr>
              ) : displayedTrains.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <Sparkles className="size-6 text-muted-foreground/50 mx-auto mb-2" />
                    {t("No special train services found for the selected criteria.", "चयनित मानदंडों के लिए कोई विशेष रेलगाड़ी सेवा नहीं मिली।")}
                  </td>
                </tr>
              ) : (
                displayedTrains.map((item) => (
                  <tr
                    key={item.special_train_id}
                    className={`hover:bg-muted/30 transition-colors ${!item.active ? "opacity-60 bg-muted/10" : ""}`}
                  >
                    {/* Train Info */}
                    <td className="p-3 font-mono">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="bg-[#003366]/10 dark:bg-blue-900/30 text-[#003366] dark:text-blue-300 px-1.5 py-0.5 rounded text-[11px]">
                          {item.train_number}
                        </span>
                        <span className="font-sans font-semibold text-xs text-foreground truncate max-w-[180px]">
                          {item.train_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span>{item.special_train_id}</span>
                        {item.direction && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                            {item.direction}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Special Type */}
                    <td className="p-3">{getSpecialTypeBadge(item.special_type)}</td>

                    {/* Corridor */}
                    <td className="p-3">
                      <div className="font-semibold text-foreground">{item.corridor_id}</div>
                      {(item.origin_station || item.destination_station) && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {item.origin_station || "—"} → {item.destination_station || "—"}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-3 font-mono text-foreground font-medium">
                      {item.service_date}
                    </td>

                    {/* Path Timing */}
                    <td className="p-3 font-mono">
                      <div className="flex items-center gap-1 text-foreground">
                        <Clock className="size-3 text-muted-foreground" />
                        <span>{item.arrival_time ? item.arrival_time.slice(0, 5) : "--:--"}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{item.departure_time ? item.departure_time.slice(0, 5) : "--:--"}</span>
                      </div>
                    </td>

                    {/* Operational Priority */}
                    <td className="p-3 text-center">
                      <Badge
                        variant={item.operational_priority >= 4 ? "destructive" : "secondary"}
                        className="text-[11px] font-black h-5 px-2"
                      >
                        P{item.operational_priority}
                      </Badge>
                    </td>

                    {/* Passengers */}
                    <td className="p-3 text-right font-mono font-medium">
                      {item.expected_passengers ? item.expected_passengers.toLocaleString() : "0"}
                    </td>

                    {/* Active Toggle */}
                    <td className="p-3 text-center">
                      <Can
                        perm="special_trains.manage"
                        fallback="disable"
                        reason={t("Only Control and Admin can toggle active status", "केवल नियंत्रण और व्यवस्थापक स्थिति बदल सकते हैं")}
                      >
                        <Switch
                          checked={item.active}
                          onCheckedChange={() => handleToggleActive(item)}
                          className="data-[state=checked]:bg-emerald-600 scale-90"
                        />
                      </Can>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openImpactSheet(item.special_train_id)}
                          className="h-7 px-2 text-[11px] font-semibold border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                        >
                          <Zap className="size-3 mr-1 text-purple-600" />
                          {t("Impact", "प्रभाव")}
                        </Button>

                        <Can
                          perm="special_trains.manage"
                          fallback="disable"
                          reason={t("Editing special trains requires special_trains.manage", "संपादित करने के लिए प्रबंधन अधिकार आवश्यक हैं")}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(item)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Impact Review Sheet */}
      <Sheet open={!!impactTrainId} onOpenChange={(open) => !open && setImpactTrainId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-[2px]">
                <Zap className="size-5" />
              </span>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  {t("Special Train Impact Analysis", "विशेष रेलगाड़ी प्रभाव विश्लेषण")}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {t(
                    "Autonomous conflict evaluation against approved maintenance blocks and pending requisitions.",
                    "स्वीकृत अनुरक्षण ब्लॉक एवं लंबित मांग पत्रों के विरुद्ध स्वायत्त विवाद मूल्यांकन।"
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {impactLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-[#003366]" />
              <p className="text-xs">{t("Analyzing corridor schedule collisions...", "कॉरिडोर अनुसूची टकराव का विश्लेषण जारी...")}</p>
            </div>
          ) : impactData ? (
            <div className="space-y-4 pt-4 text-xs">
              {/* Special Train Card */}
              <div className="p-3 bg-muted/40 rounded-[2px] border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#003366] dark:text-blue-400">
                      {impactData.train_number}
                    </span>
                    <span className="font-semibold text-foreground">{impactData.train_name}</span>
                  </div>
                  {getSpecialTypeBadge(impactData.special_type)}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2.5 text-muted-foreground font-mono text-[11px]">
                  <div>
                    {t("Corridor", "कॉरिडोर")}: <strong className="text-foreground">{impactData.corridor_id}</strong>
                  </div>
                  <div>
                    {t("Date", "दिनांक")}: <strong className="text-foreground">{impactData.service_date}</strong>
                  </div>
                  <div>
                    {t("Timing", "समय")}:{" "}
                    <strong className="text-foreground">
                      {impactData.arrival_time?.slice(0, 5)} - {impactData.departure_time?.slice(0, 5)}
                    </strong>
                  </div>
                  <div>
                    {t("Priority", "प्राथमिकता")}:{" "}
                    <strong className="text-purple-700 dark:text-purple-400">P{impactData.operational_priority}</strong>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {impactData.has_conflicts ? (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-[2px] flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-900 dark:text-red-300 text-xs">
                      {t("Direct Schedule Overlap Detected", "सीधा अनुसूची टकराव पाया गया")}
                    </h4>
                    <p className="text-[11px] text-red-800 dark:text-red-400 mt-0.5">
                      {t(
                        `Special train conflicts with ${impactData.overlapping_blocks_count} maintenance block(s) and ${impactData.overlapping_requests_count} pending request(s).`,
                        `विशेष रेलगाड़ी का ${impactData.overlapping_blocks_count} अनुरक्षण ब्लॉक(ओं) एवं ${impactData.overlapping_requests_count} मांग पत्र(ों) से टकराव है।`
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-[2px] flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                      {t("Clean Corridor Path Confirmed", "स्पष्ट कॉरिडोर पथ की पुष्टि")}
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                      {t(
                        "No overlapping maintenance blocks or pending requisitions detected on this corridor date.",
                        "इस कॉरिडोर दिनांक पर कोई अतिव्यापी अनुरक्षण ब्लॉक या मांग पत्र नहीं है।"
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Overlapping Optimized Blocks */}
              {impactData.overlapping_blocks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                    {t("Overlapping Optimized Blocks", "अतिव्यापी अनुकूलित ब्लॉक")} ({impactData.overlapping_blocks.length})
                  </h4>
                  <div className="space-y-1.5">
                    {impactData.overlapping_blocks.map((b) => (
                      <div
                        key={b.block_id}
                        className="p-2.5 bg-card border border-border rounded-[2px] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-foreground text-xs">{b.block_id}</div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)} ({b.duration_min} min)
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            {b.overlap_minutes} min conflict
                          </Badge>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            Util: {b.utilization_percent}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overlapping Pending Requests */}
              {impactData.overlapping_requests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                    {t("Overlapping Requisitions", "अतिव्यापी मांग पत्र")} ({impactData.overlapping_requests.length})
                  </h4>
                  <div className="space-y-1.5">
                    {impactData.overlapping_requests.map((r) => (
                      <div
                        key={r.request_id}
                        className="p-2.5 bg-card border border-border rounded-[2px] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-foreground text-xs">
                            {r.request_id} ({r.team_id})
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {r.requested_start?.slice(0, 5)} - {r.requested_end?.slice(0, 5)}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-400">
                          {r.overlap_minutes} min overlap
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Shift Card */}
              {impactData.recommended_shift && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-[2px] space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300 font-bold text-xs">
                    <Sparkles className="size-4 text-purple-600" />
                    <span>{t("AI Recommended Window Shift", "एआई अनुशंसित विंडो विस्थापन")}</span>
                  </div>
                  <p className="text-[11px] text-purple-800 dark:text-purple-400">
                    {impactData.recommended_shift.rationale}
                  </p>
                  <div className="flex items-center gap-2 font-mono text-[11px] bg-card p-2 rounded-[2px] border border-purple-200 dark:border-purple-900">
                    <span className="text-muted-foreground">{t("Proposed Window", "प्रस्तावित विंडो")}:</span>
                    <strong className="text-purple-700 dark:text-purple-300">
                      {impactData.recommended_shift.proposed_start} - {impactData.recommended_shift.proposed_end}
                    </strong>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      Shift: {impactData.recommended_shift.shift_offset_min > 0 ? `+${impactData.recommended_shift.shift_offset_min}` : impactData.recommended_shift.shift_offset_min} min
                    </Badge>
                  </div>
                </div>
              )}

              {/* Human in the loop notice */}
              <div className="p-2.5 bg-muted/60 border border-border rounded-[2px] text-[11px] text-muted-foreground flex items-center gap-2">
                <Info className="size-4 shrink-0 text-[#003366] dark:text-blue-400" />
                <span>{impactData.workflow_note}</span>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#003366] dark:text-blue-400 flex items-center gap-2">
                <Sparkles className="size-4 text-purple-600" />
                {editingTrain
                  ? t("Edit Special Train Service", "विशेष रेलगाड़ी सेवा संपादित करें")
                  : t("Register New Special Train Service", "नई विशेष रेलगाड़ी सेवा पंजीकृत करें")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t(
                  "Configure special train path, constraint profile, and expected passenger loading for IR-ABPS optimization.",
                  "आईआर-एबीपीएस अनुकूलन हेतु विशेष रेलगाड़ी पथ, प्रतिबंध प्रोफाइल एवं अपेक्षित यात्री भार निर्धारित करें।"
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              {/* Train Number & Name */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Train Number", "गाड़ी संख्या")} *</Label>
                  <Input
                    placeholder="e.g. 02424"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Train Name", "गाड़ी का नाम")} *</Label>
                  <Input
                    placeholder="e.g. Diwali Superfast Special"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Special Type & Corridor */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Special Type", "विशेष प्रकार")} *</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIAL_TYPES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Corridor", "कॉरिडोर")} *</Label>
                  <Select value={formCorridor} onValueChange={setFormCorridor}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRIDORS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.id} ({c.name.split(" ")[0]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Mode Toggle (Only when creating) */}
              {!editingTrain && (
                <div className="flex items-center justify-between p-2 bg-muted/40 rounded-[2px] border border-border">
                  <span className="text-[11px] font-semibold text-foreground">
                    {t("Multi-Day Date Range Expansion", "बहु-दिवसीय तिथि विस्तार")}
                  </span>
                  <Switch checked={isRange} onCheckedChange={setIsRange} className="scale-75" />
                </div>
              )}

              {/* Date Input */}
              {isRange && !editingTrain ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">{t("Start Date", "प्रारंभ दिनांक")} *</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">{t("End Date", "समापन दिनांक")} *</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Service Date", "सेवा दिनांक")} *</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {/* Arrival Time, Departure Time, Direction */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Arrival Time", "आगमन समय")} *</Label>
                  <Input
                    type="time"
                    value={arrTime}
                    onChange={(e) => setArrTime(e.target.value)}
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Departure Time", "प्रस्थान समय")} *</Label>
                  <Input
                    type="time"
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Direction", "दिशा")} *</Label>
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UP">UP</SelectItem>
                      <SelectItem value="DOWN">DOWN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority & Passengers */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Operational Priority (1-5)", "प्राथमिकता (1-5)")}</Label>
                  <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Priority 5 (CRITICAL / Express Superfast)</SelectItem>
                      <SelectItem value="4">Priority 4 (HIGH / Special Passenger)</SelectItem>
                      <SelectItem value="3">Priority 3 (MEDIUM / Standard Special)</SelectItem>
                      <SelectItem value="2">Priority 2 (LOW / Empty Coaching Rake)</SelectItem>
                      <SelectItem value="1">Priority 1 (MINIMAL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Expected Passengers", "अपेक्षित यात्री भार")}</Label>
                  <Input
                    type="number"
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    min={0}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Origin Station", "प्रारंभिक स्टेशन")}</Label>
                  <Input
                    placeholder="e.g. NDLS"
                    value={originStation}
                    onChange={(e) => setOriginStation(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">{t("Destination Station", "गंतव्य स्टेशन")}</Label>
                  <Input
                    placeholder="e.g. BSB"
                    value={destStation}
                    onChange={(e) => setDestStation(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Justification Reason */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">{t("Operational Reason / Memo Ref", "परिचालन कारण / ज्ञापन संदर्भ")}</Label>
                <Input
                  placeholder="e.g. Railway Board Notification Ref RB/2026/FEST/44"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                className="h-8 text-xs"
              >
                {t("Cancel", "रद्द करें")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#003366] hover:bg-[#002244] text-white font-bold h-8 text-xs"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> {t("Saving...", "सहेजा जा रहा है...")}
                  </>
                ) : editingTrain ? (
                  t("Update Service", "सेवा अद्यतन करें")
                ) : (
                  t("Register Service", "सेवा पंजीकृत करें")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SpecialTrainsPage;
