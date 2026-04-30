import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ConnectedAccount from "@/models/ConnectedAccount";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { accountId } = await req.json();

    const result = await ConnectedAccount.findOneAndDelete({ _id: accountId, userId: session.userId });
    if (!result) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Account disconnected" });
  } catch (error) {
    console.error("Account disconnect error:", error);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
