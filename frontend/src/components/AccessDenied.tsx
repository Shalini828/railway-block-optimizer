import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAbps } from "@/context/AbpsContext";
import { Button } from "@/components/ui/button";
import { GovtNationalEmblem } from "./GovtNationalEmblem";

export function AccessDenied({ requiredPerm }: { requiredPerm?: string }) {
  const { t } = useLanguage();
  const { role } = useAbps();

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-4 py-12">
      <div className="w-full max-w-lg border-2 border-[#800000] bg-white dark:bg-slate-950 shadow-md rounded-[2px] overflow-hidden">
        {/* Header bar */}
        <div className="bg-[#800000] px-6 py-4 text-white border-b-2 border-[#FF9933] flex items-center gap-3">
          <GovtNationalEmblem className="size-10 shrink-0" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {t("ACCESS RESTRICTED — AUTHORIZATION REQUIRED", "प्रवेश प्रतिबंधित — प्राधिकरण आवश्यक")}
            </h2>
            <p className="text-[11px] text-slate-200">
              {t("IR-ABPS Security & Role-Based Access Control", "आईआर-एबीपीएस सुरक्षा एवं भूमिका-आधारित पहुँच नियंत्रण")}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 p-4 border-l-4 border-[#800000] rounded-[2px]">
            <ShieldAlert className="size-6 text-[#800000] dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-[#800000] dark:text-red-300">
                {t(
                  "Your designation is not authorised for this operational module.",
                  "आपका पदनाम इस परिचालन मॉड्यूल के लिए अधिकृत नहीं है।"
                )}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {t("Active Profile", "सक्रिय प्रोफ़ाइल")}: <span className="font-bold">{role.title} ({role.name})</span>
              </p>
              {requiredPerm && (
                <p className="font-mono text-[10px] text-slate-500">
                  Required privilege: <code>{requiredPerm}</code>
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {t(
              "Railway operations directives restrict access to modules outside your departmental jurisdiction. Please return to your authorized workstation dashboard.",
              "रेलवे संचालन निर्देश आपके विभागीय अधिकार क्षेत्र से बाहर के मॉड्यूल तक पहुँच को प्रतिबंधित करते हैं। कृपया अपने अधिकृत वर्कस्टेशन डैशबोर्ड पर लौटें।"
            )}
          </p>

          <div className="pt-2">
            <Button
              asChild
              className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs uppercase tracking-wider rounded-[2px] h-9"
            >
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 size-4" />
                {t("Return to Authorized Dashboard", "अधिकृत डैशबोर्ड पर लौटें")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
