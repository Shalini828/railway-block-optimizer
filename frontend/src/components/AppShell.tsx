import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TrainFront,
  Building2,
  CheckCircle2,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROLES, type RoleId } from "@/lib/abps-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GovtTopUtilityBar } from "./GovtTopUtilityBar";
import { GovtHeader } from "./GovtHeader";
import { GovtSidebar } from "./GovtSidebar";
import { GovtFooter } from "./GovtFooter";
import { GovtNationalEmblem } from "./GovtNationalEmblem";
import { AccessDenied } from "./AccessDenied";
import { ROUTE_ACCESS } from "@/lib/permissions";

export function AppShell({ children }: { children: ReactNode }) {
  const { role, signedIn, signIn, signOut, authReady, can } = useAbps();
  const { t } = useLanguage();
  const location = useLocation();

  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>("admin");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const isHomePage = location.pathname === "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      await signIn(selectedRoleId, password);
      toast.success(t("Officer Authenticated Successfully", "अधिकारी सफलतापूर्वक प्रमाणित"), {
        description: `${t("Welcome", "स्वागत है")}, ${role.name || "Authorized Controller"}.`,
      });
      setPassword("");
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          t(
            "Security credentials invalid. Please enter valid password (12345).",
            "सुरक्षा क्रेडेंशियल अमान्य हैं। कृपया सही पासवर्ड (12345) दर्ज करें।"
          )
      );
    } finally {
      setLoading(false);
    }
  };

  // 0. VERIFYING SESSION SPLASH
  if (!authReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f9] dark:bg-[#0b1320] text-foreground">
        <GovtNationalEmblem className="size-12 animate-pulse mb-3" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {t("Verifying Secure Session...", "सुरक्षित सत्र का सत्यापन किया जा रहा है...")}
        </p>
      </div>
    );
  }

  // 1. NOT SIGNED IN & NOT ON HOME PAGE -> SHOW OFFICIAL RAILWAYS LOGIN PORTAL
  if (!signedIn && !isHomePage) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f4f6f9] dark:bg-[#0b1320] text-foreground">
        <GovtTopUtilityBar />
        <GovtHeader />

        <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg border-2 border-[#003366] bg-white dark:bg-slate-950 p-0 shadow-sm rounded-[2px]">
            {/* Header bar */}
            <div className="bg-[#003366] px-6 py-4 text-white border-b-2 border-[#FF9933]">
              <div className="flex items-center gap-3">
                <GovtNationalEmblem className="size-10" />
                <div>
                  <h1 className="text-base font-bold uppercase tracking-wider">
                    {t("Officer Authorization Desk", "अधिकारी प्रमाणीकरण डेस्क")}
                  </h1>
                  <p className="text-[11px] text-slate-300">
                    {t("Indian Railways · Automatic Block Planning System (IR-ABPS)", "भारतीय रेल • स्वचालित ब्लॉक नियोजन प्रणाली (आईआर-एबीपीएस)")}
                  </p>
                </div>
              </div>
            </div>

            {/* Form body */}
            <div className="p-6">
              <div className="mb-5 border-l-4 border-[#003366] bg-slate-100 dark:bg-slate-900 p-3 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-bold text-[#003366] dark:text-sky-400">
                  {t("RESTRICTED ACCESS PORTAL", "प्रतिबंधित प्रवेश पोर्टल")}
                </p>
                <p className="text-[11px] mt-0.5">
                  {t(
                    "Authorized railway officers only (TMS, SMMS, TDMS, Section Controller, DRM/Sr.DOM, CRIS Admin).",
                    "केवल अधिकृत रेलवे अधिकारी (टीएमएस, एसएमएमएस, टीडीएमएस, सेक्शन कंट्रोलर, डीआरएम, क्रिस एडमिन)।"
                  )}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role-select" className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                    {t("Select Designation / System Authority", "पदनाम / सिस्टम प्राधिकरण चुनें")}
                  </Label>
                  <Select
                    value={selectedRoleId}
                    onValueChange={(val) => setSelectedRoleId(val as RoleId)}
                  >
                    <SelectTrigger id="role-select" className="w-full bg-background border-slate-300 dark:border-slate-700 rounded-[2px] text-xs h-9 font-medium">
                      <SelectValue placeholder="Select official designation..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-[2px] border-slate-300 dark:border-slate-700">
                      {ROLES.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          <div className="flex flex-col py-0.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{r.title}</span>
                            <span className="text-[10px] text-muted-foreground">{r.name} · {r.system}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-input" className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      {t("Officer Security Passcode", "अधिकारी सुरक्षा पासकोड")}
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">{t("DEMO PASSCODE: 12345", "डेमो पासकोड: 12345")}</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="password-input"
                      type="password"
                      placeholder="•••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-[2px] bg-background border-slate-300 dark:border-slate-700 text-xs h-9 pl-9 font-mono"
                      autoFocus
                    />
                    <Lock className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                  </div>
                  {errorMsg && (
                    <p className="text-[11px] font-bold text-destructive mt-1">{errorMsg}</p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full h-9 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-[2px] cursor-pointer">
                  <KeyRound className="mr-2 size-4" /> {loading ? t("Authenticating...", "प्रमाणीकरण जारी...") : t("Authenticate & Access Console", "प्रमाणित करें एवं कंसोल खोलें")}
                </Button>

                <div className="pt-2 text-center border-t border-border/80 mt-4">
                  <Link to="/" className="text-xs font-semibold text-[#003366] dark:text-sky-400 hover:underline">
                    ← {t("Return to National Portal Homepage", "राष्ट्रीय पोर्टल मुख्य पृष्ठ पर लौटें")}
                  </Link>
                </div>
              </form>
            </div>

            {/* Security warning footer */}
            <div className="bg-slate-50 dark:bg-slate-900/80 px-6 py-2.5 border-t border-border text-center text-[10px] text-slate-500">
              {t(
                "National Informatics Centre (NIC) / CRIS Security Policy Compliant",
                "राष्ट्रीय सूचना विज्ञान केंद्र (एनआईसी) / क्रिस सुरक्षा नीति के अनुरूप"
              )}
            </div>
          </div>
        </main>

        <GovtFooter />
      </div>
    );
  }

  // 2. AUTHENTICATED WORKSPACE: FULL-WIDTH WITH FLUSH LEFT-DOCKED SIDEBAR
  if (signedIn) {
    const pathname = location.pathname.replace(/\/+$/, "") || "/";
    const requiredPerm = ROUTE_ACCESS[pathname];
    const isAuthorized = !requiredPerm || can(requiredPerm);

    return (
      <div className="flex min-h-screen flex-col bg-[#f4f6f9] dark:bg-[#0b1320] text-foreground">
        <GovtTopUtilityBar />
        <GovtHeader />

        <div className="flex flex-1 flex-col lg:flex-row w-full items-stretch min-h-0">
          {/* Flush Left Sidebar */}
          <GovtSidebar />

          {/* Main Operational Workspace */}
          <main id="main-content" className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {isAuthorized ? children : <AccessDenied requiredPerm={requiredPerm} />}
          </main>
        </div>
      </div>
    );
  }

  // 3. PUBLIC / LANDING PAGE
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9] dark:bg-[#0b1320] text-foreground">
      <GovtTopUtilityBar />
      <GovtHeader />

      <main id="main-content" className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-[1720px] mx-auto">
        {children}
      </main>

      <GovtFooter />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b-2 border-[#003366] bg-white dark:bg-slate-900 p-5 rounded-[2px] border border-border shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#003366] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-[2px] uppercase tracking-wider">
              INDIAN RAILWAYS
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              IR-ABPS CONTROL MODULE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#003366] dark:text-sky-400">
            {title}
          </h1>
          <p className="mt-1 max-w-4xl text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {subtitle}
          </p>
        </div>
        {action && <div className="flex items-center gap-3">{action}</div>}
      </div>
    </div>
  );
}

export const deptColor: Record<string, string> = {
  TMS: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
  SMMS: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
  TDMS: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
  JOINT: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800",
};
