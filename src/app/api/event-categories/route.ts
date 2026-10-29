import { NextResponse } from "next/server";
import { fetchEventArchiveCategories } from "@/lib/data-service";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const client = await createSupabasePrivilegedClient();
    const categories = await fetchEventArchiveCategories({ client, includeInactive: false });
    return NextResponse.json({ success: true, data: categories });
  } catch (err: any) {
    console.error("GET /api/event-categories error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch event categories" },
      { status: 500 }
    );
  }
}

