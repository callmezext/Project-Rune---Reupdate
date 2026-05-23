import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const campaign = await Campaign.findById(id).lean();
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Campaign detail error:", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // Server-side validation: music campaigns must have tiktokSoundId on every sound
    if (body.type === "music") {
      const sounds: Array<{ tiktokSoundId?: string }> = body.sounds || [];
      const missingSoundId = sounds.some((s) => !s.tiktokSoundId?.trim());
      if (missingSoundId || sounds.length === 0) {
        return NextResponse.json(
          { error: "Campaign type 'music' wajib memiliki TikTok Sound ID pada setiap sound." },
          { status: 400 }
        );
      }
    }

    const campaign = await Campaign.findByIdAndUpdate(id, body, { new: true });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Campaign update error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
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
    await Campaign.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    console.error("Campaign delete error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
