import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import ConvocationBookingClient from "@/components/booking/ConvocationBookingClient";
import { ArrowLeft } from "lucide-react";

interface SpecialEventBookingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: SpecialEventBookingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const formatted = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${formatted} • Special Event Booking • OFFPRINT (অফপ্রিন্ট)`,
    description: `Reserve your photography session slot for ${formatted} with OFFPRINT.`,
  };
}

export default async function SpecialEventBookingPage({
  params,
}: SpecialEventBookingPageProps) {
  const { slug } = await params;

  return (
    <div className="py-12 md:py-16 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C4028] hover:text-[#141210] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Booking Pathways</span>
          </Link>
        </div>

        <ConvocationBookingClient eventSlug={slug} />
      </div>
    </div>
  );
}

