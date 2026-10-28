import React, { Suspense } from "react";
import type { Metadata } from "next";
import BookingDetailClient from "@/components/client-portal/BookingDetailClient";

export const metadata: Metadata = {
  title: "Booking Details • OFFPRINT Client Portal",
  description: "Inspect, reschedule, or cancel your OFFPRINT photography reservation.",
};

async function BookingDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingDetailClient bookingId={id} />;
}

export default function ClientBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="py-12 md:py-20 bg-[#FAF7F2]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center text-sm text-[#5C5449]">
              Loading booking details...
            </div>
          }
        >
          <BookingDetailContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

