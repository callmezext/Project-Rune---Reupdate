"use client";

import { useEffect, useRef, useState } from "react";

const GLITCH_CHARS = "!<>-_\\/[]{}—=+*^?#01";

export default function GlitchText({ children }: { children: string }) {
  const [display, setDisplay] = useState(children);
  const original = children;
  const glitchFrames = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (glitchFrames.current === 0 && Math.random() < 0.008) {
        glitchFrames.current = Math.floor(Math.random() * 5) + 3;
      }

      if (glitchFrames.current > 0) {
        const arr = original.split("");
        const num = Math.floor(Math.random() * (arr.length / 3)) + 1;
        for (let i = 0; i < num; i++) {
          const r = Math.floor(Math.random() * arr.length);
          if (arr[r] !== " ") {
            arr[r] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          }
        }
        setDisplay(arr.join(""));
        glitchFrames.current--;
      } else {
        setDisplay(original);
      }

      timer = setTimeout(tick, 50);
    };

    timer = setTimeout(tick, 50);
    return () => clearTimeout(timer);
  }, [original]);

  return (
    <>
      <style>{`
        .cyber-glitch-text {
          position: relative;
          display: inline-block;
          background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 60%, #A78BFA 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: glitchDrop 4s infinite;
        }

        @keyframes glitchDrop {
          0%, 10%, 100% {
            filter: drop-shadow(0 0 0 transparent);
            transform: translate(0) skew(0deg);
          }
          2% {
            filter: drop-shadow(4px 2px 0px #A78BFA) drop-shadow(-4px -2px 0px #EC4899);
            transform: translate(-3px, 1px) skew(3deg);
          }
          4% {
            filter: drop-shadow(-5px -2px 0px #EC4899) drop-shadow(5px 2px 0px #8B5CF6);
            transform: translate(3px, -2px) skew(-3deg);
          }
          6% {
            filter: drop-shadow(0 0 0 transparent);
            transform: translate(0) skew(0deg);
          }
          50%, 60% {
            filter: drop-shadow(0 0 0 transparent);
            transform: translate(0) skew(0deg);
          }
          52% {
            filter: drop-shadow(3px -3px 0px #EC4899) drop-shadow(-3px 3px 0px #A78BFA);
            transform: translate(2px, 2px) skew(-2deg);
          }
          54% {
            filter: drop-shadow(0 0 0 transparent);
            transform: translate(0) skew(0deg);
          }
        }
      `}</style>
      <span className="cyber-glitch-text">{display}</span>
    </>
  );
}
