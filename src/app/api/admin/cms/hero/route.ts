import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUuid } from "@/lib/data-service";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load hero slides" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      id,
      title,
      subtitle,
      eyebrow,
      cta_label,
      cta_href,
      image_url,
      storage_path,
      alt_text,
      focal_point,
      text_align,
      sort_order,
      is_published,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Slide headline is required." }, { status: 400 });
    }
    if (!image_url || !image_url.trim()) {
      return NextResponse.json({ success: false, error: "Slide photograph is required." }, { status: 400 });
    }

    const payload = {
      id: ensureUuid(id),
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : null,
      eyebrow: eyebrow ? eyebrow.trim() : null,
      cta_label: cta_label ? cta_label.trim() : null,
      cta_href: cta_href ? cta_href.trim() : null,
      image_url: image_url.trim(),
      storage_path: storage_path ? storage_path.trim() : null,
      alt_text: alt_text ? alt_text.trim() : title.trim(),
      focal_point: focal_point || "center",
      text_align: text_align || "left",
      sort_order: typeof sort_order === "number" ? sort_order : 1,
      is_published: is_published !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("hero_slides")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save hero slide" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Slide ID is required." }, { status: 400 });
    }

    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete hero slide" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ success: false, error: "Array of ordered slide IDs is required." }, { status: 400 });
    }

    const updates = order.map((id, index) =>
      supabase
        .from("hero_slides")
        .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true, count: order.length });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to reorder hero slides" },
      { status: 500 }
    );
  }
}

