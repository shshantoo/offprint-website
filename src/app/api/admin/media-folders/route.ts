import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import {
  fetchMediaFolders,
  saveMediaFolder,
  deleteMediaFolder,
} from "@/lib/data-service";
import type { MediaFolderType } from "@/types/database";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as MediaFolderType | null;

  try {
    const folders = await fetchMediaFolders(type || undefined, client);
    return NextResponse.json({ success: true, data: folders });
  } catch (err: any) {
    console.error("GET /api/admin/media-folders error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch folders" }, { status: 500 });
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
    const { id, name, slug, folder_type, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Folder name is required." }, { status: 400 });
    }

    const type: MediaFolderType = folder_type === "event-highlight" ? "event-highlight" : "event-archive";
    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-");

    const saved = await saveMediaFolder(
      {
        id,
        name: name.trim(),
        slug: cleanSlug,
        folder_type: type,
        description: description?.trim() || null,
      },
      client
    );

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error("POST /api/admin/media-folders error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save folder" }, { status: 500 });
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
  const force = searchParams.get("force") === "true";

  if (!id) {
    return NextResponse.json({ success: false, error: "Folder ID is required." }, { status: 400 });
  }

  try {
    // Check if folder is referenced by events or highlights
    if (!force) {
      const folders = await fetchMediaFolders(undefined, client);
      const target = folders.find((f) => f.id === id);
      if (target && (target.assigned_events_count > 0 || target.assigned_highlights_count > 0)) {
        return NextResponse.json(
          {
            success: false,
            error: `This folder is currently referenced by ${target.assigned_events_count} event(s) and ${target.assigned_highlights_count} highlight(s). Reassign them first or delete them before removing this folder.`,
            referenced: true,
          },
          { status: 409 }
        );
      }
    }

    await deleteMediaFolder(id, client);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/media-folders error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete folder" }, { status: 500 });
  }
}
