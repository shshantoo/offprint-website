import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  fetchPortfolioProjects,
  savePortfolioProject,
  deletePortfolioProject,
} from "@/lib/data-service";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cat = searchParams.get("category") || "all";
    const data = await fetchPortfolioProjects(cat as any);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const client = await createSupabasePrivilegedClient();
  try {
    const json = await request.json();
    const saved = await savePortfolioProject(json, client);
    try {
      revalidatePath("/works");
      revalidatePath("/");
    } catch {}
    return NextResponse.json({ success: true, data: saved }, { status: 200 });
  } catch (err: any) {
    console.error("Error in POST /api/portfolio:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to save portfolio project" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const client = await createSupabasePrivilegedClient();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Project id is required" },
        { status: 400 }
      );
    }
    await deletePortfolioProject(id, client);
    try {
      revalidatePath("/works");
      revalidatePath("/");
    } catch {}
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in DELETE /api/portfolio:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete portfolio project" }, { status: 500 });
  }
}
