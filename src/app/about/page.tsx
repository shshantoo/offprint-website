import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Award, Building2, Target, CheckCircle2, ArrowUpRight, Film, Printer } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Learn about OFFPRINT, a Govt. Registered corporate agency in Bangladesh established in Sep 2025, specializing in high-profile media coverage and luxury print merchandise.",
};

export default function AboutPage() {
  return (
    <div className="py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141210] border border-[#3d3126] text-xs font-mono text-[#c98a4b]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Govt. Reg. Entity • Est. Sep 2025</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#f5f0eb] tracking-tight">
            The OFFPRINT Story
          </h1>
          <p className="text-base sm:text-lg text-[#a89f91] max-w-2xl mx-auto leading-relaxed">
            Bridging cinematic storytelling and tactile physical print craftsmanship for Bangladesh’s leading corporate entities, summits, and institutions.
          </p>
        </div>

        {/* Narrative Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5 text-sm text-[#a89f91] leading-relaxed">
            <h2 className="text-2xl font-bold text-[#f5f0eb]">
              Founded on Precision & Permanence
            </h2>
            <p>
              Established in September 2025 in Dhaka, Bangladesh, <strong className="text-[#f5f0eb]">OFFPRINT (অফপ্রিন্ট)</strong> was founded with a singular conviction: corporate institutions deserve media and tangible materials that match the stature of their work.
            </p>
            <p>
              In an era dominated by transient digital content and generic print vendors, OFFPRINT operates two deeply integrated disciplines under one roof:
            </p>
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-[#141210] border border-[#26201b] flex items-start gap-3">
                <Film className="w-5 h-5 text-[#c98a4b] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#f5f0eb]">1. Media & Production Wing</h4>
                  <p className="text-xs text-[#a89f91] mt-0.5">
                    Multi-camera 4K coverage of corporate summits, keynote recordings, brand documentaries, board executive portraits, and private high-society weddings.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#141210] border border-[#26201b] flex items-start gap-3">
                <Printer className="w-5 h-5 text-[#c98a4b] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#f5f0eb]">2. Physical Print & Merch Solutions</h4>
                  <p className="text-xs text-[#a89f91] mt-0.5">
                    Imported 650 GSM cotton debossed cards, optical-grade acrylic frames, custom foam-fitted swag gift suites, and precision fiber laser engraved metal pens.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[#141210] border border-[#3d3126] space-y-6">
            <h3 className="text-xl font-bold text-[#f5f0eb]">
              Why Bespoke Offline Pricing?
            </h3>
            <p className="text-xs text-[#a89f91] leading-relaxed">
              We purposefully reject automated quote generators. Every corporate summit requires unique wireless audio channels, lens selections, and turnaround schedules; every print order involves distinct GSM weights, foil dies, and tactile coatings.
            </p>
            <ul className="space-y-2.5 text-xs text-[#d4cbbf]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c98a4b]" />
                <span>Direct technical consultation with a senior producer</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c98a4b]" />
                <span>Physical material swatch review available at your Dhaka office</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c98a4b]" />
                <span>Formal corporate VAT/Tax compliance billing</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-[#26201b]">
              <Link
                href="/#quote"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#c98a4b] text-black hover:bg-[#e5a96b] transition-colors"
              >
                <span>Request Project Consultation</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-[#141210] border border-[#26201b]">
            <div className="text-3xl font-extrabold text-[#f5f0eb] font-mono">50+</div>
            <div className="text-xs text-[#a89f91] mt-1">Delivered Projects</div>
          </div>
          <div className="p-6 rounded-2xl bg-[#141210] border border-[#26201b]">
            <div className="text-3xl font-extrabold text-[#c98a4b] font-mono">Govt. Reg</div>
            <div className="text-xs text-[#a89f91] mt-1">Legally Registered in BD</div>
          </div>
          <div className="p-6 rounded-2xl bg-[#141210] border border-[#26201b]">
            <div className="text-3xl font-extrabold text-[#f5f0eb] font-mono">Dhaka Hub</div>
            <div className="text-xs text-[#a89f91] mt-1">Nationwide Coverage</div>
          </div>
          <div className="p-6 rounded-2xl bg-[#141210] border border-[#26201b]">
            <div className="text-3xl font-extrabold text-[#c98a4b] font-mono">100%</div>
            <div className="text-xs text-[#a89f91] mt-1">Offline Bespoke Quotes</div>
          </div>
        </div>

      </div>
    </div>
  );
}
