import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { type } = await req.json();

    const user = await User.findById(session.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const balance = type === "campaign" ? user.campaignBalance : user.referralBalance;
    const minWithdraw = type === "campaign" ? 10 : 30;

    if (balance < minWithdraw) {
      return NextResponse.json({ error: `Minimum withdrawal is $${minWithdraw}.00` }, { status: 400 });
    }

    if (!user.paymentMethods?.length) {
      return NextResponse.json({ error: "Please add a payment method in your profile first" }, { status: 400 });
    }

    const defaultPayment = user.paymentMethods.find((p) => p.isDefault) || user.paymentMethods[0];
    const fee = parseFloat((balance * 0.03).toFixed(2));
    const net = parseFloat((balance - fee).toFixed(2));

    // Create transaction
    await Transaction.create({
      userId: user._id,
      type: "payout",
      amount: balance,
      status: "pending",
      paymentMethod: defaultPayment,
      paymentFee: fee,
      netAmount: net,
      description: `${type} payout via ${defaultPayment.type}`,
    });

    // Reset balance
    if (type === "campaign") user.campaignBalance = 0;
    else user.referralBalance = 0;
    await user.save();

    return NextResponse.json({ success: true, message: `Payout of ${net.toFixed(2)} USD requested. Processing in 24-48h.` });
  } catch (error) {
    console.error("Payout error:", error);
    return NextResponse.json({ error: "Payout failed" }, { status: 500 });
  }
}
