import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SiteSetting from "@/models/SiteSetting";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await SiteSetting.findOne().lean();
    const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";
    const guildId = settings?.discordGuildId || process.env.DISCORD_GUILD_ID || "";

    if (!token) {
      return NextResponse.json({ success: true, roles: [] });
    }
    if (!guildId) {
      return NextResponse.json({ success: true, roles: [] });
    }

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: `Discord API: ${err}`, roles: [] });
    }

    const roles = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanRoles = (roles as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
    }));

    return NextResponse.json({ success: true, roles: cleanRoles });
  } catch (error) {
    console.error("[Discord Roles]", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}
