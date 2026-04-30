import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submission from "@/models/Submission";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    // Aggregate leaderboard from submissions
    const leaderboardData = await Submission.aggregate([
      { $match: { campaignId: new mongoose.Types.ObjectId(id), status: { $in: ["approved", "paid_out"] } } },
      {
        $group: {
          _id: "$userId",
          submissions: { $sum: 1 },
          earned: { $sum: "$earned" },
        },
      },
      { $sort: { earned: -1 } },
      { $limit: 20 },
    ]);

    // Get usernames
    const userIds = leaderboardData.map((d) => d._id);
    const users = await User.find({ _id: { $in: userIds } }).select("username").lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

    const leaderboard = leaderboardData.map((d, i) => ({
      rank: i + 1,
      username: userMap.get(d._id.toString()) || "unknown",
      submissions: d.submissions,
      earned: d.earned,
    }));

    return NextResponse.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ leaderboard: [] });
  }
}
