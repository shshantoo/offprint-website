import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Film,
  Printer,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Learn about OFFPRINT, a Govt. Registered photography studio and corporate agency in Bangladesh established in Sep 2025.",
};

export default function AboutPage() {
  return (
    <div className="py-16 md:py-24 bg-[#FAF7F2]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Govt. Reg. Entity • Est. Sep 2025</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#141210] tracking-tight">
            The OFFPRINT Story
          </h1>
          <p className="text-base sm:text-lg text-[#5C5449] max-w-2xl mx-auto leading-relaxed">
            Bridging editorial portraiture, cinematic storytelling, and tactile physical print craftsmanship for Bangladesh’s leading institutions, graduates, and executives.
          </p>
        </div>

        {/* Narrative Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5 text-sm text-[#5C5449] leading-relaxed">
            <h2 className="text-2xl font-bold text-[#141210]">
              Founded on Precision & Permanence
            </h2>
            <p>
              Established in September 2025 in Dhaka, Bangladesh,{" "}
              <strong className="text-[#141210]">OFFPRINT (অফপ্রিন্ট)</strong> was founded with a singular conviction: milestones and institutions deserve photography and tangible materials that match their stature.
            </p>
            <p>
              In an era dominated by transient digital content, OFFPRINT operates two deeply integrated disciplines under one roof:
            </p>
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] flex items-start gap-3">
                <Film className="w-5 h-5 text-[#A66D35] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#141210]">1. Photography & Production Wing</h4>
                  <p className="text-xs text-[#5C5449] mt-0.5">
                    IUB Convocation portraiture, executive headshots, multi-camera 4K corporate summits, brand documentaries, and private weddings.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] flex items-start gap-3">
                <Printer className="w-5 h-5 text-[#A66D35] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#141210]">2. Physical Print & Merch Solutions</h4>
                  <p className="text-xs text-[#5C5449] mt-0.5">
                    Imported 650 GSM cotton debossed cards, optical-grade acrylic frames, custom foam-fitted swag gift suites, and precision laser-engraved brass pens.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] shadow-xs space-y-6">
            <h3 className="text-xl font-bold text-[#141210]">
              Direct Studio Booking & Bespoke Consultations
            </h3>
            <p className="text-xs text-[#5C5449] leading-relaxed">
              For individual portrait sessions, convocation photography, and standard studio packages, reserve your exact date and time slot online with instant confirmation. For multi-camera summits and bulk print runs, our producers prepare custom technical scopes.
            </p>
            <ul className="space-y-2.5 text-xs text-[#141210]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#A66D35]" />
                <span>Real-time slot reservation & Client Portal access</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#A66D35]" />
                <span>Physical material swatch review available at our Dhaka desk</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#A66D35]" />
                <span>Formal corporate VAT/Tax compliance billing</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-[#E5DEC9] flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#3A2008] text-[#FAF7F2] hover:bg-[#5C4028] transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book a Session</span>
              </Link>
              <Link
                href="/#quote"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#FAF7F2] text-[#3A2008] border border-[#D5CCB4] hover:bg-[#F4EFE6] transition-colors"
              >
                <span>Custom Quote</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
            <div className="text-3xl font-extrabold text-[#141210] font-mono">50+</div>
            <div className="text-xs text-[#5C5449] mt-1">Delivered Projects</div>
          </div>
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
            <div className="text-3xl font-extrabold text-[#3A2008] font-mono">Govt. Reg</div>
            <div className="text-xs text-[#5C5449] mt-1">Legally Registered in BD</div>
          </div>
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
            <div className="text-3xl font-extrabold text-[#141210] font-mono">Dhaka Hub</div>
            <div className="text-xs text-[#5C5449] mt-1">Nationwide Coverage</div>
          </div>
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
            <div className="text-3xl font-extrabold text-[#A66D35] font-mono">Live</div>
            <div className="text-xs text-[#5C5449] mt-1">Online Slot Booking</div>
          </div>
        </div>
      </div>
    </div>
  );
}
