"use client";

import React from "react";
import Link from "next/link";
import { Printer, Sparkles, ArrowRight } from "lucide-react";

export default function PrintSolutionsBridge() {
  const highlights = [
    { title: "Cotton Debossed Cards", desc: "650 GSM cotton, blind deboss, bronze foil edging" },
    { title: "Floating Acrylic Frames", desc: "12mm optical clear cast acrylic with brass standoffs" },
    { title: "Corporate Swag Boxes", desc: "Custom foam insert, foil-stamped linen boxes, thermal flasks" },
    { title: "Laser Engraved Pens", desc: "Heavyweight solid brass with fiber laser monogramming" },
  ];

  return (
    <section className="py-20 bg-[#FAF7F2] relative border-t border-[#E5DEC9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-[#F4EFE6] border border-[#D5CCB4] p-8 sm:p-12 lg:p-16 overflow-hidden shadow-xs">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
                <Printer className="w-3.5 h-3.5" />
                <span>Physical Print & Merchandise Wing</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#141210] tracking-tight leading-tight">
                Tangible Excellence. <br />
                <span className="text-[#3A2008]">Physical Swag & Print Solutions.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#5C5449] leading-relaxed max-w-xl">
                Elevate your brand beyond screens. We produce custom debossed corporate cards, archival executive frames, VIP swag gift boxes, and summit collateral engineered with bespoke tactile paper stocks and precision laser engraving.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link
                  href="/print-solutions"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#3A2008] text-[#FAF7F2] hover:bg-[#5C4028] transition-all duration-200"
                >
                  <span>Explore Product Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="#quote?type=physical_merch"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#FFFFFF] hover:bg-[#FAF7F2] text-[#141210] border border-[#D5CCB4] transition-all"
                >
                  <span>Order Swag Boxes</span>
                </Link>
              </div>
            </div>

            {/* Right Highlights Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] transition-colors shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#A66D35] mb-3 border border-[#E5DEC9]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#141210] mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#5C5449] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
