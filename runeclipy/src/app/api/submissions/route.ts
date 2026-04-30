import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const submissions = await Submission.find({ userId: session.userId })
      .sort({ submittedAt: -1 })
      .lean();

    // Get campaign details
    const campaignIds = [...new Set(submissions.map((s) => s.campaignId.toString()))];
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } })
      .select("title coverImage")
      .lean();
    const campMap = new Map(campaigns.map((c) => [c._id.toString(), c]));

    const enriched = submissions.map((s) => {
      const camp = campMap.get(s.campaignId.toString());
      return {
        _id: s._id,
        campaignTitle: camp?.title || "Unknown Campaign",
        campaignCover: camp?.coverImage || "",
        videoUrl: s.videoUrl,
        views: s.views,
        earned: s.earned,
        status: s.status,
        submittedAt: s.submittedAt,
      };
    });

    return NextResponse.json({ success: true, submissions: enriched });
  } catch (error) {
    console.error("Submissions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
