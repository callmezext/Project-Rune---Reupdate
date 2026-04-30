// DEV-ONLY: Bypass login for testing — REMOVE IN PRODUCTION
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    await connectDB();
    const email = req.nextUrl.searchParams.get("email") || "gunturafandy5@gmail.com";
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const forceAdmin = req.nextUrl.searchParams.get("admin") === "true";
    const role = forceAdmin ? "admin" : user.role;

    const session = await getSession();
    session.userId = user._id.toString();
    session.username = user.username;
    session.email = user.email;
    session.role = role;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true, message: "Dev login OK", user: { username: user.username, role } });
  } catch (error) {
    console.error("Dev login error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
