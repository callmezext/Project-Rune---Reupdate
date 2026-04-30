import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 });
    }

    return NextResponse.json({
      isLoggedIn: true,
      userId: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
    });
  } catch {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ success: true, message: "Logged out" });
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
