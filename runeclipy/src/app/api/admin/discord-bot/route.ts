import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import BotStatus from "@/models/BotStatus";

// Helper: get or create bot status doc
async function getBotDoc() {
  let doc = await BotStatus.findOne({ botType: "discord" });
  if (!doc) doc = await BotStatus.create({ botType: "discord" });
  return doc;
}

// GET — bot status
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const doc = await getBotDoc();

    // Check if bot is stale (no heartbeat for 30s = probably dead)
    const isStale = doc.status === "online" && doc.lastHeartbeat &&
      Date.now() - new Date(doc.lastHeartbeat).getTime() > 30000;

    if (isStale) {
      doc.status = "offline";
      doc.command = "idle";
      await doc.save();
    }

    return NextResponse.json({
      success: true,
      bot: {
        status: doc.status,
        command: doc.command,
        error: doc.error,
        username: doc.username,
        avatar: doc.avatar,
        guildCount: doc.guildCount,
        ping: doc.ping,
        startedAt: doc.startedAt?.toISOString() || null,
        uptime: doc.startedAt ? Math.floor((Date.now() - new Date(doc.startedAt).getTime()) / 1000) : 0,
        lastHeartbeat: doc.lastHeartbeat?.toISOString() || null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST — send command to bot
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { action } = await req.json();

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();
    const doc = await getBotDoc();
    doc.command = action;

    // If starting, mark as connecting so UI shows immediately
    if (action === "start" || action === "restart") {
      doc.status = "connecting";
      doc.error = "";
    }
    if (action === "stop") {
      doc.status = "offline";
    }

    await doc.save();

    return NextResponse.json({
      success: true,
      message: `Command '${action}' sent to bot`,
      bot: {
        status: doc.status,
        command: doc.command,
        error: doc.error,
        username: doc.username,
        avatar: doc.avatar,
        guildCount: doc.guildCount,
        ping: doc.ping,
        startedAt: doc.startedAt?.toISOString() || null,
        uptime: doc.startedAt ? Math.floor((Date.now() - new Date(doc.startedAt).getTime()) / 1000) : 0,
        lastHeartbeat: doc.lastHeartbeat?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[BotAPI] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
