"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export default function GlitchText({ children }: { children: string }) {
  const [display, setDisplay] = useState(children);
  const [glitchBorder, setGlitchBorder] = useState(false);
  const rafRef = useRef<number>(0);
  const busyRef = useRef(false);
  const original = children;

  const scramble = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setGlitchBorder(true);

    const chars = original.split("");
    const total = 12; // fast — ~200ms total
    let frame = 0;

    const resolve = chars.map((_, i) =>
      Math.floor((i / chars.length) * total * 0.6) + Math.floor(Math.random() * 3)
    );

    const tick = () => {
      frame++;
      const out = chars.map((ch, i) => {
        if (ch === " ") return " ";
        if (frame >= resolve[i]) return ch;
        return LETTERS[Math.floor(Math.random() * LETTERS.length)];
      });
      setDisplay(out.join(""));

      if (frame < total) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(original);
        busyRef.current = false;
        setTimeout(() => setGlitchBorder(false), 150);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [original]);

  useEffect(() => {
    const t = setTimeout(() => scramble(), 600);
    const iv = setInterval(() => scramble(), 3000);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
      cancelAnimationFrame(rafRef.current);
    };
  }, [scramble]);

  return (
    <>
      <style>{`
        .scramble-wrap {
          position: relative;
          display: inline;
          padding: 0 6px;
        }

        .scramble-wrap::before,
        .scramble-wrap::after {
          content: '';
          position: absolute;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.05s;
        }

        /* Top-left corner bracket */
        .scramble-wrap::before {
          top: -4px;
          left: -2px;
          width: 14px;
          height: 14px;
          border-top: 2px solid #A78BFA;
          border-left: 2px solid #A78BFA;
        }

        /* Bottom-right corner bracket */
        .scramble-wrap::after {
          bottom: -4px;
          right: -2px;
          width: 14px;
          height: 14px;
          border-bottom: 2px solid #EC4899;
          border-right: 2px solid #EC4899;
        }

        .scramble-wrap.active::before,
        .scramble-wrap.active::after {
          opacity: 1;
        }

        .scramble-wrap.active::before {
          animation: corner-glitch-tl 200ms steps(3) forwards;
        }

        .scramble-wrap.active::after {
          animation: corner-glitch-br 200ms steps(3) forwards;
        }

        @keyframes corner-glitch-tl {
          0%   { transform: translate(-4px, -2px); opacity: 1; }
          33%  { transform: translate(2px, 1px); opacity: 0.7; }
          66%  { transform: translate(-1px, -1px); opacity: 1; }
          100% { transform: translate(0); opacity: 0.8; }
        }

        @keyframes corner-glitch-br {
          0%   { transform: translate(4px, 2px); opacity: 1; }
          33%  { transform: translate(-2px, -1px); opacity: 0.7; }
          66%  { transform: translate(1px, 1px); opacity: 1; }
          100% { transform: translate(0); opacity: 0.8; }
        }
      `}</style>
      <span className={`scramble-wrap gradient-text ${glitchBorder ? "active" : ""}`}>
        {display}
      </span>
    </>
  );
}
