import { NextResponse } from "next/server";
import { fetchPrintProducts, savePrintProduct } from "@/lib/data-service";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cat = searchParams.get("category") || "all";
    const data = await fetchPrintProducts(cat as any);
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

  try {
    const json = await request.json();
    const saved = await savePrintProduct(json);
    return NextResponse.json({ success: true, data: saved }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
