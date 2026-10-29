import { NextResponse } from "next/server";
import { fetchSiteSettings } from "@/lib/data-service";

export async function GET() {
  try {
    const settings = await fetchSiteSettings();
    return NextResponse.json({
      success: true,
      data: settings.general,
      homepage_config: settings.homepage_config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load public site settings" },
      { status: 500 }
    );
  }
}
