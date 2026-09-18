import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "hi";

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (en: string, hi: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_STORAGE_KEY = "ir-abps-lang";

export function LanguageProvider({
  children,
  defaultLang = "en",
}: {
  children: ReactNode;
  defaultLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
      if (stored === "en" || stored === "hi") {
        return stored;
      }
    }
    return defaultLang;
  });

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const t = (en: string, hi: string) => {
    return lang === "hi" ? hi : en;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
