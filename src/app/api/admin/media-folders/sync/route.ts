import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

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
    // 1. First attempt to call the dedicated database sync RPC
    const { data: rpcData, error: rpcError } = await client.rpc("sync_media_folders_and_photos");

    if (!rpcError && rpcData?.status === "success") {
      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${rpcData.synced_photos || 0} photographs with Supabase Storage.`,
        data: rpcData,
      });
    }

    if (rpcError) {
      console.warn("sync_media_folders_and_photos RPC failed, running fallback storage scanner:", rpcError);
    }

    // Fallback: list physical folders in portfolio-media and sync
    const { data: archivesList } = await client.storage
      .from("portfolio-media")
      .list("event-archives", { limit: 1000 });

    let totalSynced = 0;

    if (Array.isArray(archivesList)) {
      for (const item of archivesList) {
        // Folders have no id or mimetype
        const folderName = item.name;
        if (!folderName || folderName.startsWith(".")) continue;

        const slug = folderName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
        const prefix = `event-archives/${folderName}/`;

        // Upsert folder record
        const { data: folderRecord } = await client
          .from("media_folders")
          .upsert({
            name: folderName,
            slug,
            folder_type: "event-archive",
            storage_prefix: prefix,
            description: `Visual archive for ${folderName}`,
          }, { onConflict: "slug" })
          .select("id")
          .single();

        if (folderRecord?.id) {
          // List files in folder
          const { data: files } = await client.storage
            .from("portfolio-media")
            .list(`event-archives/${folderName}`, { limit: 1000 });

          if (Array.isArray(files)) {
            const validPhotos = files.filter(f => f.name && !f.name.startsWith("."));
            let order = 1;
            for (const file of validPhotos) {
              const storagePath = `event-archives/${folderName}/${file.name}`;
              const publicUrl = `https://qqklsbbysybzivifnykd.supabase.co/storage/v1/object/public/portfolio-media/${encodeURI(storagePath)}`;
              
              await client.from("media_folder_photos").upsert({
                folder_id: folderRecord.id,
                storage_path: storagePath,
                public_url: publicUrl,
                file_name: file.name,
                size_bytes: file.metadata?.size || 0,
                mime_type: file.metadata?.mimetype || "image/jpeg",
                alt_text: `${folderName} - ${file.name}`,
                sort_order: order,
                is_cover: order === 1,
              }, { onConflict: "storage_path" });

              order++;
              totalSynced++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${totalSynced} photographs from Supabase Storage.`,
      data: { synced_photos: totalSynced },
    });
  } catch (err: any) {
    console.error("POST /api/admin/media-folders/sync error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to sync media folders" }, { status: 500 });
  }
}
