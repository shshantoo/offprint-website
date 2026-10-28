import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import {
  adminFirstLoginCredentialSchema,
  adminAccountUpdateSchema,
} from "@/lib/validations";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  const auth = await requireAdminAuth({ allowPendingCredentialChange: true });
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user, profile, mustChangeCredentials } = auth.context;
  return NextResponse.json({
    account: {
      id: user.id,
      email: user.email,
      username: profile?.username || null,
      full_name: profile?.full_name || "",
      must_change_credentials: mustChangeCredentials,
      credentials_changed_at: profile?.credentials_changed_at || null,
    },
  });
}

/**
 * Handles both:
 * 1. Mandatory First-Login Administrator Username + Password Setup (POST)
 * 2. Ongoing Account & Security Username / Password Updates with Re-Authentication (PATCH or POST)
 *
 * Guarantees that `must_change_credentials` is cleared ONLY after both the Supabase Auth
 * password update and the atomic username update (`complete_admin_credential_update`) succeed.
 */
async function handleCredentialUpdate(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`admin-account-update:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many credential update attempts. Please wait a minute." },
      { status: 429 }
    );
  }

  const auth = await requireAdminAuth({ allowPendingCredentialChange: true });
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase server client is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const isFirstLoginFlow =
      auth.context.mustChangeCredentials || body?.mode === "first_login";

    if (isFirstLoginFlow) {
      const parsed = adminFirstLoginCredentialSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message ||
              "Please provide a valid username and new password.",
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const { username, currentPassword, newPassword } = parsed.data;
      const cleanUsername = username.trim();

      // Pre-check case-insensitive username uniqueness before updating Auth password
      const { data: conflictRow } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .neq("id", auth.context.user.id)
        .maybeSingle();

      if (conflictRow) {
        return NextResponse.json(
          {
            error:
              "This username is already taken. Please choose a different administrator username.",
          },
          { status: 409 }
        );
      }

      // If currentPassword was supplied, verify it via re-authentication
      if (currentPassword && currentPassword.trim().length > 0) {
        const { error: reauthErr } = await supabase.auth.signInWithPassword({
          email: auth.context.user.email,
          password: currentPassword,
        });
        if (reauthErr) {
          return NextResponse.json(
            { error: "Current password is incorrect." },
            { status: 401 }
          );
        }
      }

      // 1. Update password in Supabase Auth first
      const { error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { username: cleanUsername },
      });

      if (pwError) {
        return NextResponse.json(
          {
            error:
              pwError.message ||
              "Failed to update password in Supabase Auth. Please choose a stronger password.",
          },
          { status: 400 }
        );
      }

      // 2. Atomically update username and clear must_change_credentials = false
      const { data: updatedProfile, error: rpcError } = await supabase.rpc(
        "complete_admin_credential_update",
        {
          p_new_username: cleanUsername,
        }
      );

      if (rpcError) {
        const msg = rpcError.message || "Failed to update administrator username.";
        if (msg.includes("USERNAME_TAKEN")) {
          return NextResponse.json(
            {
              error:
                "This username is already taken. Please choose a different administrator username.",
            },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message:
          "Administrator username and password updated. First-login security setup complete.",
        profile: updatedProfile,
      });
    }

    // Ongoing Account & Security update (requires currentPassword re-authentication)
    const parsed = adminAccountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Invalid account security update request.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { username, currentPassword, newPassword } = parsed.data;
    const targetUsername = (
      username?.trim() ||
      auth.context.profile?.username ||
      ""
    ).trim();

    if (!targetUsername) {
      return NextResponse.json(
        { error: "Administrator username is required." },
        { status: 400 }
      );
    }

    // Pre-check case-insensitive username uniqueness before updating Auth password
    const { data: conflictRow } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", targetUsername)
      .neq("id", auth.context.user.id)
      .maybeSingle();

    if (conflictRow) {
      return NextResponse.json(
        {
          error:
            "This username is already in use. Please choose another username.",
        },
        { status: 409 }
      );
    }

    // Re-authenticate with currentPassword before allowing username or password change
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: auth.context.user.email,
      password: currentPassword,
    });

    if (reauthErr) {
      return NextResponse.json(
        {
          error:
            "Current password verification failed. Please enter your active password.",
        },
        { status: 401 }
      );
    }

    // If a new password was provided, update it in Supabase Auth
    if (newPassword && newPassword.length > 0) {
      const { error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { username: targetUsername },
      });

      if (pwError) {
        return NextResponse.json(
          {
            error:
              pwError.message || "Failed to update password in Supabase Auth.",
          },
          { status: 400 }
        );
      }
    }

    // Atomically update username and record credentials_changed_at
    const { data: updatedProfile, error: rpcError } = await supabase.rpc(
      "complete_admin_credential_update",
      {
        p_new_username: targetUsername,
      }
    );

    if (rpcError) {
      const msg = rpcError.message || "Failed to update administrator username.";
      if (msg.includes("USERNAME_TAKEN")) {
        return NextResponse.json(
          {
            error:
              "This username is already in use. Please choose another username.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message:
        newPassword && newPassword.length > 0
          ? "Administrator credentials (username & password) updated."
          : "Administrator username updated.",
      profile: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update administrator credentials." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleCredentialUpdate(request);
}

export async function PATCH(request: Request) {
  return handleCredentialUpdate(request);
}
