import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ConnectedAccount from "@/models/ConnectedAccount";
import { getSession } from "@/lib/auth";
import { scrapeForVerification } from "@/lib/tiktok-profile";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { profileUrl } = await req.json();

    const match = profileUrl.match(/@([a-zA-Z0-9._]+)/);
    if (!match) return NextResponse.json({ error: "Invalid profile URL" }, { status: 400 });
    const username = match[1];

    const account = await ConnectedAccount.findOne({
      userId: session.userId,
      username,
      isVerified: false,
    });

    if (!account) return NextResponse.json({ error: "Account not found or already verified" }, { status: 404 });

    console.log(`[RuneClipy:Verify] ═══ Starting verification for @${username} ═══`);
    console.log(`[RuneClipy:Verify] Expected code: ${account.verificationCode}`);

    let result;
    try {
      result = await scrapeForVerification(username, account.verificationCode);
    } catch {
      return NextResponse.json({
        error: "Failed to fetch TikTok profile. Please try again in a moment.",
        hint: "Make sure the TikTok username is correct and the profile is not private.",
        canRequestManual: true,
      }, { status: 400 });
    }

    if (result.codeFound) {
      account.isVerified = true;
      account.verifiedAt = new Date();
      await account.save();

      console.log(`[RuneClipy:Verify] ✅ @${username} verified for user ${session.userId}`);

      return NextResponse.json({
        success: true,
        message: `Account @${username} verified successfully! You can now remove the code from your bio.`,
      });
    }

    // Code not found
    const bio = result.profile.bio;
    const allBios = result.allBios || [];
    console.log(`[RuneClipy:Verify] ❌ Code "${account.verificationCode}" not found in bio: "${bio}"`);
    if (allBios.length > 0) {
      console.log(`[RuneClipy:Verify] All bios detected:`, allBios);
    }

    return NextResponse.json({
      error: `Verification code "${account.verificationCode}" not found in @${username}'s TikTok bio.`,
      currentBio: bio || "(empty bio — server has not received the latest update from TikTok yet)",
      allBiosDetected: [...new Set(allBios.filter(b => b))],
      hint: [
        "💡 Tips for successful verification:",
        "1. Make sure the code is copied EXACTLY to your TikTok bio (no extra spaces)",
        "2. After editing your bio, SAVE it and CLOSE the TikTok app completely",
        "3. Wait 3-5 minutes for changes to propagate to TikTok's servers",
        "4. Click the verify button again",
        "5. If it still fails, click 'Request Manual Verification' below",
      ].join("\n"),
      canRequestManual: true,
    }, { status: 400 });
  } catch (error) {
    console.error("Account verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
