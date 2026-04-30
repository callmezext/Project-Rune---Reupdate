import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 3 withdrawals per hour
    const rl = rateLimit(`withdraw:${session.userId}`, RATE_LIMITS.withdraw.max, RATE_LIMITS.withdraw.window);
    if (rl.limited) {
      return NextResponse.json({ error: `Terlalu banyak request. Coba lagi dalam ${Math.ceil(rl.resetIn / 60000)} menit.` }, { status: 429 });
    }

    await connectDB();
    const { amount, paymentMethod } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Jumlah withdraw tidak valid" }, { status: 400 });
    }

    if (!paymentMethod?.type || !paymentMethod?.detail) {
      return NextResponse.json({ error: "Pilih metode pembayaran dan isi detailnya" }, { status: 400 });
    }

    const user = await User.findById(session.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const totalBalance = (user.campaignBalance || 0) + (user.referralBalance || 0);

    if (amount > totalBalance) {
      return NextResponse.json({ error: `Saldo tidak cukup. Saldo: $${totalBalance.toFixed(2)}` }, { status: 400 });
    }

    // Minimum withdrawal check (default $10)
    const minWithdraw = 10;
    if (amount < minWithdraw) {
      return NextResponse.json({ error: `Minimum withdraw $${minWithdraw}` }, { status: 400 });
    }

    // Check pending withdrawal
    const pendingPayout = await Transaction.findOne({ userId: session.userId, type: "payout", status: "pending" });
    if (pendingPayout) {
      return NextResponse.json({ error: "Kamu masih punya request payout yang pending. Tunggu sampai diproses." }, { status: 400 });
    }

    // Calculate fee (3%)
    const feePercent = 3;
    const fee = parseFloat((amount * feePercent / 100).toFixed(2));
    const netAmount = parseFloat((amount - fee).toFixed(2));

    // Deduct from balance (campaign first, then referral)
    let remaining = amount;
    const campaignDeduct = Math.min(user.campaignBalance || 0, remaining);
    remaining -= campaignDeduct;
    const referralDeduct = Math.min(user.referralBalance || 0, remaining);

    user.campaignBalance = (user.campaignBalance || 0) - campaignDeduct;
    user.referralBalance = (user.referralBalance || 0) - referralDeduct;
    await user.save();

    // Create transaction
    const transaction = await Transaction.create({
      userId: session.userId,
      type: "payout",
      amount,
      paymentFee: fee,
      netAmount,
      status: "pending",
      paymentMethod: {
        type: paymentMethod.type,
        email: paymentMethod.type === "paypal" || paymentMethod.type === "dana" ? paymentMethod.detail : undefined,
        phone: paymentMethod.type === "gopay" || paymentMethod.type === "ovo" ? paymentMethod.detail : undefined,
      },
      description: `Payout request via ${paymentMethod.type}`,
    });

    await createNotification({
      userId: session.userId,
      type: "payout_requested",
      title: "Payout Request Submitted 💸",
      message: `Request payout $${amount.toFixed(2)} via ${paymentMethod.type}. Net: $${netAmount.toFixed(2)} (fee: $${fee.toFixed(2)}). Menunggu admin approval.`,
      link: "/balance",
    });

    return NextResponse.json({
      success: true,
      message: `Payout $${netAmount.toFixed(2)} sedang diproses!`,
      transaction: { id: transaction._id, amount, fee, netAmount, status: "pending" },
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: "Withdrawal failed" }, { status: 500 });
  }
}
