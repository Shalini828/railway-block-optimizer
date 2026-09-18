import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  BrainCircuit,
  CalendarRange,
  ShieldAlert,
  BarChart3,
  Siren,
  ChevronRight,
  UserCheck,
  Building2,
  Radio,
  LogOut,
  Shield,
  Activity,
  Layers,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { GovtNationalEmblem } from "./GovtNationalEmblem";

export const NAV_SECTIONS = [
  {
    titleEn: "CORRIDOR OPERATIONS",
    titleHi: "कॉरिडोर परिचालन",
    items: [
      { to: "/dashboard", labelEn: "Control Dashboard", labelHi: "नियंत्रण डैशबोर्ड", icon: LayoutDashboard, badge: "Live", badgeTone: "bg-[#137547] text-white" },
      { to: "/requests", labelEn: "Requisition Portal", labelHi: "मांग पत्र पोर्टल", icon: ClipboardList, badge: null, badgeTone: "" },
      { to: "/optimizer", labelEn: "IR-ABPS Brain", labelHi: "एआई अनुकूलन इंजन", icon: BrainCircuit, badge: "AI", badgeTone: "bg-[#003366] text-white" },
      { to: "/planner", labelEn: "Gantt Planner", labelHi: "गैंट योजनाकार", icon: CalendarRange, badge: null, badgeTone: "" },
    ],
  },
  {
    titleEn: "SAFETY & ASSET SCRUTINY",
    titleHi: "सुरक्षा एवं परिसंपत्ति संवीक्षा",
    items: [
      { to: "/conflicts", labelEn: "Conflicts & Approvals", labelHi: "विवाद एवं अनुमोदन", icon: ShieldAlert, badge: null, badgeTone: "" },
      { to: "/maintenance-tasks", labelEn: "Maintenance Tasks", labelHi: "अनुरक्षण कार्य", icon: Wrench, badge: null, badgeTone: "" },
      { to: "/analytics", labelEn: "Impact Analytics", labelHi: "प्रभाव विश्लेषण", icon: BarChart3, badge: null, badgeTone: "" },
      { to: "/emergency", labelEn: "Emergency Blocking", labelHi: "आपातकालीन ब्लॉक", icon: Siren, badge: "SOS", badgeTone: "bg-[#800000] text-white animate-pulse" },
    ],
  },
] as const;

export function GovtSidebar() {
  const location = useLocation();
  const { role, signOut } = useAbps();
  const { lang, t } = useLanguage();

  return (
    <aside className="w-full lg:w-80 xl:w-88 shrink-0 bg-white dark:bg-slate-900 border-r-2 border-slate-300 dark:border-slate-800 select-none min-h-full flex flex-col justify-between shadow-xs">
      <div>
        {/* Officer Active Session Strip */}
        <div className="bg-[#003366] text-white p-4.5 sm:p-5 border-b-2 border-[#FF9933]">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FF9933]">
              <UserCheck className="size-4 text-[#FF9933]" />
              {t("OFFICER CONSOLE", "अधिकारी कंसोल")}
            </span>
            <span className="bg-[#FF9933] text-slate-950 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-extrabold uppercase shadow-2xs">
              {role.system}
            </span>
          </div>

          <h2 className="text-base font-extrabold text-white tracking-tight leading-snug">
            {role.title}
          </h2>

          <div className="flex items-center justify-between text-xs text-slate-200 mt-2.5 font-mono border-t border-white/20 pt-2">
            <span className="font-semibold text-slate-100">{role.name}</span>
            <span className="text-[11px] text-slate-300 font-semibold bg-white/10 px-1.5 py-0.5 rounded-[2px]">NCR / DLI</span>
          </div>
        </div>

        {/* Division & Live Feed Status */}
        <div className="px-4.5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-xs">
            <Building2 className="size-4 text-[#003366] dark:text-sky-400" />
            <span>{t("Division: PRYJ / NR", "मंडल: पीआरवाईजे / उ.रे.")}</span>
          </div>
          <span className="flex items-center gap-1.5 text-[#137547] font-bold text-[11px] font-mono">
            <span className="size-2 rounded-full bg-[#137547] animate-pulse" />
            COA LIVE
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="py-3">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="mb-3 last:mb-0">
              <div className="px-4.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {lang === "hi" ? section.titleHi : section.titleEn}
              </div>

              <nav className="flex flex-col">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to || (item.to === "/dashboard" && location.pathname === "/");
                  const Icon = item.icon;
                  const label = lang === "hi" ? item.labelHi : item.labelEn;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center justify-between px-4.5 py-3.5 text-[13px] font-bold transition-colors border-y border-transparent ${
                        isActive
                          ? "bg-[#003366] text-white border-l-[6px] border-l-[#FF9933] shadow-xs"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#003366] dark:hover:text-sky-400"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon
                          className={`size-[18px] shrink-0 ${
                            isActive ? "text-[#FF9933]" : "text-[#003366] dark:text-sky-400"
                          }`}
                        />
                        <span className="tracking-tight">{label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] uppercase ${
                            item.badgeTone || (isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300")
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Footer: Security compliance & Sign Out */}
      <div className="p-4.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
          <span className="font-semibold">IR-ABPS v2.4</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> SECURE DESK
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="w-full text-xs font-bold uppercase tracking-wider rounded-[2px] h-10 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-[#800000] hover:text-white hover:border-[#800000] transition-colors cursor-pointer"
        >
          <LogOut className="mr-2 size-4" />
          {t("Sign Out Desk", "साइन आउट करें")}
        </Button>
      </div>
    </aside>
  );
}
