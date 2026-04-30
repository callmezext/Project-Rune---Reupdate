import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

// Google OAuth Step 2: Handle the callback from Google
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("[RuneClipy] Google OAuth error:", error);
    return NextResponse.redirect(new URL("/login?error=google_denied", req.url));
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[RuneClipy] Google token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/login?error=google_token_failed", req.url));
    }

    // Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL("/login?error=google_no_email", req.url));
    }

    console.log(`[RuneClipy] Google OAuth: ${googleUser.email} (${googleUser.name})`);

    await connectDB();

    // Check if user exists by googleId or email
    let user = await User.findOne({
      $or: [
        { googleId: googleUser.id },
        { email: googleUser.email.toLowerCase() },
      ],
    });

    if (user) {
      // Update googleId if not set
      if (!user.googleId) {
        user.googleId = googleUser.id;
        if (!user.avatar && googleUser.picture) user.avatar = googleUser.picture;
        await user.save();
      }

      if (user.isBanned) {
        return NextResponse.redirect(new URL("/login?error=account_banned", req.url));
      }
    } else {
      // Create new user
      const baseUsername = (googleUser.name || googleUser.email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "")
        .substring(0, 15);

      // Make username unique
      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      user = await User.create({
        nickname: googleUser.name || username,
        username,
        email: googleUser.email.toLowerCase(),
        password: "",
        googleId: googleUser.id,
        avatar: googleUser.picture || "",
        referralCode: username,
        memberSince: new Date(),
      });

      console.log(`[RuneClipy] ✅ New Google user created: @${username}`);
    }

    // Create session
    const session = await getSession();
    session.userId = user._id.toString();
    session.username = user.username;
    session.email = user.email;
    session.role = user.role;
    session.isLoggedIn = true;
    await session.save();

    console.log(`[RuneClipy] ✅ Google login success: @${user.username}`);

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("[RuneClipy] Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
}
