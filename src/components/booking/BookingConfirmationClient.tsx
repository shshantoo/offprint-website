"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Booking } from "@/types/database";
import { formatDhakaDateTime } from "@/lib/booking/timezone";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";

export default function BookingConfirmationClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  const bookingRef = searchParams.get("ref") || "OFP-CONFIRMED";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const fetched = json?.data?.booking || json?.booking;
        if (fetched) {
          setBooking(fetched);
        }
      })
      .catch(() => {
        // Guest user may not be authenticated yet; reference receipt still renders cleanly
      });
  }, [bookingId]);

  const handleCopyRef = () => {
    navigator.clipboard.writeText(booking?.booking_ref || bookingRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#D5CCB4] p-8 sm:p-12 shadow-md space-y-8">
        {/* Top Confirmed Badge */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#EEF7F2] border border-[#2E6B4E]/30 text-[#2E6B4E] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-[#2E6B4E] font-semibold">
            Reservation Confirmed
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#141210] tracking-tight">
            Your Photography Session is Reserved
          </h1>
          <p className="text-sm text-[#5C5449] max-w-lg mx-auto leading-relaxed">
            A confirmation email has been queued for your inbox, and our studio calendar has locked your time slot.
          </p>
        </div>

        {/* Reference Box */}
        <div className="p-5 rounded-2xl bg-[#F4EFE6] border border-[#D5CCB4] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#5C4028] block">
              Official Booking Reference
            </span>
            <span className="text-2xl font-extrabold font-mono text-[#3A2008] tracking-wider">
              {booking?.booking_ref || bookingRef}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyRef}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF7F2] text-xs font-semibold text-[#141210] border border-[#D5CCB4] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#2E6B4E]" />
                <span>Copied Reference</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Copy Reference</span>
              </>
            )}
          </button>
        </div>

        {/* Detailed Breakdown (if authenticated or loaded) */}
        {booking && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
                <Calendar className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Date & Time (Asia/Dhaka)</span>
              </div>
              <div className="text-sm font-bold text-[#141210]">
                {formatDhakaDateTime(booking.start_at)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
                <Clock className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Service & Package</span>
              </div>
              <div className="text-sm font-bold text-[#141210]">
                {booking.service_or_event_title}
                {booking.package_name ? ` — ${booking.package_name}` : ""}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
                <MapPin className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Location / Venue</span>
              </div>
              <div className="text-sm font-bold text-[#141210]">
                {booking.location || "OFFPRINT Studio, Dhaka"}
              </div>
            </div>
          </div>
        )}

        {/* Policy & Portal Instructions */}
        <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2 text-xs text-[#5C5449] leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-[#141210]">
            <ShieldCheck className="w-4 h-4 text-[#A66D35]" />
            <span>Managing, Rescheduling, or Cancelling Your Booking</span>
          </div>
          <p>
            Sign in or create your client account at the{" "}
            <strong className="text-[#141210]">OFFPRINT Client Portal</strong> using the same email address you used for this reservation. All bookings matching your verified email are automatically linked to your portal dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            href={bookingId ? `/client-portal/bookings/${bookingId}` : "/client-portal"}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-widest transition-colors"
          >
            <UserCheck className="w-4 h-4 text-[#D9A673]" />
            <span>Open Client Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/book"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border border-[#D5CCB4] text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <span>Book Another Session</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
