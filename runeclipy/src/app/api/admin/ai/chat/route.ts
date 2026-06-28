import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runAIChat, getStoredAIConfig, ChatMessage } from "@/lib/gemini";
import { getClientIP, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const ip = getClientIP(req);
    const { limited } = rateLimit(`admin-ai:${session.userId}:${ip}`, 20, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: "Terlalu banyak request. Coba lagi sebentar." }, { status: 429 });
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length > 4000) {
      return NextResponse.json({ error: "Pesan tidak valid atau terlalu panjang" }, { status: 400 });
    }

    const { apiKey, apiKeys, model } = await getStoredAIConfig();
    const activeKeys = apiKeys && apiKeys.length > 0 ? apiKeys : (apiKey ? [apiKey] : []);
    if (activeKeys.length === 0) {
      return NextResponse.json({
        error: "API key Gemini belum dikonfigurasi. Silakan set di Settings → AI Assistant.",
      }, { status: 400 });
    }

    const chatHistory: ChatMessage[] = Array.isArray(history)
      ? history.slice(-40).flatMap((item): ChatMessage[] => {
          if (!item || (item.role !== "user" && item.role !== "model") || !Array.isArray(item.parts)) return [];
          const text = item.parts[0]?.text;
          if (typeof text !== "string") return [];
          return [{ role: item.role, parts: [{ text: text.slice(0, 4000) }] }];
        })
      : [];

    const reply = await runAIChat(
      activeKeys,
      model,
      chatHistory,
      message.trim(),
      session.userId,
      session.username
    );

    return NextResponse.json({ success: true, reply });
  } catch (error: unknown) {
    console.error("AI chat error:", error);
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
