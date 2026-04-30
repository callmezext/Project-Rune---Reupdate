import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Campaign from "@/models/Campaign";
import ConnectedAccount from "@/models/ConnectedAccount";
import { getSession } from "@/lib/auth";
import { scrapeTikTokVideo, verifySoundMatch } from "@/lib/tiktok-scraper";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Please login first" }, { status: 401 });
    }

    // Rate limit: 10 submissions per hour per user
    const rl = rateLimit(`submit:${session.userId}`, RATE_LIMITS.submit.max, RATE_LIMITS.submit.window);
    if (rl.limited) {
      return NextResponse.json({ error: `Terlalu banyak submit. Coba lagi dalam ${Math.ceil(rl.resetIn / 60000)} menit.` }, { status: 429 });
    }

    await connectDB();
    const { id } = await params;
    const { videoUrl } = await req.json();

    if (!videoUrl || !videoUrl.includes("tiktok.com")) {
      return NextResponse.json({ error: "Please provide a valid TikTok video URL" }, { status: 400 });
    }

    // Check campaign exists and is active
    const campaign = await Campaign.findById(id);
    if (!campaign || campaign.status !== "active") {
      return NextResponse.json({ error: "Campaign not found or not active" }, { status: 404 });
    }

    // Check budget remaining
    if (campaign.budgetUsed >= campaign.totalBudget) {
      return NextResponse.json({ error: "Campaign budget has been fully used" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════
    //  CHECK VERIFIED CONNECTED ACCOUNT
    // ═══════════════════════════════════════════════════
    const verifiedAccounts = await ConnectedAccount.find({
      userId: session.userId,
      platform: "tiktok",
      isVerified: true,
    });

    if (verifiedAccounts.length === 0) {
      return NextResponse.json({
        error: "Kamu belum menghubungkan akun TikTok. Verifikasi akun TikTok kamu dulu di halaman Connected Accounts.",
        code: "NO_VERIFIED_ACCOUNT",
      }, { status: 403 });
    }

    // Check submission limit
    const existingCount = await Submission.countDocuments({
      campaignId: id,
      userId: session.userId,
    });

    if (existingCount >= campaign.maxSubmissionsPerAccount) {
      return NextResponse.json({
        error: `Max ${campaign.maxSubmissionsPerAccount} submissions per account for this campaign`,
      }, { status: 400 });
    }

    // Check duplicate video URL (across all campaigns)
    const duplicateAnyCampaign = await Submission.findOne({ videoUrl });
    if (duplicateAnyCampaign) {
      return NextResponse.json({ error: "Video ini sudah pernah di-submit (di campaign ini atau campaign lain)." }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════
    //  SCRAPE VIDEO & VERIFY
    // ═══════════════════════════════════════════════════
    console.log(`[RuneClipy:Submit] Scraping video: ${videoUrl}`);
    let videoData;
    try {
      videoData = await scrapeTikTokVideo(videoUrl);
    } catch (scrapeErr) {
      console.error("[RuneClipy:Submit] Scrape failed:", scrapeErr);
      return NextResponse.json({
        error: "Gagal mengambil data video. Cek URL dan coba lagi.",
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════
    //  VERIFY VIDEO OWNER = CONNECTED ACCOUNT
    // ═══════════════════════════════════════════════════
    const videoAuthor = videoData.author.username.toLowerCase();
    const connectedUsernames = verifiedAccounts.map(a => a.username.toLowerCase());

    if (!connectedUsernames.includes(videoAuthor)) {
      console.log(`[RuneClipy:Submit] ❌ Owner mismatch: video by @${videoAuthor}, connected: [${connectedUsernames.join(", ")}]`);
      return NextResponse.json({
        error: `Video ini milik @${videoAuthor}, tapi akun TikTok yang kamu hubungkan adalah @${connectedUsernames.join(", @")}. Kamu hanya bisa submit video dari akun yang sudah diverifikasi.`,
        code: "OWNER_MISMATCH",
      }, { status: 403 });
    }

    // Verify sound matches campaign requirement
    const soundCheck = verifySoundMatch(videoData.music, campaign.sounds || []);
    console.log(`[RuneClipy:Submit] Sound: ${soundCheck.matched ? "✅" : "❌"} — ${soundCheck.reason}`);

    if (!soundCheck.matched) {
      return NextResponse.json({
        error: "Sound tidak cocok dengan campaign ini.",
        details: soundCheck.reason,
        detected: { title: videoData.music.title, author: videoData.music.author },
      }, { status: 400 });
    }

    // Check video age
    if (!campaign.allowOldVideos && videoData.createTime) {
      const maxAgeMs = (campaign.maxVideoAgeHours || 24) * 60 * 60 * 1000;
      const videoAge = Date.now() - videoData.createTime * 1000;
      if (videoAge > maxAgeMs) {
        const hoursAgo = Math.round(videoAge / (60 * 60 * 1000));
        return NextResponse.json({
          error: `Video terlalu lama (${hoursAgo} jam lalu). Campaign ini hanya menerima video ${campaign.maxVideoAgeHours || 24} jam terakhir.`,
        }, { status: 400 });
      }
    }

    // Check minimum views
    if (campaign.minViews > 0 && videoData.stats.views < campaign.minViews) {
      return NextResponse.json({
        error: `Video perlu minimal ${campaign.minViews.toLocaleString()} views. Saat ini: ${videoData.stats.views.toLocaleString()}`,
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════
    //  ANTI-CHEAT: ENGAGEMENT RATIO CHECK
    // ═══════════════════════════════════════════════════
    let suspiciousFlags: string[] = [];

    if (videoData.stats.views > 5000) {
      const engagementRate = ((videoData.stats.likes + videoData.stats.comments) / videoData.stats.views) * 100;

      // Very low engagement = likely bought views
      if (engagementRate < 0.5) {
        suspiciousFlags.push(`Engagement sangat rendah (${engagementRate.toFixed(2)}%)`);
      }

      // Zero likes with high views = highly suspicious
      if (videoData.stats.likes === 0 && videoData.stats.views > 1000) {
        suspiciousFlags.push("0 likes dengan views tinggi");
      }

      // Abnormal like-to-comment ratio (too many likes, 0 comments on popular video)
      if (videoData.stats.views > 10000 && videoData.stats.comments === 0 && videoData.stats.likes > 100) {
        suspiciousFlags.push("Tidak ada komentar di video populer");
      }
    }

    // ═══════════════════════════════════════════════════
    //  AUTO-APPROVE CHECK
    // ═══════════════════════════════════════════════════
    const engagementRate = videoData.stats.views > 0
      ? ((videoData.stats.likes + videoData.stats.comments) / videoData.stats.views) * 100
      : 0;

    const canAutoApprove = campaign.autoApprove
      && suspiciousFlags.length === 0
      && engagementRate >= (campaign.minEngagementRate || 2);

    const status = canAutoApprove ? "approved" : "pending";

    // Find the connected account for this video
    const connectedAccount = verifiedAccounts.find(
      a => a.username.toLowerCase() === videoAuthor
    );

    // Calculate earnings if auto-approved
    let earned = 0;
    if (canAutoApprove) {
      if (campaign.earningType === "per_view" || campaign.earningType === "both") {
        const { calculateEarning } = await import("@/lib/utils");
        const viewEarning = calculateEarning(videoData.stats.views, campaign.ratePerMillionViews);
        earned += Math.min(viewEarning, campaign.maxEarningsPerPost);
      }
      if (campaign.earningType === "per_post" || campaign.earningType === "both") {
        earned += campaign.fixedRatePerPost || 0;
      }
      earned = parseFloat(earned.toFixed(2));
    }

    // Create submission with scraped data
    const submission = await Submission.create({
      campaignId: id,
      userId: session.userId,
      connectedAccountId: connectedAccount?._id,
      videoUrl,
      tiktokVideoId: videoData.videoId,
      soundId: videoData.music.id || videoData.music.title,
      views: videoData.stats.views,
      likes: videoData.stats.likes,
      comments: videoData.stats.comments,
      shares: videoData.stats.shares,
      submittedAt: new Date(),
      status,
      earned,
      ...(suspiciousFlags.length > 0 && {
        rejectReason: `⚠️ SUSPICIOUS: ${suspiciousFlags.join("; ")}`,
      }),
      ...(canAutoApprove && {
        reviewedAt: new Date(),
      }),
    });

    // Update campaign stats & budget
    const uniqueCreators = await Submission.distinct("userId", { campaignId: id });
    await Campaign.findByIdAndUpdate(id, {
      $inc: { totalSubmissions: 1, ...(canAutoApprove && earned > 0 ? { budgetUsed: earned } : {}) },
      totalCreators: uniqueCreators.length,
    });

    const isSuspicious = suspiciousFlags.length > 0;
    console.log(`[RuneClipy:Submit] ${canAutoApprove ? "🤖 AUTO-APPROVED" : isSuspicious ? "⚠️ SUSPICIOUS" : "⏳ PENDING"} @${videoAuthor} — Views: ${videoData.stats.views}, Sound: "${soundCheck.matchedSound}"${canAutoApprove ? ` Earned: $${earned}` : ""}`);

    return NextResponse.json({
      success: true,
      message: canAutoApprove
        ? `Video auto-approved! ✅ Kamu langsung dapat $${earned.toFixed(2)}!`
        : isSuspicious
          ? "Video submitted, tapi ada indikasi mencurigakan. Admin akan review."
          : "Video submitted! Sound verified ✅ — Menunggu review.",
      submission: {
        id: submission._id,
        status: submission.status,
        soundVerified: true,
        matchedSound: soundCheck.matchedSound,
        views: videoData.stats.views,
        earned,
        autoApproved: canAutoApprove,
        suspicious: isSuspicious,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
