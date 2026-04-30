import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { otpStore } from "../send/route";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, action } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const stored = otpStore.get(email.toLowerCase());

    if (!stored) {
      return NextResponse.json({ error: "OTP not found. Please request a new one." }, { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    if (stored.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
    }

    // OTP is valid — clear it
    otpStore.delete(email.toLowerCase());

    // If login action, set session
    if (action === "login") {
      await connectDB();
      const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const session = await getSession();
      session.userId = user._id.toString();
      session.username = user.username;
      session.email = user.email;
      session.role = user.role;
      session.isLoggedIn = true;
      await session.save();

      return NextResponse.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
        },
      });
    }

    // For registration, just confirm OTP is valid
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
