import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Referral from "@/models/Referral";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { nickname, username, email, password, referralCode } = await req.json();

    if (!nickname || !username || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (username.length < 3 || !/^[a-z0-9._]+$/.test(username)) {
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
    }

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      nickname: nickname.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      referralCode: username.toLowerCase().trim(),
      referredBy: referralCode?.toLowerCase().trim() || "",
      memberSince: new Date(),
    });

    // Process referral
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toLowerCase().trim() });
      if (referrer) {
        await Referral.create({
          referrerId: referrer._id,
          referredUserId: user._id,
          referredUsername: user.username,
          referrerUsername: referrer.username,
          joinedAt: new Date(),
        });
      }
    }

    // Create session
    const session = await getSession();
    session.userId = user._id.toString();
    session.username = user.username;
    session.email = user.email;
    session.role = user.role;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
