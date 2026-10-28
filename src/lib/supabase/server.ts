import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabasePublishableKey, isSupabaseConfigured } from "./client";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where setting cookies is a no-op;
          // Session refresh is handled in proxy.ts / Route Handlers.
        }
      },
    },
  });
}

/**
 * Creates a server-only privileged Supabase client when SUPABASE_SERVICE_ROLE_KEY is configured,
 * otherwise falls back to the request-scoped authenticated server client.
 * Never import this file in client components.
 */
export async function createSupabasePrivilegedClient() {
  if (!isSupabaseConfigured()) return null;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    serviceRoleKey &&
    serviceRoleKey.trim() !== "" &&
    !serviceRoleKey.includes("your-")
  ) {
    return createClient(getSupabaseUrl(), serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createSupabaseServerClient();
}

