"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Sparkles,
  Pause,
  Play,
} from "lucide-react";
import type { EventHeroSlide, MediaFolderPhoto, SliderConfig } from "@/types/database";

interface EventHeroSlideshowProps {
  slides?: EventHeroSlide[] | null;
  fallbackPhotos?: MediaFolderPhoto[];
  coverUrl?: string | null;
  title: string;
  category?: string;
  eventDate?: string;
  sliderConfig?: SliderConfig;
  intervalSeconds?: number;
}

export default function EventHeroSlideshow({
  slides = [],
  fallbackPhotos = [],
  coverUrl,
  title,
  category,
  eventDate,
  sliderConfig,
  intervalSeconds,
}: EventHeroSlideshowProps) {
  // Normalize slides
  const normalizedSlides: {
    id: string;
    url: string;
    caption?: string | null;
    focal?: string;
  }[] = [];

  if (Array.isArray(slides) && slides.length > 0) {
    slides.forEach((s, idx) => {
      normalizedSlides.push({
        id: s.id || `slide-${idx}`,
        url: s.image_url,
        caption: s.caption,
        focal: s.focal_point || "center",
      });
    });
  } else if (fallbackPhotos.length > 0) {
    fallbackPhotos.slice(0, 8).forEach((p, idx) => {
      normalizedSlides.push({
        id: p.id || `photo-${idx}`,
        url: p.public_url,
        caption: p.caption || p.alt_text,
        focal: p.focal_point || "center",
      });
    });
  } else if (coverUrl) {
    normalizedSlides.push({
      id: "cover-slide",
      url: coverUrl,
      caption: title,
      focal: "center",
    });
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const total = normalizedSlides.length;

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Smooth auto-rotation using centralized timing when not paused
  useEffect(() => {
    const autoplay = sliderConfig ? sliderConfig.autoplay_enabled : true;
    if (total <= 1 || isPaused || lightboxOpen || !autoplay) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const intervalMs = Math.max(
      2000,
      (sliderConfig?.interval_seconds || intervalSeconds || 4) * 1000
    );

    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [total, isPaused, lightboxOpen, sliderConfig, intervalSeconds, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "Escape") setLightboxOpen(false);
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "ArrowLeft") handlePrev();
      } else {
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "ArrowLeft") handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, handleNext, handlePrev]);

  if (total === 0) return null;

  const currentSlide = normalizedSlides[currentIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    touchStartXRef.current = null;
    setIsPaused(false);
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-[#2E2822] bg-[#141210] shadow-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Aspect Container */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] w-full max-h-[640px] overflow-hidden">
        {normalizedSlides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <Image
                src={slide.url}
                alt={slide.caption || `${title} slide ${idx + 1}`}
                fill
                priority={idx === 0}
                className="object-cover transition-transform duration-7000 ease-out"
                style={{
                  objectPosition:
                    slide.focal === "top"
                      ? "center top"
                      : slide.focal === "bottom"
                      ? "center bottom"
                      : "center center",
                  transform: isActive ? "scale(1.03)" : "scale(1.0)",
                }}
                sizes="100vw"
              />

              {/* Cinematic Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141210]/60 via-transparent to-[#141210]/40" />
            </div>
          );
        })}

        {/* Top Badges & Lightbox Button */}
        <div className="absolute top-5 left-5 right-5 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {category && (
              <span className="rounded-full bg-[#141210]/80 backdrop-blur-md px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#D9A673] border border-[#3A2008]">
                {category.replace(/_/g, " ")}
              </span>
            )}
            {eventDate && (
              <span className="rounded-full bg-[#141210]/80 backdrop-blur-md px-3 py-1 text-[10px] font-mono text-[#FAF7F2]/80 border border-white/10 hidden sm:inline-block">
                {eventDate}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141210]/80 backdrop-blur-md text-[#FAF7F2] hover:bg-[#3A2008] border border-white/10 transition-colors"
            title="Inspect slide full-screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom Slide Info & Controls */}
        <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#D9A673] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Editorial Visual Reel • Slide {currentIndex + 1} of {total}
            </span>
            {currentSlide.caption && (
              <p className="text-sm sm:text-base font-semibold text-[#FAF7F2] drop-shadow-md line-clamp-1">
                {currentSlide.caption}
              </p>
            )}
          </div>

          {/* Navigation Controls */}
          {total > 1 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#141210]/80 backdrop-blur-md text-[#FAF7F2] hover:bg-[#3A2008] border border-white/10 transition-colors"
                title={isPaused ? "Play slideshow" : "Pause slideshow"}
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>

              <button
                type="button"
                onClick={handlePrev}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141210]/80 backdrop-blur-md text-[#FAF7F2] hover:bg-[#3A2008] border border-white/10 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Indicator Pills */}
              <div className="flex items-center gap-1.5 px-2">
                {normalizedSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentIndex
                        ? "w-6 bg-[#D9A673]"
                        : "w-1.5 bg-[#FAF7F2]/40 hover:bg-[#FAF7F2]/80"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141210]/80 backdrop-blur-md text-[#FAF7F2] hover:bg-[#3A2008] border border-white/10 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Fullscreen Inspector */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative max-h-[85vh] max-w-[90vw] aspect-[16/10] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentSlide.url}
              alt={currentSlide.caption || title}
              fill
              className="object-contain"
              sizes="90vw"
            />
            {currentSlide.caption && (
              <div className="absolute bottom-[-2.5rem] left-0 right-0 text-center text-xs text-neutral-300">
                {currentSlide.caption} • Slide {currentIndex + 1} of {total}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

