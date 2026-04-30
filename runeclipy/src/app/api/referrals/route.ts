import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Referral from "@/models/Referral";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.userId).select("referralCode").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const referrals = await Referral.find({ referrerId: session.userId }).sort({ joinedAt: -1 }).lean();
    const totalEarned = referrals.reduce((sum, r) => sum + r.totalEarned, 0);

    return NextResponse.json({
      success: true,
      referralCode: user.referralCode,
      totalReferrals: referrals.length,
      totalEarned,
      referrals,
    });
  } catch (error) {
    console.error("Referrals error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
