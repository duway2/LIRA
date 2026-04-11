"use client";

import { useLanguage } from "@/contexts/language-context";

type LanguageSwitcherProps = {
  className?: string;
};

export default function LanguageSwitcher({
  className = "",
}: LanguageSwitcherProps) {
  const { language, changeLanguage } = useLanguage();

  const buttonClass = (active: boolean) =>
    `px-2.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide transition-colors ${
      active
        ? "bg-lira-red text-white"
        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
    }`;

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200 ${className}`.trim()}
      aria-label="Language Switcher"
    >
      <button
        type="button"
        onClick={() => changeLanguage("id")}
        className={buttonClass(language === "id")}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        className={buttonClass(language === "en")}
      >
        EN
      </button>
    </div>
  );
}
