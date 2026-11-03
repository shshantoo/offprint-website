import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import { discoverAndReconcileStorageFolders } from "@/lib/data-service";

export async function POST(_request: NextRequest) {
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
    let rpcSynced = 0;
    try {
      const { data: rpcData, error: rpcError } = await client.rpc("sync_media_folders_and_photos");
      if (!rpcError && rpcData?.status === "success") {
        rpcSynced = rpcData.synced_photos || 0;
      }
    } catch (rpcErr) {
      console.warn("sync_media_folders_and_photos RPC notice:", rpcErr);
    }

    // 2. Run multi-prefix storage reconciler to discover all folders and photos
    const reconciledFolders = await discoverAndReconcileStorageFolders(undefined, client);

    const totalPhotos = reconciledFolders.reduce((sum, f) => sum + (f.photo_count || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Successfully discovered ${reconciledFolders.length} folders and synchronized ${Math.max(rpcSynced, totalPhotos)} photographs from Supabase Storage.`,
      data: {
        synced_photos: Math.max(rpcSynced, totalPhotos),
        discovered_folders: reconciledFolders.length,
        folders: reconciledFolders,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/media-folders/sync error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to sync media folders" }, { status: 500 });
  }
}

