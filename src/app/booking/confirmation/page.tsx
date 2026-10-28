import React, { Suspense } from "react";
import type { Metadata } from "next";
import BookingConfirmationClient from "@/components/booking/BookingConfirmationClient";

export const metadata: Metadata = {
  title: "Booking Confirmed • OFFPRINT (অফপ্রিন্ট)",
  description: "Your OFFPRINT photography session reservation reference and confirmation summary.",
};

export default function BookingConfirmationPage() {
  return (
    <div className="py-16 md:py-24 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="max-w-3xl mx-auto rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center text-sm text-[#5C5449]">
              Loading reservation confirmation...
            </div>
          }
        >
          <BookingConfirmationClient />
        </Suspense>
      </div>
    </div>
  );
}

