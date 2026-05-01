import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";

// GET — List ALL campaigns for admin (including ended)
export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const campaigns = await Campaign.find()
      .select("-description")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("Admin campaigns error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
