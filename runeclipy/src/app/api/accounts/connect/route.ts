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
    const username = match[1];

    // Check duplicate
    const existing = await ConnectedAccount.findOne({ userId: session.userId, username });
    if (existing) return NextResponse.json({ error: "This account is already connected" }, { status: 400 });

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
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}
