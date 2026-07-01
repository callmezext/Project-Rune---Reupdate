import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Email or username is required" }, { status: 400 });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.toLowerCase().trim() },
      ],
      isDeleted: false,
    });

    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error("Check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
