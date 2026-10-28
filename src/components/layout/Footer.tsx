"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  GraduationCap,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#F4EFE6] border-t border-[#E5DEC9] text-[#655E55] pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Info & Govt Reg */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#3A2008] border border-[#5C4028] flex items-center justify-center text-[#FAF7F2] font-bold text-lg font-mono">
                <span>O</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-xl text-[#141210]">
                  OFFPRINT
                </span>
                <span className="text-xs font-semibold text-[#3A2008] px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#DED6C6]">
                  অফপ্রিন্ট
                </span>
              </div>
            </div>

            <p className="text-xs text-[#655E55] leading-relaxed max-w-sm">
              Govt. Registered photography studio and corporate agency in Bangladesh (Est. Sep 2025). Specializing in IUB Convocation portrait sessions, executive headshots, corporate summits, brand documentaries, and luxury physical print collateral.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#141210] font-medium bg-[#FFFFFF] px-3.5 py-2 rounded-lg border border-[#E5DEC9] w-fit">
              <ShieldCheck className="w-4 h-4 text-[#A66D35] shrink-0" />
              <span>Govt. Reg. Entity • 50+ Completed Projects</span>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <Link
                href="/book"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold hover:bg-[#5C4028] transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-[#D8B084]" />
                <span>Book a Session</span>
              </Link>
              <Link
                href="/client-portal"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFFFFF] text-[#3A2008] border border-[#DED6C6] text-xs font-semibold hover:bg-[#FAF7F2] transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Client Portal</span>
              </Link>
            </div>
          </div>

          {/* Booking & Photography */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#141210]">
              Photography &amp; Booking
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#3A2008] hover:text-[#A66D35] transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Special Event Booking</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/book/traditional"
                  className="hover:text-[#141210] transition-colors"
                >
                  Traditional Photography Booking
                </Link>
              </li>
              <li>
                <Link
                  href="/works"
                  className="hover:text-[#141210] transition-colors"
                >
                  Production Works Archive
                </Link>
              </li>
              <li>
                <Link
                  href="/client-portal"
                  className="hover:text-[#141210] transition-colors"
                >
                  Reschedule or Manage Booking
                </Link>
              </li>
              <li>
                <Link
                  href="/#quote"
                  className="hover:text-[#141210] transition-colors"
                >
                  Custom Corporate Quote
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Wing 2: Print & Merch */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#141210]">
              Physical Print &amp; Merch
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/print-solutions"
                  className="hover:text-[#141210] transition-colors"
                >
                  650 GSM Debossed Business Cards
                </Link>
              </li>
              <li>
                <Link
                  href="/print-solutions"
                  className="hover:text-[#141210] transition-colors"
                >
                  12mm Optical Clear Acrylic Frames
                </Link>
              </li>
              <li>
                <Link
                  href="/print-solutions"
                  className="hover:text-[#141210] transition-colors"
                >
                  Bespoke Corporate Swag Suites
                </Link>
              </li>
              <li>
                <Link
                  href="/print-solutions"
                  className="hover:text-[#141210] transition-colors"
                >
                  Laser Engraved Brass Pens
                </Link>
              </li>
              <li>
                <Link
                  href="/print-solutions"
                  className="hover:text-[#141210] transition-colors"
                >
                  Matte Roll-up Summit Banners
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Desk */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#141210]">
              Direct Studio Desk
            </h4>
            <div className="space-y-2.5 text-xs">
              <a
                href="tel:+8801700000000"
                className="flex items-center gap-2 text-[#3D3730] hover:text-[#3A2008] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#A66D35]" />
                <span className="font-mono">+880 1700-000000</span>
              </a>
              <a
                href="mailto:inquiry@offprint.agency"
                className="flex items-center gap-2 text-[#3D3730] hover:text-[#3A2008] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
                <span className="font-mono">inquiry@offprint.agency</span>
              </a>
              <div className="flex items-start gap-2 text-[11px] text-[#655E55]">
                <MapPin className="w-3.5 h-3.5 text-[#A66D35] shrink-0 mt-0.5" />
                <span>
                  Gulshan &amp; Banani Corporate Corridor, Dhaka, Bangladesh
                </span>
              </div>
              <div className="pt-2 text-[11px] text-[#8A8175]">
                Timezone: Asia/Dhaka (BST • UTC+6)
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-8 border-t border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between text-xs text-[#655E55] gap-4">
          <div>
            © 2026 OFFPRINT (অফপ্রিন্ট). All rights reserved. Registered under Laws of Bangladesh.
          </div>
          <div className="flex items-center gap-6">
            <span>Est. Sep 2025 • Dhaka</span>
            <Link href="/privacy" className="hover:text-[#141210] transition-colors">
              Booking Policy &amp; Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
