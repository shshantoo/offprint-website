import { NextResponse } from "next/server";
import { fetchLeads, submitLead } from "@/lib/data-service";
import { leadFormSchema } from "@/lib/validations";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";

export async function GET(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const data = await fetchLeads(status as any);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = leadFormSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const newLead = await submitLead({
      client_name: parsed.data.client_name,
      company_name: parsed.data.company_name || null,
      email: parsed.data.email,
      phone: parsed.data.phone,
      inquiry_type: parsed.data.inquiry_type,
      details: parsed.data.details,
      estimated_qty: parsed.data.estimated_qty || null,
      event_date: parsed.data.event_date || null,
    });

    return NextResponse.json({ success: true, data: newLead }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
