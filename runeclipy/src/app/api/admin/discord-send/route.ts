import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SiteSetting from "@/models/SiteSetting";

// POST — send embed message to a Discord channel
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { channelId, embeds } = await req.json();

    if (!channelId || !embeds?.length) {
      return NextResponse.json({ error: "channelId and embeds required" }, { status: 400 });
    }

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await SiteSetting.findOne().lean();
    const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";

    if (!token) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 400 });
    }

    // Send each embed as a separate message or batch
    const results = [];
    for (const embed of embeds) {
      const payload: Record<string, unknown> = { embeds: [embed] };
      if (embed.content) {
        payload.content = embed.content;
        delete embed.content;
      }
      if (embed.buttons && Array.isArray(embed.buttons) && embed.buttons.length > 0) {
        payload.components = [
          {
            type: 1,
            components: embed.buttons.slice(0, 5).map((b: any) => {
              let finalUrl = (b.url || "").trim() || "https://google.com";
              if (!/^https?:\/\//i.test(finalUrl)) {
                finalUrl = `https://${finalUrl}`;
              }
              const btn: Record<string, any> = {
                type: 2,
                style: 5,
                label: b.label || "Link",
                url: finalUrl
              };
              if (b.emoji) btn.emoji = { name: b.emoji };
              return btn;
            })
          }
        ];
        delete embed.buttons;
      }

      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        results.push({ success: false, error: err });
      } else {
        const msg = await res.json();
        results.push({ success: true, messageId: msg.id });
      }
    }

    const allSuccess = results.every((r) => r.success);
    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess ? `${results.length} message(s) sent!` : "Some messages failed",
    });
  } catch (error) {
    console.error("[Discord Send]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
