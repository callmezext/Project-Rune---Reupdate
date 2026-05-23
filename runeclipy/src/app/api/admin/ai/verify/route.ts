import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyGeminiApiKey } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { apiKey, model } = await req.json();
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return NextResponse.json({ valid: false, error: "API key tidak valid" });
    }

    const result = await verifyGeminiApiKey(apiKey.trim(), model);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI verify error:", error);
    return NextResponse.json({ valid: false, error: "Gagal memverifikasi API key" });
  }
}
