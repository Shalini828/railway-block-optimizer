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
          OFFICIAL BULLETIN
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
          HERO
      ========================================================= */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute right-[-80px] top-[-80px] hidden opacity-[0.035] lg:block">
          <GovtNationalEmblem className="size-[430px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
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
                  className="h-10 bg-[#003366] px-5 font-bold text-white hover:bg-[#00264d]"
                >
                  <a href="#how-it-works">
                    <BrainCircuit className="mr-2 size-4" />
                    {t("See How It Works", "यह कैसे काम करता है")}
                  </a>
                </Button>

                <Button asChild variant="outline" className="h-10 border-slate-400 px-5 font-bold">
                  <a href="#problem">
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
              <div className="border border-slate-200 bg-[#f8fafc] p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      AI DECISION ENGINE
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#003366] dark:text-sky-400">
                      Block Intelligence
                    </h2>
                  </div>

                  <div className="flex size-11 items-center justify-center bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
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

                <div className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
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
          PROBLEM
      ========================================================= */}
      <section
        id="problem"
        className="border-b border-slate-200 bg-[#f6f8fb] dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-[1500px] px-6 py-14 sm:px-10 lg:px-14 ">
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

          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <ProblemCard
              number="01"
              icon={<FileText className="size-5" />}
              title={t("Many Maintenance Requests", "कई अनुरक्षण अनुरोध")}
              description={t(
                "Track, signal and electrical departments continuously generate maintenance requirements with different priorities, assets and durations.",
                "ट्रैक, सिग्नल और विद्युत विभाग अलग-अलग प्राथमिकताओं, परिसंपत्तियों और अवधि के साथ अनुरक्षण आवश्यकताएं उत्पन्न करते हैं।",
              )}
            />

            <ProblemCard
              number="02"
              icon={<LayoutDashboard className="size-5" />}
              title={t("Train Movement", "ट्रेन संचालन")}
              description={t(
                "A proposed block can interact with passenger, express, goods and special train movements.",
                "प्रस्तावित ब्लॉक यात्री, एक्सप्रेस, माल और विशेष ट्रेनों की आवाजाही को प्रभावित कर सकता है।",
              )}
            />

            <ProblemCard
              number="03"
              icon={<ShieldAlert className="size-5" />}
              title={t("Asset Safety", "परिसंपत्ति सुरक्षा")}
              description={t(
                "Critical assets, defects and maintenance history can indicate where maintenance urgency is higher.",
                "महत्वपूर्ण परिसंपत्तियां, दोष और अनुरक्षण इतिहास अधिक अनुरक्षण प्राथमिकता वाले क्षेत्रों की पहचान करने में मदद करते हैं।",
              )}
            />

            <ProblemCard
              number="04"
              icon={<CalendarRange className="size-5" />}
              title={t("Limited Block Windows", "सीमित ब्लॉक विंडो")}
              description={t(
                "Available track time is limited, so maintenance work needs to be planned efficiently without unnecessary disruption.",
                "उपलब्ध ट्रैक समय सीमित है, इसलिए अनावश्यक व्यवधान के बिना अनुरक्षण कार्य की कुशल योजना आवश्यक है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          SOLUTION
      ========================================================= */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-[1500px] px-6 py-14 sm:px-10 lg:px-14">
          <SectionIntro
            eyebrow={t("THE SOLUTION", "समाधान")}
            title={t(
              "One intelligence layer for the complete maintenance decision.",
              "पूरे अनुरक्षण निर्णय के लिए एक इंटेलिजेंस लेयर।",
            )}
            description={t(
              "Instead of looking at maintenance, assets and traffic separately, RailWise AI brings them together before recommending a maintenance window.",
              "अनुरक्षण, परिसंपत्ति और यातायात को अलग-अलग देखने के बजाय RailWise AI ब्लॉक की अनुशंसा से पहले इन सभी संकेतों को एक साथ देखता है।",
            )}
          />

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            <SolutionCard
              number="01"
              icon={<ShieldAlert className="size-5" />}
              title={t("Understand Asset Risk", "परिसंपत्ति जोखिम समझें")}
              description={t(
                "The ML risk model evaluates asset condition, criticality, defects and maintenance history to estimate maintenance risk.",
                "ML मॉडल परिसंपत्ति की स्थिति, महत्वपूर्णता, दोष और अनुरक्षण इतिहास का विश्लेषण करके अनुरक्षण जोखिम का अनुमान लगाता है।",
              )}
            />

            <SolutionCard
              number="02"
              icon={<LayoutDashboard className="size-5" />}
              title={t("Understand Operational Impact", "परिचालन प्रभाव समझें")}
              description={t(
                "The system evaluates train movements and corridor conditions to estimate the operational impact of a proposed maintenance window.",
                "सिस्टम ट्रेन संचालन और कॉरिडोर स्थितियों का मूल्यांकन करके प्रस्तावित अनुरक्षण विंडो के परिचालन प्रभाव का अनुमान लगाता है।",
              )}
            />

            <SolutionCard
              number="03"
              icon={<BrainCircuit className="size-5" />}
              title={t("Generate the Block Plan", "ब्लॉक योजना तैयार करें")}
              description={t(
                "The optimizer combines maintenance priority, asset risk, traffic impact, freight pressure and consolidation opportunities to select suitable windows.",
                "ऑप्टिमाइज़र अनुरक्षण प्राथमिकता, परिसंपत्ति जोखिम, यातायात प्रभाव, माल दबाव और समूहीकरण अवसरों को मिलाकर उपयुक्त विंडो चुनता है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section
        id="how-it-works"
        className="border-b border-slate-200 bg-[#f6f8fb] dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-[1500px] px-6 py-14 sm:px-10 lg:px-14">
          <SectionIntro
            eyebrow={t("HOW IT WORKS", "यह कैसे काम करता है")}
            title={t(
              "From maintenance request to explainable block recommendation.",
              "अनुरक्षण अनुरोध से व्याख्यात्मक ब्लॉक अनुशंसा तक।",
            )}
            description={t(
              "RailWise AI turns operational data into a structured decision workflow.",
              "RailWise AI परिचालन डेटा को एक संरचित निर्णय प्रक्रिया में बदलता है।",
            )}
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            <WorkflowStep
              step="01"
              icon={<FileText className="size-5" />}
              title={t("Maintenance Requests", "अनुरक्षण अनुरोध")}
              description={t(
                "Requests enter the planning workflow with task type, asset, duration, department and priority.",
                "अनुरोध कार्य प्रकार, परिसंपत्ति, अवधि, विभाग और प्राथमिकता के साथ योजना प्रक्रिया में आते हैं।",
              )}
            />

            <WorkflowStep
              step="02"
              icon={<ShieldAlert className="size-5" />}
              title={t("Asset Risk Analysis", "परिसंपत्ति जोखिम विश्लेषण")}
              description={t(
                "The ML model evaluates asset condition and historical maintenance signals.",
                "ML मॉडल परिसंपत्ति की स्थिति और ऐतिहासिक अनुरक्षण संकेतों का मूल्यांकन करता है।",
              )}
            />

            <WorkflowStep
              step="03"
              icon={<LayoutDashboard className="size-5" />}
              title={t("Traffic Intelligence", "यातायात इंटेलिजेंस")}
              description={t(
                "Train movements overlapping potential block windows are evaluated for operational impact.",
                "संभावित ब्लॉक विंडो में आने वाली ट्रेन गतिविधियों का परिचालन प्रभाव जांचा जाता है।",
              )}
            />

            <WorkflowStep
              step="04"
              icon={<CalendarRange className="size-5" />}
              title={t("Freight Forecast", "माल ढुलाई पूर्वानुमान")}
              description={t(
                "Goods demand is forecast for the corridor so planning can account for future freight pressure.",
                "कॉरिडोर के लिए माल मांग का पूर्वानुमान लगाया जाता है ताकि भविष्य के माल दबाव को ध्यान में रखा जा सके।",
              )}
            />

            <WorkflowStep
              step="05"
              icon={<BrainCircuit className="size-5" />}
              title={t("AI Block Optimization", "एआई ब्लॉक अनुकूलन")}
              description={t(
                "The optimizer scores candidate windows and produces an explainable recommendation.",
                "ऑप्टिमाइज़र संभावित विंडो का स्कोर करता है और व्याख्यात्मक अनुशंसा तैयार करता है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          AI CAPABILITIES
      ========================================================= */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-[1500px] px-6 py-14 sm:px-10 lg:px-14">
          <SectionIntro
            eyebrow={t("AI CAPABILITIES", "एआई क्षमताएं")}
            title={t(
              "Multiple AI signals. One operational decision.",
              "कई एआई संकेत। एक परिचालन निर्णय।",
            )}
            description={t(
              "The intelligence layer is designed around the actual factors that influence railway maintenance planning.",
              "इंटेलिजेंस लेयर उन वास्तविक कारकों के आधार पर बनाई गई है जो रेलवे अनुरक्षण योजना को प्रभावित करते हैं।",
            )}
          />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CapabilityCard
              icon={<ShieldAlert className="size-5" />}
              title={t("Asset Risk", "परिसंपत्ति जोखिम")}
              description={t(
                "Predicts asset-level maintenance risk from condition and historical signals.",
                "स्थिति और ऐतिहासिक संकेतों से परिसंपत्ति-स्तरीय अनुरक्षण जोखिम का अनुमान।",
              )}
            />

            <CapabilityCard
              icon={<LayoutDashboard className="size-5" />}
              title={t("Traffic Impact", "यातायात प्रभाव")}
              description={t(
                "Estimates operational impact from train movements around a block window.",
                "ब्लॉक विंडो के आसपास ट्रेन संचालन से होने वाले परिचालन प्रभाव का अनुमान।",
              )}
            />

            <CapabilityCard
              icon={<CalendarRange className="size-5" />}
              title={t("Goods Forecast", "माल पूर्वानुमान")}
              description={t(
                "Forecasts future freight pressure for corridor-aware planning.",
                "कॉरिडोर आधारित योजना के लिए भविष्य के माल दबाव का पूर्वानुमान।",
              )}
            />

            <CapabilityCard
              icon={<BrainCircuit className="size-5" />}
              title={t("Block Intelligence", "ब्लॉक इंटेलिजेंस")}
              description={t(
                "Combines multiple signals into an explainable block assessment.",
                "कई संकेतों को एक व्याख्यात्मक ब्लॉक मूल्यांकन में जोड़ता है।",
              )}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          WHAT PLANNER GETS
      ========================================================= */}
      <section className="border-b border-slate-200 bg-[#f6f8fb] dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-[1500px] px-6 py-14 sm:px-10 lg:px-14">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#003366] dark:text-sky-400">
                {t("WHY IT MATTERS", "क्यों महत्वपूर्ण है")}
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#071126] sm:text-4xl dark:text-white">
                {t(
                  "What the planner gets from RailWise AI.",
                  "RailWise AI से प्लानर को क्या मिलता है।",
                )}
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t(
                  "The objective is not simply to generate blocks. It is to improve the quality and transparency of the maintenance decision.",
                  "उद्देश्य केवल ब्लॉक बनाना नहीं है। उद्देश्य अनुरक्षण निर्णय की गुणवत्ता और पारदर्शिता को बेहतर बनाना है।",
                )}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <BenefitCard
                title={t("Better Prioritization", "बेहतर प्राथमिकता")}
                text={t(
                  "Maintenance urgency and asset risk are considered before selecting a window.",
                  "विंडो चुनने से पहले अनुरक्षण प्राथमिकता और परिसंपत्ति जोखिम को ध्यान में रखा जाता है।",
                )}
              />

              <BenefitCard
                title={t("Lower Disruption", "कम व्यवधान")}
                text={t(
                  "Traffic impact is considered before recommending a maintenance window.",
                  "अनुरक्षण विंडो की अनुशंसा से पहले यातायात प्रभाव पर विचार किया जाता है।",
                )}
              />

              <BenefitCard
                title={t("Better Consolidation", "बेहतर समूहीकरण")}
                text={t(
                  "Compatible maintenance activities can be grouped into efficient blocks.",
                  "संगत अनुरक्षण गतिविधियों को अधिक कुशल ब्लॉकों में जोड़ा जा सकता है।",
                )}
              />

              <BenefitCard
                title={t("Explainable AI", "व्याख्यात्मक एआई")}
                text={t(
                  "The system exposes the operational factors behind its recommendation.",
                  "सिस्टम अपनी अनुशंसा के पीछे मौजूद परिचालन कारकों को दिखाता है।",
                )}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          HUMAN IN THE LOOP
      ========================================================= */}
      <section className="bg-[#003366] text-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="grid items-center gap-7 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-300">
                {t("DECISION INTELLIGENCE", "निर्णय इंटेलिजेंस")}
              </p>

              <h2 className="mt-2 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">
                {t(
                  "From “Where can we put the block?” to “Why is this the right window?”",
                  "“ब्लॉक कहाँ रखें?” से “यह विंडो क्यों उपयुक्त है?” तक।",
                )}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                {t(
                  "RailWise AI supports planners with data-driven recommendations while keeping operational validation and authorized human decisions in the loop.",
                  "RailWise AI डेटा आधारित अनुशंसाओं के माध्यम से प्लानर की सहायता करता है, जबकि परिचालन सत्यापन और अधिकृत मानवीय निर्णय प्रक्रिया में बने रहते हैं।",
                )}
              </p>
            </div>

            <Button
              asChild
              className="h-11 bg-white px-6 font-bold text-[#003366] hover:bg-slate-100"
            >
              <Link to="/dashboard">
                {signedIn
                  ? t("Enter Platform", "प्लेटफॉर्म खोलें")
                  : t("Explore Platform", "प्लेटफॉर्म देखें")}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL TRUST / COMPLIANCE STRIP
      ========================================================= */}
      <section className="bg-[#f6f8fb] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 border border-slate-300 bg-white px-4 py-4 sm:flex-row sm:items-start sm:gap-4 dark:border-slate-700 dark:bg-slate-900">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#003366] dark:text-sky-400" />

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#003366] dark:text-sky-400">
                {t(
                  "Human-in-the-loop operational decision support",
                  "मानवीय नियंत्रण आधारित परिचालन निर्णय सहायता",
                )}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
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
   SMALL REUSABLE UI COMPONENTS
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
    <div className="max-w-5xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#003366] dark:text-sky-400">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-4xl font-black leading-[1.08] tracking-tight text-[#071126] sm:text-5xl lg:text-[52px] dark:text-white">
        {title}
      </h2>

      <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
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
    <div className="flex items-center gap-3 border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex size-9 shrink-0 items-center justify-center bg-slate-100 text-[#003366] dark:bg-slate-800 dark:text-sky-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{value}</p>
      </div>
    </div>
  );
}

function ProblemCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[245px] border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center bg-slate-100 text-[#003366] dark:bg-slate-800 dark:text-sky-400">
          {icon}
        </div>

        <span className="text-3xl font-black text-slate-100 dark:text-slate-800">{number}</span>
      </div>
      <h3 className="mt-6 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function SolutionCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[250px] border border-slate-200 bg-[#f8fafc] p-7 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div className="flex size-12 items-center justify-center bg-[#003366] text-white">
          {icon}
        </div>

        <span className="text-4xl font-black text-slate-200 dark:text-slate-800">{number}</span>
      </div>
      <h3 className="mt-6 text-lg font-black text-slate-900 dark:text-white">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
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
<div className="relative min-h-[245px] border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg lg:-ml-px lg:first:ml-0 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex size-12 items-center justify-center bg-[#003366] text-white">{icon}</div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#003366] dark:text-sky-400">
        STEP {step}
      </p>
<h3 className="mt-2 text-base font-black text-slate-900 dark:text-white">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function CapabilityCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex size-10 items-center justify-center border border-slate-200 bg-slate-50 text-[#003366] dark:border-slate-700 dark:bg-slate-800 dark:text-sky-400">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function BenefitCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>

          <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-400">{text}</p>
        </div>
      </div>
    </div>
  );
}
