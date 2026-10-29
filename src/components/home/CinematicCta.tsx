"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  GraduationCap,
  Calendar,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import type { HomepageConfig } from "@/types/database";

interface CinematicCtaProps {
  config?: Partial<HomepageConfig>;
  general?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  show?: boolean;
}

export default function CinematicCta({ config, general, show = true }: CinematicCtaProps) {
  if (show === false) return null;

  const heading = config?.closing_cta_heading || "Every Milestone Deserves Permanent Record.";
  const subheading =
    config?.closing_cta_subheading ||
    "Commission our studio for university convocations, executive leadership portraits, or cultural documentation in Dhaka and beyond.";
  const buttonLabel = config?.closing_cta_button_label || "Book a Photography Session";
  const buttonHref = config?.closing_cta_button_href || "/book";
  const bgImage =
    config?.closing_cta_image_url ||
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80";

  const email = general?.email || "inquiry@offprint.agency";
  const phone = general?.phone?.trim();
  const address = general?.address || "Dhaka, Bangladesh";

  return (
    <section className="relative py-20 sm:py-28 lg:py-36 bg-[#161311] text-[#FAF7F2] overflow-hidden border-t border-[#3A2008]/40">
      {/* Background Cinematic Photograph with moody dark gradient overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        <Image
          src={bgImage}
          alt="Cinematic photography backdrop by OFFPRINT"
          fill
          sizes="100vw"
          className="object-cover object-center filter blur-xs contrast-110 brightness-[0.35]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#161311] via-[#161311]/85 to-[#161311]/80" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-[#D5CCB4]">
            <span className="w-2 h-2 rounded-full bg-[#A66D35]" />
            <span>STUDIO COMMISSIONS // DHAKA</span>
          </div>

          <h2 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-[#FAF7F2] leading-[1.08]">
            {heading}
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-[#BDB5A7] max-w-xl mx-auto font-sans leading-relaxed font-light">
            {subheading}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href={buttonHref}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#A66D35] hover:bg-[#C48B52] text-[#161311] shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Calendar className="w-4 h-4 text-[#161311]" />
              <span className="font-bold">{buttonLabel}</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              href="/book/convocation"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-white/15 text-[#FAF7F2] border border-white/20 transition-all"
            >
              <GraduationCap className="w-4 h-4 text-[#A66D35]" />
              <span>IUB 27th Convocation</span>
            </Link>

            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-medium text-[#D5CCB4] hover:text-[#FAF7F2] hover:bg-white/5 transition-all"
            >
              <Mail className="w-4 h-4 text-[#A66D35]" />
              <span>Contact Desk</span>
            </Link>
          </div>

          {/* Studio Contact Metadata Strip */}
          <div className="pt-10 border-t border-white/10 flex flex-wrap items-center justify-center gap-8 text-xs font-mono text-[#8A8175]">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>{address}</span>
            </div>
            {phone && (
              <div className="flex items-center justify-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>{phone}</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
              <a href={`mailto:${email}`} className="hover:text-[#FAF7F2] transition-colors">
                {email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
