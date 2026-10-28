import { NextRequest, NextResponse } from "next/server";
import {
  getConvocationAvailabilityFromDb,
  getTraditionalAvailabilityFromDb,
} from "@/lib/booking/booking-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "convocation";
    const now = new Date();
    const year = Number(searchParams.get("year") || now.getUTCFullYear());
    const month = Number(searchParams.get("month") || now.getUTCMonth() + 1);
    const date = searchParams.get("date") || undefined;
    const excludeBookingId = searchParams.get("excludeBookingId") || undefined;

    if (type === "convocation" || type === "special") {
      const slug = searchParams.get("slug") || "iub-27th-convocation";
      const eventId = searchParams.get("eventId") || undefined;
      const result = await getConvocationAvailabilityFromDb({
        slug,
        eventId,
        year,
        month,
        date,
        excludeBookingId,
      });

      return NextResponse.json({
        success: true,
        type,
        ...result,
      });
    } else if (type === "traditional") {
      const serviceId = searchParams.get("serviceId") || undefined;
      const serviceSlug = searchParams.get("serviceSlug") || undefined;
      const durationMins = searchParams.get("durationMins")
        ? Number(searchParams.get("durationMins"))
        : undefined;

      const result = await getTraditionalAvailabilityFromDb({
        serviceId,
        serviceSlug,
        durationMins,
        year,
        month,
        date,
        excludeBookingId,
      });

      return NextResponse.json({
        success: true,
        type: "traditional",
        ...result,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid availability type. Must be convocation or traditional." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch availability",
      },
      { status: err?.httpStatus || 500 }
    );
  }
}

