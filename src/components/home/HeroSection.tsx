"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import type { HeroSlide, HomepageConfig } from "@/types/database";

interface HeroSectionProps {
  slides?: HeroSlide[];
  config?: Partial<HomepageConfig>;
}

export default function HeroSection({ slides = [], config }: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Active published slides
  const activeSlides = Array.isArray(slides)
    ? slides.filter((s) => s && s.is_published !== false)
    : [];

  const totalSlides = activeSlides.length;
  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  const autoplay = config?.hero_autoplay !== false && totalSlides > 1;
  const intervalSeconds = Math.max(3, Number(config?.hero_interval_sec) || 6);

  const nextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Autoplay timer
  useEffect(() => {
    if (!autoplay || isPaused || totalSlides <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoplay, isPaused, intervalSeconds, totalSlides, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // If no published hero slides exist, render a clean, quiet neutral fallback (no dummy images)
  if (totalSlides === 0) {
    return (
      <section className="relative w-full h-screen min-h-[100dvh] bg-[#141210] text-[#FAF7F2] flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-radial from-[#2C2621]/40 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl text-center space-y-6">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A66D35]">
            OFFPRINT STUDIO • DHAKA
          </span>
          <h1 className="font-editorial text-4xl sm:text-6xl text-[#FAF7F2] font-light">
            Enduring Visual Legacies.
          </h1>
          <p className="text-sm sm:text-base text-[#D5CCB4] font-light max-w-md mx-auto leading-relaxed">
            Curated milestone portraiture, institutional coverage, and archival print editions.
          </p>
          <div className="pt-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FAF7F2] text-[#141210] hover:bg-white text-xs font-semibold uppercase tracking-widest transition-all"
            >
              <span>Explore Studio Services</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Focal point mapping
  const focalPointClass =
    currentSlide?.focal_point === "top"
      ? "object-top"
      : currentSlide?.focal_point === "bottom"
      ? "object-bottom"
      : currentSlide?.focal_point === "left"
      ? "object-left"
      : currentSlide?.focal_point === "right"
      ? "object-right"
      : "object-center";

  // Text alignment mapping
  const alignClass =
    currentSlide?.text_align === "center"
      ? "text-center items-center mx-auto"
      : currentSlide?.text_align === "right"
      ? "text-right items-end ml-auto"
      : "text-left items-start mr-auto";

  return (
    <section
      aria-label="Hero Photography Slider"
      className="relative w-full h-screen min-h-[100dvh] overflow-hidden bg-[#141210] select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide Image Layer with Smooth Crossfade Transition */}
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={currentSlide.id || currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0.3 : 0.9,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="absolute inset-0 w-full h-full"
        >
          <Image
            src={currentSlide.image_url}
            alt={currentSlide.alt_text || currentSlide.title || "OFFPRINT Photography"}
            fill
            priority
            sizes="100vw"
            className={`object-cover ${focalPointClass}`}
          />
          {/* Restrained tonal gradient for text legibility without obscuring photography */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/20 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Slide Editorial Content Overlay */}
      <div className="relative z-20 w-full h-full flex flex-col justify-end pb-24 sm:pb-28 lg:pb-32 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || currentIndex}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
            transition={{
              duration: shouldReduceMotion ? 0.2 : 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`flex flex-col ${alignClass} max-w-3xl space-y-4 sm:space-y-6`}
          >
            {/* Optional Eyebrow Text (only rendered if non-empty) */}
            {currentSlide.eyebrow?.trim() && (
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#D5CCB4] inline-block font-medium drop-shadow-xs">
                {currentSlide.eyebrow.trim()}
              </span>
            )}

            {/* Clear, Elegant Editorial Headline */}
            <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-[#FAF7F2] leading-[1.05] drop-shadow-sm">
              {currentSlide.title}
            </h1>

            {/* Optional Short Supporting Sentence */}
            {currentSlide.subtitle?.trim() && (
              <p className="text-sm sm:text-base md:text-lg text-[#D5CCB4] font-light leading-relaxed max-w-xl drop-shadow-xs">
                {currentSlide.subtitle.trim()}
              </p>
            )}

            {/* Primary Call-to-Action */}
            {currentSlide.cta_label?.trim() && (
              <div className="pt-2 sm:pt-4">
                <Link
                  href={currentSlide.cta_href?.trim() || "/book"}
                  className="inline-flex items-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#FAF7F2] text-[#141210] hover:bg-white text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-xl hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
                >
                  <span>{currentSlide.cta_label.trim()}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Minimalist Slider Navigation & Controls Strip */}
      {totalSlides > 1 && (
        <div className="absolute z-30 bottom-8 sm:bottom-10 left-6 sm:left-12 lg:left-20 right-6 sm:right-12 lg:right-20 flex items-center justify-between text-[#FAF7F2]/80">
          {/* Subtle Slide Number Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tracking-widest text-[#FAF7F2]">
              {String(currentIndex + 1).padStart(2, "0")}
            </span>
            <span className="w-8 h-px bg-white/30" />
            <span className="text-xs font-mono tracking-widest text-white/50">
              {String(totalSlides).padStart(2, "0")}
            </span>
          </div>

          {/* Discreet Slider Chevrons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous photograph"
              className="w-10 h-10 rounded-full border border-white/20 bg-black/20 hover:bg-black/50 hover:border-white/40 backdrop-blur-xs flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next photograph"
              className="w-10 h-10 rounded-full border border-white/20 bg-black/20 hover:bg-black/50 hover:border-white/40 backdrop-blur-xs flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
