import { createSupabaseServerClient, createSupabasePrivilegedClient } from "./server";
import type { UserProfile } from "@/types/database";

export interface AuthenticatedContext {
  user: {
    id: string;
    email: string;
  };
  profile: UserProfile | null;
  isAdmin: boolean;
  mustChangeCredentials: boolean;
}

function getConfiguredAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Verifies the current user's session against Supabase Auth on the server
 * and resolves their profile, trusted admin role, and credential-change status.
 * Never trusts client-provided role claims.
 */
export async function getServerAuthContext(): Promise<AuthenticatedContext | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return null;
  }

  let profile: UserProfile | null = null;
  try {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileRow) {
      profile = profileRow as UserProfile;
    } else {
      const meta = user.user_metadata || {};
      const newProfile: UserProfile = {
        id: user.id,
        email: user.email.toLowerCase(),
        username: typeof meta.username === "string" ? meta.username : null,
        full_name: meta.full_name || user.email.split("@")[0],
        phone: meta.phone || "",
        company_or_institution: meta.company_or_institution || null,
        student_id: meta.student_id || null,
        role: "client",
        must_change_credentials: false,
      };
      const { data: inserted } = await supabase
        .from("profiles")
        .upsert(newProfile)
        .select("*")
        .maybeSingle();
      if (inserted) {
        profile = inserted as UserProfile;
      } else {
        profile = newProfile;
      }
    }
  } catch {
    const meta = user.user_metadata || {};
    profile = {
      id: user.id,
      email: user.email.toLowerCase(),
      full_name: meta.full_name || user.email.split("@")[0],
      phone: meta.phone || "",
      role: "client",
      must_change_credentials: false,
    };
  }

  const adminEmails = getConfiguredAdminEmails();
  const isEmailAdmin = adminEmails.includes(user.email.toLowerCase());
  const isProfileAdmin = profile?.role === "admin";
  const isAdmin = Boolean(isProfileAdmin || isEmailAdmin);

  if (isEmailAdmin && profile && profile.role !== "admin") {
    try {
      const priv = await createSupabasePrivilegedClient();
      if (priv) {
        const mustChange = !profile.credentials_changed_at;
        await priv
          .from("profiles")
          .update({
            role: "admin",
            must_change_credentials: mustChange,
          })
          .eq("id", user.id);
        profile.role = "admin";
        profile.must_change_credentials = mustChange;
      }
    } catch {
      // Ignore if service role key is not configured
    }
  }

  const mustChangeCredentials = Boolean(
    isAdmin && profile?.must_change_credentials === true
  );

  return {
    user: {
      id: user.id,
      email: user.email.toLowerCase(),
    },
    profile,
    isAdmin,
    mustChangeCredentials,
  };
}

export async function requireServerAuth(): Promise<
  | { authorized: true; context: AuthenticatedContext }
  | { authorized: false; status: number; error: string }
> {
  const ctx = await getServerAuthContext();
  if (!ctx) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in to continue.",
    };
  }
  return { authorized: true, context: ctx };
}

export async function requireAdminAuth(options?: {
  allowPendingCredentialChange?: boolean;
}): Promise<
  | { authorized: true; context: AuthenticatedContext }
  | { authorized: false; status: number; error: string; code?: string }
> {
  const ctx = await getServerAuthContext();
  if (!ctx) {
    return {
      authorized: false,
      status: 401,
      error: "Administrator authentication required. Please sign in at /admin-portal.",
    };
  }
  if (!ctx.isAdmin) {
    return {
      authorized: false,
      status: 403,
      error: "Access denied. Your account does not have administrator privileges.",
    };
  }
  if (ctx.mustChangeCredentials && !options?.allowPendingCredentialChange) {
    return {
      authorized: false,
      status: 403,
      code: "CREDENTIALS_CHANGE_REQUIRED",
      error:
        "Mandatory security setup required: please set your new administrator username and password before accessing the Admin Portal.",
    };
  }
  return { authorized: true, context: ctx };
}

/**
 * Helper to detect if a Supabase PostgREST error indicates that the database schema
 * has not yet been migrated into the target Supabase project.
 */
export function isMissingSchemaError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "PGRST202" ||
    code === "42P01" ||
    code === "42883" ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the function") ||
    msg.includes("schema cache") ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}
