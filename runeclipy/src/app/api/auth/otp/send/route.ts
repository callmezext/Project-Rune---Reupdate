import { NextRequest, NextResponse } from "next/server";
import { generateOTP } from "@/lib/utils";
import { sendOTPEmail } from "@/lib/email";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// In-memory OTP store (shared)
const otpStore = new Map<string, { otp: string; expiresAt: number; action: string }>();
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

    try {
      await sendOTPEmail(email, otp);
    } catch {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
