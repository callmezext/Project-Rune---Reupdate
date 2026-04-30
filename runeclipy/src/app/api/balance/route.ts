import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.userId).select("campaignBalance referralBalance").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const transactions = await Transaction.find({ userId: session.userId })
      .sort({ createdAt: -1 }).limit(20).lean();

    return NextResponse.json({
      success: true,
      campaignBalance: user.campaignBalance,
      referralBalance: user.referralBalance,
      transactions,
    });
  } catch (error) {
    console.error("Balance GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
