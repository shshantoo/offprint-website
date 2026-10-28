import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/supabase/auth-helpers";
import { adminLoginSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin-login:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Too many sign-in attempts. Please wait a minute before trying again.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid credentials format." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase authentication client is not configured." },
        { status: 500 }
      );
    }

    const identifier = parsed.data.identifier.trim();
    const password = parsed.data.password;
    let targetEmail = identifier.toLowerCase();

    // If identifier is a username rather than an email address, resolve it safely on the server
    // using our zero-enumeration RPC that verifies both username + password hash before returning email
    if (!identifier.includes("@")) {
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
        "verify_admin_username_login",
        {
          p_username: identifier,
          p_password: password,
        }
      );

      if (rpcError || !resolvedEmail || typeof resolvedEmail !== "string") {
        return NextResponse.json(
          { error: "Invalid administrator username/email or password." },
          { status: 401 }
        );
      }

      targetEmail = resolvedEmail.toLowerCase();
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Invalid administrator username/email or password." },
        { status: 401 }
      );
    }

    const ctx = await getServerAuthContext();
    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication session could not be established." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      isAdmin: ctx.isAdmin,
      mustChangeCredentials: ctx.mustChangeCredentials,
      schemaReady: true,
      user: ctx.user,
      profile: ctx.profile,
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication request failed. Please try again." },
      { status: 500 }
    );
  }
}

