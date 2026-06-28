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

    // Download reference videos locally if provided in the sound object
    if (body.sounds && body.sounds.length > 0) {
      const { downloadReferenceVideo } = await import("@/lib/tiktok-scraper");
      for (const sound of body.sounds) {
        if (sound.videoReferenceUrl && sound.videoReferenceUrl.trim().startsWith("http")) {
          try {
            console.log("[Campaign API] Downloading reference video:", sound.videoReferenceUrl);
            const localUrl = await downloadReferenceVideo(sound.videoReferenceUrl);
            sound.videoReferenceUrl = localUrl;
            console.log("[Campaign API] Saved reference video locally to:", localUrl);
          } catch (err) {
            console.error("[Campaign API] Failed to download reference video:", err);
          }
        }
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
          : "No deadline ⏰";

        const stripHtml = (html: string) => (html || "").replace(/<[^>]*>/g, "").trim();
        const desc = stripHtml(campaign.description);
        const shortDesc = desc.length > 250 ? desc.substring(0, 250) + "..." : desc;

        const rateVal = campaign.earningType === "per_post"
          ? `$${campaign.fixedRatePerPost} / post`
          : campaign.earningType === "both"
            ? `$${campaign.ratePerMillionViews}/M views + $${campaign.fixedRatePerPost}/post`
            : `$${campaign.ratePerMillionViews}/M views`;

        const limitDetails = `• **Cap per Post:** ${campaign.maxEarningsPerPost > 0 ? `$${campaign.maxEarningsPerPost}` : "Unlimited"}\n• **Cap per Profile:** ${campaign.maxEarningsPerCreator > 0 ? `$${campaign.maxEarningsPerCreator}` : "Unlimited"}`;

        const fields = [
          { name: "💰 Earning Model & Rates", value: `• **Rate:** ${rateVal}\n${limitDetails}`, inline: false },
          { name: "📊 Budget & Submissions", value: `• **Total Budget:** ${campaign.totalBudget > 0 ? `$${campaign.totalBudget}` : "Unlimited 💎"}\n• **Submission Limit:** ${campaign.maxSubmissionsPerAccount > 0 ? `${campaign.maxSubmissionsPerAccount} submissions` : "Unlimited 🚀"}\n• **Min. Views Required:** ${campaign.minViews?.toLocaleString() || "1,000"} views`, inline: false }
        ];

        if (campaign.sounds && campaign.sounds.length > 0) {
          const soundList = campaign.sounds
            .filter((s: any) => s.title)
            .map((s: any) => `🎵 **${s.title}**${s.soundUrl ? ` • [Sound Link](${s.soundUrl})` : ""}${s.tiktokSoundId ? ` (ID: \`${s.tiktokSoundId}\`)` : ""}`)
            .join("\n");
          if (soundList) {
            fields.push({ name: "🎧 Required Sound", value: soundList, inline: false });
          }
        }

        fields.push({ name: "⏰ Deadline", value: deadline, inline: true });

        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "🎉 **Campaign Baru!** @everyone",
            embeds: [{
              title: `🎉 New Campaign: ${campaign.title}`,
              description: shortDesc || "No description provided.",
              color: 0x00D4AA,
              fields: fields,
              footer: { text: "Submit video kamu sekarang dan mulailah menghasilkan! 🚀" },
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
