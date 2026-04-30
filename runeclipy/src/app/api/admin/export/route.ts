import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Submission from "@/models/Submission";
import Transaction from "@/models/Transaction";
import Campaign from "@/models/Campaign";
import { getSession } from "@/lib/auth";

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "users";

    let csv = "";
    let filename = "";

    if (type === "users") {
      const users = await User.find().lean();
      csv = toCSV(
        ["ID", "Username", "Nickname", "Email", "Role", "Banned", "Campaign Balance", "Referral Balance", "Created"],
        users.map((u) => [
          u._id.toString(), u.username, u.nickname || "", u.email,
          u.role, u.isBanned ? "Yes" : "No",
          (u.campaignBalance || 0).toString(), (u.referralBalance || 0).toString(),
          new Date(u.createdAt).toISOString(),
        ])
      );
      filename = "runeclipy-users";
    } else if (type === "submissions") {
      const subs = await Submission.find().lean();
      const userIds = [...new Set(subs.map((s) => s.userId.toString()))];
      const campIds = [...new Set(subs.map((s) => s.campaignId.toString()))];
      const users = await User.find({ _id: { $in: userIds } }).select("username").lean();
      const camps = await Campaign.find({ _id: { $in: campIds } }).select("title").lean();
      const uMap = new Map(users.map((u) => [u._id.toString(), u.username]));
      const cMap = new Map(camps.map((c) => [c._id.toString(), c.title]));

      csv = toCSV(
        ["ID", "User", "Campaign", "Video URL", "Views", "Likes", "Comments", "Shares", "Earned", "Status", "Submitted"],
        subs.map((s) => [
          s._id.toString(), uMap.get(s.userId.toString()) || "", cMap.get(s.campaignId.toString()) || "",
          s.videoUrl, (s.views || 0).toString(), (s.likes || 0).toString(),
          (s.comments || 0).toString(), (s.shares || 0).toString(),
          (s.earned || 0).toString(), s.status,
          new Date(s.submittedAt).toISOString(),
        ])
      );
      filename = "runeclipy-submissions";
    } else if (type === "transactions") {
      const txs = await Transaction.find().sort({ createdAt: -1 }).lean();
      const userIds = [...new Set(txs.map((t) => t.userId.toString()))];
      const users = await User.find({ _id: { $in: userIds } }).select("username").lean();
      const uMap = new Map(users.map((u) => [u._id.toString(), u.username]));

      csv = toCSV(
        ["ID", "User", "Type", "Amount", "Fee", "Net", "Status", "Method", "Description", "Created"],
        txs.map((t) => [
          t._id.toString(), uMap.get(t.userId.toString()) || "", t.type,
          t.amount.toString(), (t.paymentFee || 0).toString(), (t.netAmount || 0).toString(),
          t.status, t.paymentMethod?.type || "", t.description || "",
          new Date(t.createdAt).toISOString(),
        ])
      );
      filename = "runeclipy-transactions";
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
