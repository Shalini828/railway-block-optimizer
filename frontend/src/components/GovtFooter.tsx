import { Phone, Mail, Activity, ShieldCheck } from "lucide-react";
import { GovtNationalEmblem } from "./GovtNationalEmblem";
import { useLanguage } from "@/context/LanguageContext";

export function GovtFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t-2 border-[#003366] bg-slate-900 text-slate-300 text-xs select-none">
      {/* Tricolor Accent Stripe */}
      <div className="tricolor-stripe w-full" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Main Clean Summary Row */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Brand & Portal Info */}
          <div className="flex items-center gap-3">
            <GovtNationalEmblem className="size-8 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs tracking-wide">
                  {t("INDIAN RAILWAYS", "भारतीय रेल")}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {t("IR-ABPS Console", "आईआर-एबीपीएस कंसोल")}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-medium">
                  <Activity className="size-2.5 animate-pulse" />
                  {t("99.98% Uptime", "99.98% ऑनलाइन")}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {t("Ministry of Railways, Government of India • CRIS", "रेल मंत्रालय, भारत सरकार • क्रिस")}
              </p>
            </div>
          </div>

          {/* Integrated Systems Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
            <span className="text-slate-400 font-semibold mr-1 uppercase tracking-wider text-[9px]">
              {t("Integrated Systems:", "एकीकृत प्रणालियां:")}
            </span>
            <span className="px-2 py-0.5 rounded-[2px] bg-slate-800/80 border border-slate-700 text-slate-200 font-mono">COA</span>
            <span className="px-2 py-0.5 rounded-[2px] bg-slate-800/80 border border-slate-700 text-slate-200 font-mono">TMS</span>
            <span className="px-2 py-0.5 rounded-[2px] bg-slate-800/80 border border-slate-700 text-slate-200 font-mono">SMMS</span>
            <span className="px-2 py-0.5 rounded-[2px] bg-slate-800/80 border border-slate-700 text-slate-200 font-mono">TDMS</span>
            <span className="px-2 py-0.5 rounded-[2px] bg-slate-800/80 border border-slate-700 text-slate-200 font-mono">FOIS</span>
          </div>

          {/* Support Hotlines */}
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Phone className="size-3.5 text-[#FF9933]" />
              <span>
                <strong className="text-white">139</strong> <span className="text-[10px] text-slate-400">({t("Rail Madad 24x7", "रेल मदद")})</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
              <Mail className="size-3.5 text-[#FF9933]" />
              <span className="font-mono">helpdesk@cris.org.in</span>
            </div>
          </div>
        </div>

        {/* Compact Baseline */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
          <p>
            {t(
              "© Ministry of Railways, Govt of India • Developed & Maintained by CRIS / NIC.",
              "© रेल मंत्रालय, भारत सरकार • क्रिस / एनआईसी द्वारा विकसित एवं प्रबंधित।"
            )}
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-400">v2.4.0 (Enterprise)</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-400" />
              {t("Security Cleared (GIGW 3.0)", "सुरक्षा प्रमाणित (जीआईजीडब्ल्यू 3.0)")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
