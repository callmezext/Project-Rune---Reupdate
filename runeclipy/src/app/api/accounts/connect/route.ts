import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ConnectedAccount from "@/models/ConnectedAccount";
import { getSession } from "@/lib/auth";
import { generateVerificationCode } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { profileUrl } = await req.json();

    if (!profileUrl || !profileUrl.includes("tiktok.com")) {
      return NextResponse.json({ error: "Please provide a valid TikTok profile URL" }, { status: 400 });
    }

    // Extract username from URL
    const match = profileUrl.match(/@([a-zA-Z0-9._]+)/);
    if (!match) return NextResponse.json({ error: "Could not extract username from URL" }, { status: 400 });
    const username = match[1].toLowerCase();

    // Check if this TikTok account is already connected by ANY user (global duplicate)
    const globalExisting = await ConnectedAccount.findOne({ platform: "tiktok", username });
    if (globalExisting) {
      if (globalExisting.userId.toString() === session.userId) {
        return NextResponse.json({ error: "Kamu sudah menghubungkan akun TikTok ini" }, { status: 400 });
      }
      return NextResponse.json({ error: "Akun TikTok ini sudah terhubung oleh user lain" }, { status: 400 });
    }

    const verificationCode = generateVerificationCode();

    await ConnectedAccount.create({
      userId: session.userId,
      platform: "tiktok",
      username,
      profileUrl,
      verificationCode,
    });

    return NextResponse.json({ success: true, verificationCode });
  } catch (error) {
    console.error("Account connect error:", error);
    // Handle MongoDB duplicate key error
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Akun TikTok ini sudah terhubung" }, { status: 400 });
    }
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}
