import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { generateOTP } from "@/lib/utils";
import { sendOTPEmail } from "@/lib/email";
import { otpStore } from "../auth/otp/send/route";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.userId).lean();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Build safe response with bind status
    const { password, googleId, discordId, ...safeUser } = user as unknown as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        hasPassword: !!(password && (password as string).length > 0),
        hasGoogle: !!googleId,
        hasDiscord: !!discordId,
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { action } = body;

    const user = await User.findById(session.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ─── Add Payment Method ───────────────────────
    if (action === "add_payment") {
      const { payment } = body;
      const isFirst = user.paymentMethods.length === 0;
      user.paymentMethods.push({
        type: payment.type,
        email: payment.email || undefined,
        phone: payment.phone || undefined,
        nickname: payment.nickname || undefined,
        isDefault: isFirst,
      });
      await user.save();
      return NextResponse.json({ success: true, message: "Payment method added" });
    }

    // ─── Update Profile (nickname) ────────────────
    if (action === "update_profile") {
      const { nickname } = body;
      if (nickname) user.nickname = nickname;
      await user.save();
      return NextResponse.json({ success: true, message: "Profile updated" });
    }

    // ─── Change Password ──────────────────────────
    if (action === "change_password") {
      const { currentPassword, newPassword } = body;

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
      }

      // If user has a password, verify old one
      if (user.password && user.password.length > 0) {
        if (!currentPassword) {
          return NextResponse.json({ error: "Current password is required" }, { status: 400 });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      await user.save();
      return NextResponse.json({ success: true, message: "Password changed successfully" });
    }

    // ─── Request Email Change (sends OTP to new email) ──
    if (action === "request_email_change") {
      const { newEmail, password: userPassword } = body;

      if (!newEmail) {
        return NextResponse.json({ error: "New email is required" }, { status: 400 });
      }

      // Verify password first
      if (user.password && user.password.length > 0) {
        if (!userPassword) {
          return NextResponse.json({ error: "Password is required to change email" }, { status: 400 });
        }
        const isMatch = await bcrypt.compare(userPassword, user.password);
        if (!isMatch) {
          return NextResponse.json({ error: "Password is incorrect" }, { status: 400 });
        }
      }

      // Check if email already taken
      const existing = await User.findOne({ email: newEmail.toLowerCase(), _id: { $ne: user._id } });
      if (existing) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
      }

      // Send OTP to new email
      const otp = generateOTP();
      otpStore.set(newEmail.toLowerCase(), {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        action: "change-email",
      });

      try {
        await sendOTPEmail(newEmail, otp);
      } catch {
        console.log(`[DEV] Email change OTP for ${newEmail}: ${otp}`);
      }

      return NextResponse.json({
        success: true,
        message: "Verification code sent to new email",
      });
    }

    // ─── Confirm Email Change (verify OTP) ────────
    if (action === "confirm_email_change") {
      const { newEmail, otp } = body;

      if (!newEmail || !otp) {
        return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
      }

      const stored = otpStore.get(newEmail.toLowerCase());
      if (!stored || stored.action !== "change-email") {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      }
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(newEmail.toLowerCase());
        return NextResponse.json({ error: "Code has expired" }, { status: 400 });
      }
      if (stored.otp !== otp) {
        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      }

      otpStore.delete(newEmail.toLowerCase());

      user.email = newEmail.toLowerCase();
      await user.save();

      // Update session
      session.email = user.email;
      await session.save();

      return NextResponse.json({ success: true, message: "Email changed successfully" });
    }

    // ─── Unbind Google ─────────────────────────────
    if (action === "unbind_google") {
      if (!user.googleId) {
        return NextResponse.json({ error: "Google is not connected" }, { status: 400 });
      }

      // Must have password set before unbinding
      if (!user.password || user.password.length === 0) {
        return NextResponse.json(
          { error: "You must set a password before disconnecting Google. Otherwise you won't be able to log in." },
          { status: 400 }
        );
      }

      user.googleId = undefined;
      await user.save();
      return NextResponse.json({ success: true, message: "Google account disconnected" });
    }

    // ─── Delete Account ──────────────────────────
    if (action === "delete_account") {
      const { password: confirmPassword } = body;

      // If user has a password, require it for confirmation
      if (user.password && user.password.length > 0) {
        if (!confirmPassword) {
          return NextResponse.json({ error: "Password is required to delete your account" }, { status: 400 });
        }
        const isMatch = await bcrypt.compare(confirmPassword, user.password);
        if (!isMatch) {
          return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
        }
      }

      // Soft-delete: mark as deleted, clear PII
      user.isDeleted = true;
      user.isBanned = true; // Prevent re-login
      user.email = `deleted_${user._id}@runeclipy.local`;
      user.password = "";
      user.googleId = undefined;
      user.discordId = undefined;
      user.nickname = "Deleted User";
      user.avatar = "";
      user.paymentMethods = [];
      await user.save();

      // Disconnect all linked TikTok accounts
      const ConnectedAccount = (await import("@/models/ConnectedAccount")).default;
      await ConnectedAccount.deleteMany({ userId: user._id });

      // Destroy session
      session.destroy();

      return NextResponse.json({ success: true, message: "Account deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
