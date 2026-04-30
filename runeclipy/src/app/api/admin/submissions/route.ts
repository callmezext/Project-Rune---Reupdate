import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const submissions = await Submission.find().sort({ submittedAt: -1 }).limit(100).lean();

    // Enrich with user and campaign data
    const userIds = [...new Set(submissions.map((s) => s.userId.toString()))];
    const campIds = [...new Set(submissions.map((s) => s.campaignId.toString()))];

    const [users, campaigns] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select("username nickname").lean(),
      Campaign.find({ _id: { $in: campIds } }).select("title").lean(),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const campMap = new Map(campaigns.map((c) => [c._id.toString(), c]));

    const enriched = submissions.map((s) => ({
      _id: s._id,
      videoUrl: s.videoUrl,
      views: s.views,
      likes: s.likes,
      comments: s.comments,
      shares: s.shares,
      earned: s.earned,
      status: s.status,
      rejectReason: s.rejectReason,
      submittedAt: s.submittedAt,
      userName: userMap.get(s.userId.toString())?.username || "unknown",
      campaignTitle: campMap.get(s.campaignId.toString())?.title || "Unknown",
      suspicious: s.rejectReason?.startsWith("⚠️ SUSPICIOUS"),
      engagementRate: s.views > 0 ? (((s.likes || 0) + (s.comments || 0)) / s.views * 100).toFixed(2) : "0",
    }));

    return NextResponse.json({ success: true, submissions: enriched });
  } catch (error) {
    console.error("Admin submissions error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
