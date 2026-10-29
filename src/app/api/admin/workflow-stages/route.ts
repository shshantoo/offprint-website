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
    const {
      id,
      name,
      slug,
      description,
      client_facing_description,
      sort_order,
      is_active,
      is_final_delivery,
      is_visible_to_client,
      color,
      allow_link_delivery,
      is_link_required,
      send_email_on_delivery,
      auto_send_email,
      default_validity_days,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Stage name is required." }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-");

    const payload: Record<string, any> = {
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
      allow_link_delivery: allow_link_delivery !== undefined ? Boolean(allow_link_delivery) : Boolean(is_final_delivery),
      is_link_required: Boolean(is_link_required),
      send_email_on_delivery: Boolean(send_email_on_delivery),
      auto_send_email: Boolean(auto_send_email),
      default_validity_days: Number(default_validity_days) > 0 ? Number(default_validity_days) : 14,
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

export async function PATCH(request: NextRequest) {
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

    // Reorder multiple stages
    if (body.action === "reorder" && Array.isArray(body.stages)) {
      for (const item of body.stages) {
        if (item.id && typeof item.sort_order === "number") {
          await client
            .from("workflow_stages")
            .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
            .eq("id", item.id);
        }
      }
      const { data: updatedStages } = await client
        .from("workflow_stages")
        .select("*")
        .order("sort_order", { ascending: true });

      return NextResponse.json({ success: true, data: updatedStages });
    }

    // Toggle active state or single field update
    if (body.id) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
      if (body.is_visible_to_client !== undefined) updates.is_visible_to_client = Boolean(body.is_visible_to_client);
      if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

      const { data: updated, error } = await client
        .from("workflow_stages")
        .update(updates)
        .eq("id", body.id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid patch payload" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/admin/workflow-stages error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to update workflow stages" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Stage ID is required." }, { status: 400 });
    }

    // Check if any bookings use this stage
    const { count, error: countErr } = await client
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("workflow_stage_id", id);

    if (countErr) throw countErr;

    if (count && count > 0) {
      // Safe disable instead of hard deleting to protect relational integrity
      await client
        .from("workflow_stages")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        archived: true,
        message: `Stage is in use by ${count} booking(s). It has been deactivated/archived to preserve historical records.`,
      });
    }

    // No bookings use it, safe to delete
    const { error: delErr } = await client
      .from("workflow_stages")
      .delete()
      .eq("id", id);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, deleted: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/workflow-stages error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to remove workflow stage" }, { status: 500 });
  }
}
