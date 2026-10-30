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
      "Celebrate your academic milestone with editorial studio and outdoor portraiture. Real-time time-slot reservations, curated solo & family packages, and archival print options.",
    features: [
      "Real-time time-slot reservations with guaranteed capacity",
      "Individual graduate, family & peer group portrait coverage",
      "High-resolution color-graded gallery & archival print options",
      "Instant email confirmation & Google Calendar synchronization",
    ],
    bookingHref: "/book/convocation",
    bookingLabel: "IUB Convocation Booking",
    icon: GraduationCap,
    span: "col-span-1 lg:col-span-2",
    featured: true,
  },
  {
    id: "headshots",
    title: "Executive Headshots & Leadership Portraits",
    tagline: "Studio & Corporate On-Location",
    description:
      "Mobile lighting rigs deployed at your Gulshan, Banani, or Motijheel office, or booked at our studio. Tethered live review and natural skin retouching.",
    features: [
      "Tethered live review on iPad for instant selection",
      "High-end natural skin retouching and tone grading",
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
    title: "Corporate Summits & Broadcast Forums",
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
    title: "Brand Documentaries & Seasonal Weddings",
    tagline: "Editorial Storytelling & Heritage Chronicles",
    description:
      "From industrial heritage documentaries to bespoke multi-day family wedding chronicles, we bring refined editorial aesthetics and unobtrusive storytelling.",
    features: [
      "Fine-art photography & cinema-grade documentary teams",
      "Aerial drone cinematography & custom anamorphic grading",
      "Handcrafted archival photo albums & framing options",
    ],
    bookingHref: "/book/traditional",
    bookingLabel: "Schedule Consultation",
    icon: Heart,
    span: "col-span-1 lg:col-span-2",
    featured: false,
  },
];

interface ServicesBentoProps {
  heading?: string;
  subheading?: string;
  show?: boolean;
}

export default function ServicesBento({
  heading = "Specialized Studio Capabilities",
  subheading = "Book your appointment directly online through our live scheduling calendar or commission a bespoke multi-day production scope.",
  show = true,
}: ServicesBentoProps) {
  if (show === false) return null;
  return (
    <section className="py-20 sm:py-28 bg-[#FAF7F2] relative border-t border-[#E5DEC9]" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5DEC9] pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A66D35] font-semibold">
                MEDIA &amp; COVERAGE WING
              </span>
            </div>

            <h2 className="font-editorial text-4xl sm:text-5xl font-normal text-[#141210] tracking-tight">
              {heading}
            </h2>

            <p className="text-sm sm:text-base text-[#5C5449] max-w-xl">
              {subheading}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Explore All Disciplines</span>
            </Link>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
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
                      <span className="px-3 py-1 rounded-full bg-[#3A2008] text-[#FAF7F2] text-[10px] font-mono uppercase tracking-widest">
                        Milestone Campaign
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                      {srv.tagline}
                    </span>
                    <h3 className="font-editorial text-2xl font-normal text-[#141210] mt-1">
                      {srv.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
                    {srv.description}
                  </p>

                  <ul className="space-y-2.5 pt-2">
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{srv.bookingLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/contact`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#5C4028] hover:text-[#141210] transition-colors"
                  >
                    <span>Custom Scope Inquiry</span>
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
