import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import mongoose from "mongoose";

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not connected");

    console.log("[RuneClipy] ⚠️  RESET DATA requested by admin:", session.username);

    // Delete all non-admin users
    const usersDeleted = await db.collection("users").deleteMany({ role: { $ne: "admin" } });

    // Delete all other collections entirely
    const collections = ["submissions", "campaigns", "transactions", "referrals", "notifications", "connectedaccounts", "sitesettings"];
    const results: Record<string, number> = {};

    for (const col of collections) {
      try {
        const r = await db.collection(col).deleteMany({});
        results[col] = r.deletedCount;
      } catch {
        results[col] = 0; // collection might not exist
      }
    }

    console.log("[RuneClipy] ✅ RESET complete:", { usersDeleted: usersDeleted.deletedCount, ...results });

    return NextResponse.json({
      success: true,
      message: "All data has been reset. Admin accounts preserved.",
      deleted: {
        users: usersDeleted.deletedCount,
        ...results,
      },
    });
  } catch (error) {
    console.error("[RuneClipy] Reset error:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
