"use client";

import { useEffect, useState } from "react";

export default function GlobalLoading() {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 15;
      });
    }, 150);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#07050f]/80 backdrop-blur-md animate-fadeIn">
      {/* Premium Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-bg-secondary z-[10000]">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 shadow-[0_0_8px_rgba(139,92,246,0.8)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Pulsing Glowing Crystal Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16 bg-[#0d091e] rounded-2xl flex items-center justify-center border border-accent/30 shadow-2xl shadow-accent/15 animate-pulse">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]"
          >
            <defs>
              <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <path
              d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2z"
              stroke="url(#loadGrad)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 8.5L16.5 12l-7 3.5V8.5z"
              fill="url(#loadGrad)"
            />
          </svg>
        </div>
        <div className="text-xs font-bold text-text-secondary uppercase tracking-widest animate-pulse font-sans">
          Loading...
        </div>
      </div>
    </div>
  );
}
