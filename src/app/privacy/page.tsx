import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Clock, RefreshCw, Lock, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Booking Policies & Privacy • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Review OFFPRINT's appointment reservation, rescheduling, cancellation, and client privacy policies.",
};

export default function PrivacyAndPolicyPage() {
  return (
    <div className="py-16 md:py-24 bg-[#FAF7F2]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Studio Governance & Client Protections</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#141210] tracking-tight">
            Booking Policies & Client Privacy
          </h1>
          <p className="text-sm sm:text-base text-[#5C5449] leading-relaxed">
            Transparent scheduling rules for IUB 27th Convocation Photography and Traditional Studio/Location Bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#141210]">Rescheduling Policy</h2>
            <p className="text-xs text-[#5C5449] leading-relaxed">
              Clients may reschedule an active booking directly via the{" "}
              <Link href="/client-portal" className="text-[#3A2008] underline font-semibold">
                Client Portal
              </Link>{" "}
              up to the configured cutoff window prior to the session start time (typically 24 hours for traditional sessions and 48 hours for convocation sessions). Rescheduling atomically validates the new slot and releases the original time slot.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#141210]">Cancellation Policy</h2>
            <p className="text-xs text-[#5C5449] leading-relaxed">
              Cancellations may be completed online before the stated cancellation deadline on your booking confirmation. Once cancelled, the reserved slot capacity is immediately released and your Google Calendar event and email records are updated.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#141210]">Timezone & Punctuality</h2>
            <p className="text-xs text-[#5C5449] leading-relaxed">
              All dates and times across the OFFPRINT platform are displayed in{" "}
              <strong className="text-[#141210]">Asia/Dhaka (Bangladesh Standard Time, UTC+06:00)</strong>. Please arrive 10 minutes before your scheduled session window.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#141210]">Data & Gallery Privacy</h2>
            <p className="text-xs text-[#5C5449] leading-relaxed">
              Your contact details, academic ID, and booking records are protected by strict privacy and security controls. Public availability schedules only expose anonymized time intervals and never disclose client identities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

