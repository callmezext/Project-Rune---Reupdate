import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

// Discord OAuth Step 2: Handle callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") || "login"; // "login" or "bind"

  if (error || !code) {
    console.error("[RuneClipy] Discord OAuth error:", error);
    const dest = state === "bind" ? "/profile?error=discord_denied" : "/login?error=discord_denied";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/discord/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.DISCORD_CLIENT_ID || "",
        client_secret: process.env.DISCORD_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[RuneClipy] Discord token exchange failed:", tokenData);
      const dest = state === "bind" ? "/profile?error=discord_token_failed" : "/login?error=discord_token_failed";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // Get user info from Discord
    const userInfoRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const discordUser = await userInfoRes.json();

    if (!discordUser.id) {
      const dest = state === "bind" ? "/profile?error=discord_no_user" : "/login?error=discord_no_user";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    console.log(`[RuneClipy] Discord OAuth: ${discordUser.username}#${discordUser.discriminator} (${discordUser.id})`);

    await connectDB();
    const session = await getSession();

    // ═══ BIND MODE: Link Discord to existing account ═══
    if (state === "bind" && session.isLoggedIn) {
      // Check if this Discord ID is already bound to another user
      const existing = await User.findOne({ discordId: discordUser.id, _id: { $ne: session.userId } });
      if (existing) {
        return NextResponse.redirect(new URL("/profile?error=discord_already_bound", req.url));
      }

      await User.updateOne(
        { _id: session.userId },
        {
          discordId: discordUser.id,
          discordUsername: discordUser.username || discordUser.global_name || "",
        }
      );

      console.log(`[RuneClipy] ✅ Discord linked to @${session.username}`);
      return NextResponse.redirect(new URL("/profile?success=discord_linked", req.url));
    }

    // ═══ LOGIN/REGISTER MODE ═══
    // Check if user exists by discordId or email
    const discordEmail = discordUser.email?.toLowerCase();
    let user = await User.findOne({
      $or: [
        { discordId: discordUser.id },
        ...(discordEmail ? [{ email: discordEmail }] : []),
      ],
    });

    if (user) {
      // Update discordId if not set
      if (!user.discordId) {
        user.discordId = discordUser.id;
        user.discordUsername = discordUser.username || discordUser.global_name || "";
        await user.save();
      }

      if (user.isBanned) {
        return NextResponse.redirect(new URL("/login?error=account_banned", req.url));
      }
    } else {
      // Create new user from Discord
      const displayName = discordUser.global_name || discordUser.username || "User";
      const baseUsername = (discordUser.username || "user")
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "")
        .substring(0, 15);

      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      // Discord may not provide email (depends on scope)
      const email = discordEmail || `discord_${discordUser.id}@runeclipy.local`;

      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
        : "";

      user = await User.create({
        nickname: displayName,
        username,
        email,
        password: "",
        discordId: discordUser.id,
        avatar: avatarUrl,
        referralCode: username,
        memberSince: new Date(),
      });

      console.log(`[RuneClipy] ✅ New Discord user created: @${username}`);
    }

    // Create session
    session.userId = user._id.toString();
    session.username = user.username;
    session.email = user.email;
    session.role = user.role;
    session.isLoggedIn = true;
    await session.save();

    console.log(`[RuneClipy] ✅ Discord login success: @${user.username}`);

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("[RuneClipy] Discord OAuth callback error:", err);
    const dest = state === "bind" ? "/profile?error=discord_failed" : "/login?error=discord_failed";
    return NextResponse.redirect(new URL(dest, req.url));
  }
}
