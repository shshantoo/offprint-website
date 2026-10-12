"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Film, Printer, Sparkles, Building2, Award } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
      {/* Background Ambient Glow Circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] bg-gradient-to-b from-[#4a2805]/50 via-[#c98a4b]/15 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-[#6e3c08]/15 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#4a2805]/20 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          
          {/* Trust Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141210] border border-[#3d3126] text-xs font-medium text-[#f5f0eb] shadow-xl hover:border-[#c98a4b] transition-all">
            <span className="flex h-2 w-2 rounded-full bg-[#c98a4b] animate-pulse" />
            <span className="text-[#a89f91]">Govt. Registered Agency</span>
            <span className="text-[#696257]">•</span>
            <span className="text-[#c98a4b] font-mono">অফপ্রিন্ট (Est. Sep 2025)</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#f5f0eb] leading-[1.1]">
            Enduring Visual Legacies. <br />
            <span className="bg-gradient-to-r from-[#c98a4b] via-[#e5a96b] to-[#a89f91] bg-clip-text text-transparent">
              Bespoke Physical Solutions.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#a89f91] max-w-2xl leading-relaxed">
            The premier corporate media production and tactile print merchandise agency in Bangladesh. 
            Delivering cinematic summits, brand documentaries, and luxury branded collateral for visionary institutions.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
            <Link
              href="#quote"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[#4a2805] to-[#6e3c08] hover:from-[#6e3c08] hover:to-[#c98a4b] text-[#f5f0eb] hover:text-black border border-[#c98a4b]/50 shadow-2xl shadow-[#4a2805]/40 hover:shadow-[#c98a4b]/30 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <span>Request Bespoke Quote</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              href="/works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-medium text-[#f5f0eb] bg-[#141210] hover:bg-[#1c1815] border border-[#26201b] hover:border-[#3d3126] transition-all"
            >
              <Film className="w-4 h-4 text-[#c98a4b]" />
              <span>Explore 50+ Projects</span>
            </Link>

            <Link
              href="/print-solutions"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-medium text-[#f5f0eb] bg-[#141210] hover:bg-[#1c1815] border border-[#26201b] hover:border-[#3d3126] transition-all"
            >
              <Printer className="w-4 h-4 text-[#c98a4b]" />
              <span>Print Catalog</span>
            </Link>
          </div>

          {/* Value Propositions / Key Metrics */}
          <div className="pt-12 w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#141210]/60 border border-[#26201b] backdrop-blur-md">
              <div className="flex flex-col items-center justify-center p-3 text-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#f5f0eb] font-mono">50+</span>
                <span className="text-xs text-[#a89f91] mt-1">Delivered Projects</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 text-center border-l border-[#26201b]">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#c98a4b] font-mono">2 Wings</span>
                <span className="text-xs text-[#a89f91] mt-1">Media & Physical Merch</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 text-center border-l border-[#26201b]">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#f5f0eb] font-mono">Govt. Reg.</span>
                <span className="text-xs text-[#a89f91] mt-1">Verified Entity in BD</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 text-center border-l border-[#26201b]">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#c98a4b] font-mono">100%</span>
                <span className="text-xs text-[#a89f91] mt-1">Bespoke Offline Deals</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
