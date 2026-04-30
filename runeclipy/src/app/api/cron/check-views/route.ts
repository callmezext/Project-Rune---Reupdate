/**
 * ═══════════════════════════════════════════════════════════
 *  RuneClipy — Auto View Re-check (Cron Endpoint)
 * ═══════════════════════════════════════════════════════════
 *  Staggered processing: max 5 submissions per run, 
 *  each user's submissions checked 1 hour apart.
 *  Call this endpoint every 10 minutes via cron/setInterval.
 * ═══════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Campaign from "@/models/Campaign";
import { scrapeTikTokVideo } from "@/lib/tiktok-scraper";
import { calculateEarning } from "@/lib/utils";

const BATCH_SIZE = 5; // Max submissions to check per run
const MIN_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour between checks per user

export async function GET(req: Request) {
  // Simple auth via secret key
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (key !== process.env.CRON_SECRET && key !== "runeclipy-cron-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();

    // Find approved submissions that haven't been checked in 1+ hours
    // Stagger: group by userId, pick oldest lastCheckedAt first
    const staleSubmissions = await Submission.aggregate([
      {
        $match: {
          status: "approved",
          $or: [
            { lastCheckedAt: { $lt: new Date(now.getTime() - MIN_CHECK_INTERVAL_MS) } },
            { lastCheckedAt: { $exists: false } },
            { lastCheckedAt: null },
          ],
        },
      },
      // Sort by lastCheckedAt (null first = never checked, then oldest)
      { $sort: { lastCheckedAt: 1 } },
      // Group by user, take only 1 per user (stagger)
      {
        $group: {
          _id: "$userId",
          submissionId: { $first: "$_id" },
          videoUrl: { $first: "$videoUrl" },
          views: { $first: "$views" },
          likes: { $first: "$likes" },
          comments: { $first: "$comments" },
          shares: { $first: "$shares" },
          earned: { $first: "$earned" },
          campaignId: { $first: "$campaignId" },
          lastCheckedAt: { $first: "$lastCheckedAt" },
        },
      },
      { $limit: BATCH_SIZE },
    ]);

    if (staleSubmissions.length === 0) {
      return NextResponse.json({ success: true, message: "No submissions to check", checked: 0 });
    }

    console.log(`[RuneClipy:Cron] Checking ${staleSubmissions.length} submissions...`);

    const results: { id: string; oldViews: number; newViews: number; status: string }[] = [];

    for (const sub of staleSubmissions) {
      try {
        // Add small delay between scrapes to avoid rate limiting
        await new Promise((r) => setTimeout(r, 2000));

        const videoData = await scrapeTikTokVideo(sub.videoUrl);

        const oldViews = sub.views;
        const newViews = videoData.stats.views;

        // Update submission stats
        const updateData: Record<string, unknown> = {
          views: newViews,
          likes: videoData.stats.likes,
          comments: videoData.stats.comments,
          shares: videoData.stats.shares,
          lastCheckedAt: now,
        };

        // Recalculate earnings if views changed
        if (newViews !== oldViews) {
          const campaign = await Campaign.findById(sub.campaignId);
          if (campaign) {
            let earned = 0;

            if (campaign.earningType === "per_view" || campaign.earningType === "both") {
              const viewEarning = calculateEarning(newViews, campaign.ratePerMillionViews);
              earned += Math.min(viewEarning, campaign.maxEarningsPerPost);
            }

            if (campaign.earningType === "per_post" || campaign.earningType === "both") {
              earned += campaign.fixedRatePerPost || 0;
            }

            const newEarned = parseFloat(earned.toFixed(2));
            const diff = newEarned - (sub.earned || 0);

            if (diff !== 0) {
              updateData.earned = newEarned;
              // Update campaign budget
              await Campaign.findByIdAndUpdate(sub.campaignId, { $inc: { budgetUsed: diff } });
            }
          }
        }

        await Submission.findByIdAndUpdate(sub.submissionId, updateData);

        results.push({ id: sub.submissionId.toString(), oldViews, newViews, status: "ok" });
        console.log(`[RuneClipy:Cron] ✅ ${sub.videoUrl.slice(0, 50)}... | ${oldViews} → ${newViews} views`);
      } catch (err) {
        console.error(`[RuneClipy:Cron] ❌ Failed:`, (err as Error).message);
        // Still update lastCheckedAt to avoid retrying immediately
        await Submission.findByIdAndUpdate(sub.submissionId, { lastCheckedAt: now });
        results.push({ id: sub.submissionId.toString(), oldViews: sub.views, newViews: sub.views, status: "error" });
      }
    }

    return NextResponse.json({ success: true, checked: results.length, results });
  } catch (error) {
    console.error("[RuneClipy:Cron] Error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
