import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSetting from "@/models/SiteSetting";

export async function GET() {
  try {
    await connectDB();
    const settings = await SiteSetting.findOne().select("siteName siteLogoUrl").lean();
    return NextResponse.json({
      success: true,
      siteName: settings?.siteName || "RuneClipy",
      siteLogoUrl: settings?.siteLogoUrl || "",
    });
  } catch (error) {
    console.error("Config GET error:", error);
    return NextResponse.json({
      success: true,
      siteName: "RuneClipy",
      siteLogoUrl: "",
    });
  }
}
