"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { Testimonial } from "@/types/database";

interface EditorialTestimonialsProps {
  testimonials?: Testimonial[];
  show?: boolean;
}

export default function EditorialTestimonials({
  testimonials = [],
  show = true,
}: EditorialTestimonialsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // If section is toggled off or there are no published testimonials, omit section completely
  if (show === false || !Array.isArray(testimonials) || testimonials.length === 0) {
    return null;
  }

  const prev = () => {
    setCurrentIndex((curr) => (curr === 0 ? testimonials.length - 1 : curr - 1));
  };

  const next = () => {
    setCurrentIndex((curr) => (curr === testimonials.length - 1 ? 0 : curr + 1));
  };

  const current = testimonials[currentIndex] || testimonials[0];

  return (
    <section className="py-16 sm:py-24 bg-[#F4EFE6] border-t border-[#E5DEC9] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Heading and Indicator */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A66D35] font-semibold">
                CLIENT TESTIMONIALS
              </span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-[#141210] leading-snug">
              Client Praise &amp; Reflections
            </h2>

            <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
              Reflections from corporate summits, cultural archives, and leadership institutions partnering with our studio.
            </p>

            {/* Accessible Navigation Controls */}
            {testimonials.length > 1 && (
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous testimonial"
                  className="w-10 h-10 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#141210] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-[#3A2008]" />
                </button>

                <span className="text-xs font-mono text-[#5C5449]">
                  {currentIndex + 1} / {testimonials.length}
                </span>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Next testimonial"
                  className="w-10 h-10 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#141210] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-[#3A2008]" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Active Testimonial Card */}
          <div className="lg:col-span-8">
            <div className="relative rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-8 sm:p-12 shadow-xs space-y-6">
              <Quote className="w-10 h-10 text-[#A66D35]/30" />

              <blockquote className="font-editorial text-xl sm:text-2xl lg:text-3xl font-light text-[#141210] leading-relaxed italic">
                &ldquo;{current.quote}&rdquo;
              </blockquote>

              <div className="pt-4 border-t border-[#E5DEC9] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm text-[#141210]">
                    {current.author}
                  </div>
                  <div className="text-xs text-[#5C5449]">
                    {current.role_or_title}
                    {current.organization ? ` • ${current.organization}` : ""}
                  </div>
                </div>

                {current.project_tag && (
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-[#A66D35]">
                    {current.project_tag}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
