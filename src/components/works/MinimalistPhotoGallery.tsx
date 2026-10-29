"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Sparkles,
  Grid,
  Columns,
} from "lucide-react";
import type { MediaFolderPhoto } from "@/types/database";

interface MinimalistPhotoGalleryProps {
  photos: MediaFolderPhoto[];
  title?: string;
  subtitle?: string;
  rotationIntervalMs?: number;
}

export default function MinimalistPhotoGallery({
  photos,
  title,
  subtitle,
  rotationIntervalMs = 2200,
}: MinimalistPhotoGalleryProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"spotlight" | "grid">("spotlight");
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  const totalPhotos = photos.length;

  const handleNext = useCallback(() => {
    if (totalPhotos <= 1) return;
    setStartIndex((prev) => (prev + 1) % totalPhotos);
  }, [totalPhotos]);

  const handlePrev = useCallback(() => {
    if (totalPhotos <= 1) return;
    setStartIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
  }, [totalPhotos]);

  // Subtle automatic rotation in spotlight mode
  useEffect(() => {
    if (viewMode !== "spotlight" || totalPhotos <= 4 || isPaused || lightboxIndex !== null) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(() => {
      handleNext();
    }, rotationIntervalMs);

    return () => clearInterval(timer);
  }, [viewMode, totalPhotos, isPaused, lightboxIndex, rotationIntervalMs, handleNext]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % totalPhotos : 0));
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + totalPhotos) % totalPhotos : 0
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, totalPhotos]);

  if (totalPhotos === 0) {
    return (
      <div className="rounded-3xl border border-[#2E2822] bg-[#141210] p-12 text-center text-[#877D70]">
        <Sparkles className="mx-auto h-6 w-6 text-[#A66D35] mb-2 opacity-60" />
        <p className="text-sm font-semibold text-[#FAF7F2]">Photographs are being curated for this collection.</p>
        <p className="text-xs text-[#877D70] mt-1">Check back shortly to view the complete photographic archive.</p>
      </div>
    );
  }

  // Circular visible slice of portrait panels
  const visiblePhotos: { photo: MediaFolderPhoto; actualIndex: number }[] = [];
  const countToDisplay = Math.min(totalPhotos, 4);

  for (let i = 0; i < countToDisplay; i++) {
    const actualIndex = (startIndex + i) % totalPhotos;
    visiblePhotos.push({
      photo: photos[actualIndex],
      actualIndex,
    });
  }

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
    <section
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative rounded-3xl bg-[#141210] border border-[#2E2822] p-5 sm:p-7 md:p-8 overflow-hidden shadow-2xl"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          {subtitle && (
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#D9A673] block mb-1">
              {subtitle}
            </span>
          )}
          {title && (
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FAF7F2]">
              {title}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-[#1F1B17] border border-[#2E2822] p-1">
            <button
              type="button"
              onClick={() => setViewMode("spotlight")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "spotlight"
                  ? "bg-[#3A2008] text-[#FAF7F2]"
                  : "text-[#877D70] hover:text-[#FAF7F2]"
              }`}
              title="Editorial Spotlight Carousel"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Spotlight</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "grid"
                  ? "bg-[#3A2008] text-[#FAF7F2]"
                  : "text-[#877D70] hover:text-[#FAF7F2]"
              }`}
              title="Complete Mixed Aspect Ratio Gallery Grid"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>All ({totalPhotos})</span>
            </button>
          </div>

          {/* Prev / Next controls in spotlight mode */}
          {viewMode === "spotlight" && totalPhotos > 1 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#877D70] mr-1">
                {startIndex + 1} / {totalPhotos}
              </span>
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2E2822] bg-[#1F1B17] text-[#FAF7F2] hover:bg-[#3A2008] transition-colors"
                aria-label="Previous photograph"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2E2822] bg-[#1F1B17] text-[#FAF7F2] hover:bg-[#3A2008] transition-colors"
                aria-label="Next photograph"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: SPOTLIGHT TALL PORTRAIT PANELS */}
      {viewMode === "spotlight" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {visiblePhotos.map(({ photo, actualIndex }, idx) => (
            <div
              key={`${photo.id}-${actualIndex}-${idx}`}
              onClick={() => setLightboxIndex(actualIndex)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl border border-[#2E2822] bg-[#1F1B17] aspect-[3/4] transition-all duration-700 ease-out hover:border-[#D9A673]/60 hover:shadow-xl hover:shadow-[#D9A673]/5"
            >
              <Image
                src={photo.public_url}
                alt={photo.alt_text || photo.caption || "Editorial photograph"}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/90 via-[#141210]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 p-4 flex flex-col justify-between">
                <div className="flex justify-end">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#141210]/80 text-[#FAF7F2] backdrop-blur-sm">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                {photo.caption && (
                  <p className="text-xs font-semibold text-[#FAF7F2] line-clamp-2">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: COMPLETE MIXED ASPECT RATIO GALLERY GRID */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {photos.map((photo, idx) => {
            // Mixed aspect ratio support: portrait, landscape, square
            const isWide = idx % 5 === 0;
            const aspectClass = isWide ? "aspect-[16/10] sm:col-span-2" : "aspect-[3/4]";
            return (
              <div
                key={photo.id || idx}
                onClick={() => setLightboxIndex(idx)}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-[#2E2822] bg-[#1F1B17] ${aspectClass} transition-all duration-500 hover:border-[#D9A673]/60`}
              >
                <Image
                  src={photo.public_url}
                  alt={photo.alt_text || photo.caption || "Archive photo"}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 p-3 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#141210]/80 text-[#FAF7F2]">
                      <Maximize2 className="h-3 w-3" />
                    </span>
                  </div>
                  {photo.caption && (
                    <p className="text-[11px] font-semibold text-[#FAF7F2] line-clamp-1">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox / Inspector */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white"
            aria-label="Close fullscreen view"
          >
            <X className="h-5 w-5" />
          </button>

          {totalPhotos > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev - 1 + totalPhotos) % totalPhotos : 0
                  );
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white"
                aria-label="Previous photograph"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev + 1) % totalPhotos : 0
                  );
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-neutral-300 hover:text-white"
                aria-label="Next photograph"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative max-h-[85vh] max-w-[90vw] aspect-[3/4] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-full w-full max-h-[80vh] overflow-hidden rounded-2xl">
              <Image
                src={photos[lightboxIndex].public_url}
                alt={
                  photos[lightboxIndex].alt_text ||
                  photos[lightboxIndex].caption ||
                  "High resolution photograph"
                }
                fill
                priority
                className="object-contain"
                sizes="90vw"
              />
            </div>

            <div className="mt-3 flex items-center justify-between w-full max-w-xl px-2 text-xs text-neutral-400">
              <p className="truncate font-semibold text-neutral-200">
                {photos[lightboxIndex].caption || photos[lightboxIndex].file_name}
              </p>
              <span className="font-mono text-neutral-500 shrink-0 ml-4">
                {lightboxIndex + 1} of {totalPhotos}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
