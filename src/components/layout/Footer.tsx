"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Phone, Mail, MapPin, ArrowUpRight, Lock, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0e0c0a] border-t border-[#26201b] text-[#a89f91] pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Info & Govt Reg */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4a2805] to-[#141210] border border-[#3d3126] flex items-center justify-center text-[#f5f0eb] font-bold text-lg font-mono">
                <span className="text-[#c98a4b]">O</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-xl text-[#f5f0eb]">
                  OFFPRINT
                </span>
                <span className="text-xs font-medium text-[#c98a4b] px-1.5 py-0.5 rounded bg-[#4a2805]/40 border border-[#6e3c08]/50">
                  অফপ্রিন্ট
                </span>
              </div>
            </div>

            <p className="text-xs text-[#a89f91] leading-relaxed max-w-sm">
              Govt. Registered corporate agency in Bangladesh. Crafting premium visual media for high-level summits, documentaries, and executive headshots, paired with luxury physical print and corporate merchandise.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#f5f0eb] bg-[#141210] px-3 py-2 rounded-lg border border-[#26201b] w-fit">
              <ShieldCheck className="w-4 h-4 text-[#c98a4b] shrink-0" />
              <span>Govt. Reg. Entity • 50+ Completed Projects</span>
            </div>

            <div className="pt-2 text-[11px] text-[#696257]">
              Pricing Protocol: Strictly bespoke & offline quotation. All deals handled through scheduled consultations and direct phone confirmations.
            </div>
          </div>

          {/* Core Wing 1: Media Coverage */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f5f0eb]">
              Media & Coverage
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/works?cat=corporate_summit" className="hover:text-[#c98a4b] transition-colors">
                  Corporate Summits & Seminars
                </Link>
              </li>
              <li>
                <Link href="/works?cat=documentary" className="hover:text-[#c98a4b] transition-colors">
                  Brand & Heritage Documentaries
                </Link>
              </li>
              <li>
                <Link href="/works?cat=headshot" className="hover:text-[#c98a4b] transition-colors">
                  Executive Headshots & C-Suite
                </Link>
              </li>
              <li>
                <Link href="/works?cat=workshop" className="hover:text-[#c98a4b] transition-colors">
                  Workshops & Innovation Forums
                </Link>
              </li>
              <li>
                <Link href="/works?cat=wedding" className="hover:text-[#c98a4b] transition-colors">
                  Seasonal Bespoke Weddings
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Wing 2: Print & Merch */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f5f0eb]">
              Physical Solutions
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/print-solutions?cat=cards" className="hover:text-[#c98a4b] transition-colors">
                  Debossed Velvet Business Cards
                </Link>
              </li>
              <li>
                <Link href="/print-solutions?cat=frames" className="hover:text-[#c98a4b] transition-colors">
                  Optical Clear Acrylic Frames
                </Link>
              </li>
              <li>
                <Link href="/print-solutions?cat=corporate_swag" className="hover:text-[#c98a4b] transition-colors">
                  Bespoke Corporate Swag Kits
                </Link>
              </li>
              <li>
                <Link href="/print-solutions?cat=pens" className="hover:text-[#c98a4b] transition-colors">
                  Laser Engraved Metal Pens
                </Link>
              </li>
              <li>
                <Link href="/print-solutions?cat=banners" className="hover:text-[#c98a4b] transition-colors">
                  Matte Roll-up Summit Banners
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Administrative */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f5f0eb]">
              Direct Desk
            </h4>
            <div className="space-y-2.5 text-xs">
              <a
                href="tel:+8801700000000"
                className="flex items-center gap-2 hover:text-[#c98a4b] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#c98a4b]" />
                <span>+880 1700-000000 (Dhaka)</span>
              </a>
              <a
                href="mailto:contact@offprint.agency"
                className="flex items-center gap-2 hover:text-[#c98a4b] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#c98a4b]" />
                <span>inquiry@offprint.agency</span>
              </a>
              <div className="flex items-start gap-2 text-[11px] text-[#696257]">
                <MapPin className="w-3.5 h-3.5 text-[#c98a4b] shrink-0 mt-0.5" />
                <span>Dhaka, Bangladesh • Operating Nationwide</span>
              </div>
            </div>

            <div className="pt-3">
              <Link
                href="/admin/leads"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#141210] hover:bg-[#1b1815] border border-[#26201b] hover:border-[#c98a4b]/50 text-xs text-[#a89f91] hover:text-[#c98a4b] transition-colors"
              >
                <Lock className="w-3 h-3 text-[#c98a4b]" />
                <span>Admin Access</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-8 border-t border-[#26201b] flex flex-col sm:flex-row items-center justify-between text-xs text-[#696257] gap-4">
          <div>
            © 2026 OFFPRINT (অফপ্রিন্ট). All rights reserved. Registered under Laws of Bangladesh.
          </div>
          <div className="flex items-center gap-6">
            <span>Corporate Registration: Est. Sep 2025</span>
            <Link href="/privacy" className="hover:text-[#a89f91]">
              Terms & Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
