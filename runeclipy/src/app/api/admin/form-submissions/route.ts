import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import FormSubmission from "@/models/FormSubmission";

// GET — Fetch all custom form submissions from Discord modals
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const submissions = await FormSubmission.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error("[Form Submissions GET]", error);
    return NextResponse.json({ error: "Failed to fetch form submissions" }, { status: 500 });
  }
}

// DELETE — Delete a specific form submission entry
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await connectDB();
    const deleted = await FormSubmission.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Submission entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Submission deleted successfully" });
  } catch (error) {
    console.error("[Form Submissions DELETE]", error);
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }
}
