import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export const getSupabasePublishableKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = () => {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  return Boolean(
    url &&
      key &&
      url.startsWith("http") &&
      !url.includes("your-project")
  );
};

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  if (typeof window === "undefined") {
    return createSupabaseJsClient(getSupabaseUrl(), getSupabasePublishableKey());
  }
  if (!browserClient) {
    browserClient = createBrowserClient(
      getSupabaseUrl(),
      getSupabasePublishableKey()
    );
  }
  return browserClient;
}

export const supabase = isSupabaseConfigured()
  ? createSupabaseJsClient(getSupabaseUrl(), getSupabasePublishableKey())
  : null;
