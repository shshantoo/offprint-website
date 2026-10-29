"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EventArchive, SliderConfig } from "@/types/database";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Building,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface ArchivesCarouselProps {
  items: EventArchive[];
  sliderConfig?: SliderConfig;
  onResetCategory?: () => void;
  selectedCategoryName?: string;
}

export default function ArchivesCarousel({
  items = [],
  sliderConfig,
  onResetCategory,
  selectedCategoryName,
}: ArchivesCarouselProps) {
  const config = {
    autoplay_enabled: sliderConfig?.autoplay_enabled ?? true,
    interval_seconds: sliderConfig?.interval_seconds ?? 5,
    transition_duration_ms: sliderConfig?.transition_duration_ms ?? 600,
    pause_on_hover: sliderConfig?.pause_on_hover ?? true,
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  // Touch tracking for mobile swipe navigation
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Update visible card count based on viewport width
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCount(1);
      } else if (width < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  // Reset index when items change (e.g. category filter changes)
  useEffect(() => {
    setCurrentIndex(0);
  }, [items.length]);

  const maxIndex = Math.max(0, items.length - visibleCount);

  const goToNext = useCallback(() => {
    if (items.length <= visibleCount) return;
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [items.length, visibleCount, maxIndex]);

  const goToPrev = useCallback(() => {
    if (items.length <= visibleCount) return;
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [items.length, visibleCount, maxIndex]);

  // Autoplay rotation timer
  useEffect(() => {
    if (!config.autoplay_enabled || isPaused || prefersReducedMotion || items.length <= visibleCount) {
      return;
    }

    const intervalMs = Math.max(2000, config.interval_seconds * 1000);
    const timer = setInterval(() => {
      goToNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [config.autoplay_enabled, config.interval_seconds, isPaused, prefersReducedMotion, items.length, visibleCount, goToNext]);

  // Touch swiping handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = null;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrev();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // 1. Empty State (no mock data or placeholder images)
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-10 text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center mx-auto text-[#A66D35]">
          <Sparkles className="w-5 h-5 opacity-70" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-bold text-[#141210]">
            No Published Archives {selectedCategoryName ? `in ${selectedCategoryName}` : ""}
          </h3>
          <p className="text-xs text-[#5C5449] leading-relaxed">
            There are currently no published event archive productions under this category. Newly published productions will appear here immediately once authorized in the admin portal.
          </p>
        </div>
        {onResetCategory && (
          <button
            type="button"
            onClick={onResetCategory}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-semibold text-[#3A2008] transition-colors cursor-pointer"
          >
            <span>Show All Archives</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // 2. Single Event Mode: Static presentation without unnecessary slider controls
  if (items.length === 1) {
    const ev = items[0];
    const categoryLabel = ev.category_rel?.name || ev.category || "Archive";

    return (
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/works/${ev.slug}`}
          className="group block rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#3A2008]"
        >
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#141210]">
            {ev.cover_image_url ? (
              <Image
                src={ev.cover_image_url}
                alt={ev.cover_alt_text || ev.title}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-[#3A2008]" />
            )}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[#FAF7F2]/95 backdrop-blur-xs text-[#3A2008] border border-[#E5DEC9] shadow-2xs">
                {categoryLabel}
              </span>
            </div>
            {ev.is_featured && (
              <div className="absolute top-4 right-4">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#3A2008] text-[#FAF7F2] shadow-2xs flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-[#D9A673]" />
                  Featured
                </span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#877D70]">
              <span className="flex items-center gap-1.5 text-[#A66D35]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{ev.event_date}</span>
              </span>
              {ev.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="w-3 h-3 text-[#A66D35]" />
                    <span className="truncate">{ev.location}</span>
                  </span>
                </>
              )}
              {ev.client_or_institution && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <Building className="w-3 h-3 text-[#A66D35]" />
                    <span className="truncate">{ev.client_or_institution}</span>
                  </span>
                </>
              )}
            </div>

            <h3 className="font-editorial text-2xl font-normal text-[#141210] group-hover:text-[#3A2008] transition-colors">
              {ev.title}
            </h3>

            <p className="text-xs text-[#5C5449] line-clamp-2 leading-relaxed">
              {ev.short_description}
            </p>

            <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-between text-xs text-[#3A2008] font-bold">
              <span>View Production Archive</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // 3. Multi-Event Automatic Carousel
  return (
    <div
      className="relative space-y-6"
      onMouseEnter={() => config.pause_on_hover && setIsPaused(true)}
      onMouseLeave={() => config.pause_on_hover && setIsPaused(false)}
      onFocus={() => config.pause_on_hover && setIsPaused(true)}
      onBlur={() => config.pause_on_hover && setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Archives Carousel"
    >
      {/* Navigation Controls Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="text-xs font-mono text-[#877D70]">
          <span>
            Showing {currentIndex + 1}–{Math.min(currentIndex + visibleCount, items.length)} of {items.length} Productions
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrev}
            className="w-9 h-9 rounded-full bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#E5DEC9] hover:border-[#3A2008] flex items-center justify-center text-[#141210] transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3A2008]"
            aria-label="Previous archive production"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="w-9 h-9 rounded-full bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#E5DEC9] hover:border-[#3A2008] flex items-center justify-center text-[#141210] transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3A2008]"
            aria-label="Next archive production"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overflow Track Container */}
      <div className="overflow-hidden rounded-3xl p-1 -m-1">
        <div
          className={`flex gap-6 ${
            prefersReducedMotion
              ? "transition-none"
              : "transition-transform ease-out"
          }`}
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCount + (visibleCount > 1 ? 1.5 : 0))}%)`,
            transitionDuration: prefersReducedMotion
              ? "0ms"
              : `${config.transition_duration_ms}ms`,
          }}
        >
          {items.map((ev, idx) => {
            const categoryLabel = ev.category_rel?.name || ev.category || "Archive";
            const widthClass =
              visibleCount === 1
                ? "w-full"
                : visibleCount === 2
                ? "w-[calc(50%-12px)]"
                : "w-[calc(33.333%-16px)]";

            return (
              <div
                key={ev.id}
                className={`${widthClass} shrink-0`}
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${items.length}: ${ev.title}`}
              >
                <Link
                  href={`/works/${ev.slug}`}
                  className="group flex flex-col justify-between h-full rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#3A2008]"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#141210]">
                      {ev.cover_image_url ? (
                        <Image
                          src={ev.cover_image_url}
                          alt={ev.cover_alt_text || ev.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#3A2008]" />
                      )}

                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider bg-[#FAF7F2]/95 backdrop-blur-xs text-[#3A2008] border border-[#E5DEC9] shadow-2xs font-semibold">
                          {categoryLabel}
                        </span>
                      </div>

                      {ev.is_featured && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono uppercase bg-[#3A2008] text-[#FAF7F2] shadow-2xs flex items-center gap-1 font-bold">
                            <Sparkles className="w-2.5 h-2.5 text-[#D9A673]" />
                            Featured
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-6 pt-2 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#877D70]">
                        <span className="flex items-center gap-1 text-[#A66D35]">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{ev.event_date}</span>
                        </span>
                        {ev.location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate max-w-[140px]">
                              <MapPin className="w-3 h-3 text-[#A66D35]" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          </>
                        )}
                        {ev.client_or_institution && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate max-w-[130px]">
                              <Building className="w-3 h-3 text-[#A66D35]" />
                              <span className="truncate">{ev.client_or_institution}</span>
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-[#141210] group-hover:text-[#3A2008] transition-colors line-clamp-1">
                        {ev.title}
                      </h3>

                      <p className="text-xs text-[#5C5449] line-clamp-2 leading-relaxed">
                        {ev.short_description}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-between text-xs text-[#3A2008] font-bold">
                      <span>View Production Details</span>
                      <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Indicators (Dots) */}
      {maxIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentIndex === idx
                  ? "w-6 bg-[#3A2008]"
                  : "w-1.5 bg-[#D5CCB4] hover:bg-[#A66D35]"
              }`}
              aria-label={`Go to carousel slide page ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
