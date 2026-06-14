"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { translations, TranslationKey } from "@/lib/translations";

type Language = "en" | "id";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read initial language from cookie or localStorage
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang === "en" || savedLang === "id") {
      setLanguageState(savedLang);
    } else {
      // Try to parse from document cookie
      const match = document.cookie.match(/RUNECLIPY_LANG=(en|id)/);
      if (match) {
        setLanguageState(match[1] as Language);
      }
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    
    // Set cookie (expires in 1 year)
    document.cookie = `RUNECLIPY_LANG=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Refresh router so Next.js server components re-run with the updated cookie
    router.refresh();
  };

  const t = (key: TranslationKey): string => {
    const dict = translations[language] || translations.en;
    return (dict[key] || translations.en[key] || key) as string;
  };

  // Prevent hydration mismatch by rendering children only after mounting
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
