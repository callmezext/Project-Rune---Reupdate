import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ConnectedAccount from "@/models/ConnectedAccount";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import User from "@/models/User";

/**
 * POST — Request manual verification from admin
 * Creates a notification for all admins about this request.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { profileUrl } = await req.json();

    const match = profileUrl.match(/@([a-zA-Z0-9._]+)/);
    if (!match) return NextResponse.json({ error: "Invalid profile URL" }, { status: 400 });
    const username = match[1];

    // Find the unverified account
    const account = await ConnectedAccount.findOne({
      userId: session.userId,
      username,
      isVerified: false,
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found or already verified" }, { status: 404 });
    }

    // Find all admin users
    const admins = await User.find({ role: "admin", isDeleted: { $ne: true } }).select("_id").lean();

    // Create notifications for all admins
    for (const admin of admins) {
      await createNotification({
        userId: admin._id.toString(),
        type: "system",
        title: "📩 Manual Verification Request",
        message: `User @${session.username} requests manual verification for TikTok @${username} (code: ${account.verificationCode})`,
        icon: "📩",
        link: "/admin/accounts",
      });
    }

    console.log(`[RuneClipy] Manual verification requested: @${username} by user ${session.username}`);

    return NextResponse.json({
      success: true,
      message: "Manual verification request sent to admin. Please keep the code in your bio.",
    });
  } catch (error) {
    console.error("Manual verify request error:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
