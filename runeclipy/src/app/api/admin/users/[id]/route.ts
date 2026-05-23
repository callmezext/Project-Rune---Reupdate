import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { logAdminAction } from "@/lib/activity-log";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const allowed = [
      "nickname", "role", "tier", "isBanned", "badges"
    ];
    const update: Record<string, any> = {};
    
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    // Uniqueness validation for Username
    if (body.username && body.username.trim() !== "") {
      const cleanUsername = body.username.trim().toLowerCase();
      const conflict = await User.findOne({ username: cleanUsername, _id: { $ne: id } });
      if (conflict) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }
      update.username = cleanUsername;
    }

    // Uniqueness validation for Email
    if (body.email && body.email.trim() !== "") {
      const cleanEmail = body.email.trim().toLowerCase();
      const conflict = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (conflict) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 400 });
      }
      update.email = cleanEmail;
    }

    // Password Update Hashing
    if (body.password && body.password.trim() !== "") {
      if (body.password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      update.password = await bcrypt.hash(body.password, 10);
    }

    // Number conversions
    if ("campaignBalance" in body) update.campaignBalance = Number(body.campaignBalance) || 0;
    if ("referralBalance" in body) update.referralBalance = Number(body.referralBalance) || 0;

    // Stats conversion
    if (body.stats) {
      update.stats = {
        totalVideos: Number(body.stats.totalVideos) || 0,
        totalEarned: Number(body.stats.totalEarned) || 0,
        totalViews: Number(body.stats.totalViews) || 0,
      };
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Log Activity
    const editedFields = Object.keys(update).filter(k => k !== "password");
    
    if ("isBanned" in body && editedFields.length === 1) {
      await logAdminAction({
        actor: session.username || "admin", actorId: session.userId as string,
        action: body.isBanned ? "ban_user" : "unban_user",
        target: id, targetType: "user",
        details: `${body.isBanned ? "Banned" : "Unbanned"} user @${user.username}`,
      });
    } else {
      await logAdminAction({
        actor: session.username || "admin", actorId: session.userId as string,
        action: "edit_user_detail",
        target: id, targetType: "user",
        details: `Edited detailed profile of @${user.username}. Changed fields: ${editedFields.join(", ")}`,
      });
    }

    const { password: _, ...userObj } = user.toObject();

    return NextResponse.json({ success: true, user: userObj });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    await connectDB();
    const { id } = await params;

    // Don't allow deleting yourself
    if (id === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Soft delete
    const user = await User.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    console.log(`[Admin] Soft-deleted user @${user.username} by admin @${session.username}`);

    await logAdminAction({
      actor: session.username || "admin", actorId: session.userId as string,
      action: "delete_user",
      target: id, targetType: "user",
      details: `Soft-deleted user @${user.username} (${user.email})`,
    });

    return NextResponse.json({ success: true, message: `User @${user.username} deleted` });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
