/**
 * Formats database, Supabase PostgREST, and application errors into transparent,
 * diagnostic error objects for administrators in the Admin Portal.
 * 
 * Unlike public booking endpoints which return visitor-friendly fallback copy,
 * admin endpoints MUST preserve genuine error codes, details, and hints to avoid
 * masking database issues (e.g., column mismatches, PostgREST schema cache staleness).
 */
export function formatAdminError(err: unknown): { code: string; message: string; httpStatus: number } {
  if (!err) {
    return { code: "UNKNOWN_ERROR", message: "An unexpected error occurred", httpStatus: 500 };
  }
  if (typeof err === "object") {
    const e = err as any;
    if (e.code && e.message && typeof e.httpStatus === "number") {
      return e;
    }
    const code = e.code || "DB_ERROR";
    const details = e.details ? ` (${e.details})` : "";
    const hint = e.hint ? ` [Hint: ${e.hint}]` : "";
    const message = e.message || e.error_description || "Database operation failed";
    const status =
      typeof e.status === "number" && e.status >= 400 && e.status < 600
        ? e.status
        : (code === "PGRST116" ? 404 : 400);

    return {
      code,
      message: `${message}${details}${hint}`,
      httpStatus: status,
    };
  }
  return { code: "SERVER_ERROR", message: String(err), httpStatus: 500 };
}

