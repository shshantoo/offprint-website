"use client";

import React from "react";
import Link from "next/link";
import {
  Video,
  Users,
  Heart,
  ArrowUpRight,
  CheckCircle2,
  GraduationCap,
  Calendar,
} from "lucide-react";

const SERVICES = [
  {
    id: "convocation",
    title: "Academic & Milestone Event Portraiture",
    tagline: "Dedicated Event Sessions & Family Portraits",
    description:
      "Celebrate your academic milestone or special campaign with editorial studio and outdoor portraiture. Real-time time-slot reservations, curated solo & family packages, and archival print options.",
    features: [
      "Real-time time-slot reservations with guaranteed capacity",
      "Individual graduate, family & peer group portrait coverage",
      "High-resolution color-graded gallery & archival print options",
      "Instant email confirmation & Google Calendar synchronization",
    ],
    bookingHref: "/book",
    bookingLabel: "Explore Special Event Sessions",
    icon: GraduationCap,
    span: "col-span-1 lg:col-span-2",
    featured: true,
  },
  {
    id: "headshots",
    title: "Executive Headshots & Portraits",
    tagline: "Studio & Corporate On-Location",
    description:
      "Mobile lighting rigs deployed at your Gulshan, Banani, or Motijheel office, or booked at our studio. Tethered live review and natural retouching.",
    features: [
      "Tethered live review on iPad for instant selection",
      "High-end natural skin retouching",
      "Uniform color-calibrated backdrops for leadership teams",
    ],
    bookingHref: "/book/traditional",
    bookingLabel: "Book Portrait Session",
    icon: Users,
    span: "col-span-1",
    featured: false,
  },
  {
    id: "summits",
    title: "Corporate Summits & Seminars",
    tagline: "Multicam 4K Broadcast & Same-Day PR Stills",
    description:
      "Designed for embassies, banks, and international forums. Redundant multi-camera coverage, clean board audio sync, and rapid press release photo suites.",
    features: [
      "Multi-angle 4K cinema cameras & dedicated photo team",
      "Instant on-site editor for same-day press release photos",
      "Executive keynote highlight teasers within 24 hours",
    ],
    bookingHref: "/book/traditional",
    bookingLabel: "Book Event Coverage",
    icon: Video,
    span: "col-span-1",
    featured: false,
  },
  {
    id: "documentaries",
    title: "Brand Documentaries & Weddings",
    tagline: "Editorial Storytelling & Heritage Chronicles",
    description:
      "From industrial heritage documentaries to bespoke multi-day family wedding chronicles, we bring refined editorial aesthetics and unobtrusive storytelling.",
    features: [
      "Fine-art photography & cinema-grade documentary teams",
      "Aerial drone cinematography & custom color grading",
      "Handcrafted archival photo albums & framing options",
    ],
    bookingHref: "/book/traditional",
    bookingLabel: "Schedule Consultation / Session",
    icon: Heart,
    span: "col-span-1 lg:col-span-2",
    featured: false,
  },
];

export default function ServicesBento() {
  return (
    <section className="py-24 bg-[#FAF7F2] relative border-t border-[#E5DEC9]" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
            <span>Photography & Production Wing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#141210] tracking-tight">
            Specialized Photography & Media Services
          </h2>
          <p className="text-sm sm:text-base text-[#5C5449]">
            Book your appointment directly online through our live scheduling calendar or request a bespoke multi-day production scope.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {SERVICES.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                className={`group relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 border ${
                  srv.featured
                    ? "bg-[#F4EFE6] border-[#D5CCB4] hover:border-[#3A2008]"
                    : "bg-[#FFFFFF] border-[#E5DEC9] hover:border-[#A66D35]"
                } hover:shadow-lg ${srv.span}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        srv.featured
                          ? "bg-[#3A2008] text-[#FAF7F2]"
                          : "bg-[#FAF7F2] border border-[#E5DEC9] text-[#3A2008] group-hover:bg-[#3A2008] group-hover:text-[#FAF7F2]"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    {srv.featured && (
                      <span className="px-3 py-1 rounded-full bg-[#3A2008] text-[#FAF7F2] text-[11px] font-mono uppercase tracking-wider">
                        Featured Event
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                      {srv.tagline}
                    </span>
                    <h3 className="text-2xl font-bold text-[#141210] mt-1">
                      {srv.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
                    {srv.description}
                  </p>

                  <ul className="space-y-2 pt-2">
                    {srv.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#141210]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#A66D35] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E5DEC9] flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={srv.bookingHref}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{srv.bookingLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`#quote?service=${srv.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#5C4028] hover:text-[#141210] transition-colors"
                  >
                    <span>Custom Inquiry</span>
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
