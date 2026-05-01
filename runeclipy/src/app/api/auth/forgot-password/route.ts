import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { generateOTP } from "@/lib/utils";
import { sendResetPasswordEmail } from "@/lib/email";
import { otpStore } from "../otp/send/route";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000); // 3 per 15 min
    if (rl.limited) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${Math.ceil(rl.resetIn / 60000)} minutes.` },
        { status: 429 }
      );
    }

    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset code has been sent.",
      });
    }

    if (user.isBanned) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset code has been sent.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes for password reset
      action: "reset-password",
    });

    try {
      await sendResetPasswordEmail(email, otp);
    } catch {
      console.log(`[DEV] Reset OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset code has been sent.",
      email: email.toLowerCase(),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
