import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldCheck,
  KeyRound,
  Users,
  FileSpreadsheet,
  Activity,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Server,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/AppShell";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "System Administration & RBAC Governance | IR-ABPS" },
      {
        name: "description",
        content: "Security governance, role-based access control matrix, and system audit trail for IR-ABPS.",
      },
    ],
  }),
  component: AdminPage,
});

interface RoleMatrixItem {
  role_id: string;
  name: string;
  title: string;
  system: string;
  dept: string;
  scope: string;
  permissions: string[];
}

interface AuditRecord {
  audit_id: number;
  ts: string;
  actor_role: string;
  actor_name: string;
  method: string;
  path: string;
  action: string;
  target_type: string;
  target_id: string;
  outcome: string;
  detail: any;
}

function AdminPage() {
  const { t } = useLanguage();
  const { user } = useAbps();

  const [roles, setRoles] = useState<Record<string, RoleMatrixItem>>({});
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFilterRole, setLogFilterRole] = useState("ALL");
  const [logFilterAction, setLogFilterAction] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matrixRes, logsRes] = await Promise.all([
        apiFetch("/admin/permission-matrix"),
        apiFetch("/admin/audit-log?limit=100"),
      ]);

      if (matrixRes.ok) {
        const matrixData = await matrixRes.json();
        setRoles(matrixData.roles || {});
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("Failed to load administration data.", "प्रशासन डेटा लोड करने में विफल।"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchRole = logFilterRole === "ALL" || l.actor_role === logFilterRole;
    const matchAction =
      !logFilterAction ||
      l.action.toLowerCase().includes(logFilterAction.toLowerCase()) ||
      l.path.toLowerCase().includes(logFilterAction.toLowerCase()) ||
      (l.actor_name && l.actor_name.toLowerCase().includes(logFilterAction.toLowerCase()));
    return matchRole && matchAction;
  });

  // Unique list of all permissions across all roles
  const allPermissions = Array.from(
    new Set(Object.values(roles).flatMap((r) => r.permissions)),
  ).sort();

  return (
    <>
      <PageHeader
        title={t("System Administration & RBAC Governance", "सिस्टम प्रशासन एवं आरबीएसी शासन")}
        subtitle={t(
          "Official security posture, live role-permission ledger, demo profile credentials, and compliance audit trail.",
          "आधिकारिक सुरक्षा स्थिति, लाइव भूमिका-अनुमति बहीखाता, डेमो प्रोफ़ाइल क्रेडेंशियल और अनुपालन ऑडिट ट्रेल।",
        )}
        action={
          <div className="flex items-center gap-2">
            <Badge className="bg-[#003366] text-white border-0 text-[10px] uppercase font-mono px-2 py-1">
              <Lock className="size-3 mr-1 text-[#FF9933]" />
              {t("ADMIN CLEARANCE: ACTIVE", "प्रशासक निकासी: सक्रिय")}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-8 text-xs font-bold border-slate-300 dark:border-slate-700"
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("Refresh Audit", "ऑडिट ताज़ा करें")}
            </Button>
          </div>
        }
      />

      {/* DEMO ACCOUNTS & ROLES STRIP */}
      <div className="mb-6">
        <div className="border-b-2 border-[#003366] pb-1.5 mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#003366] dark:text-sky-400 flex items-center gap-2">
            <Users className="size-4 text-[#FF9933]" />
            {t("Configured Designation Profiles (Demo Accounts)", "कॉन्फ़िगर किए गए पदनाम प्रोफाइल (डेमो खाते)")}
          </h2>
          <span className="text-[10px] font-mono text-slate-500">
            {t("DEMO PASSCODE: 12345 (ALL PROFILES)", "डेमो पासकोड: 12345 (सभी प्रोफाइल)")}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.values(roles).map((r) => (
            <Card
              key={r.role_id}
              className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none"
            >
              <CardHeader className="bg-slate-100 dark:bg-slate-800/80 p-3 border-b border-border">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-slate-500">
                      ID: {r.role_id}
                    </span>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {r.title}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-bold uppercase rounded-[2px] ${
                      r.scope === "network"
                        ? "bg-purple-100 text-purple-900 border-purple-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {r.scope}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">{t("Designation", "पदनाम")}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{r.name}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-border">
                  <span className="text-slate-500">{t("Department Jurisdiction", "विभागीय अधिकार क्षेत्र")}</span>
                  <span className="font-mono font-bold text-[#003366] dark:text-sky-400">{r.dept}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t("Active Permissions", "सक्रिय अनुमतियां")}</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {r.permissions.length} keys
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* LIVE PERMISSION MATRIX */}
      <Card className="mb-6 border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
        <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-[#003366] dark:text-sky-400" />
              <CardTitle className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
                {t("Authoritative Backend Permission Matrix", "प्रामाणिक बैकएंड अनुमति मैट्रिक्स")}
              </CardTitle>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
              {allPermissions.length} {t("Total Permissions Registered", "कुल अनुमतियां पंजीकृत")}
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            {t(
              "Read-only cryptographic source of truth served directly from backend ROLE_TABLE.",
              "बैकएंड ROLE_TABLE से सीधे प्रदान की गई केवल-पठनीय अनुमति तालिका।",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">{t("Permission Key", "अनुमति कुंजी")}</TableHead>
                <TableHead className="text-center">{t("Admin (DRM Planning)", "व्यवस्थापक")}</TableHead>
                <TableHead className="text-center">{t("Chief Controller", "मुख्य नियंत्रक")}</TableHead>
                <TableHead className="text-center">{t("Engineering (TMS)", "इंजीनियरिंग")}</TableHead>
                <TableHead className="text-center">{t("Traction (TDMS)", "ट्रैक्शन")}</TableHead>
                <TableHead className="text-center">{t("Signal (SMMS)", "सिग्नल")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPermissions.map((perm) => (
                <TableRow key={perm} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <TableCell className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {perm}
                  </TableCell>
                  {["admin", "control", "engineering", "traction", "signal"].map((rId) => {
                    const has = roles[rId]?.permissions.includes(perm);
                    return (
                      <TableCell key={rId} className="text-center">
                        {has ? (
                          <span className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center size-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 text-xs font-bold">
                            –
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AUDIT LOG VIEWER */}
      <Card className="border border-border bg-white dark:bg-slate-900 rounded-[2px] shadow-none">
        <CardHeader className="bg-slate-100 dark:bg-slate-900/80 p-3.5 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-[#003366] dark:text-sky-400" />
              <CardTitle className="text-xs font-bold uppercase text-[#003366] dark:text-sky-400">
                {t("System Audit Log (Last 100 Events)", "सिस्टम ऑडिट लॉग (अंतिम 100 घटनाएं)")}
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <Select value={logFilterRole} onValueChange={setLogFilterRole}>
                <SelectTrigger className="h-8 text-xs rounded-[2px] w-[130px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[2px]">
                  <SelectItem value="ALL">{t("All Roles", "सभी भूमिकाएं")}</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="traction">Traction</SelectItem>
                  <SelectItem value="signal">Signal</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 text-xs rounded-[2px] w-[180px] bg-background"
                  placeholder={t("Filter action/actor...", "कार्रवाई फ़िल्टर करें...")}
                  value={logFilterAction}
                  onChange={(e) => setLogFilterAction(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Timestamp", "समय")}</TableHead>
                <TableHead>{t("Actor", "उपयोगकर्ता")}</TableHead>
                <TableHead>{t("Role", "भूमिका")}</TableHead>
                <TableHead>{t("Action", "कार्रवाई")}</TableHead>
                <TableHead>{t("Path / Endpoint", "पथ / एंडपॉइंट")}</TableHead>
                <TableHead>{t("Outcome", "परिणाम")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((l) => (
                <TableRow key={l.audit_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <TableCell className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {l.ts ? new Date(l.ts).toLocaleString("en-IN") : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {l.actor_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono font-bold rounded-[2px]">
                      {l.actor_role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-[#003366] dark:text-sky-400">
                    {l.action}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {l.method} {l.path}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded-[2px] border ${
                        l.outcome === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-red-100 text-red-900 border-red-300"
                      }`}
                    >
                      {l.outcome}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    {t("No audit records matching filters.", "फ़िल्टर से मेल खाने वाले कोई ऑडिट रिकॉर्ड नहीं।")}
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
