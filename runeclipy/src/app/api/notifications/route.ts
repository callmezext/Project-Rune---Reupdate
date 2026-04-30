import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { getSession } from "@/lib/auth";

// GET — list user notifications
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const notifications = await Notification.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId: session.userId, isRead: false });

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PUT — mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { notificationId, markAll } = await req.json();

    if (markAll) {
      await Notification.updateMany({ userId: session.userId, isRead: false }, { isRead: true });
    } else if (notificationId) {
      await Notification.findOneAndUpdate({ _id: notificationId, userId: session.userId }, { isRead: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications PUT error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
