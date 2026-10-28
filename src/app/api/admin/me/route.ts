import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/supabase/auth-helpers";

export async function GET() {
  const ctx = await getServerAuthContext();
  if (!ctx) {
    return NextResponse.json({
      authenticated: false,
      isAdmin: false,
      mustChangeCredentials: false,
      schemaReady: true,
      user: null,
      profile: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    isAdmin: ctx.isAdmin,
    mustChangeCredentials: ctx.mustChangeCredentials,
    schemaReady: true,
    user: ctx.user,
    profile: ctx.profile,
  });
}
