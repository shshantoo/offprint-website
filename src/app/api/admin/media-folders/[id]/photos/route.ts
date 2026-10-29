import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import {
  fetchFolderPhotos,
  saveFolderPhoto,
  deleteFolderPhoto,
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
    // 1. Fetch folder to resolve storage prefix
    const { data: folder } = await client
      .from("media_folders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (folder) {
      const prefix =
        folder.storage_prefix ||
        (folder.folder_type === "event-highlight"
          ? `event-archive-highlights/${folder.slug}/`
          : `event-archives/${folder.slug}/`);
      const storageDir = prefix.replace(/^\/+|\/+$/g, "");

      // 2. Discover files directly in Supabase Storage and auto-synchronize
      try {
        const { data: storageObjects } = await client.storage
          .from("portfolio-media")
          .list(storageDir, { limit: 500, sortBy: { column: "name", order: "asc" } });

        if (Array.isArray(storageObjects)) {
          // Strictly exclude empty folder placeholders (.emptyFolderPlaceholder) and non-images
          const validFiles = storageObjects.filter((item) => {
            if (!item.name || item.name.startsWith(".")) return false;
            if (
              item.name.endsWith(".emptyFolderPlaceholder") ||
              item.name.endsWith(".keep")
            ) {
              return false;
            }
            const lower = item.name.toLowerCase();
            return (
              lower.endsWith(".jpg") ||
              lower.endsWith(".jpeg") ||
              lower.endsWith(".png") ||
              lower.endsWith(".webp") ||
              lower.endsWith(".avif") ||
              lower.endsWith(".gif")
            );
          });

          if (validFiles.length > 0) {
            const existingPhotos = await fetchFolderPhotos(id, client);
            const existingPaths = new Set(existingPhotos.map((p) => p.storage_path));

            for (const file of validFiles) {
              const fullPath = `${storageDir}/${file.name}`;
              if (!existingPaths.has(fullPath)) {
                const { data: pubData } = client.storage
                  .from("portfolio-media")
                  .getPublicUrl(fullPath);

                const cleanCaption = file.name
                  .replace(/\.[^/.]+$/, "")
                  .replace(/^\d+[-_]/, "")
                  .replace(/[-_]/g, " ");

                await saveFolderPhoto(
                  {
                    folder_id: id,
                    storage_path: fullPath,
                    public_url: pubData.publicUrl,
                    file_name: file.name,
                    size_bytes: file.metadata?.size || 0,
                    mime_type: file.metadata?.mimetype || "image/jpeg",
                    aspect_ratio: "portrait",
                    sort_order: existingPhotos.length + 1,
                    is_cover: existingPhotos.length === 0,
                    caption: cleanCaption,
                    alt_text: `${folder.name} — ${cleanCaption}`,
                  },
                  client
                );
              }
            }
          }
        }
      } catch (storageScanErr) {
        console.warn("Storage auto-sync scan skipped:", storageScanErr);
      }
    }

    const photos = await fetchFolderPhotos(id, client);
    return NextResponse.json({ success: true, data: photos });
  } catch (err: any) {
    console.error("GET /api/admin/media-folders/[id]/photos error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch photos" },
      { status: 500 }
    );
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
    return NextResponse.json({ success: false, error: "Supabase client unconfigured" }, { status: 503 });
  }

  try {
    // Check folder exists and retrieve its storage prefix
    const { data: folder, error: folderErr } = await client
      .from("media_folders")
      .select("*")
      .eq("id", id)
      .single();

    if (folderErr || !folder) {
      return NextResponse.json({ success: false, error: "Target media folder does not exist" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";

    // 1. Direct photo JSON metadata save/update
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const saved = await saveFolderPhoto({ ...body, folder_id: id }, client);
      return NextResponse.json({ success: true, data: saved });
    }

    // 2. Multi-part file upload
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided for upload." }, { status: 400 });
    }

    const uploadedPhotos = [];
    const prefix = folder.storage_prefix || (folder.folder_type === "event-highlight" ? `event-archive-highlights/${folder.slug}/` : `event-archives/${folder.slug}/`);

    // Get current photo count for sort order
    const existing = await fetchFolderPhotos(id, client);
    let nextSort = existing.length;

    for (const file of files) {
      if (!file.name) continue;

      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "_")
        .replace(/_+/g, "_");
      const timestamp = Date.now();
      const storagePath = `${prefix}${timestamp}_${safeName}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { data: uploadData, error: uploadErr } = await client.storage
        .from("portfolio-media")
        .upload(storagePath, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadErr) {
        console.error("Storage upload error for", safeName, uploadErr);
        continue;
      }

      const { data: pubData } = client.storage
        .from("portfolio-media")
        .getPublicUrl(uploadData.path);

      const photoRecord = await saveFolderPhoto(
        {
          folder_id: id,
          storage_path: uploadData.path,
          public_url: pubData.publicUrl,
          file_name: file.name,
          size_bytes: file.size,
          mime_type: file.type || "image/jpeg",
          aspect_ratio: "portrait",
          sort_order: nextSort++,
          is_cover: existing.length === 0 && uploadedPhotos.length === 0,
          caption: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          alt_text: `${folder.name} — ${file.name.replace(/\.[^/.]+$/, "")}`,
        },
        client
      );

      uploadedPhotos.push(photoRecord);
    }

    return NextResponse.json({
      success: true,
      data: uploadedPhotos,
      count: uploadedPhotos.length,
    });
  } catch (err: any) {
    console.error("POST /api/admin/media-folders/[id]/photos error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to process photo upload" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json({ success: false, error: "Database client is not configured" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get("photoId");

  if (!photoId) {
    return NextResponse.json({ success: false, error: "Photo ID is required." }, { status: 400 });
  }

  try {
    // Optionally fetch photo storage path before delete to remove from bucket
    const { data: photo } = await client
      .from("media_folder_photos")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();

    if (photo?.storage_path) {
      try {
        await client.storage.from("portfolio-media").remove([photo.storage_path]);
      } catch (storageErr) {
        console.warn("Storage deletion warning:", storageErr);
      }
    }

    await deleteFolderPhoto(photoId, client);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/media-folders/[id]/photos error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete photo" }, { status: 500 });
  }
}
