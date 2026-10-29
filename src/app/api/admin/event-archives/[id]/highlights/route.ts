import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import {
  fetchEventHighlights,
  saveEventHighlight,
  deleteEventHighlight,
} from "@/lib/data-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }
  try {
    const highlights = await fetchEventHighlights(id, { includeUnpublished: true, client });
    return NextResponse.json({ success: true, data: highlights });
  } catch (err: any) {
    console.error("GET /api/admin/event-archives/[id]/highlights error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch highlights" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { title, short_description, cover_image_url } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Highlight title is required." }, { status: 400 });
    }
    if (!short_description || typeof short_description !== "string" || !short_description.trim()) {
      return NextResponse.json({ success: false, error: "Highlight short description is required." }, { status: 400 });
    }
    if (!cover_image_url || typeof cover_image_url !== "string" || !cover_image_url.trim()) {
      return NextResponse.json({ success: false, error: "Highlight cover image is required." }, { status: 400 });
    }

    const saved = await saveEventHighlight({ ...body, event_id: id }, client);

    // Look up parent event slug for revalidation
    const { data: event } = await client
      .from("event_archives")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    try {
      if (event?.slug) {
        revalidatePath(`/works/${event.slug}`);
        if (saved.slug) {
          revalidatePath(`/works/${event.slug}/highlights/${saved.slug}`);
        }
      }
    } catch {}

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error("POST /api/admin/event-archives/[id]/highlights error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save highlight" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const highlightId = searchParams.get("highlightId");

  if (!highlightId) {
    return NextResponse.json({ success: false, error: "Highlight ID is required." }, { status: 400 });
  }

  try {
    const { data: event } = await client
      .from("event_archives")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    await deleteEventHighlight(highlightId, client);

    try {
      if (event?.slug) {
        revalidatePath(`/works/${event.slug}`);
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/event-archives/[id]/highlights error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete highlight" }, { status: 500 });
  }
}
