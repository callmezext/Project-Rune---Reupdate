"use client";

import { useEffect, useRef, useCallback } from "react";

export default function GlitchText({ children }: { children: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);

  const triggerGlitch = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;

    el.classList.remove("glitching");
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add("glitching");

    setTimeout(() => {
      el.classList.remove("glitching");
    }, 400);
  }, []);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = 2500 + Math.random() * 2000;
      timerId = setTimeout(() => {
        triggerGlitch();
        scheduleNext();
      }, delay);
    };

    // First glitch quickly
    timerId = setTimeout(() => {
      triggerGlitch();
      scheduleNext();
    }, 1200);

    return () => clearTimeout(timerId);
  }, [triggerGlitch]);

  return (
    <>
      {/* Inline styles — Tailwind v4 strips custom CSS from globals.css */}
      <style>{`
        .glitch-wrap {
          position: relative;
          display: inline-block;
        }

        .glitch-base {
          position: relative;
          z-index: 2;
        }

        .glitch-copy {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          user-select: none;
          opacity: 0;
          z-index: 3;
        }

        .glitch-copy-1 {
          color: #A78BFA;
          clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%);
        }

        .glitch-copy-2 {
          color: #EC4899;
          clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%);
        }

        .glitch-wrap.glitching .glitch-copy-1 {
          opacity: 0.85;
          animation: g-slice-1 400ms steps(4) forwards;
        }

        .glitch-wrap.glitching .glitch-copy-2 {
          opacity: 0.75;
          animation: g-slice-2 400ms steps(4) forwards;
        }

        .glitch-wrap.glitching .glitch-base {
          animation: g-base-jitter 400ms steps(6) forwards;
        }

        @keyframes g-slice-1 {
          0%   { transform: translate(-8px, -2px);  opacity: 0.9; }
          25%  { transform: translate(6px, 1px);    opacity: 0.7; }
          50%  { transform: translate(-10px, -1px); opacity: 0.85; }
          75%  { transform: translate(4px, 2px);    opacity: 0.5; }
          100% { transform: translate(0);           opacity: 0; }
        }

        @keyframes g-slice-2 {
          0%   { transform: translate(10px, 2px);   opacity: 0.8; }
          25%  { transform: translate(-6px, -1px);  opacity: 0.9; }
          50%  { transform: translate(8px, 1px);    opacity: 0.7; }
          75%  { transform: translate(-4px, -2px);  opacity: 0.4; }
          100% { transform: translate(0);           opacity: 0; }
        }

        @keyframes g-base-jitter {
          0%   { transform: translate(0); }
          16%  { transform: translate(-2px, 0); }
          33%  { transform: translate(2px, 1px); }
          50%  { transform: translate(-1px, -1px); }
          66%  { transform: translate(1px, 0); }
          83%  { transform: translate(-1px, 1px); }
          100% { transform: translate(0); }
        }
      `}</style>

      <span ref={wrapRef} className="glitch-wrap">
        {/* Base text with gradient */}
        <span className="glitch-base gradient-text">{children}</span>

        {/* Glitch layer 1 — purple, clips top slice */}
        <span className="glitch-copy glitch-copy-1" aria-hidden="true">
          {children}
        </span>

        {/* Glitch layer 2 — pink, clips bottom slice */}
        <span className="glitch-copy glitch-copy-2" aria-hidden="true">
          {children}
        </span>
      </span>
    </>
  );
}
