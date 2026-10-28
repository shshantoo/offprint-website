import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import ConvocationBookingClient from "@/components/booking/ConvocationBookingClient";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "IUB 27th Convocation Photography Booking • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Reserve your IUB 27th Convocation photography slot with real-time availability, curated graduate portrait packages, and instant confirmation.",
};

export default function ConvocationBookingPage() {
  return (
    <div className="py-12 md:py-20 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5C4028] hover:text-[#141210] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Booking Pathways</span>
          </Link>

          <Link
            href="/book/traditional"
            className="text-xs font-medium text-[#3A2008] hover:text-[#A66D35] underline underline-offset-4"
          >
            Switch to Traditional Photography Booking →
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center text-sm text-[#5C5449]">
              Loading IUB 27th Convocation booking calendar...
            </div>
          }
        >
          <ConvocationBookingClient />
        </Suspense>
      </div>
    </div>
  );
}

