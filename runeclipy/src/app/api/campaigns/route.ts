import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

// GET — List all active campaigns
export async function GET() {
  try {
    await connectDB();

    const campaigns = await Campaign.find({ status: { $in: ["active", "paused"] } })
      .select("-description")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("Campaigns GET error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// POST — Create new campaign (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    // Server-side validation: music campaigns must have tiktokSoundId on every sound
    if (body.type === "music") {
      const sounds: Array<{ tiktokSoundId?: string }> = body.sounds || [];
      const missingSoundId = sounds.some((s) => !s.tiktokSoundId?.trim());
      if (missingSoundId || sounds.length === 0) {
        return NextResponse.json(
          { error: "Campaign type 'music' wajib memiliki TikTok Sound ID pada setiap sound." },
          { status: 400 }
        );
      }
    }

    const campaign = await Campaign.create({
      ...body,
      slug: slugify(body.title) + "-" + Date.now().toString(36),
      createdBy: session.userId,
    });

    // Auto Discord notification for new campaign
    try {
      const SiteSetting = (await import("@/models/SiteSetting")).default;
      const settings = await SiteSetting.findOne().lean();
      const token = (settings as unknown as Record<string, string>)?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";
      const channelId = settings?.discordNotifChannelId || "";

      if (token && channelId && campaign.status === "active") {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://runeclipy.vercel.app";
        const deadline = campaign.endDate
          ? `<t:${Math.floor(new Date(campaign.endDate).getTime() / 1000)}:R>`
          : "No deadline";

        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "🎉 **Campaign Baru!** @everyone",
            embeds: [{
              title: `🎵 ${campaign.title}`,
              description: campaign.description?.substring(0, 200) || "Campaign baru tersedia!",
              color: 0x00D4AA,
              fields: [
                { name: "💰 Rate", value: `$${campaign.ratePerMillionViews}/M views`, inline: true },
                { name: "💵 Budget", value: `$${campaign.totalBudget}`, inline: true },
                { name: "⏰ Deadline", value: deadline, inline: true },
              ],
              footer: { text: "Klik untuk submit video kamu! 🚀" },
              url: `${appUrl}/campaign/${campaign._id}`,
              image: campaign.coverImage ? { url: campaign.coverImage } : undefined,
              timestamp: new Date().toISOString(),
            }],
          }),
        });
        console.log("[Campaign] Discord notification sent for:", campaign.title);
      }
    } catch (notifErr) {
      console.error("[Campaign] Discord notification failed:", notifErr);
      // Don't fail campaign creation if notification fails
    }

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
