import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import { fetchEventArchiveCategories } from "@/lib/data-service";
import { revalidatePath } from "next/cache";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }

  try {
    const categories = await fetchEventArchiveCategories({ client, includeInactive: true });
    return NextResponse.json({ success: true, data: categories });
  } catch (err: any) {
    console.error("GET /api/admin/event-categories error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch categories" }, { status: 500 });
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
    const { id, name, slug, description, sort_order, is_active } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Category name is required." }, { status: 400 });
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
      sort_order: Number(sort_order) || 1,
      is_active: is_active !== false,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await client
      .from("event_archive_categories")
      .upsert(payload)
      .select("*")
      .single();

    if (error) throw error;

    try {
      revalidatePath("/works");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error("POST /api/admin/event-categories error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save category" }, { status: 500 });
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

    // Bulk reordering
    if (body.action === "reorder" && Array.isArray(body.categories)) {
      for (const item of body.categories) {
        if (item.id && typeof item.sort_order === "number") {
          await client
            .from("event_archive_categories")
            .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
            .eq("id", item.id);
        }
      }

      const categories = await fetchEventArchiveCategories({ client, includeInactive: true });
      try {
        revalidatePath("/works");
        revalidatePath("/");
      } catch {}
      return NextResponse.json({ success: true, data: categories });
    }

    // Toggle active state
    if (body.id) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
      if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);
      if (body.name !== undefined) updates.name = String(body.name).trim();

      const { data: updated, error } = await client
        .from("event_archive_categories")
        .update(updates)
        .eq("id", body.id)
        .select("*")
        .single();

      if (error) throw error;

      try {
        revalidatePath("/works");
        revalidatePath("/");
      } catch {}

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid patch payload" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/admin/event-categories error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to update category" }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "Category ID is required." }, { status: 400 });
    }

    // Lookup category name first
    const { data: cat } = await client
      .from("event_archive_categories")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    if (!cat) {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }

    // Check how many event archives reference this category
    const { count, error: countErr } = await client
      .from("event_archives")
      .select("id", { count: "exact", head: true })
      .or(`category_id.eq."${id}",category.eq."${cat.name}"`);

    if (countErr) throw countErr;

    if (count && count > 0) {
      // Safe deactivation to preserve relational integrity
      await client
        .from("event_archive_categories")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      try {
        revalidatePath("/works");
        revalidatePath("/");
      } catch {}

      return NextResponse.json({
        success: true,
        archived: true,
        message: `Category "${cat.name}" is in use by ${count} event archive(s). It has been deactivated/archived to preserve existing records.`,
      });
    }

    // Safe to delete if no archives reference it
    const { error: delErr } = await client
      .from("event_archive_categories")
      .delete()
      .eq("id", id);

    if (delErr) throw delErr;

    try {
      revalidatePath("/works");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, deleted: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/event-categories error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to remove category" }, { status: 500 });
  }
}
