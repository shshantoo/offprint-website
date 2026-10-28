/**
 * Resolves the trusted application base URL across Development, Vercel Preview, and Production.
 *
 * Precedence:
 * 1. NEXT_PUBLIC_SITE_URL (custom domain or canonical site URL configured in Vercel, e.g. "https://offprint.agency")
 * 2. NEXT_PUBLIC_APP_URL (standard alias)
 * 3. VERCEL_PROJECT_PRODUCTION_URL (Vercel production system env, e.g. "offprint.vercel.app")
 * 4. VERCEL_URL / NEXT_PUBLIC_VERCEL_URL (Vercel preview deployment system env, e.g. "offprint-git-xyz.vercel.app")
 * 5. Fallback for local development: "http://localhost:3000"
 */
export function getSiteBaseUrl(): string {
  const customSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (customSiteUrl) {
    return customSiteUrl.replace(/\/$/, "");
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) {
    return `https://${vercelProduction.replace(/\/$/, "")}`;
  }

  const vercelPreview =
    process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelPreview) {
    return `https://${vercelPreview.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

