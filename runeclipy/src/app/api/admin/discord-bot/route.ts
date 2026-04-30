import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SiteSetting from "@/models/SiteSetting";
import { startBot, stopBot, getBotStatus } from "@/lib/discord-bot";

// GET — bot status
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ success: true, bot: getBotStatus() });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST — start or stop bot
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === "start") {
      await connectDB();
      const settings = await SiteSetting.findOne().lean();
      const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";

      if (!token) {
        return NextResponse.json({ success: false, error: "Bot token belum di-set. Isi di Settings terlebih dahulu." }, { status: 400 });
      }

      const result = await startBot(token);
      // Wait a moment for the bot to connect
      if (result.success) {
        await new Promise((r) => setTimeout(r, 2000));
      }
      return NextResponse.json({ success: result.success, error: result.error, bot: getBotStatus() });
    }

    if (action === "stop") {
      await stopBot();
      return NextResponse.json({ success: true, bot: getBotStatus() });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[BotAPI] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
