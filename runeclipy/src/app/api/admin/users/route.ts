import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAdminAction } from "@/lib/activity-log";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    await connectDB();
    const users = await User.find({ isDeleted: false }).select("-password -googleId").sort({ memberSince: -1 }).lean();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const { nickname, username, email, password, role, tier, campaignBalance, referralBalance } = body;

    // Validation
    if (!nickname || !username || !email || !password) {
      return NextResponse.json({ error: "Name, Username, Email, and Password are required" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check uniqueness
    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existing) {
      if (existing.username === cleanUsername) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }
      return NextResponse.json({ error: "Email is already taken" }, { status: 400 });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique referral code
    let referralCode = "";
    let codeExists = true;
    while (codeExists) {
      referralCode = `RUNE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const found = await User.findOne({ referralCode });
      if (!found) codeExists = false;
    }

    // Create User
    const newUser = new User({
      nickname: nickname.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: role || "user",
      tier: tier || "bronze",
      campaignBalance: Number(campaignBalance) || 0,
      referralBalance: Number(referralBalance) || 0,
      referralCode,
      stats: {
        totalVideos: 0,
        totalEarned: 0,
        totalViews: 0,
      },
    });

    await newUser.save();

    // Log administrative action
    await logAdminAction({
      actor: session.username || "admin",
      actorId: session.userId as string,
      action: "create_user",
      target: newUser._id.toString(),
      targetType: "user",
      details: `Created new user @${newUser.username} (${newUser.email}) with role: ${newUser.role}, tier: ${newUser.tier}`,
    });

    const { password: _, ...userObj } = newUser.toObject();

    return NextResponse.json({ success: true, user: userObj });
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

