import { NextRequest, NextResponse } from "next/server";
import { clientProfileSchema } from "@/lib/validations";
import { requireServerAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireServerAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: auth.context.user,
      profile: auth.context.profile,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireServerAuth();
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
    const parsed = clientProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid profile details",
        },
        { status: 400 }
      );
    }

    // Never allow updating 'role' from the client profile endpoint
    const updates = {
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      company_or_institution: parsed.data.company_or_institution || null,
      student_id: parsed.data.student_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", auth.context.user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;
