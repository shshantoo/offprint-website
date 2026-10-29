import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json(
      { success: false, error: "Database client is not configured" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const roleFilter = searchParams.get("role");
    const search = searchParams.get("search")?.toLowerCase().trim();

    // If requesting bookings for a specific user
    if (userId) {
      const [userRes, bookingsRes] = await Promise.all([
        client.from("profiles").select("*").eq("id", userId).maybeSingle(),
        client
          .from("bookings")
          .select("*")
          .eq("user_id", userId)
          .order("start_at", { ascending: false }),
      ]);

      if (!userRes.data) {
        return NextResponse.json(
          { success: false, error: "User not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          user: userRes.data,
          bookings: bookingsRes.data || [],
        },
      });
    }

    // Otherwise list all registered users with their booking stats
    let profilesQuery = client.from("profiles").select("*").order("created_at", { ascending: false });

    if (roleFilter && roleFilter !== "all") {
      profilesQuery = profilesQuery.eq("role", roleFilter);
    }

    const { data: profiles, error: profErr } = await profilesQuery;
    if (profErr) {
      throw new Error(`Failed to fetch profiles: ${profErr.message}`);
    }

    // Fetch booking counts per user
    const { data: bookingStats } = await client
      .from("bookings")
      .select("user_id, id, total_price, start_at, status")
      .not("user_id", "is", null);

    const statsByUser: Record<string, { count: number; totalSpent: number; lastBookingAt: string | null }> = {};
    if (Array.isArray(bookingStats)) {
      for (const b of bookingStats) {
        if (!b.user_id) continue;
        if (!statsByUser[b.user_id]) {
          statsByUser[b.user_id] = { count: 0, totalSpent: 0, lastBookingAt: null };
        }
        statsByUser[b.user_id].count++;
        statsByUser[b.user_id].totalSpent += Number(b.total_price || 0);
        if (!statsByUser[b.user_id].lastBookingAt || b.start_at > statsByUser[b.user_id].lastBookingAt!) {
          statsByUser[b.user_id].lastBookingAt = b.start_at;
        }
      }
    }

    let results = (profiles || []).map((p: any) => {
      const stats = statsByUser[p.id] || { count: 0, totalSpent: 0, lastBookingAt: null };
      return {
        ...p,
        bookings_count: stats.count,
        total_spent: stats.totalSpent,
        last_booking_at: stats.lastBookingAt,
      };
    });

    if (search) {
      results = results.filter(
        (u: any) =>
          u.full_name?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.phone?.toLowerCase().includes(search) ||
          u.student_id?.toLowerCase().includes(search) ||
          u.username?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (err: any) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load users" },
      { status: 500 }
    );
  }
}
