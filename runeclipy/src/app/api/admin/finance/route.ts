import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import Campaign from "@/models/Campaign";
import Submission from "@/models/Submission";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    await connectDB();

    const [paidAgg, feesAgg, pendingAgg, budgetAgg] = await Promise.all([
      Transaction.aggregate([{ $match: { type: "payout", status: "completed" } }, { $group: { _id: null, total: { $sum: "$netAmount" } } }]),
      Transaction.aggregate([{ $match: { type: "payout", status: "completed" } }, { $group: { _id: null, total: { $sum: "$paymentFee" } } }]),
      Transaction.aggregate([{ $match: { type: "payout", status: "pending" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Campaign.aggregate([{ $group: { _id: null, budget: { $sum: "$totalBudget" }, used: { $sum: "$budgetUsed" } } }]),
    ]);

    // Earnings per day (last 30 days) from approved submissions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const earningsPerDay = await Submission.aggregate([
      { $match: { status: "approved", submittedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          totalEarned: { $sum: "$earned" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Budget per campaign
    const campaignBudgets = await Campaign.find()
      .select("title totalBudget budgetUsed status type")
      .sort({ totalBudget: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      totalPaidOut: paidAgg[0]?.total || 0,
      totalFees: feesAgg[0]?.total || 0,
      totalPending: pendingAgg[0]?.total || 0,
      totalCampaignBudgets: budgetAgg[0]?.budget || 0,
      totalBudgetUsed: budgetAgg[0]?.used || 0,
      earningsPerDay,
      campaignBudgets,
    });
  } catch (error) {
    console.error("Finance error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
