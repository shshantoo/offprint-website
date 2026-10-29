import { NextResponse } from "next/server";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

export async function GET() {
  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const { data: stages, error } = await client
      .from("workflow_stages")
      .select(
        "id, name, slug, description, client_facing_description, sort_order, color, is_final_delivery, allow_link_delivery"
      )
      .eq("is_active", true)
      .eq("is_visible_to_client", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data: stages || [] });
  } catch (err: any) {
    console.error("GET /api/workflow-stages error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
