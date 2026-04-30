import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

// GET — List all active campaigns
export async function GET() {
  try {
    await connectDB();

    const campaigns = await Campaign.find({ status: { $in: ["active", "paused"] } })
      .select("-description")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("Campaigns GET error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// POST — Create new campaign (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    const campaign = await Campaign.create({
      ...body,
      slug: slugify(body.title) + "-" + Date.now().toString(36),
      createdBy: session.userId,
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
