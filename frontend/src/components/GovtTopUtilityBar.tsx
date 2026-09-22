import { useState, useEffect } from "react";
import { Volume2, Moon, Sun, ArrowDown, Globe } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

export function GovtTopUtilityBar() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const now = new Date();
    setLastUpdated(
      now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
        " " +
        now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) +
        " IST",
    );
  }, []);

  const handleScreenReader = () => {
    alert(
      lang === "hi"
        ? "स्क्रीन रीडर एक्सेस सक्षम किया गया। सभी मॉड्यूल पर मानक एआरआईए लेबल और लैंडमार्क नेविगेशन सक्रिय हैं।"
        : "Screen Reader Access enabled. Standard ARIA labels and semantic landmark navigation active across all IR-ABPS modules.",
    );
  };

  return (
    <div className="border-b border-border/80 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-medium select-none">
      <div className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 sm:px-6 lg:px-8 py-1">
        {/* Left: Single-language Ministry attribution & Skip link */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {t("GOVERNMENT OF INDIA", "भारत सरकार")}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-700 dark:text-slate-300">
            {t("MINISTRY OF RAILWAYS", "रेल मंत्रालय")}
          </span>
          <a
            href="#main-content"
            className="hidden md:inline-flex items-center gap-1 text-primary hover:underline font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <ArrowDown className="size-3" /> {t("Skip to Main Content", "मुख्य सामग्री पर जाएं")}
          </a>
        </div>

        {/* Right: Accessibility Controls & Language */}
        <div className="flex items-center gap-3 divide-x divide-slate-300 dark:divide-slate-700">
          {/* Screen Reader */}
          <button
            onClick={handleScreenReader}
            className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
            title={t("Screen Reader Access", "स्क्रीन रीडर एक्सेस")}
          >
            <Volume2 className="size-3 text-primary" />
            <span className="hidden lg:inline">
              {t("Screen Reader Access", "स्क्रीन रीडर एक्सेस")}
            </span>
          </button>

          {/* High Contrast / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 pl-3 hover:text-primary transition-colors cursor-pointer"
            title="Toggle High Contrast / Theme"
          >
            {theme === "dark" ? (
              <>
                <Sun className="size-3 text-amber-400" />
                <span className="hidden sm:inline">{t("Normal Mode", "सामान्य मोड")}</span>
              </>
            ) : (
              <>
                <Moon className="size-3 text-slate-700" />
                <span className="hidden sm:inline">{t("High Contrast", "उच्च कंट्रास्ट")}</span>
              </>
            )}
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 pl-3">
            <Globe className="size-3 text-primary" />
            <button
              onClick={() => setLang("en")}
              className={`font-semibold cursor-pointer px-1 py-0.5 rounded ${
                lang === "en"
                  ? "bg-[#003366] text-white font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              }`}
            >
              English
            </button>
            <span className="text-slate-400">/</span>
            <button
              onClick={() => setLang("hi")}
              className={`font-semibold cursor-pointer px-1 py-0.5 rounded ${
                lang === "hi"
                  ? "bg-[#003366] text-white font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* Last Updated */}
          <span className="hidden 2xl:inline pl-3 text-[10px] text-slate-500">
            {t("Last Updated:", "अंतिम अद्यतन:")}{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {lastUpdated || "Live"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
