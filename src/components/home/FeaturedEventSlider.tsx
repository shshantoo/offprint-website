"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowUpRight, Sparkles, Calendar, Tag } from "lucide-react";
import type { EventArchive, SliderConfig } from "@/types/database";
import { formatDate } from "@/lib/utils";

interface FeaturedEventSliderProps {
  events: EventArchive[];
  sliderConfig?: SliderConfig;
}

export default function FeaturedEventSlider({
  events = [],
  sliderConfig,
}: FeaturedEventSliderProps) {
  const config = {
    autoplay_enabled: sliderConfig?.autoplay_enabled ?? true,
    interval_seconds: sliderConfig?.interval_seconds ?? 6,
    transition_duration_ms: sliderConfig?.transition_duration_ms ?? 700,
    pause_on_hover: sliderConfig?.pause_on_hover ?? true,
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  const goToNext = useCallback(() => {
    if (events.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % events.length);
  }, [events.length]);

  const goToPrev = useCallback(() => {
    if (events.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
  }, [events.length]);

  // Autoplay rotation using configurable timing
  useEffect(() => {
    if (events.length <= 1 || isPaused || prefersReducedMotion || !config.autoplay_enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(2000, config.interval_seconds * 1000);
    timerRef.current = setInterval(() => {
      goToNext();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [events.length, isPaused, prefersReducedMotion, config.autoplay_enabled, config.interval_seconds, goToNext]);

  // Empty state: clean, no demo events or placeholders
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#E5DEC9] bg-[#FAF7F2] p-10 sm:p-14 text-center space-y-3">
        <Sparkles className="w-5 h-5 text-[#A66D35] mx-auto opacity-70" />
        <h4 className="text-sm font-semibold text-[#141210]">
          No Highlighted Events on Display
        </h4>
        <p className="text-xs text-[#5C5449] max-w-md mx-auto leading-relaxed">
          Published event archives marked as &ldquo;Featured on Dashboard&rdquo; by the administrator will automatically rotate in this presentation.
        </p>
        <div className="pt-2">
          <Link
            href="/works"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-semibold text-[#141210] hover:bg-[#FAF7F2] transition-colors"
          >
            <span>Explore All Production Archives</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#A66D35]" />
          </Link>
        </div>
      </div>
    );
  }

  // Single featured event: normal static presentation
  if (events.length === 1) {
    const single = events[0];
    return (
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] overflow-hidden shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto min-h-[300px] lg:min-h-[440px] bg-[#141210]">
            {single.cover_image_url ? (
              <Image
                src={single.cover_image_url}
                alt={single.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover object-center filter contrast-[1.02]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8C827A] text-xs font-mono">
                Archive Stills
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
          </div>

          <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-[11px] font-mono font-bold text-[#A66D35]">
                  <Tag className="w-3 h-3 text-[#A66D35]" />
                  <span>{single.category || "Convocation"}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6E3C08]">
                  <Calendar className="w-3 h-3 text-[#A66D35]" />
                  <span>{formatDate(single.event_date)}</span>
                </span>
              </div>

              <h3 className="font-editorial text-2xl sm:text-3xl text-[#141210] font-normal leading-tight">
                {single.title}
              </h3>

              <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
                {single.short_description}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5DEC9]">
              <Link
                href={`/works/${single.slug}`}
                className="inline-flex items-center justify-between w-full px-5 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-all group"
              >
                <span>Explore Full Event Archive</span>
                <ArrowUpRight className="w-4 h-4 text-[#D9A673] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple featured events: Minimalist Automatic Slider
  const current = events[currentIndex] || events[0];

  return (
    <div
      className="relative rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] overflow-hidden shadow-2xs group"
      onMouseEnter={() => config.pause_on_hover && setIsPaused(true)}
      onMouseLeave={() => config.pause_on_hover && setIsPaused(false)}
      onFocus={() => config.pause_on_hover && setIsPaused(true)}
      onBlur={() => config.pause_on_hover && setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlighted Events Slider"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[440px]">
        {/* Cover Photograph Frame with Smooth Crossfade */}
        <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto min-h-[320px] lg:min-h-[460px] bg-[#141210] overflow-hidden">
          {events.map((ev, idx) => {
            const isActive = idx === currentIndex;
            return (
              <div
                key={ev.id}
                className={`absolute inset-0 transition-opacity ease-in-out ${
                  isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
                style={{
                  transitionDuration: prefersReducedMotion
                    ? "0ms"
                    : `${config.transition_duration_ms}ms`,
                }}
                aria-hidden={!isActive}
              >
                {ev.cover_image_url && (
                  <Image
                    src={ev.cover_image_url}
                    alt={ev.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover object-center filter contrast-[1.02]"
                    priority={idx === 0}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
              </div>
            );
          })}

          {/* Discreet Slider Indicator on Image */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-[#FAF7F2]">
            <span className="font-bold text-[#D9A673]">
              {String(currentIndex + 1).padStart(2, "0")}
            </span>
            <span className="opacity-50">/</span>
            <span className="opacity-80">
              {String(events.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Narrative & Event Controls Content */}
        <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6 bg-[#FFFFFF]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-[11px] font-mono font-bold text-[#A66D35]">
                  <Tag className="w-3 h-3 text-[#A66D35]" />
                  <span>{current.category || "Convocation"}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6E3C08]">
                  <Calendar className="w-3 h-3 text-[#A66D35]" />
                  <span>{formatDate(current.event_date)}</span>
                </span>
              </div>

              {/* Discreet Manual Previous / Next Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goToPrev}
                  aria-label="Previous featured event"
                  className="w-8 h-8 rounded-full border border-[#E5DEC9] bg-[#FAF7F2] hover:bg-[#3A2008] hover:text-[#FAF7F2] hover:border-[#3A2008] flex items-center justify-center text-[#5C5449] transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="Next featured event"
                  className="w-8 h-8 rounded-full border border-[#E5DEC9] bg-[#FAF7F2] hover:bg-[#3A2008] hover:text-[#FAF7F2] hover:border-[#3A2008] flex items-center justify-center text-[#5C5449] transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="font-editorial text-2xl sm:text-3xl text-[#141210] font-normal leading-tight">
              {current.title}
            </h3>

            <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed line-clamp-3">
              {current.short_description}
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#E5DEC9]">
            {/* Slide Navigation Dots */}
            <div className="flex items-center gap-1.5">
              {events.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? "w-6 bg-[#3A2008]"
                      : "w-2 bg-[#E5DEC9] hover:bg-[#A66D35]"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <Link
              href={`/works/${current.slug}`}
              className="inline-flex items-center justify-between w-full px-5 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-all group"
            >
              <span>Explore Event Archive</span>
              <ArrowUpRight className="w-4 h-4 text-[#D9A673] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

