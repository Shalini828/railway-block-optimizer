import { Link } from "@tanstack/react-router";
import { PhoneCall, ShieldCheck, LogOut, KeyRound, UserCheck } from "lucide-react";
import { GovtNationalEmblem } from "./GovtNationalEmblem";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";

export function GovtHeader({ onOpenLoginModal }: { onOpenLoginModal?: () => void }) {
  const { role, signedIn, signOut } = useAbps();
  const { t } = useLanguage();

  return (
    <header className="border-b border-border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="w-full flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3">
        {/* Left: Official Emblem & Single Language Titles */}
        <Link to="/" className="flex items-center gap-3.5 group outline-none">
          <GovtNationalEmblem className="size-12 shrink-0 drop-shadow-sm transition-transform group-hover:scale-105" />
          <div className="border-l border-slate-300 dark:border-slate-700 pl-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-[#003366] dark:text-sky-400">
                {t("INDIAN RAILWAYS", "भारतीय रेल")}
              </span>
            </div>
            <h1 className="text-sm font-extrabold uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
              {t("AUTOMATIC BLOCK PLANNING SYSTEM (IR-ABPS)", "स्वचालित ब्लॉक नियोजन प्रणाली (IR-ABPS)")}
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
              {t(
                "AI-Powered Automatic Block Planning Suite · Centre for Railway Information Systems (CRIS)",
                "एआई-आधारित स्वचालित ब्लॉक नियोजन प्रणाली • रेलवे सूचना प्रणाली केंद्र (क्रिस)"
              )}
            </p>
          </div>
        </Link>

        {/* Right: Hotline, Corridor Live status & Auth */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Rail Madad 139 Hotline */}
          <div className="hidden lg:flex items-center gap-2 rounded border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 text-xs">
            <PhoneCall className="size-3.5 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-[10px] font-bold uppercase text-orange-800 dark:text-orange-300 leading-none">
                {t("Rail Madad", "रेल मदद")}
              </p>
              <p className="text-xs font-bold text-orange-950 dark:text-orange-200">
                139 {t("(Toll Free)", "(टोल फ्री)")}
              </p>
            </div>
          </div>

          {/* COA Live feed status */}
          <div className="hidden sm:flex items-center gap-2 rounded border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600"></span>
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 leading-none">
                {t("COA Link Active", "सीओए लिंक सक्रिय")}
              </p>
              <p className="text-[11px] font-semibold text-emerald-950 dark:text-emerald-200">
                {t("NDLS – BSB Corridor", "नई दिल्ली – वाराणसी कॉरिडोर")}
              </p>
            </div>
          </div>

          {/* User Role / Auth button */}
          {signedIn ? (
            <div className="flex items-center gap-2 border-l border-slate-300 dark:border-slate-700 pl-3">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-1 text-xs font-bold uppercase text-primary dark:text-sky-400">
                  <UserCheck className="size-3.5" />
                  <span>{role.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{role.name} ({role.system})</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="h-8 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold hover:bg-destructive hover:text-white"
              >
                <LogOut className="mr-1.5 size-3.5" /> {t("Sign Out", "साइन आउट")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-slate-300 dark:border-slate-700 pl-3">
              <Button
                size="sm"
                className="h-8 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded-[2px]"
                asChild
              >
                <Link to="/dashboard">
                  <KeyRound className="mr-1.5 size-3.5" /> {t("Officer Login", "अधिकारी लॉगिन")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Tricolor National Ribbon */}
      <div className="tricolor-stripe w-full" />
    </header>
  );
}
