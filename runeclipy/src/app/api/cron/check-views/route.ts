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
import ScheduledTask from "@/models/ScheduledTask";
import SiteSetting from "@/models/SiteSetting";
import { scrapeTikTokVideo } from "@/lib/tiktok-scraper";
import { calculateEarning } from "@/lib/utils";

const BATCH_SIZE = 5; // Max submissions to check per run
const MIN_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour between checks per user

async function checkBudgetAlerts() {
  try {
    const activeCampaigns = await Campaign.find({
      status: "active",
      $or: [{ budgetAlertSent: false }, { budgetAlertSent: { $exists: false } }],
    });

    if (activeCampaigns.length === 0) return;

    const settings = await SiteSetting.findOne().lean();
    const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";
    const channelId = settings?.discordNotifChannelId || "";

    if (!token || !channelId) return;

    for (const campaign of activeCampaigns) {
      const pct = campaign.totalBudget > 0 ? campaign.budgetUsed / campaign.totalBudget : 0;
      if (pct >= 0.80) {
        console.log(`[RuneClipy:Cron] Budget alert triggered for campaign: ${campaign.title} (${(pct * 100).toFixed(1)}%)`);
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://runeclipy.vercel.app";
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: "⚠️ **Budget Alert!** @here",
            embeds: [
              {
                title: `Campaign Hampir Kehabisan Budget!`,
                description: `Campaign **${campaign.title}** telah menggunakan **${(pct * 100).toFixed(1)}%** dari total budget-nya.`,
                color: 0xffaa00,
                fields: [
                  { name: "💵 Total Budget", value: `$${campaign.totalBudget}`, inline: true },
                  { name: "📉 Budget Terpakai", value: `$${campaign.budgetUsed.toFixed(2)}`, inline: true },
                ],
                url: `${appUrl}/campaign/${campaign._id}`,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });

        if (res.ok) {
          campaign.budgetAlertSent = true;
          await campaign.save();
          console.log(`[RuneClipy:Cron] Budget alert sent successfully for campaign: ${campaign.title}`);
        } else {
          const errText = await res.text();
          console.error(`[RuneClipy:Cron] Gagal kirim notif budget alert ke Discord:`, errText);
        }
      }
    }
  } catch (err) {
    console.error("[RuneClipy:Cron] Error checking budget alerts:", err);
  }
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const key = auth || url.searchParams.get("key");
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    await checkBudgetAlerts();

    const now = new Date();

    // ─── Process Scheduled Tasks ───────────────────────────────────────────
    try {
      const pendingTasks = await ScheduledTask.find({
        status: "pending",
        executeAt: { $lte: now },
      });

      if (pendingTasks.length > 0) {
        console.log(`[RuneClipy:Cron] Processing ${pendingTasks.length} scheduled tasks...`);
        const settings = await SiteSetting.findOne().lean();
        const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";

        for (const task of pendingTasks) {
          try {
            if (task.taskType === "send_discord_message") {
              const { channelId, content } = task.payload;
              if (!token) throw new Error("Discord Bot Token belum dikonfigurasi di setting.");
              if (!channelId || !content) throw new Error("channelId dan content wajib ada.");

              const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                  Authorization: `Bot ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ content }),
              });

              if (!res.ok) {
                const err = await res.text();
                throw new Error(`Discord API: ${err}`);
              }
            }

            task.status = "completed";
            await task.save();
            console.log(`[RuneClipy:Cron] Task ${task._id} completed successfully`);
          } catch (taskErr) {
            console.error(`[RuneClipy:Cron] Task ${task._id} failed:`, taskErr);
            task.status = "failed";
            task.error = (taskErr as Error).message;
            await task.save();
          }
        }
      }
    } catch (cronTaskErr) {
      console.error("[RuneClipy:Cron] Gagal memproses scheduled tasks:", cronTaskErr);
    }

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
              earned += campaign.maxEarningsPerPost > 0 ? Math.min(viewEarning, campaign.maxEarningsPerPost) : viewEarning;
            }

            if (campaign.earningType === "per_post" || campaign.earningType === "both") {
              earned += campaign.fixedRatePerPost || 0;
            }

            const newEarned = parseFloat(earned.toFixed(2));
            const diff = newEarned - (sub.earned || 0);

            if (diff !== 0) {
              let budgetDiff = diff;
              let isBudgetFullyUsed = false;
              if (campaign.totalBudget > 0) {
                const remainingBudget = Math.max(0, campaign.totalBudget - campaign.budgetUsed);
                budgetDiff = diff > 0 ? Math.min(diff, remainingBudget) : diff;
                isBudgetFullyUsed = budgetDiff >= remainingBudget;
              }
              const cappedEarned = parseFloat(((sub.earned || 0) + budgetDiff).toFixed(2));

              updateData.earned = cappedEarned;
              await Campaign.findByIdAndUpdate(sub.campaignId, {
                $inc: { budgetUsed: budgetDiff },
                ...(isBudgetFullyUsed ? { status: "paused" } : {}),
              });
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
