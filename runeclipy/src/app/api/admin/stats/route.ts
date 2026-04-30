import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import Submission from "@/models/Submission";
import Transaction from "@/models/Transaction";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const [totalUsers, activeCampaigns, totalSubmissions, pendingSubmissions, pendingPayouts, revenueAgg] =
      await Promise.all([
        User.countDocuments({ isDeleted: false }),
        Campaign.countDocuments({ status: "active" }),
        Submission.countDocuments(),
        Submission.countDocuments({ status: "pending" }),
        Transaction.countDocuments({ type: "payout", status: "pending" }),
        Transaction.aggregate([
          { $match: { type: "payout", status: "completed" } },
          { $group: { _id: null, total: { $sum: "$paymentFee" } } },
        ]),
      ]);

    // ═══ Chart data: submissions per day (last 30 days) ═══
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const submissionsPerDay = await Submission.aggregate([
      { $match: { submittedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ═══ Chart data: new users per day (last 30 days) ═══
    const usersPerDay = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ═══ Campaign stats breakdown ═══
    const campaignBreakdown = await Campaign.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalBudget: { $sum: "$totalBudget" },
          budgetUsed: { $sum: "$budgetUsed" },
        },
      },
    ]);

    // ═══ Top campaigns by submissions ═══
    const topCampaigns = await Campaign.find({ status: "active" })
      .sort({ totalSubmissions: -1 })
      .limit(5)
      .select("title totalSubmissions totalCreators budgetUsed totalBudget type")
      .lean();

    // ═══ Recent submissions ═══
    const recentSubmissions = await Submission.find()
      .sort({ submittedAt: -1 })
      .limit(5)
      .lean();

    const recentUserIds = [...new Set(recentSubmissions.map((s) => s.userId.toString()))];
    const recentCampIds = [...new Set(recentSubmissions.map((s) => s.campaignId.toString()))];
    const [recentUsers, recentCamps] = await Promise.all([
      User.find({ _id: { $in: recentUserIds } }).select("username").lean(),
      Campaign.find({ _id: { $in: recentCampIds } }).select("title").lean(),
    ]);
    const userMap = new Map(recentUsers.map((u) => [u._id.toString(), u.username]));
    const campMap = new Map(recentCamps.map((c) => [c._id.toString(), c.title]));

    const recentEnriched = recentSubmissions.map((s) => ({
      _id: s._id,
      userName: userMap.get(s.userId.toString()) || "unknown",
      campaignTitle: campMap.get(s.campaignId.toString()) || "Unknown",
      status: s.status,
      views: s.views,
      submittedAt: s.submittedAt,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeCampaigns,
        totalSubmissions,
        pendingSubmissions,
        pendingPayouts,
        totalRevenue: revenueAgg[0]?.total || 0,
      },
      charts: {
        submissionsPerDay,
        usersPerDay,
      },
      campaignBreakdown,
      topCampaigns,
      recentSubmissions: recentEnriched,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
