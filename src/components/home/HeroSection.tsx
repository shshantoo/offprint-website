"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  GraduationCap,
  Camera,
  Film,
  ShieldCheck,
} from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-[#FAF7F2]">
      {/* Subtle architectural editorial frame lines */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Editorial Headline & Booking CTAs */}
          <div className="lg:col-span-7 space-y-7">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-medium text-[#141210] shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-[#A66D35]" />
              <span className="text-[#5C5449]">Govt. Registered Studio & Agency</span>
              <span className="text-[#D5CCB4]">•</span>
              <span className="text-[#3A2008] font-mono font-semibold">অফপ্রিন্ট (Est. Sep 2025)</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#141210] leading-[1.06]">
              Enduring Visual Legacies.{" "}
              <span className="text-[#3A2008] block sm:inline">
                Timeless Portraiture.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#5C5449] max-w-2xl leading-relaxed">
              Dhaka’s premier photography studio, corporate media production house, and bespoke print agency. Reserve your session for{" "}
              <strong className="text-[#141210] font-semibold">
                IUB 27th Convocation Photography
              </strong>
              , executive portraits, brand documentaries, or private celebrations.
            </p>

            {/* Primary & Secondary CTAs — Single Prominent IUB 27th Convocation Booking Button */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                href="/book/convocation"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] shadow-md transition-all"
              >
                <GraduationCap className="w-4 h-4 text-[#D9A673]" />
                <span>IUB 27th Convocation Booking</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#FFFFFF] hover:bg-[#F4EFE6] text-[#3A2008] border border-[#D5CCB4] shadow-xs transition-all"
              >
                <Calendar className="w-4 h-4 text-[#A66D35]" />
                <span>Book a Session</span>
              </Link>

              <Link
                href="/works"
                className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl text-xs font-medium text-[#5C5449] hover:text-[#141210] bg-transparent hover:bg-[#F4EFE6] border border-transparent hover:border-[#E5DEC9] transition-all"
              >
                <Film className="w-4 h-4 text-[#A66D35]" />
                <span>Explore 50+ Works</span>
              </Link>
            </div>

            {/* Studio Assurance Strip */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#E5DEC9]">
              <div className="space-y-0.5">
                <div className="text-2xl font-extrabold text-[#141210] font-mono">50+</div>
                <div className="text-xs text-[#5C5449]">Delivered Productions</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-extrabold text-[#3A2008] font-mono">Live</div>
                <div className="text-xs text-[#5C5449]">Real-Time Slot Booking</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-extrabold text-[#141210] font-mono">2 Wings</div>
                <div className="text-xs text-[#5C5449]">Media & Print Collateral</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-extrabold text-[#A66D35] font-mono">Est. 2025</div>
                <div className="text-xs text-[#5C5449]">Dhaka Studio & Agency</div>
              </div>
            </div>
          </div>

          {/* Right Column: Dual Booking Pathway Showcase Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#A66D35] block">
                    Direct Studio Reservations
                  </span>
                  <h2 className="text-xl font-bold text-[#141210] mt-0.5">
                    Select Your Booking Pathway
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#F4EFE6] border border-[#E5DEC9] text-[11px] font-mono text-[#3A2008]">
                  Asia/Dhaka (BST)
                </span>
              </div>

              {/* Pathway 1: Special Event & Milestone Campaigns */}
              <Link
                href="/book"
                className="group block p-5 rounded-2xl bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E5DEC9] hover:border-[#A66D35] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#3A2008] text-[#FAF7F2] flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#A66D35] font-semibold">
                        Special Event Booking
                      </span>
                      <h3 className="text-base font-bold text-[#141210] group-hover:text-[#3A2008]">
                        Convocation &amp; Special Event Sessions
                      </h3>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#877D70] group-hover:text-[#3A2008] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0 mt-1" />
                </div>
                <p className="text-xs text-[#5C5449] mt-3 leading-relaxed">
                  Dedicated graduate &amp; family portrait sessions, seasonal mini-sessions, and curated campaign time-slot reservations.
                </p>
              </Link>

              {/* Pathway 2: Traditional Photography Booking */}
              <Link
                href="/book/traditional"
                className="group block p-5 rounded-2xl bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E5DEC9] hover:border-[#A66D35] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F4EFE6] border border-[#D5CCB4] text-[#3A2008] flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C4028] font-semibold">
                        Studio & On-Location
                      </span>
                      <h3 className="text-base font-bold text-[#141210] group-hover:text-[#3A2008]">
                        Traditional Photography Sessions
                      </h3>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#877D70] group-hover:text-[#3A2008] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0 mt-1" />
                </div>
                <p className="text-xs text-[#5C5449] mt-3 leading-relaxed">
                  Executive headshots, corporate summits, brand documentaries, portrait sessions, and seasonal bespoke weddings.
                </p>
              </Link>

              <div className="pt-2 flex items-center justify-between text-xs text-[#5C5449]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Instant Confirmation Reference</span>
                </span>
                <Link
                  href="/client-portal"
                  className="font-semibold text-[#3A2008] hover:text-[#A66D35] underline underline-offset-4"
                >
                  Manage Existing Booking →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
