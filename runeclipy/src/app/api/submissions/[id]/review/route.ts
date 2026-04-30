import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { calculateEarning } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const { status, rejectReason } = await req.json();

    const submission = await Submission.findById(id);
    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

    submission.status = status;
    if (status === "rejected" && rejectReason) {
      submission.rejectReason = rejectReason;
    }
    submission.reviewedAt = new Date();
    submission.reviewedBy = session.userId;

    // Calculate earnings if approved
    if (status === "approved") {
      const campaign = await Campaign.findById(submission.campaignId);
      if (campaign) {
        let earned = 0;

        // Per view earning
        if (campaign.earningType === "per_view" || campaign.earningType === "both") {
          const viewEarning = calculateEarning(submission.views, campaign.ratePerMillionViews);
          earned += Math.min(viewEarning, campaign.maxEarningsPerPost);
        }

        // Per post fixed rate
        if (campaign.earningType === "per_post" || campaign.earningType === "both") {
          earned += campaign.fixedRatePerPost || 0;
        }

        // Cap to max earnings per post (only for per_view component, fixed rate is always added)
        submission.earned = parseFloat(earned.toFixed(2));

        // Update campaign budget used
        campaign.budgetUsed += submission.earned;
        await campaign.save();

        // Notify user
        await createNotification({
          userId: submission.userId.toString(),
          type: "submission_approved",
          title: "Submission Approved! 🎉",
          message: `Your video for "${campaign.title}" was approved. You earned $${submission.earned.toFixed(2)}!`,
          link: "/campaigns",
        });
      }
    } else if (status === "rejected") {
      // Notify user about rejection
      await createNotification({
        userId: submission.userId.toString(),
        type: "submission_rejected",
        title: "Submission Rejected",
        message: `Your submission was rejected. Reason: ${rejectReason || "Does not meet campaign requirements."}`,
        link: "/campaigns",
      });
    }

    await submission.save();

    return NextResponse.json({ success: true, message: `Submission ${status}` });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
