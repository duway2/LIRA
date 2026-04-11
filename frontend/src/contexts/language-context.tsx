"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Language = "id" | "en";

type LanguageContextValue = {
  language: Language;
  changeLanguage: (nextLanguage: Language) => void;
  toggleLanguage: () => void;
  t: (idText: string, enText: string) => string;
};

const LANGUAGE_STORAGE_KEY = "lira-language";

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "id";
    }

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "id" || stored === "en") {
      return stored;
    }

    return "id";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const changeLanguage = useCallback((nextLanguage: Language) => {
    setLanguage(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "id" ? "en" : "id"));
  }, []);

  const t = useCallback(
    (idText: string, enText: string) => (language === "id" ? idText : enText),
    [language],
  );

  const value = useMemo(
    () => ({ language, changeLanguage, toggleLanguage, t }),
    [changeLanguage, language, t, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
