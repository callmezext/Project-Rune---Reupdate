"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  isAction?: boolean;
}

interface ChatHistoryItem {
  role: "user" | "model";
  parts: { text: string }[];
}

const QUICK_PROMPTS = [
  "📊 Statistik platform hari ini",
  "👥 10 user terbaru",
  "⏳ Submission pending",
  "💰 Transaksi terbaru",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs flex-shrink-0 shadow-lg shadow-accent/20">
        🤖
      </div>
      <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/5 border border-white/10 max-w-[85%]">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  // Safe markdown-like rendering; never render raw HTML from AI output.
  const renderInline = (line: string) => {
    const parts = line.split(/(`[^`]+`|\*\*.*?\*\*)/g).filter(Boolean);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={idx} className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono text-accent-light">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const isBullet = /^[•\-]\s/.test(line);
      const content = isBullet ? line.replace(/^[•\-]\s/, "") : line;

      return (
        <span key={i}>
          {isBullet && <span className="text-accent-light mr-1">•</span>}
          {renderInline(content)}
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div className={cn("flex items-end gap-2 mb-3 animate-fadeIn", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs flex-shrink-0 shadow-lg shadow-accent/20">
          🤖
        </div>
      )}
      <div
        className={cn(
          "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[85%] break-words",
          isUser
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-violet-500/20"
            : "bg-white/5 border border-white/10 text-text-primary rounded-bl-sm backdrop-blur-sm"
        )}
      >
        {msg.isAction && (
          <div className="flex items-center gap-1.5 text-[10px] text-accent-light mb-1.5 font-medium uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-accent-light animate-pulse" />
            Mengeksekusi aksi...
          </div>
        )}
        <div className="whitespace-pre-wrap">{renderContent(msg.content)}</div>
      </div>
    </div>
  );
}

export default function AdminAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Halo! Saya AI Assistant RuneClipy 🤖\n\nSaya bisa membantu kamu mengelola platform — cari user, edit data, analisa statistik, kelola campaign, dan banyak lagi.\n\nMau mulai dengan apa?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [activeModel, setActiveModel] = useState("Gemini 2.0 Flash");
  const [pulseCount, setPulseCount] = useState(0);
  const chatHistory = useRef<ChatHistoryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pulseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active model on mount
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings?.geminiModel) {
          const modelMap: Record<string, string> = {
            "gemini-2.0-flash": "Gemini 2.0 Flash",
            "gemini-2.0-pro-exp-02-05": "Gemini 2.0 Pro Exp",
            "gemini-2.5-flash": "Gemini 2.5 Flash",
            "gemini-2.5-pro": "Gemini 2.5 Pro",
            "gemini-3.5-flash": "Gemini 3.5 Flash",
            "gemini-3.5-pro": "Gemini 3.5 Pro",
          };
          setActiveModel(modelMap[d.settings.geminiModel] || d.settings.geminiModel);
        }
      })
      .catch(console.error);
  }, []);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Pulse animation on bubble when closed
  useEffect(() => {
    if (!open) {
      pulseTimer.current = setInterval(() => {
        setPulseCount((c) => c + 1);
      }, 5000);
    } else {
      if (pulseTimer.current) clearInterval(pulseTimer.current);
    }
    return () => {
      if (pulseTimer.current) clearInterval(pulseTimer.current);
    };
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: chatHistory.current,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errText = data.error || "Terjadi kesalahan. Coba lagi.";
        // Check for API key error
        if (errText.includes("API key") || errText.includes("dikonfigurasi")) {
          setHasApiKey(false);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `❌ ${errText}`,
          },
        ]);
      } else {
        const reply = data.reply as string;
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: reply,
          },
        ]);

        // Update history for context
        chatHistory.current = [
          ...chatHistory.current,
          { role: "user", parts: [{ text: text.trim() }] },
          { role: "model", parts: [{ text: reply }] },
        ];
        // Keep last 20 turns to avoid token overflow
        if (chatHistory.current.length > 40) {
          chatHistory.current = chatHistory.current.slice(-40);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "❌ Gagal terhubung ke server. Periksa koneksi internet.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat dibersihkan. Ada yang bisa saya bantu? 🤖",
      },
    ]);
    chatHistory.current = [];
    setHasApiKey(true);
  };

  return (
    <>
      {/* ── Floating Bubble Button ─────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-2xl shadow-2xl",
          "bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600",
          "flex items-center justify-center text-white text-2xl",
          "transition-all duration-300 hover:scale-110 active:scale-95",
          "shadow-violet-500/40",
          open && "rotate-[360deg] scale-90"
        )}
        aria-label="Toggle AI Assistant"
      >
        {/* Pulse ring */}
        {!open && (
          <span
            key={pulseCount}
            className="absolute inset-0 rounded-2xl bg-violet-500/40 animate-ping"
            style={{ animationDuration: "1.5s", animationIterationCount: "2" }}
          />
        )}
        <span className="relative z-10 transition-transform duration-300">
          {open ? "✕" : "🤖"}
        </span>
      </button>

      {/* ── Chat Window ─────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-[99] w-[380px] max-w-[calc(100vw-24px)]",
          "flex flex-col rounded-2xl overflow-hidden",
          "border border-white/10 shadow-2xl shadow-black/50",
          "backdrop-blur-xl bg-bg-secondary/90",
          "transition-all duration-300 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
        style={{ maxHeight: "min(580px, calc(100vh - 120px))" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-violet-600/10 to-cyan-600/10 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm shadow-lg shadow-accent/20">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-text-primary">AI Admin Assistant</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeModel} • Online
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors text-sm"
              title="Bersihkan chat"
            >
              🗑️
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* No API Key Banner */}
        {!hasApiKey && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2 shrink-0">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              API key belum dikonfigurasi.{" "}
              <a href="/admin/settings" className="underline underline-offset-2 hover:text-amber-200 font-semibold">
                Buka Settings → AI Assistant
              </a>{" "}
              untuk mengatur.
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0 min-h-0">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="text-[11px] px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-accent/30 hover:bg-accent/5 text-text-secondary hover:text-text-primary transition-all disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-3 pb-3 pt-2 border-t border-white/10 shrink-0">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya sesuatu atau beri perintah..."
              disabled={isLoading}
              className={cn(
                "flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm",
                "text-text-primary placeholder:text-text-muted/50",
                "focus:outline-none focus:border-accent/40 focus:bg-white/8",
                "transition-all disabled:opacity-60",
              )}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                "bg-gradient-to-br from-violet-600 to-indigo-600 text-white",
                "hover:from-violet-500 hover:to-indigo-500 active:scale-95",
                "transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                "shadow-lg shadow-violet-500/20"
              )}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-text-muted/40 text-center mt-1.5">
            AI dapat membuat kesalahan. Verifikasi informasi penting.
          </p>
        </div>
      </div>
    </>
  );
}
