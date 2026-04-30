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
        error: "Gagal mengambil data profil TikTok. Coba lagi dalam beberapa saat.",
        hint: "Pastikan username TikTok sudah benar dan profil tidak di-private.",
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
        message: `Akun @${username} berhasil diverifikasi! Kamu bisa hapus kode dari bio sekarang.`,
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
      error: `Kode verifikasi "${account.verificationCode}" tidak ditemukan di bio TikTok @${username}.`,
      currentBio: bio || "(bio kosong — server belum mendapat update terbaru dari TikTok)",
      allBiosDetected: [...new Set(allBios.filter(b => b))],
      hint: [
        "💡 Tips agar verifikasi berhasil:",
        "1. Pastikan kode sudah disalin PERSIS ke bio TikTok (tanpa spasi tambahan)",
        "2. Setelah edit bio, SIMPAN dan TUTUP aplikasi TikTok sepenuhnya",
        "3. Tunggu 3-5 menit agar perubahan tersebar ke server TikTok",
        "4. Klik tombol verifikasi lagi",
        "5. Jika tetap gagal, klik 'Minta Verifikasi Manual' di bawah",
      ].join("\n"),
      canRequestManual: true,
    }, { status: 400 });
  } catch (error) {
    console.error("Account verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
