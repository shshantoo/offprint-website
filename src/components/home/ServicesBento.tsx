"use client";

import React from "react";
import Link from "next/link";
import { Video, Award, Users, Heart, ArrowUpRight, CheckCircle2, Mic, Film } from "lucide-react";

const SERVICES = [
  {
    id: "summits",
    title: "Corporate Summits & International Seminars",
    tagline: "Multicam 4K Broadcast & Same-Day PR Delivery",
    description: "Designed for embassies, financial institutions, and tech consortia. We orchestrate redundant multi-camera setups, clean audio board sync, live stream switcher outputs, and rapid same-day photo suites for press releases.",
    features: [
      "Multi-angle 4K Cinema cameras (Sony FX series)",
      "Wireless sound engineering with backup line recordings",
      "Instant on-site photo editor with expedited press gallery",
      "Executive keynote highlight teasers within 24 hours"
    ],
    accent: "from-[#4a2805] to-[#141210]",
    icon: Video,
    span: "col-span-1 lg:col-span-2",
  },
  {
    id: "documentaries",
    title: "Brand Documentaries & Heritage Films",
    tagline: "Narrative-Driven Cinema for Discerning Brands",
    description: "We uncover the craftsmanship, industrial scale, and human ambition behind Bangladeshi institutions. Ideal for anniversary retrospectives, factory tours, and brand legacy marketing.",
    features: [
      "In-depth stakeholder interviews with teleprompter option",
      "Industrial gimbal & aerial drone cinematography",
      "Bespoke score mixing & subtle color grading"
    ],
    accent: "from-[#6e3c08]/40 to-[#141210]",
    icon: Film,
    span: "col-span-1",
  },
  {
    id: "headshots",
    title: "Executive Headshots & C-Suite Portraits",
    tagline: "Studio-Grade Portability for Boardrooms",
    description: "Mobile studio lighting rigs deployed directly inside your Gulshan, Banani, or Motijheel headquarters. Minimal boardroom disruption, maximum executive polish.",
    features: [
      "Tethered live review on iPads for instant selection",
      "High-end frequency separation skin retouching",
      "Uniform color-calibrated backdrops for team consistency"
    ],
    accent: "from-[#141210] to-[#1c1815]",
    icon: Users,
    span: "col-span-1",
  },
  {
    id: "weddings",
    title: "Seasonal Bespoke Weddings & Private Affairs",
    tagline: "Exclusive Cinematic Chronicles for Esteemed Families",
    description: "Strictly limited to a selective quota per calendar season. We bring editorial fashion aesthetics and respectful unobtrusive documentary coverage to multi-day grand celebrations.",
    features: [
      "Fine-art photography team with medium format detail capture",
      "Cinematic slow-motion 120fps drone sweeps",
      "Handcrafted archival leather photo books available"
    ],
    accent: "from-[#4a2805]/60 to-[#141210]",
    icon: Heart,
    span: "col-span-1 lg:col-span-2",
  },
];

export default function ServicesBento() {
  return (
    <section className="py-24 bg-[#0a0a0a] relative border-t border-[#26201b]" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141210] border border-[#3d3126] text-xs font-mono text-[#c98a4b]">
            <span>Media & Production Wing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#f5f0eb] tracking-tight">
            Specialized Production Capabilities
          </h2>
          <p className="text-sm sm:text-base text-[#a89f91]">
            Engineered around strict reliability standards. We do not treat corporate coverage as generic videography—we treat it as brand architecture.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {SERVICES.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                className={`group relative rounded-2xl bg-gradient-to-br ${srv.accent} border border-[#26201b] hover:border-[#c98a4b]/50 p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-[#4a2805]/20 ${srv.span}`}
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#141210] border border-[#3d3126] flex items-center justify-center text-[#c98a4b] group-hover:bg-[#4a2805] group-hover:text-[#f5f0eb] transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#c98a4b]">
                      {srv.tagline}
                    </span>
                    <h3 className="text-2xl font-bold text-[#f5f0eb] mt-1 group-hover:text-white transition-colors">
                      {srv.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-[#a89f91] leading-relaxed">
                    {srv.description}
                  </p>

                  <ul className="space-y-2 pt-2">
                    {srv.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#d4cbbf]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#c98a4b] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-[#26201b] flex items-center justify-between">
                  <span className="text-xs font-mono text-[#696257]">Bespoke Quote Protocol</span>
                  <Link
                    href={`#quote?service=${srv.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#c98a4b] hover:text-[#f5f0eb] group-hover:translate-x-1 transition-all"
                  >
                    <span>Request Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
