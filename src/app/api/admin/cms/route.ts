import { NextRequest, NextResponse } from "next/server";
import { fetchSiteSettings } from "@/lib/data-service";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const settings = await fetchSiteSettings();
  return NextResponse.json({
    success: true,
    data: settings,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { key, value } = body;
    if (!key || !value) {
      return NextResponse.json(
        { success: false, error: "Missing setting key or value." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("site_settings").upsert({
      key: String(key),
      value,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { key, value },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save site settings" },
      { status: 500 }
    );
  }
}

