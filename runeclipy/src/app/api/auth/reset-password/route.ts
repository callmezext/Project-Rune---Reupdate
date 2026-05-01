import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { otpStore } from "../otp/send/route";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Verify OTP
    const stored = otpStore.get(email.toLowerCase());

    if (!stored || stored.action !== "reset-password") {
      return NextResponse.json({ error: "Invalid or expired reset code. Please request a new one." }, { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return NextResponse.json({ error: "Reset code has expired. Please request a new one." }, { status: 400 });
    }

    if (stored.otp !== otp) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // OTP valid — clear it
    otpStore.delete(email.toLowerCase());

    // Update password
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
