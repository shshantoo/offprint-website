"use client";

import React from "react";
import Link from "next/link";
import { Printer, Sparkles, ArrowRight, Layers, Box, PenTool } from "lucide-react";

export default function PrintSolutionsBridge() {
  const highlights = [
    { title: "Cotton Debossed Cards", desc: "650 GSM cotton, blind deboss, bronze foil edging" },
    { title: "Floating Acrylic Frames", desc: "12mm optical clear cast acrylic with brass standoffs" },
    { title: "Corporate Swag Boxes", desc: "Custom foam insert, foil-stamped linen boxes, thermal flasks" },
    { title: "Laser Engraved Pens", desc: "Heavyweight solid brass with fiber laser monogramming" },
  ];

  return (
    <section className="py-20 bg-[#0a0a0a] relative border-t border-[#26201b]">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#4a2805]/20 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#141210] via-[#161311] to-[#1c1815] border border-[#3d3126] p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
          
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#c98a4b]/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 right-10 text-9xl font-mono font-extrabold text-[#f5f0eb]/[0.02] select-none pointer-events-none">
            PRINT
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a0a0a] border border-[#3d3126] text-xs font-mono text-[#c98a4b]">
                <Printer className="w-3.5 h-3.5" />
                <span>Physical Print & Merchandise Wing</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#f5f0eb] tracking-tight leading-tight">
                Tangible Excellence. <br />
                <span className="text-[#c98a4b]">Physical Swag & Print Solutions.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#a89f91] leading-relaxed max-w-xl">
                Elevate your brand beyond screens. We produce custom debossed corporate cards, archival executive frames, VIP swag gift boxes, and summit collateral engineered with bespoke tactile paper stocks and precision laser engraving.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link
                  href="/print-solutions"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#c98a4b] text-black hover:bg-[#e5a96b] shadow-xl shadow-[#4a2805]/30 transition-all duration-200"
                >
                  <span>Explore Product Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="#quote?type=physical_merch"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#0a0a0a] hover:bg-[#141210] text-[#f5f0eb] border border-[#26201b] hover:border-[#3d3126] transition-all"
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
                  className="p-4 rounded-xl bg-[#0a0a0a]/80 border border-[#26201b] hover:border-[#c98a4b]/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#141210] flex items-center justify-center text-[#c98a4b] mb-2 border border-[#26201b]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-bold text-[#f5f0eb] mb-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#a89f91] leading-relaxed">
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
