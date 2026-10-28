import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { fetchSiteSettings } from "@/lib/data-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BookingEvent } from "@/types/database";
import {
  GraduationCap,
  Camera,
  ArrowUpRight,
  Calendar,
  ShieldCheck,
  Clock,
  CheckCircle2,
  UserCheck,
  Sparkles,
  MapPin,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Book a Session • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Reserve your photography appointment with OFFPRINT — select a Special Event / Convocation Session or Traditional Studio & On-Location Photography.",
};

export default async function BookingEntryPage() {
  const siteSettings = await fetchSiteSettings();
  const supabase = await createSupabaseServerClient();

  let publishedEvents: BookingEvent[] = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from("booking_events")
        .select("*")
        .eq("status", "published")
        .order("is_featured_on_home", { ascending: false })
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        publishedEvents = data as BookingEvent[];
      }
    } catch {
      // Fallback below if query fails
    }
  }

  return (
    <div className="py-16 md:py-24 bg-[#FAF7F2]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Live Online Reservation System • Asia/Dhaka (BST)</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#141210] tracking-tight">
            {siteSettings.booking_page?.heading || "Reserve Your Photography Session"}
          </h1>
          <p className="text-sm sm:text-base text-[#5C5449] leading-relaxed">
            {siteSettings.booking_page?.subheading ||
              "Select your photography booking pathway below. All flows connect to our real-time studio schedule with atomic slot protection and instant email confirmation."}
          </p>
        </div>

        {/* Booking Pathway Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dynamic Published Special Booking Events */}
          {publishedEvents.length > 0 ? (
            publishedEvents.map((ev) => {
              const bookingHref =
                ev.slug === "iub-27th-convocation"
                  ? "/book/convocation"
                  : `/book/special/${ev.slug}`;
              const isConvocation =
                ev.category === "convocation" || ev.category === "graduation";

              return (
                <div
                  key={ev.id}
                  className="group rounded-3xl bg-[#FFFFFF] border-2 border-[#D5CCB4] hover:border-[#3A2008] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-xl"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-[#3A2008] text-[#FAF7F2] flex items-center justify-center shadow-sm">
                        {isConvocation ? (
                          <GraduationCap className="w-7 h-7" />
                        ) : (
                          <Sparkles className="w-7 h-7" />
                        )}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#F4EFE6] border border-[#D5CCB4] text-xs font-mono uppercase tracking-wider text-[#3A2008] font-semibold">
                        {ev.category?.replace(/_/g, " ") || "Special Event"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35] font-semibold">
                        {ev.subtitle || "Special Event Booking Portal"}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
                        {ev.title}
                      </h2>
                      <p className="text-sm text-[#5C5449] leading-relaxed">
                        {ev.description}
                      </p>
                    </div>

                    <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#141210]">
                      {ev.venue && (
                        <li className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                          <span>Venue: {ev.venue}</span>
                        </li>
                      )}
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                        <span>
                          Live event calendar with{" "}
                          {ev.default_slot_duration_mins || 30}-minute time-slot
                          availability
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                        <span>
                          Real-time slot capacity enforcement &amp; buffer protection
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                        <span>
                          Instant booking reference &amp; Client Portal self-service
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-8 mt-8 border-t border-[#E5DEC9]">
                    <Link
                      href={bookingHref}
                      className="w-full inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] shadow-sm transition-all"
                    >
                      <span>Reserve {ev.title}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="group rounded-3xl bg-[#FFFFFF] border-2 border-[#D5CCB4] hover:border-[#3A2008] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-[#3A2008] text-[#FAF7F2] flex items-center justify-center shadow-sm">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#F4EFE6] border border-[#D5CCB4] text-xs font-mono uppercase tracking-wider text-[#3A2008] font-semibold">
                    Dedicated Event Portal
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35] font-semibold">
                    Convocation Special
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
                    IUB 27th Convocation Photography
                  </h2>
                  <p className="text-sm text-[#5C5449] leading-relaxed">
                    Exclusive graduate portrait sessions, family &amp; peer group coverage,
                    and fine-art regalia framing for Independent University, Bangladesh
                    (IUB) 27th Convocation graduates.
                  </p>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-[#E5DEC9]">
                <Link
                  href="/book/convocation"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] shadow-sm transition-all"
                >
                  <span>Open IUB 27th Convocation Booking</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Option 2: Traditional Photography Booking */}
          <div className="group rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#F4EFE6] border border-[#D5CCB4] text-[#3A2008] flex items-center justify-center">
                  <Camera className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono uppercase tracking-wider text-[#5C4028] font-semibold">
                  Year-Round Scheduling
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[#5C4028] font-semibold">
                  Studio &amp; On-Location
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
                  Traditional Photography Booking
                </h2>
                <p className="text-sm text-[#5C5449] leading-relaxed">
                  Flexible appointment scheduling for executive portraits, corporate
                  events, brand documentaries, family portraiture, and seasonal bespoke
                  weddings across Dhaka.
                </p>
              </div>

              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#141210]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                  <span>
                    Select from administrator-managed photography services &amp; packages
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                  <span>Choose studio or custom Dhaka venue/location coordinates</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                  <span>
                    Shared resource conflict prevention with special event schedules
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                  <span>Automated Google Calendar sync &amp; confirmation email</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 mt-8 border-t border-[#E5DEC9]">
              <Link
                href="/book/traditional"
                className="w-full inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#FAF7F2] hover:bg-[#3A2008] text-[#3A2008] hover:text-[#FAF7F2] border border-[#3A2008] transition-all"
              >
                <span>Open Traditional Photography Booking</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Client Portal & Policy Strip */}
        <div className="rounded-3xl bg-[#F4EFE6] border border-[#D5CCB4] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#3A2008] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#A66D35]" />
              <span>Already Have a Reservation?</span>
            </div>
            <h3 className="text-lg font-bold text-[#141210]">
              Access the OFFPRINT Client Portal
            </h3>
            <p className="text-xs text-[#5C5449] leading-relaxed">
              Sign in with your booking email to inspect your reservation reference,
              review package details, reschedule to another open slot, or cancel within
              policy deadlines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              href="/client-portal"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF7F2] text-[#141210] border border-[#D5CCB4] text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <UserCheck className="w-4 h-4 text-[#A66D35]" />
              <span>Open Client Portal</span>
            </Link>
            <Link
              href="/privacy"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-medium text-[#5C5449] hover:text-[#141210] transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Booking Policies</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
