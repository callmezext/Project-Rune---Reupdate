"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    { code: "en" as const, name: "English", flag: "🇬🇧" },
    { code: "id" as const, name: "Indonesia", flag: "🇮🇩" },
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 sm:w-auto sm:px-3 rounded-xl flex items-center justify-center gap-1.5 text-text-muted hover:bg-bg-tertiary/40 hover:text-text-primary transition-all border border-transparent hover:border-white/[0.04] backdrop-blur-md"
        title="Change Language"
      >
        <span className="text-sm sm:text-base leading-none">{currentLang.flag}</span>
        <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">{currentLang.code}</span>
        <svg
          className={cn("w-3.5 h-3.5 text-text-muted transition-transform duration-200", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-40 bg-bg-secondary/95 border border-border/70 rounded-2xl shadow-2xl p-1.5 z-50 animate-fadeInUp backdrop-blur-md">
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">Language</div>
          <div className="border-t border-border/55 my-1" />
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLanguage(l.code);
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-bg-tertiary/60 transition-all duration-200",
                language === l.code ? "bg-accent/15 text-accent-light" : "text-text-secondary"
              )}
            >
              <span className="text-sm leading-none">{l.flag}</span>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
