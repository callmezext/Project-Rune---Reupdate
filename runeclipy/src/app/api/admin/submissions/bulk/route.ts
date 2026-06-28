import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import Submission from "@/models/Submission";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import { calculateEarning } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";
import { logAdminAction } from "@/lib/activity-log";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { action, submissionIds, rejectReason } = await req.json();

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ error: "No submissions selected" }, { status: 400 });
    }

    if (submissionIds.length > 50) {
      return NextResponse.json({ error: "Maximum 50 submissions at a time" }, { status: 400 });
    }

    const results: { id: string; status: string; earned?: number; error?: string }[] = [];

    for (const id of submissionIds) {
      try {
        const submission = await Submission.findById(id);
        if (!submission) {
          results.push({ id, status: "error", error: "Not found" });
          continue;
        }

        if (submission.status !== "pending") {
          results.push({ id, status: "skipped", error: "Already reviewed" });
          continue;
        }

        if (action === "approve") {
          submission.status = "approved";
          submission.reviewedAt = new Date();
          submission.reviewedBy = session.userId as unknown as typeof submission.reviewedBy;

          const campaign = await Campaign.findById(submission.campaignId);
          if (campaign) {
            let earned = 0;

            if (campaign.earningType === "per_view" || campaign.earningType === "both") {
              const viewEarning = calculateEarning(submission.views, campaign.ratePerMillionViews);
              earned += campaign.maxEarningsPerPost > 0 ? Math.min(viewEarning, campaign.maxEarningsPerPost) : viewEarning;
            }

            if (campaign.earningType === "per_post" || campaign.earningType === "both") {
              earned += campaign.fixedRatePerPost || 0;
            }

            submission.earned = parseFloat(earned.toFixed(2));

            campaign.budgetUsed += submission.earned;
            campaign.totalSubmissions = (campaign.totalSubmissions || 0) + 1;

            const existingApproved = await Submission.countDocuments({
              campaignId: submission.campaignId,
              userId: submission.userId,
              status: "approved",
              _id: { $ne: submission._id },
            });
            if (existingApproved === 0) {
              campaign.totalCreators = (campaign.totalCreators || 0) + 1;
            }

            await campaign.save();

            await User.findByIdAndUpdate(submission.userId, {
              $inc: {
                "stats.totalVideos": 1,
                "stats.totalEarned": submission.earned,
                "stats.totalViews": submission.views,
                campaignBalance: submission.earned,
              },
            });

            await createNotification({
              userId: submission.userId.toString(),
              type: "submission_approved",
              title: "Submission Approved! 🎉",
              message: `Your video for "${campaign.title}" was approved. You earned $${submission.earned.toFixed(2)}!`,
              link: "/campaigns",
            });

            results.push({ id, status: "approved", earned: submission.earned });
          } else {
            results.push({ id, status: "error", error: "Campaign not found" });
            continue;
          }
        } else {
          // Reject
          submission.status = "rejected";
          submission.rejectReason = rejectReason || "Does not meet campaign requirements.";
          submission.reviewedAt = new Date();
          submission.reviewedBy = session.userId as unknown as typeof submission.reviewedBy;

          await createNotification({
            userId: submission.userId.toString(),
            type: "submission_rejected",
            title: "Submission Rejected",
            message: `Your submission was rejected. Reason: ${submission.rejectReason}`,
            link: "/campaigns",
          });

          results.push({ id, status: "rejected" });
        }

        await submission.save();
      } catch (err) {
        results.push({ id, status: "error", error: (err as Error).message });
      }
    }

    const processed = results.filter((r) => r.status === "approved" || r.status === "rejected").length;
    const totalEarned = results.reduce((a, r) => a + (r.earned || 0), 0);

    await logAdminAction({
      actor: session.username || "admin",
      actorId: session.userId as string,
      action: `bulk_${action}`,
      target: `${processed} submissions`,
      targetType: "submission",
      details: `Bulk ${action}: ${processed} processed, ${results.filter((r) => r.status === "error").length} errors. ${action === "approve" ? `Total earned: $${totalEarned.toFixed(2)}` : `Reason: ${rejectReason || "N/A"}`}`,
    });

    return NextResponse.json({
      success: true,
      processed,
      totalEarned: parseFloat(totalEarned.toFixed(2)),
      results,
    });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json({ error: "Bulk action failed" }, { status: 500 });
  }
}
