"use client";

import { useState, useEffect } from "react";

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  showText?: boolean;
}

export default function Logo({
  className = "",
  iconSize = 20,
  textSize = "text-base",
  showText = true,
}: LogoProps) {
  const [config, setConfig] = useState({ siteName: "RuneClipy", siteLogoUrl: "" });

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setConfig({
            siteName: data.siteName || "RuneClipy",
            siteLogoUrl: data.siteLogoUrl || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {config.siteLogoUrl ? (
        <img
          src={config.siteLogoUrl}
          alt={config.siteName}
          width={iconSize + 10}
          height={iconSize + 10}
          className="object-contain rounded-xl shrink-0"
          style={{ width: `${iconSize + 10}px`, height: `${iconSize + 10}px` }}
        />
      ) : (
        /* Default Premium Glowing Geometric Crystal Logo */
        <div 
          className="relative flex-shrink-0 bg-[#0d091e] rounded-xl flex items-center justify-center border border-accent/25 shadow-md shadow-accent/15 hover:scale-105 active:scale-95 transition-all"
          style={{ width: `${iconSize + 10}px`, height: `${iconSize + 10}px` }}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_0_6px_rgba(139,92,246,0.3)]"
          >
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            {/* Elegant outer geometric crystal */}
            <path
              d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2z"
              stroke="url(#logoGrad)"
              strokeWidth="2.2"
              strokeLinejoin="round"
              className="animate-pulse"
              style={{ animationDuration: '4s' }}
            />
            {/* Glowing inner video-clipping play path */}
            <path
              d="M9.5 8.5L16.5 12l-7 3.5V8.5z"
              fill="url(#logoGrad)"
            />
          </svg>
        </div>
      )}
      {showText && (
        <span className={`${textSize} font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-300 uppercase`}>
          {config.siteName}
        </span>
      )}
    </div>
  );
}
