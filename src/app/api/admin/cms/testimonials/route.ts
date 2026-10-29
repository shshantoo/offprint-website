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
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load testimonials" },
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
      quote,
      author,
      role_or_title,
      organization,
      project_tag,
      avatar_url,
      sort_order,
      is_published,
    } = body;

    if (!quote || !quote.trim()) {
      return NextResponse.json({ success: false, error: "Testimonial quote is required." }, { status: 400 });
    }
    if (!author || !author.trim()) {
      return NextResponse.json({ success: false, error: "Author name is required." }, { status: 400 });
    }

    const payload = {
      id: ensureUuid(id),
      quote: quote.trim(),
      author: author.trim(),
      role_or_title: role_or_title ? role_or_title.trim() : null,
      organization: organization ? organization.trim() : null,
      project_tag: project_tag ? project_tag.trim() : null,
      avatar_url: avatar_url ? avatar_url.trim() : null,
      sort_order: typeof sort_order === "number" ? sort_order : 1,
      is_published: is_published !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("testimonials")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save testimonial" },
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
      return NextResponse.json({ success: false, error: "Testimonial ID is required." }, { status: 400 });
    }

    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete testimonial" },
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
      return NextResponse.json({ success: false, error: "Array of ordered IDs is required." }, { status: 400 });
    }

    const updates = order.map((id, index) =>
      supabase
        .from("testimonials")
        .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true, count: order.length });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to reorder testimonials" },
      { status: 500 }
    );
  }
}

