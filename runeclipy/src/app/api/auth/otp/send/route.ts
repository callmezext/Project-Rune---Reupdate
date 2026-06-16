import { NextRequest, NextResponse } from "next/server";
import { generateOTP } from "@/lib/utils";
import { sendOTPEmail } from "@/lib/email";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// Shared global OTP store to survive hot-reloads in Next.js development
declare global {
  var globalOtpStore: Map<string, { otp: string; expiresAt: number; action: string }> | undefined;
}

const otpStore = global.globalOtpStore || new Map<string, { otp: string; expiresAt: number; action: string }>();
if (process.env.NODE_ENV !== "production") {
  global.globalOtpStore = otpStore;
}
export { otpStore };

export async function POST(req: NextRequest) {
  try {
    const { email, action } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();

    // Check if email exists when registering
    if (action === "register") {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
    }

    const otp = generateOTP();
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      action: action || "verify",
    });

    console.log(`[OTP] Generated OTP for ${email}: ${otp}`);

    let mailSent = false;
    try {
      await sendOTPEmail(email, otp);
      mailSent = true;
    } catch (mailErr) {
      console.warn(`[OTP] Failed to send email to ${email}:`, mailErr);
    }

    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json({
      success: true,
      message: mailSent ? "OTP sent successfully" : "OTP generated (development console)",
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

