import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

export async function GET() {
  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }

  try {
    const { data: stages, error } = await client
      .from("workflow_stages")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: stages || [] });
  } catch (err: any) {
    console.error("GET /api/admin/workflow-stages error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch stages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, name, slug, description, client_facing_description, sort_order, is_active, is_final_delivery, is_visible_to_client, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Stage name is required." }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-");

    const payload = {
      ...(id ? { id } : {}),
      name: name.trim(),
      slug: cleanSlug,
      description: description?.trim() || null,
      client_facing_description: client_facing_description?.trim() || null,
      sort_order: Number(sort_order) || 1,
      is_active: is_active !== false,
      is_final_delivery: Boolean(is_final_delivery),
      is_visible_to_client: is_visible_to_client !== false,
      color: color || "#5C5449",
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await client
      .from("workflow_stages")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error("POST /api/admin/workflow-stages error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save workflow stage" }, { status: 500 });
  }
}
