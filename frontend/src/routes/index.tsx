import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  CalendarRange,
  ClipboardList,
  FileText,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Radio,
  LayoutDashboard,
  Layers,
  TrainFront,
  Flame,
  Building2,
  Activity,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { useAbps } from "@/context/AbpsContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { GovtNationalEmblem } from "@/components/GovtNationalEmblem";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "IR-ABPS | Indian Railways Automatic Block Planning System",
      },
      {
        name: "description",
        content:
          "AI-powered railway maintenance decision intelligence for asset risk, traffic impact, freight demand and maintenance block planning.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { signedIn } = useAbps();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col bg-[#f6f8fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* =========================================================
          OFFICIAL BULLETIN (PRESERVED)
      ========================================================= */}
      <div className="flex items-center gap-2 border-y border-slate-300 bg-white px-4 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
        <span className="flex shrink-0 items-center gap-1 rounded-sm bg-[#800000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <Radio className="size-3" />
          {t("Official Bulletin", "आधिकारिक बुलेटिन")}
        </span>

        <div className="truncate text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-[#003366] dark:text-sky-400">
            {t("IR-ABPS:", "आईआर-एबीपीएस:")}
          </span>{" "}
          {t(
            "AI-assisted railway maintenance planning and decision intelligence.",
            "एआई आधारित रेलवे अनुरक्षण योजना एवं निर्णय प्रणाली।",
          )}
        </div>
      </div>

      {/* =========================================================
          HERO (PRESERVED HERO STRUCTURE & CONTENT)
      ========================================================= */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute right-[-80px] top-[-80px] hidden opacity-[0.035] lg:block">
          <GovtNationalEmblem className="size-[430px]" />
        </div>

        <div className="relative mx-auto max-w-[1480px] px-5 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            {/* LEFT */}
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="border border-[#003366] bg-[#003366]/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#003366] dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                  {t("Railway Decision Intelligence", "रेलवे निर्णय इंटेलिजेंस")}
                </span>

                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  {t("AI-Powered Planning", "एआई आधारित योजना")}
                </span>
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#003366] dark:text-sky-400">
                RAILWISE AI
              </p>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.03] tracking-tight text-[#071126] sm:text-5xl lg:text-6xl dark:text-white">
                {t(
                  "Smarter Railway Maintenance. Safer Block Planning.",
                  "स्मार्ट रेलवे अनुरक्षण। बेहतर एवं सुरक्षित ब्लॉक योजना।",
                )}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
                {t(
                  "RailWise AI helps planners decide when, where and how maintenance blocks should be scheduled by combining maintenance urgency, asset health, train traffic and freight demand into one explainable decision workflow.",
                  "RailWise AI अनुरक्षण की प्राथमिकता, परिसंपत्ति की स्थिति, ट्रेन यातायात और माल ढुलाई की मांग को एक निर्णय प्रणाली में जोड़कर यह तय करने में सहायता करता है कि अनुरक्षण ब्लॉक कब, कहाँ और कैसे निर्धारित किए जाएं।",
                )}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-10 bg-[#003366] px-5 font-bold text-white hover:bg-[#00264d] rounded-[2px]"
                >
                  <a href="#how-it-works">
                    <BrainCircuit className="mr-2 size-4 text-[#FF9933]" />
                    {t("See How It Works", "यह कैसे काम करता है")}
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-10 border-slate-400 px-5 font-bold rounded-[2px]"
                >
                  <a href="#challenge">
                    {t("Understand the Problem", "समस्या समझें")}
                    <ArrowRight className="ml-2 size-4" />
                  </a>
                </Button>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>✓ {t("Asset-aware", "परिसंपत्ति आधारित")}</span>
                <span>✓ {t("Traffic-aware", "यातायात आधारित")}</span>
                <span>✓ {t("Explainable", "व्याख्यात्मक")}</span>
                <span>✓ {t("Human-in-the-loop", "मानवीय नियंत्रण")}</span>
              </div>
            </div>

            {/* RIGHT - DECISION ENGINE VISUAL */}
            <div className="relative">
              <div className="border border-slate-200 bg-[#f8fafc] p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-[2px]">
                <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      AI DECISION ENGINE
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#003366] dark:text-sky-400">
                      Block Intelligence
                    </h2>
                  </div>

                  <div className="flex size-11 items-center justify-center bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 rounded-[2px]">
                    <BrainCircuit className="size-6" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <DecisionSignal
                    icon={<ShieldAlert className="size-4" />}
                    title={t("Asset Risk", "परिसंपत्ति जोखिम")}
                    value={t("Condition + defects + history", "स्थिति + दोष + इतिहास")}
                  />

                  <DecisionSignal
                    icon={<LayoutDashboard className="size-4" />}
                    title={t("Traffic Impact", "यातायात प्रभाव")}
                    value={t("Passenger + Express + Goods", "यात्री + एक्सप्रेस + माल")}
                  />

                  <DecisionSignal
                    icon={<CalendarRange className="size-4" />}
                    title={t("Freight Forecast", "माल ढुलाई पूर्वानुमान")}
                    value={t("Future corridor pressure", "भविष्य का कॉरिडोर दबाव")}
                  />

                  <DecisionSignal
                    icon={<ClipboardList className="size-4" />}
                    title={t("Maintenance Demand", "अनुरक्षण मांग")}
                    value={t("Priority + consolidation", "प्राथमिकता + समूहीकरण")}
                  />
                </div>

                <div className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30 rounded-[2px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {t("Explainable recommendation", "व्याख्यात्मक अनुशंसा")}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] leading-5 text-emerald-700 dark:text-emerald-400">
                    {t(
                      "The planner can see the operational factors behind a recommended block.",
                      "प्लानर अनुशंसित ब्लॉक के पीछे मौजूद परिचालन कारकों को देख सकता है।",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          2. THE CHALLENGE
      ========================================================= */}
      <section
        id="challenge"
        className="border-b border-slate-200 bg-[#f6f8fb] dark:border-slate-800 dark:bg-slate-950 py-16 sm:py-20 lg:py-22"
      >
        <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <SectionIntro
            eyebrow={t("THE CHALLENGE", "चुनौती")}
            title={t(
              "Railway maintenance is not just a scheduling problem.",
              "रेलवे अनुरक्षण केवल शेड्यूल बनाने की समस्या नहीं है।",
            )}
            description={t(
              "A maintenance block has to balance multiple operational realities at the same time.",
              "एक अनुरक्षण ब्लॉक को एक साथ कई परिचालन वास्तविकताओं के बीच संतुलन बनाना पड़ता है।",
            )}
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ChallengeCard
              number="01"
              icon={<FileText className="size-5" />}
              badge="REQUISITION VOLUME"
              title={t("Many Maintenance Requests", "कई अनुरक्षण अनुरोध")}
              description={t(
                "Track, signal and electrical departments continuously generate maintenance requirements with different priorities, assets and durations.",
                "ट्रैक, सिग्नल और विद्युत विभाग अलग-अलग प्राथमिकताओं, परिसंपत्तियों और अवधि के साथ लगातार अनुरक्षण आवश्यकताएं उत्पन्न करते हैं।",
              )}
            />

            <ChallengeCard
              number="02"
              icon={<TrainFront className="size-5" />}
              badge="TRAFFIC INTERACTION"
              title={t("Train Movement", "ट्रेन संचालन")}
              description={t(
                "A proposed block can interact with passenger, express, goods and special train movements.",
                "एक प्रस्तावित ब्लॉक यात्री, सुपरफास्ट एक्सप्रेस, मालगाड़ी और विशेष ट्रेन संचालन के साथ परस्पर प्रभाव डाल सकता है।",
              )}
            />

            <ChallengeCard
              number="03"
              icon={<ShieldAlert className="size-5" />}
              badge="SAFETY & INTEGRITY"
              title={t("Asset Safety", "परिसंपत्ति सुरक्षा")}
              description={t(
                "Critical assets, defects and maintenance history can indicate where maintenance urgency is higher.",
                "महत्वपूर्ण परिसंपत्तियां, ट्रैक दोष और अनुरक्षण इतिहास यह स्पष्ट संकेत देते हैं कि किस खंड में सुरक्षा प्राथमिकता अधिक है।",
              )}
            />

            <ChallengeCard
              number="04"
              icon={<CalendarRange className="size-5" />}
              badge="CORRIDOR OCCUPANCY"
              title={t("Limited Block Windows", "सीमित ब्लॉक विंडो")}
              description={t(
                "Available track time is limited, so maintenance work needs to be planned efficiently without unnecessary operational disruption.",
                "उपलब्ध ट्रैक समय सीमित है, इसलिए अनावश्यक परिचालन व्यवधान के बिना अनुरक्षण कार्य की कुशल योजना आवश्यक है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          3. THE SOLUTION
      ========================================================= */}
      <section
        id="solution"
        className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 py-16 sm:py-20 lg:py-22"
      >
        <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <SectionIntro
            eyebrow={t("THE SOLUTION", "समाधान")}
            title={t(
              "One intelligence layer for the complete maintenance decision.",
              "पूरे अनुरक्षण निर्णय के लिए एक समग्र इंटेलिजेंस लेयर।",
            )}
            description={t(
              "Instead of looking at maintenance, assets and traffic separately, RailWise AI brings them together before recommending a maintenance window.",
              "अनुरक्षण, परिसंपत्ति स्वास्थ्य और ट्रेन यातायात को अलग-अलग देखने के बजाय RailWise AI किसी भी विंडो की अनुशंसा करने से पहले इन सभी संकेतों को एकीकृत करता है।",
            )}
          />

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <SolutionCard
              phase="INPUTS"
              number="01"
              icon={<Flame className="size-6 text-orange-600" />}
              title={t("Understand Asset Risk", "परिसंपत्ति जोखिम समझें")}
              description={t(
                "The ML risk model evaluates asset condition, criticality, defects and maintenance history to estimate maintenance risk.",
                "मशीन लर्निंग जोखिम मॉडल परिसंपत्ति की स्थिति, महत्वपूर्णता, दोषों और पिछले अनुरक्षण इतिहास का मूल्यांकन करके सटीक अनुरक्षण जोखिम निर्धारित करता है।",
              )}
            />

            <SolutionCard
              phase="INTELLIGENCE"
              number="02"
              icon={<LayoutDashboard className="size-6 text-[#003366] dark:text-sky-400" />}
              title={t("Understand Operational Impact", "परिचालन प्रभाव समझें")}
              description={t(
                "The system evaluates train movements and corridor conditions to estimate the operational impact of a proposed maintenance window.",
                "सिस्टम ट्रेन समय-सारिणी और कॉरिडोर की भीड़-भाड़ का विश्लेषण करके प्रस्तावित अनुरक्षण विंडो के परिचालन प्रभाव का सटीक पूर्वानुमान लगाता है।",
              )}
            />

            <SolutionCard
              phase="DECISION"
              number="03"
              icon={<BrainCircuit className="size-6 text-[#137547]" />}
              title={t("Generate the Block Plan", "ब्लॉक योजना तैयार करें")}
              description={t(
                "The optimizer combines maintenance priority, asset risk, traffic impact, freight pressure and consolidation opportunities to select suitable windows.",
                "ऑप्टिमाइज़र अनुरक्षण प्राथमिकता, परिसंपत्ति जोखिम, यातायात प्रभाव, माल दबाव और समूहीकरण अवसरों को मिलाकर सर्वोत्तम व्यावहारिक ब्लॉक चुनता है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          4. HOW IT WORKS
      ========================================================= */}
      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-[#f6f8fb] dark:border-slate-800 dark:bg-slate-950 py-16 sm:py-20 lg:py-22"
      >
        <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <SectionIntro
            eyebrow={t("HOW IT WORKS", "यह कैसे काम करता है")}
            title={t(
              "From maintenance request to explainable block recommendation.",
              "अनुरक्षण मांग पत्र से व्याख्यात्मक ब्लॉक अनुशंसा तक।",
            )}
            description={t(
              "RailWise AI turns operational data into a structured decision workflow.",
              "RailWise AI जटिल परिचालन डेटा को एक पारदर्शी, संरचित निर्णय कार्यप्रवाह में परिवर्तित करता है।",
            )}
          />

          <div className="mt-9 grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
            <WorkflowStep
              step="01"
              icon={<FileText className="size-5" />}
              title={t("Maintenance Requests", "अनुरक्षण मांग पत्र")}
              description={t(
                "Requests enter the planning workflow with task type, asset, duration, department and priority.",
                "अनुरोध कार्य प्रकार, परिसंपत्ति आईडी, अनुमानित अवधि, विभाग और विभागीय प्राथमिकता के साथ योजना प्रक्रिया में दर्ज होते हैं।",
              )}
            />

            <WorkflowStep
              step="02"
              icon={<ShieldAlert className="size-5" />}
              title={t("Asset Risk Analysis", "परिसंपत्ति जोखिम विश्लेषण")}
              description={t(
                "The ML model evaluates asset condition, criticality, defects and maintenance history to estimate maintenance risk.",
                "ML मॉडल परिसंपत्ति की आयु, स्थिति, गंभीर दोषों और इतिहास का मूल्यांकन करके रखरखाव की तात्कालिकता का आंकलन करता है।",
              )}
            />

            <WorkflowStep
              step="03"
              icon={<Activity className="size-5" />}
              title={t("Traffic Intelligence", "यातायात इंटेलिजेंस")}
              description={t(
                "The system checks train movements overlapping potential block windows and estimates traffic impact.",
                "सिस्टम संभावित ब्लॉक विंडो में आने वाली सभी ट्रेनों (यात्री, मेल, एक्सप्रेस, माल) की समय-सारिणी जांचकर प्रभाव स्कोर निकालता है।",
              )}
            />

            <WorkflowStep
              step="04"
              icon={<Building2 className="size-5" />}
              title={t("Freight Forecast", "माल ढुलाई पूर्वानुमान")}
              description={t(
                "Goods demand is forecast for the corridor so maintenance planning can account for future freight pressure.",
                "कॉरिडोर के लिए दैनिक मालगाड़ी मांग का पूर्वानुमान किया जाता है ताकि योजना भविष्य के माल दबाव और लोडिंग मार्गों का ध्यान रखे।",
              )}
            />

            <WorkflowStep
              step="05"
              icon={<BrainCircuit className="size-5" />}
              title={t("AI Block Optimization", "एआई ब्लॉक अनुकूलन")}
              description={t(
                "The optimizer scores candidate maintenance windows using maintenance priority, asset risk, traffic impact, freight pressure and consolidation factors.",
                "ऑप्टिमाइज़र प्राथमिकता, परिसंपत्ति जोखिम, यातायात प्रभाव, माल दबाव और समूहीकरण कारकों का उपयोग करके इष्टतम विंडो चुनता है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          5. AI CAPABILITIES
      ========================================================= */}
      <section
        id="ai-capabilities"
        className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 py-16 sm:py-20 lg:py-22"
      >
        <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <SectionIntro
            eyebrow={t("AI CAPABILITIES", "एआई क्षमताएं")}
            title={t(
              "Multiple AI signals. One operational decision.",
              "कई एआई संकेत। एक सशक्त परिचालन निर्णय।",
            )}
            description={t(
              "The intelligence layer is designed around the actual factors that influence railway maintenance planning.",
              "यह इंटेलिजेंस लेयर उन वास्तविक कारकों पर आधारित है जो भारतीय रेल में व्यावहारिक अनुरक्षण योजना को प्रभावित करते हैं।",
            )}
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <CapabilityCard
              icon={<Flame className="size-5 text-orange-600" />}
              signal="SIGNAL 01"
              title={t("Asset Risk", "परिसंपत्ति जोखिम")}
              description={t(
                "Predicts asset-level maintenance risk from condition and historical signals.",
                "परिसंपत्ति की वास्तविक स्थिति, दोषों और ऐतिहासिक विफलता संकेतों से सटीक जोखिम स्कोर का अनुमान लगाता है।",
              )}
            />

            <CapabilityCard
              icon={<TrainFront className="size-5 text-[#003366] dark:text-sky-400" />}
              signal="SIGNAL 02"
              title={t("Traffic Impact", "यातायात प्रभाव")}
              description={t(
                "Estimates operational impact from train movements around a block window.",
                "प्रस्तावित ब्लॉक विंडो के दौरान चलने वाली यात्री, एक्सप्रेस और मालगाड़ियों के संभावित विलंब का अनुमान लगाता है।",
              )}
            />

            <CapabilityCard
              icon={<CalendarRange className="size-5 text-[#137547]" />}
              signal="SIGNAL 03"
              title={t("Goods Forecast", "माल ढुलाई पूर्वानुमान")}
              description={t(
                "Forecasts future freight pressure for corridor-aware planning.",
                "कॉरिडोर आधारित ब्लॉक योजना के लिए औद्योगिक मांग और भविष्य के माल ढुलाई दबाव का सटीक पूर्वानुमान करता है।",
              )}
            />

            <CapabilityCard
              icon={<BrainCircuit className="size-5 text-purple-600 dark:text-purple-400" />}
              signal="UNIFIED ENGINE"
              title={t("Block Intelligence", "ब्लॉक इंटेलिजेंस")}
              description={t(
                "Combines multiple signals into an explainable block assessment.",
                "सभी परिचालन संकेतों को जोड़कर एक पारदर्शी, व्याख्यात्मक और संतुलित ब्लॉक मूल्यांकन प्रदान करता है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          6. WHY IT MATTERS
      ========================================================= */}
      <section
        id="why-it-matters"
        className="border-b border-slate-200 bg-[#f6f8fb] dark:border-slate-800 dark:bg-slate-950 py-16 sm:py-20 lg:py-22"
      >
        <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            {/* LEFT */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#003366] dark:text-sky-400">
                {t("WHY IT MATTERS", "क्यों महत्वपूर्ण है")}
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#071126] sm:text-4xl lg:text-[44px] leading-tight dark:text-white">
                {t(
                  "What the planner gets from RailWise AI.",
                  "RailWise AI से रेलवे प्लानर को क्या मिलता है।",
                )}
              </h2>

              <p className="mt-4 max-w-xl text-[15px] sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {t(
                  "The objective is not simply to generate blocks. It is to improve the quality and transparency of the maintenance decision.",
                  "उद्देश्य केवल स्वचालित रूप से ब्लॉक बनाना नहीं है। वास्तविक लक्ष्य निर्णय लेने की गुणवत्ता, सुरक्षा और पारदर्शिता में सुधार करना है।",
                )}
              </p>
            </div>

            {/* RIGHT - 4 COMPACT BENEFIT CARDS */}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <BenefitCard
                title={t("Better Prioritization", "बेहतर प्राथमिकता")}
                text={t(
                  "Maintenance urgency and asset risk are considered before selecting a window.",
                  "किसी भी विंडो को चुनने से पहले अनुरक्षण तात्कालिकता और परिसंपत्ति जोखिम की गहन जांच की जाती है।",
                )}
              />

              <BenefitCard
                title={t("Lower Disruption", "न्यूनतम व्यवधान")}
                text={t(
                  "Traffic impact is considered before recommending a maintenance window.",
                  "ब्लॉक की अनुशंसा से पहले ट्रेन समय-सारिणी और यात्रियों की सुविधा का पूर्ण ध्यान रखा जाता है।",
                )}
              />

              <BenefitCard
                title={t("Better Consolidation", "सशक्त समूहीकरण (शैडो ब्लॉक)")}
                text={t(
                  "Compatible maintenance activities can be grouped into efficient blocks.",
                  "ट्रैक, सिग्नल और ओएचई की संयुक्त गतिविधियों को एक ही समय में समूहीकृत कर लाइन बंद समय बचाया जाता है।",
                )}
              />

              <BenefitCard
                title={t("Explainable AI", "व्याख्यात्मक एआई")}
                text={t(
                  "The system exposes the operational factors behind its recommendation.",
                  "सिस्टम प्रत्येक सिफारिश के पीछे के परिचालन कारणों और गणनाओं को स्पष्ट रूप से प्रस्तुत करता है।",
                )}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. DECISION INTELLIGENCE CTA (DARK BLUE COMPACT)
      ========================================================= */}
      <section className="bg-[#003366] text-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[10px] font-mono font-extrabold uppercase tracking-[0.24em] text-[#FF9933]">
                {t("DECISION INTELLIGENCE", "निर्णय इंटेलिजेंस")}
              </p>

              <h2 className="mt-1.5 max-w-3xl text-2xl font-black leading-tight sm:text-3xl lg:text-4xl text-white">
                {t(
                  "From “Where can we put the block?” to “Why is this the right window?”",
                  "“ब्लॉक कहाँ रखें?” से “यह विंडो क्यों सबसे उपयुक्त है?” तक।",
                )}
              </h2>

              <p className="mt-3 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-slate-200">
                {t(
                  "RailWise AI supports planners with data-driven recommendations while keeping operational validation and authorized human decisions in the loop.",
                  "RailWise AI साक्ष्य-आधारित डेटा अनुशंसाओं के माध्यम से प्लानर की सहायता करता है, जबकि अंतिम परिचालन सत्यापन और निर्णय अधिकृत रेलवे अधिकारियों के हाथ में रहता है।",
                )}
              </p>
            </div>

            <Button
              asChild
              className="h-12 bg-white px-7 font-extrabold text-[#003366] hover:bg-slate-100 rounded-[2px] cursor-pointer shadow-md text-sm"
            >
              <Link to="/dashboard">
                {signedIn
                  ? t("ENTER PLATFORM →", "प्लेटफॉर्म खोलें →")
                  : t("EXPLORE PLATFORM →", "प्लेटफॉर्म देखें →")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================
          8. HUMAN-IN-THE-LOOP NOTICE (COMPACT OFFICIAL NOTICE)
      ========================================================= */}
      <section className="bg-[#f6f8fb] dark:bg-slate-950 py-5 sm:py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-[1480px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center border border-slate-300 bg-white px-5 py-3.5 sm:gap-4 dark:border-slate-700 dark:bg-slate-900 rounded-[2px]">
            <ShieldCheck className="size-5 shrink-0 text-[#003366] dark:text-sky-400" />

            <div className="min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#003366] dark:text-sky-400">
                {t(
                  "HUMAN-IN-THE-LOOP OPERATIONAL DECISION SUPPORT",
                  "मानवीय नियंत्रण आधारित परिचालन निर्णय समर्थन",
                )}
              </h3>

              <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400 mt-0.5">
                {t(
                  "AI recommendations are intended to support authorized railway planning and operational validation. Final decisions remain subject to applicable railway procedures and responsible officials.",
                  "एआई अनुशंसाएं अधिकृत रेलवे योजना और परिचालन सत्यापन में सहायता के लिए हैं। अंतिम निर्णय लागू रेलवे प्रक्रियाओं और जिम्मेदार अधिकारियों के अधीन रहते हैं।",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =============================================================
   REUSABLE UI COMPONENTS FOR CONTENT AREA
============================================================= */

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-4xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#003366] dark:text-sky-400">
        {eyebrow}
      </p>

      <h2 className="mt-1.5 text-3xl font-black leading-[1.1] tracking-tight text-[#071126] sm:text-4xl lg:text-[46px] dark:text-white">
        {title}
      </h2>

      <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-3xl">
        {description}
      </p>
    </div>
  );
}

function DecisionSignal({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-950 rounded-[2px]">
      <div className="flex size-9 shrink-0 items-center justify-center bg-slate-100 text-[#003366] dark:bg-slate-800 dark:text-sky-400 rounded-[2px]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{value}</p>
      </div>
    </div>
  );
}

function ChallengeCard({
  number,
  icon,
  badge,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between border border-slate-200 bg-white p-6 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 rounded-[2px] min-h-[260px]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center bg-slate-100 text-[#003366] dark:bg-slate-800 dark:text-sky-400 rounded-[2px]">
            {icon}
          </div>

          <span className="text-2xl font-black font-mono text-slate-300 dark:text-slate-700">
            {number}
          </span>
        </div>

        <span className="mt-4 inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-[#003366] dark:text-sky-400">
          {badge}
        </span>

        <h3 className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
          {title}
        </h3>

        <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function SolutionCard({
  phase,
  number,
  icon,
  title,
  description,
}: {
  phase: string;
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between border-2 border-slate-200 bg-[#f8fafc] p-6 sm:p-7 dark:border-slate-800 dark:bg-slate-950 rounded-[2px] min-h-[270px] shadow-xs hover:border-[#003366] dark:hover:border-sky-700 transition-colors">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 bg-[#003366] text-white rounded-[2px] tracking-wider">
            {phase}
          </span>

          <span className="text-xl font-mono font-black text-slate-400 dark:text-slate-600">
            {number}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px]">
            {icon}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
            {title}
          </h3>
        </div>

        <p className="mt-3.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function WorkflowStep({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex flex-col justify-between border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 rounded-[2px] min-h-[250px]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center bg-[#003366] text-white rounded-[2px]">
            {icon}
          </div>

          <span className="text-xs font-mono font-black text-[#003366] dark:text-sky-400 tracking-wider">
            STEP {step}
          </span>
        </div>

        <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white leading-snug">
          {title}
        </h3>

        <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function CapabilityCard({
  icon,
  signal,
  title,
  description,
}: {
  icon: React.ReactNode;
  signal: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 rounded-[2px] shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition-colors">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center border border-slate-200 bg-slate-50 text-[#003366] dark:border-slate-700 dark:bg-slate-800 dark:text-sky-400 rounded-[2px]">
            {icon}
          </div>

          <span className="text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-[2px]">
            {signal}
          </span>
        </div>

        <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">{title}</h3>

        <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function BenefitCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 rounded-[2px] shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#137547] dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
        </div>

        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            {title}
          </h3>

          <p className="mt-1.5 text-[13px] sm:text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
