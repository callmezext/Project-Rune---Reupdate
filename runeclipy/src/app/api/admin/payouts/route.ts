import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    await connectDB();

    const payouts = await Transaction.find({ type: "payout" }).sort({ createdAt: -1 }).lean();
    const userIds = [...new Set(payouts.map((p) => p.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select("username email").lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enriched = payouts.map((p) => {
      const user = userMap.get(p.userId.toString());
      return { ...p, userName: user?.username || "unknown", userEmail: user?.email || "" };
    });

    return NextResponse.json({ success: true, payouts: enriched });
  } catch (error) {
    console.error("Admin payouts error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
