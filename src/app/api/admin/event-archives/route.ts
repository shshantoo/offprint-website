import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import {
  fetchEventArchives,
  saveEventArchive,
  deleteEventArchive,
} from "@/lib/data-service";

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
    const events = await fetchEventArchives({ includeUnpublished: true, client });
    return NextResponse.json({ success: true, data: events });
  } catch (err: any) {
    console.error("GET /api/admin/event-archives error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch event archives" }, { status: 500 });
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
    const { title, short_description } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Event Title is required." }, { status: 400 });
    }
    if (!short_description || typeof short_description !== "string" || !short_description.trim()) {
      return NextResponse.json({ success: false, error: "Short description is required." }, { status: 400 });
    }

    const saved = await saveEventArchive(body, client);

    try {
      revalidatePath("/works");
      if (saved.slug) {
        revalidatePath(`/works/${saved.slug}`);
      }
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error("POST /api/admin/event-archives error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save event archive" }, { status: 500 });
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
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Event ID is required." }, { status: 400 });
  }

  try {
    // Look up slug before deletion for cache revalidation
    const { data: existing } = await client
      .from("event_archives")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    await deleteEventArchive(id, client);

    try {
      revalidatePath("/works");
      if (existing?.slug) {
        revalidatePath(`/works/${existing.slug}`);
      }
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/event-archives error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete event archive" }, { status: 500 });
  }
}
