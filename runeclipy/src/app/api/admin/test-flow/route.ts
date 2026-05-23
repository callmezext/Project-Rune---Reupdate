import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import Submission from "@/models/Submission";
import BotStatus from "@/models/BotStatus";
import SiteSetting from "@/models/SiteSetting";
import LinkToken from "@/models/LinkToken";
import Notification from "@/models/Notification";
import { calculateEarning } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";
import { notifyNewSubmission, notifySubmissionReview } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const steps: Record<string, { status: "success" | "warning" | "error"; message: string; details?: any }> = {};
  const isDev = process.env.NODE_ENV === "development";

  // 1. Auth Guard with Dev Mode Bypass
  let isAdminUser = false;
  try {
    const session = await getSession();
    if (session.isLoggedIn && session.role === "admin") {
      isAdminUser = true;
    }
  } catch (e) {
    // Session parsing could throw in dry contexts
  }

  if (!isAdminUser && !isDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Temporary mock documents for deletion later
  let mockUser: any = null;
  let mockCampaign: any = null;
  let mockSubmission: any = null;
  let mockLinkToken: any = null;
  let mockNotifications: string[] = [];

  try {
    // 2. Database Connection Check
    try {
      await connectDB();
      steps.database = { status: "success", message: "Connected to MongoDB successfully" };
    } catch (err: any) {
      steps.database = { status: "error", message: `DB Connection failed: ${err.message}` };
      return NextResponse.json({ success: false, steps }, { status: 500 });
    }

    // 3. Site Settings Audit
    let settings: any = null;
    try {
      settings = await SiteSetting.findOne().lean();
      const hasWebhook = !!(settings?.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL);
      const hasChannel = !!(settings?.discordNotifChannelId);

      steps.site_settings = {
        status: hasWebhook ? "success" : "warning",
        message: hasWebhook 
          ? "Site settings retrieved. Webhook configured." 
          : "Site settings retrieved, but NO Discord Webhook URL is configured.",
        details: {
          hasWebhook,
          hasChannel,
          discordNotifChannelId: settings?.discordNotifChannelId || "None",
        }
      };
    } catch (err: any) {
      steps.site_settings = { status: "error", message: `Failed to fetch SiteSetting: ${err.message}` };
    }

    // 4. Discord Bot Status Check
    try {
      const doc = await BotStatus.findOne({ botType: "discord" });
      if (!doc) {
        steps.discord_bot = { status: "warning", message: "No BotStatus record found in DB. Bot has never run." };
      } else {
        const isStale = !doc.lastHeartbeat || (Date.now() - new Date(doc.lastHeartbeat).getTime() > 30000);
        steps.discord_bot = {
          status: isStale ? "warning" : "success",
          message: isStale 
            ? `Bot record found, but heartbeat is stale (status: ${doc.status || "offline"}). Bot might be down.` 
            : "Bot is online and reporting active heartbeat.",
          details: {
            status: doc.status,
            username: doc.username || "N/A",
            ping: doc.ping,
            guildCount: doc.guildCount,
            lastHeartbeat: doc.lastHeartbeat,
          }
        };
      }
    } catch (err: any) {
      steps.discord_bot = { status: "error", message: `Failed to check bot status: ${err.message}` };
    }

    // 5. User Creation Simulation
    const uniqueSuffix = Date.now();
    try {
      mockUser = await User.create({
        nickname: `Diag Test User ${uniqueSuffix}`,
        username: `diag_user_${uniqueSuffix}`,
        email: `diag_${uniqueSuffix}@runeclipy-test.com`,
        role: "user",
        referralCode: `diagcode_${uniqueSuffix}`,
        memberSince: new Date(),
        campaignBalance: 0,
        referralBalance: 0,
        stats: { totalVideos: 0, totalEarned: 0, totalViews: 0 }
      });
      steps.user_creation = { status: "success", message: `Mock user created: @${mockUser.username}` };
    } catch (err: any) {
      steps.user_creation = { status: "error", message: `Failed to create mock user: ${err.message}` };
      throw new Error("Simulation aborted: User creation failed");
    }

    // 6. Link Token Simulation
    try {
      mockLinkToken = await LinkToken.create({
        token: `diagtoken_${uniqueSuffix}`,
        discordId: "123456789012345678", // Mock Discord ID
        discordUsername: "DiagTestDiscord#0001",
        used: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      steps.link_token = { status: "success", message: `Mock link token created: ${mockLinkToken.token}` };
    } catch (err: any) {
      steps.link_token = { status: "error", message: `Failed to create mock link token: ${err.message}` };
    }

    // 7. Campaign Flow Simulation
    try {
      mockCampaign = await Campaign.create({
        title: `🧪 Diagnostic Campaign ${uniqueSuffix}`,
        slug: `diag-camp-${uniqueSuffix}`,
        type: "music",
        status: "active",
        totalBudget: 1000,
        budgetUsed: 0,
        ratePerMillionViews: 150,
        maxEarningsPerPost: 50,
        maxEarningsPerCreator: 100,
        maxSubmissionsPerAccount: 3,
        minViews: 100,
        earningType: "per_view",
        description: "Created temporarily for end-to-end diagnosis testing.",
        supportedPlatforms: ["tiktok"]
      });
      steps.campaign_flow = { status: "success", message: `Mock active campaign created: "${mockCampaign.title}"` };
    } catch (err: any) {
      steps.campaign_flow = { status: "error", message: `Failed to create mock campaign: ${err.message}` };
      throw new Error("Simulation aborted: Campaign creation failed");
    }

    // 8. Submission Flow Simulation
    try {
      mockSubmission = await Submission.create({
        campaignId: mockCampaign._id,
        userId: mockUser._id,
        videoUrl: `https://www.tiktok.com/@diag_user_${uniqueSuffix}/video/999888777666555444`,
        tiktokVideoId: "999888777666555444",
        views: 200000, // 200k views
        likes: 12000,
        comments: 450,
        shares: 110,
        earned: 0,
        status: "pending"
      });
      steps.submission_flow = { status: "success", message: `Mock submission generated in pending state for ${mockSubmission.videoUrl}` };
    } catch (err: any) {
      steps.submission_flow = { status: "error", message: `Failed to create mock submission: ${err.message}` };
      throw new Error("Simulation aborted: Submission creation failed");
    }

    // 9. Admin Review & Earning Calculations Simulation
    try {
      // Calculate view-based earning
      const viewEarning = calculateEarning(mockSubmission.views, mockCampaign.ratePerMillionViews);
      // Cap by maxEarningsPerPost
      const calculatedEarned = parseFloat(Math.min(viewEarning, mockCampaign.maxEarningsPerPost).toFixed(2));

      // Apply approval mutations
      mockSubmission.status = "approved";
      mockSubmission.earned = calculatedEarned;
      mockSubmission.reviewedAt = new Date();
      mockSubmission.reviewedBy = mockUser._id; // mock admin review
      await mockSubmission.save();

      // Update Campaign budget & stats
      mockCampaign.budgetUsed += calculatedEarned;
      mockCampaign.totalSubmissions += 1;
      mockCampaign.totalCreators += 1;
      await mockCampaign.save();

      // Update User stats & balance
      await User.findByIdAndUpdate(mockUser._id, {
        $inc: {
          "stats.totalVideos": 1,
          "stats.totalEarned": calculatedEarned,
          "stats.totalViews": mockSubmission.views,
          campaignBalance: calculatedEarned
        }
      });

      // Fetch user to verify increments
      const updatedUser = await User.findById(mockUser._id).lean();

      // Verify Notification creation
      await createNotification({
        userId: mockUser._id.toString(),
        type: "submission_approved",
        title: "Submission Approved! 🎉",
        message: `Your video for "${mockCampaign.title}" was approved. You earned $${calculatedEarned.toFixed(2)}!`,
        link: "/campaigns",
      });

      const createdNotif = await Notification.findOne({ userId: mockUser._id }).lean();

      steps.review_and_payout = {
        status: (updatedUser?.campaignBalance === calculatedEarned) ? "success" : "error",
        message: `Simulation of admin approval: calculated earned amount = $${calculatedEarned}. User stats and balances updated.`,
        details: {
          calculatedEarned,
          updatedBalance: updatedUser?.campaignBalance || 0,
          updatedTotalEarned: updatedUser?.stats?.totalEarned || 0,
          updatedTotalVideos: updatedUser?.stats?.totalVideos || 0,
          updatedTotalViews: updatedUser?.stats?.totalViews || 0,
          notificationCreated: !!createdNotif
        }
      };
    } catch (err: any) {
      steps.review_and_payout = { status: "error", message: `Earning calculation and review simulation failed: ${err.message}` };
    }

    // 10. Discord Webhook Dispatch Test
    try {
      const hasWebhook = !!(settings?.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL);
      if (hasWebhook) {
        // Dispatch test submission alerts using the webhook utility
        await notifyNewSubmission({
          userName: mockUser.username,
          campaignTitle: mockCampaign.title,
          videoUrl: mockSubmission.videoUrl,
          views: mockSubmission.views,
          soundMatch: "Tropical Summer Beat",
          autoApproved: false
        });

        await notifySubmissionReview({
          userName: mockUser.username,
          campaignTitle: mockCampaign.title,
          status: "approved",
          earned: mockSubmission.earned
        });

        steps.discord_webhook = { status: "success", message: "Integration webhooks sent successfully." };
      } else {
        steps.discord_webhook = { status: "warning", message: "Skipped: Discord Webhook URL is not configured." };
      }
    } catch (err: any) {
      steps.discord_webhook = { status: "error", message: `Webhook dispatch failed: ${err.message}` };
    }

  } catch (err: any) {
    // Flow aborted mid-run
    console.error("[TestFlow] Aborted:", err.message);
  } finally {
    // 11. Database Cleanup Phase
    try {
      const deleteOps = [];
      if (mockSubmission?._id) deleteOps.push(Submission.deleteOne({ _id: mockSubmission._id }));
      if (mockCampaign?._id) deleteOps.push(Campaign.deleteOne({ _id: mockCampaign._id }));
      if (mockLinkToken?._id) deleteOps.push(LinkToken.deleteOne({ _id: mockLinkToken._id }));
      if (mockUser?._id) {
        deleteOps.push(User.deleteOne({ _id: mockUser._id }));
        deleteOps.push(Notification.deleteMany({ userId: mockUser._id }));
      }

      await Promise.all(deleteOps);
      steps.cleanup = { status: "success", message: "All mock diagnostic records successfully pruned from MongoDB" };
    } catch (err: any) {
      steps.cleanup = { status: "error", message: `Pruning mock data failed: ${err.message}` };
    }
  }

  // Determine global success flag
  const hasErrors = Object.values(steps).some(s => s.status === "error");
  return NextResponse.json({
    success: !hasErrors,
    message: hasErrors ? "Test flow finished with errors" : "Test flow completed successfully",
    steps
  });
}
