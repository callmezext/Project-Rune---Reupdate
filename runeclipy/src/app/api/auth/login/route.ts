import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateOTP } from "@/lib/utils";
import { sendOTPEmail } from "@/lib/email";
import { otpStore } from "../otp/send/route";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 login attempts per 15 minutes
    const ip = getClientIP(req);
    const rl = rateLimit(`login:${ip}`, RATE_LIMITS.login.max, RATE_LIMITS.login.window);
    if (rl.limited) {
      return NextResponse.json({ error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(rl.resetIn / 60000)} menit.` }, { status: 429 });
    }

    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() },
      ],
      isDeleted: false,
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ error: "Your account has been suspended. Contact support for assistance." }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate and send OTP
    const otp = generateOTP();
    otpStore.set(user.email, { otp, expiresAt: Date.now() + 5 * 60 * 1000, action: "login" });

    try {
      await sendOTPEmail(user.email, otp);
    } catch {
      // If email fails in dev, log OTP to console
      console.log(`[DEV] OTP for ${user.email}: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
