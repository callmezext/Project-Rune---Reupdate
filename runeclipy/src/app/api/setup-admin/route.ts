import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// ONE-TIME setup endpoint to promote a user to admin
// DELETE THIS FILE after first use!
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  // Simple secret key to prevent unauthorized access
  if (secret !== "runeclipy-setup-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Find user by email and promote to admin
    const user = await User.findOneAndUpdate(
      { email: "gunturafandy5@gmail.com" },
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User @${user.username} (${user.email}) promoted to admin!`,
    });
  } catch (err) {
    console.error("Setup admin error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
