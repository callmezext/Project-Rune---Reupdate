import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.userId)
      .select("-password -googleId -discordId")
      .lean();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, user });
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
    const { action, payment, nickname } = await req.json();

    const user = await User.findById(session.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "add_payment") {
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

    if (action === "update_profile") {
      if (nickname) user.nickname = nickname;
      await user.save();
      return NextResponse.json({ success: true, message: "Profile updated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
