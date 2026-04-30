import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ConnectedAccount from "@/models/ConnectedAccount";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

// GET: List all connected accounts (with user info)
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const accounts = await ConnectedAccount.find()
      .sort({ connectedAt: -1 })
      .lean();

    // Attach user info
    const userIds = [...new Set(accounts.map((a) => a.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email avatar")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enriched = accounts.map((acc) => ({
      ...acc,
      user: userMap.get(acc.userId.toString()) || null,
    }));

    return NextResponse.json({ success: true, accounts: enriched });
  } catch (error) {
    console.error("Admin accounts error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: Admin manual verify/unverify account
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const { accountId, action } = await req.json();

    if (!accountId || !["verify", "unverify", "delete"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (action === "delete") {
      await ConnectedAccount.findByIdAndDelete(accountId);
      console.log(`[Admin] Deleted connected account ${accountId}`);
      return NextResponse.json({ success: true, message: "Account deleted" });
    }

    const account = await ConnectedAccount.findById(accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (action === "verify") {
      account.isVerified = true;
      account.verifiedAt = new Date();
      await account.save();
      console.log(`[Admin] Manually verified @${account.username} (account ${accountId})`);
      return NextResponse.json({
        success: true,
        message: `@${account.username} berhasil diverifikasi oleh admin.`,
      });
    }

    if (action === "unverify") {
      account.isVerified = false;
      account.verifiedAt = undefined;
      await account.save();
      console.log(`[Admin] Unverified @${account.username} (account ${accountId})`);
      return NextResponse.json({
        success: true,
        message: `Verifikasi @${account.username} dicabut.`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin account action error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
