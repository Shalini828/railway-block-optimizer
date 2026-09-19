import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  ShieldAlert,
  Radio,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GovtNationalEmblem } from "@/components/GovtNationalEmblem";
import { ROUTE_ACCESS } from "@/lib/permissions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IR-ABPS | Indian Railways Automatic Block Planning System" },
      {
        name: "description",
        content:
          "Ministry of Railways Official Portal for AI-powered automatic block planning, shadow maintenance clustering, and sectional asset availability maximization.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { signedIn, can } = useAbps();
  const { t } = useLanguage();

  const operationalModules = [
    {
      code: "MOD-01",
      dept: t("CENTRAL OPERATIONS", "केंद्रीय परिचालन"),
      title: t("Control Dashboard", "नियंत्रण डैशबोर्ड"),
      description: t(
        "Live corridor telemetry, sectional train path occupancy, and real-time risk radar across NDLS-CNB-ALD-BSB.",
        "एनडीएलएस-सीएनबी-एएलडी-बीएसबी पर लाइव कॉरिडोर टेलीमेट्री, सेक्शनल ट्रेन पथ अधिभोग और रडार।"
      ),
      icon: LayoutDashboard,
      link: "/dashboard",
      accent: "border-l-4 border-l-[#003366]",
    },
    {
      code: "MOD-02",
      dept: t("FIELD DEPARTMENTS", "क्षेत्रीय विभाग"),
      title: t("Requisition Portal", "मांग पत्र पोर्टल"),
      description: t(
        "Electronic filing and tracking of Civil Track (TMS), Signal (SMMS), and Electrical OHE (TDMS) maintenance demands.",
        "सिविल ट्रैक (टीएमएस), सिग्नल (एसएमएमएस) और ओएचई (टीडीएमएस) मांगों का इलेक्ट्रॉनिक पंजीकरण।"
      ),
      icon: ClipboardList,
      link: "/requests",
      accent: "border-l-4 border-l-amber-600",
    },
    {
      code: "MOD-03",
      dept: t("CRIS AI ENGINE", "क्रिस एआई इंजन"),
      title: t("AI Optimizer Engine", "एआई अनुकूलन इंजन"),
      description: t(
        "Autonomous shadow block clustering algorithm, corridor window matching, and cross-departmental work bundling.",
        "स्वायत्त शैडो ब्लॉक क्लस्टरिंग एल्गोरिदम और अंतर-विभागीय कार्य समूहीकरण।"
      ),
      icon: BrainCircuit,
      link: "/optimizer",
      accent: "border-l-4 border-l-purple-700",
    },
    {
      code: "MOD-04",
      dept: t("CORRIDOR PLANNING", "कॉरिडोर योजना"),
      title: t("Gantt Planner", "गैंट योजनाकार"),
      description: t(
        "Tactical 7-day and strategic 30-day visual block timetable synchronized with COA express train movements.",
        "सीओए एक्सप्रेस ट्रेन संचालन के साथ समन्वयित रणनीतिक 30-दिवसीय दृश्य ब्लॉक समय सारिणी।"
      ),
      icon: CalendarRange,
      link: "/planner",
      accent: "border-l-4 border-l-emerald-700",
    },
    {
      code: "MOD-05",
      dept: t("SAFETY & SCRUTINY", "सुरक्षा एवं संवीक्षा"),
      title: t("Conflicts & Approvals", "विवाद एवं अनुमोदन"),
      description: t(
        "Train clash detection matrix and controller human-in-the-loop authorization desk with digital audit log.",
        "ट्रेन टकराव पहचान मैट्रिक्स और डिजिटल ऑडिट लॉग के साथ नियंत्रक प्राधिकरण डेस्क।"
      ),
      icon: ShieldAlert,
      link: "/conflicts",
      accent: "border-l-4 border-l-red-700",
    },
    {
      code: "MOD-06",
      dept: t("FIELD EXECUTION", "क्षेत्रीय निष्पादन"),
      title: t("Maintenance Tasks", "अनुरक्षण कार्य रजिस्टर"),
      description: t(
        "Comprehensive asset ledger, USFD defect logs, OHE mast schedules, and point machine maintenance register.",
        "व्यापक परिसंपत्ति खाता, यूएसएफडी दोष लॉग और पॉइंट मशीन अनुरक्षण रजिस्टर।"
      ),
      icon: ClipboardList,
      link: "/maintenance-tasks",
      accent: "border-l-4 border-l-blue-700",
    },
    {
      code: "MOD-07",
      dept: t("EXECUTIVE AUDIT", "कार्यकारी ऑडिट"),
      title: t("Impact Analytics", "प्रभाव विश्लेषण"),
      description: t(
        "Asset availability metrics, shadow block hour savings, train punctuality impact indices, and executive reporting.",
        "परिसंपत्ति उपलब्धता मेट्रिक्स, शैडो ब्लॉक बचत और ट्रेन समयपालन प्रभाव सूचकांक।"
      ),
      icon: BarChart3,
      link: "/analytics",
      accent: "border-l-4 border-l-indigo-700",
    },
    {
      code: "MOD-08",
      dept: t("DISASTER RECOVERY", "आपदा नियंत्रण"),
      title: t("Emergency Blocking", "आपातकालीन ब्लॉक"),
      description: t(
        "Immediate safety block issuance, rail fracture TSR imposition, emergency corridor holds, and disaster desk.",
        "तत्काल सुरक्षा ब्लॉक जारी करना, रेल फ्रैक्चर टीएसआर आरोपण और आपातकालीन कॉरिडोर नियंत्रण।"
      ),
      icon: Siren,
      link: "/emergency",
      accent: "border-l-4 border-l-[#800000]",
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Official Flash Ticker Bulletin */}
      <div className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200">
        <span className="flex items-center gap-1 bg-[#800000] text-white px-2 py-0.5 text-[10px] font-bold uppercase rounded-[2px] shrink-0">
          <Radio className="size-3 animate-pulse" /> {t("Official Bulletin", "आधिकारिक बुलेटिन")}
        </span>
        <div className="overflow-hidden whitespace-nowrap text-ellipsis">
          <span className="font-semibold text-[#003366] dark:text-sky-400">
            {t("IR-ABPS Enterprise v2.4.0 Active:", "आईआर-एबीपीएस सक्रिय:")}
          </span>{" "}
          {t(
            "Live COA feed synchronized for Northern Central Railway (NDLS–CNB–ALD–BSB) · Multi-departmental shadow block optimization algorithm operational.",
            "उत्तर मध्य रेलवे (एनडीएलएस-सीएनबी-एएलडी-बीएसबी) के लिए लाइव सीओए फीड सिंक्रनाइज़ · बहु-विभागीय शैडो ब्लॉक अनुकूलन सक्रिय।"
          )}
        </div>
      </div>

      {/* Official Government Hero Portal Banner */}
      <section className="border-2 border-[#003366] bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-[2px] relative overflow-hidden">
        {/* Subtle watermark background seal */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none hidden lg:block">
          <GovtNationalEmblem className="size-96" />
        </div>

        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="border border-[#003366] bg-[#003366]/10 px-2.5 py-1 text-[11px] font-bold text-[#003366] dark:text-sky-300 uppercase tracking-wider">
              {t("MINISTRY OF RAILWAYS · GOVERNMENT OF INDIA", "रेल मंत्रालय • भारत सरकार")}
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> {t("Portal Operational", "पोर्टल सक्रिय")}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-[#003366] dark:text-sky-400 leading-tight">
            {t(
              "AUTOMATIC BLOCK PLANNING & ASSET AVAILABILITY SYSTEM",
              "स्वचालित ब्लॉक नियोजन एवं परिसंपत्ति उपलब्धता प्रणाली"
            )}
          </h1>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-800 dark:text-slate-100 mt-1">
            {t(
              "INDIAN RAILWAYS AUTOMATIC BLOCK PLANNING SYSTEM (IR-ABPS)",
              "भारतीय रेल स्वचालित ब्लॉक नियोजन प्रणाली (आईआर-एबीपीएस)"
            )}
          </h2>

          <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            {t(
              "A state-of-the-art decision-support and block optimization suite engineered by Indian Railways to intelligently cluster Engineering (TMS), Signaling (SMMS), and Electrical Traction (TDMS) maintenance windows. Maximises sectional line capacity while strictly safeguarding express train punctuality.",
              "भारतीय रेल द्वारा तैयार की गई एक अत्याधुनिक निर्णय-समर्थन और ब्लॉक अनुकूलन प्रणाली जो ट्रैक (टीएमएस), सिग्नल (एसएमएमएस), और विद्युत कर्षण (टीडीएमएस) खिड़कियों को समूहीकृत करती है।"
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="default" className="bg-[#003366] hover:bg-[#002244] text-white font-bold h-9 px-5">
              <Link to="/dashboard">
                <LayoutDashboard className="mr-1.5 size-4" />
                {signedIn ? t("Open Executive Dashboard", "कार्यकारी डैशबोर्ड खोलें") : t("Access Controller Dashboard", "कंट्रोलर डैशबोर्ड देखें")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="default" className="border-slate-400 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-bold h-9 px-5 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Link to="/optimizer">
                <BrainCircuit className="mr-1.5 size-4 text-purple-700 dark:text-purple-400" /> {t("Run AI Block Clustering", "एआई ब्लॉक क्लस्टरिंग चलाएं")}
              </Link>
            </Button>
            <Button asChild variant="secondary" size="default" className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold h-9 px-5">
              <Link to="/requests">
                <FileText className="mr-1.5 size-4 text-amber-700 dark:text-amber-400" /> {t("Submit Requisition", "मांग पत्र जमा करें")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Corridor Key Performance Metrics Bar */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border border-border bg-white dark:bg-slate-900 p-3.5 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("Asset Availability", "परिसंपत्ति उपलब्धता")}
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            94.6%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("Track, Signal & OHE composite", "ट्रैक, सिग्नल एवं ओएचई समग्र")}
          </p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3.5 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("Active Megablocks", "सक्रिय मेगाब्लॉक")}
          </p>
          <p className="text-xl sm:text-2xl font-black text-[#003366] dark:text-sky-400 mt-1">
            12 / {t("Wk", "सप्ताह")}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("NDLS–BSB Corridor", "नई दिल्ली – वाराणसी कॉरिडोर")}
          </p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3.5 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("Shadow Hours Saved", "बचाए गए शैडो घंटे")}
          </p>
          <p className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
            18.5 {t("Hrs", "घंटे")}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("Recovered via AI bundling", "एआई संयोजन द्वारा संचित")}
          </p>
        </div>
        <div className="border border-border bg-white dark:bg-slate-900 p-3.5 rounded-[2px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("Punctuality Impact", "समयपालन प्रभाव")}
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            +42 {t("Min", "मिनट")}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("Express delay reduction", "एक्सप्रेस विलंब में कमी")}
          </p>
        </div>
      </section>

      {/* Section Header */}
      <div className="border-b-2 border-[#003366] pb-1.5 mt-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#003366] dark:text-sky-400">
          {t("Operational Modules & Applications Directory", "परिचालन मॉड्यूल एवं अनुप्रयोग निर्देशिका")}
        </h2>
        <span className="text-[11px] font-semibold text-slate-500">
          {operationalModules.filter((m) => !signedIn || !ROUTE_ACCESS[m.link] || can(ROUTE_ACCESS[m.link])).length} {t("Modules Active", "मॉड्यूल सक्रिय")}
        </span>
      </div>

      {/* Operational Modules Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {operationalModules
          .filter((module) => !signedIn || !ROUTE_ACCESS[module.link] || can(ROUTE_ACCESS[module.link]))
          .map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.code} to={module.link} className="group outline-none">
              <Card className={`h-full transition-all border border-border bg-white dark:bg-slate-900 hover:border-[#003366] dark:hover:border-sky-400 ${module.accent}`}>
                <CardHeader className="p-3.5 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      {module.code} · {module.dept}
                    </span>
                    <Icon className="size-4 text-[#003366] dark:text-sky-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#003366] dark:group-hover:text-sky-400 mt-1">
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0">
                  <CardDescription className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                    {module.description}
                  </CardDescription>
                  <div className="mt-3 flex items-center text-[11px] font-bold text-[#003366] dark:text-sky-400 group-hover:translate-x-1 transition-transform">
                    <span>{t("Access Console", "कंसोल खोलें")}</span>
                    <ArrowRight className="ml-1 size-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Official Guidelines / Operational Instructions Box */}
      <section className="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 p-4 rounded-[2px] text-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="size-5 text-[#003366] dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold uppercase text-[#003366] dark:text-sky-400 text-xs">
              {t("Railway Board Operating Procedure Compliance (G&SR 2026)", "रेलवे बोर्ड परिचालन प्रक्रिया अनुपालन (जी एवं एसआर)")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {t(
                "All block applications submitted via the Requisition Portal require strict compliance with Indian Railways General and Subsidiary Rules (G&SR). Shadow blocks must be electronically co-signed by respective Section Engineers (P-Way, Signal, and OHE) prior to Section Controller transmission.",
                "मांग पत्र पोर्टल के माध्यम से प्रस्तुत सभी ब्लॉक आवेदनों के लिए भारतीय रेलवे सामान्य एवं सहायक नियमों (जी एवं एसआर) का कड़ाई से अनुपालन आवश्यक है।"
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
