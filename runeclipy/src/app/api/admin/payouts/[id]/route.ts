import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    await connectDB();
    const { id } = await params;
    const { status } = await req.json();

    const tx = await Transaction.findById(id);
    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    tx.status = status;
    if (status === "completed") tx.processedAt = new Date();
    await tx.save();

    // If rejected, refund the balance
    if (status === "rejected") {
      const balanceField = tx.description?.includes("referral") ? "referralBalance" : "campaignBalance";
      await User.findByIdAndUpdate(tx.userId, { $inc: { [balanceField]: tx.amount } });

      await createNotification({
        userId: tx.userId.toString(),
        type: "payout_rejected",
        title: "Payout Rejected",
        message: `Your payout of $${tx.amount.toFixed(2)} was rejected. The amount has been refunded to your balance.`,
        link: "/balance",
      });
    }

    if (status === "completed") {
      await createNotification({
        userId: tx.userId.toString(),
        type: "payout_completed",
        title: "Payout Sent! 💸",
        message: `Your payout of $${tx.netAmount.toFixed(2)} has been processed and sent to your payment method.`,
        link: "/balance",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payout update error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
