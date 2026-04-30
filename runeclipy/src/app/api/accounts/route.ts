import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ConnectedAccount from "@/models/ConnectedAccount";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const accounts = await ConnectedAccount.find({ userId: session.userId }).sort({ connectedAt: -1 }).lean();
    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    console.error("Accounts GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
