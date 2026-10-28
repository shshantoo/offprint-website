import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import {
  isPortfolioStoragePathReferenced,
  normalizePortfolioProject,
} from "@/lib/data-service";
import type { PortfolioProject } from "@/types/database";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

function sanitizeSegment(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "item"
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase Storage client is not configured." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const folderRaw = String(formData.get("folder") || "portfolio");
    const folder = sanitizeSegment(folderRaw);

    const files: File[] = [];
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one image file to upload." },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error: `Unsupported image format "${file.type}" for "${file.name}". Allowed formats: JPEG, PNG, WebP, AVIF, GIF.`,
          },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds the 15 MB maximum upload size limit.`,
          },
          { status: 400 }
        );
      }
    }

    const uploaded: Array<{
      storage_path: string;
      public_url: string;
      file_name: string;
      size_bytes: number;
      mime_type: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
      const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
      const baseName = sanitizeSegment(file.name.replace(/\.[a-zA-Z0-9]+$/, ""));
      const storagePath = `projects/${folder}/${Date.now()}-${i + 1}-${baseName}${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("portfolio-media")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          {
            error: `Failed to upload "${file.name}" to Supabase Storage: ${uploadError.message}`,
          },
          { status: 400 }
        );
      }

      const { data: pubData } = supabase.storage
        .from("portfolio-media")
        .getPublicUrl(storagePath);

      uploaded.push({
        storage_path: storagePath,
        public_url: pubData.publicUrl,
        file_name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      });
    }

    return NextResponse.json({
      success: true,
      uploaded,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to upload portfolio media." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase Storage client is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const storagePath = String(body?.storage_path || "").trim();
    const excludeProjectId = body?.exclude_project_id
      ? String(body.exclude_project_id).trim()
      : undefined;

    if (!storagePath) {
      return NextResponse.json(
        { error: "storage_path is required." },
        { status: 400 }
      );
    }

    const { data: rows } = await supabase.from("portfolio_projects").select("*");
    const allProjects = ((rows || []) as PortfolioProject[]).map(
      normalizePortfolioProject
    );

    const referencedByPortfolio = isPortfolioStoragePathReferenced(
      storagePath,
      allProjects,
      excludeProjectId
    );

    const { data: eventRefs } = await supabase
      .from("booking_events")
      .select("id")
      .or(`cover_storage_path.eq.${storagePath},hero_image_url.ilike.%${storagePath}%`)
      .limit(1);

    const referencedByEvent = Boolean(eventRefs && eventRefs.length > 0);

    if (referencedByPortfolio || referencedByEvent) {
      return NextResponse.json({
        success: true,
        deleted: false,
        stillReferenced: true,
        message:
          "Image is still referenced by another portfolio project or event; kept in Storage.",
      });
    }

    const { error: removeError } = await supabase.storage
      .from("portfolio-media")
      .remove([storagePath]);

    if (removeError) {
      return NextResponse.json(
        { error: removeError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      stillReferenced: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete storage object." },
      { status: 500 }
    );
  }
}

