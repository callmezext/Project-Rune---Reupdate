import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runAIChat, getStoredAIConfig, ChatMessage } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    const { apiKey, apiKeys, model } = await getStoredAIConfig();
    const activeKeys = apiKeys && apiKeys.length > 0 ? apiKeys : (apiKey ? [apiKey] : []);
    if (activeKeys.length === 0) {
      return NextResponse.json({
        error: "API key Gemini belum dikonfigurasi. Silakan set di Settings → AI Assistant.",
      }, { status: 400 });
    }

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];

    const reply = await runAIChat(
      activeKeys,
      model,
      chatHistory,
      message,
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
