"use client";

import React, { useState } from "react";
import Link from "next/link";
import type {
  EventArchive,
  EventArchiveCategory,
  SliderSettings,
} from "@/types/database";
import ArchivesCarousel from "./ArchivesCarousel";
import FeaturedEventSlider from "./FeaturedEventSlider";
import {
  ChevronRight,
  Camera,
  Sparkles,
  Layers,
} from "lucide-react";

interface FlagshipShowcaseProps {
  archives?: EventArchive[];
  featuredArchives?: EventArchive[];
  categories?: EventArchiveCategory[];
  sliderSettings?: SliderSettings;
  heading?: string;
  subheading?: string;
  show?: boolean;
}

export default function FlagshipShowcase({
  archives = [],
  featuredArchives = [],
  categories = [],
  sliderSettings,
  heading = "Curated Milestone Archives & Signature Productions",
  subheading = "From academic convocations to executive leadership portraiture and institutional documentary archives in Dhaka, explore our signature productions.",
  show = true,
}: FlagshipShowcaseProps) {
  // In-place category filter state: "all" or category slug/name/id
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (show === false) return null;

  // Active categories from Supabase
  const activeCategories = categories.filter((cat) => cat.is_active !== false);

  // In-place filtering across all published archives
  const filteredArchives = archives.filter((ev) => {
    if (selectedCategory === "all") return true;
    const target = selectedCategory.toLowerCase();
    return (
      Boolean(ev.category_id && ev.category_id === selectedCategory) ||
      Boolean(
        ev.category &&
          (ev.category.toLowerCase() === target ||
            ev.category.toLowerCase().replace(/[\s_-]+/g, "") ===
              target.replace(/[\s_-]+/g, ""))
      ) ||
      Boolean(
        ev.category_rel &&
          (ev.category_rel.slug.toLowerCase() === target ||
            ev.category_rel.name.toLowerCase() === target ||
            ev.category_rel.id === selectedCategory)
      )
    );
  });

  const selectedCategoryObj = activeCategories.find(
    (c) =>
      c.slug.toLowerCase() === selectedCategory.toLowerCase() ||
      c.name.toLowerCase() === selectedCategory.toLowerCase() ||
      c.id === selectedCategory
  );

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-[#FAF7F2] relative border-t border-[#E5DEC9]"
      id="works"
      aria-label="Photography Works & Archives"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 lg:space-y-24">
        {/* Section Header with Oversized Editorial Typography */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#E5DEC9] pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-editorial text-3xl sm:text-4xl text-[#A66D35] font-light">
                02
              </span>
              <span className="h-px w-8 bg-[#E5DEC9]" />
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#5C4028]">
                CURATED VISUAL CHRONICLES
              </span>
            </div>

            <h2 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#141210]">
              {heading}
            </h2>

            <p className="text-sm sm:text-base text-[#5C5449] max-w-2xl leading-relaxed">
              {subheading}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/book/convocation"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-widest transition-all shadow-xs"
            >
              <Camera className="w-3.5 h-3.5 text-[#D9A673]" />
              <span>Book a Session</span>
            </Link>

            <Link
              href="/works"
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] border border-[#E5DEC9] text-xs font-semibold uppercase tracking-wider text-[#141210] transition-colors"
            >
              <span>View Full Works Directory</span>
              <ChevronRight className="w-4 h-4 text-[#A66D35]" />
            </Link>
          </div>
        </div>

        {/* 1. ARCHIVES SECTION (ALL PUBLISHED EVENT ARCHIVES WITH IN-PLACE CATEGORY FILTERING & AUTOMATIC CAROUSEL) */}
        <div className="space-y-8" aria-label="Archives">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DEC9] pb-4">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-[#A66D35]" />
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#141210] font-bold">
                Archives
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-[#877D70]">
              <span className="text-[#A66D35]">
                {archives.length} {archives.length === 1 ? "Production" : "Productions"} Documented
              </span>
              <span>•</span>
              <span>
                {activeCategories.length} {activeCategories.length === 1 ? "Category" : "Categories"} Active
              </span>
            </div>
          </div>

          {/* In-Place Category Filter Bar (Clicking filters in place without navigating away) */}
          <div
            className="flex flex-wrap items-center gap-2 pb-1 overflow-x-auto"
            role="tablist"
            aria-label="Filter Archives by Category"
          >
            {/* All Archives Button */}
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                selectedCategory === "all"
                  ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                  : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:border-[#D5CCB4]"
              }`}
              aria-pressed={selectedCategory === "all"}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === "all"
                    ? "bg-[#5C4028] text-[#FAF7F2]"
                    : "bg-[#FAF7F2] text-[#A66D35] border border-[#E5DEC9]"
                }`}
              >
                {archives.length}
              </span>
            </button>

            {/* Dynamic Database Categories from Supabase */}
            {activeCategories.map((cat) => {
              const isSelected =
                selectedCategory === cat.slug.toLowerCase() ||
                selectedCategory === cat.name.toLowerCase() ||
                selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug.toLowerCase())}
                  className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                      : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:border-[#D5CCB4]"
                  }`}
                  aria-pressed={isSelected}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? "bg-[#5C4028] text-[#FAF7F2]"
                        : "bg-[#FAF7F2] text-[#A66D35] border border-[#E5DEC9]"
                    }`}
                  >
                    {cat.archive_count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Smooth Automatic Archives Carousel */}
          <ArchivesCarousel
            items={filteredArchives}
            sliderConfig={sliderSettings?.archives_carousel}
            onResetCategory={() => setSelectedCategory("all")}
            selectedCategoryName={selectedCategoryObj?.name}
          />
        </div>

        {/* 2. HIGHLIGHTED EVENTS SECTION (FEATURED ARCHIVES ROTATION ONLY) */}
        <div className="space-y-8" aria-label="Highlighted Events">
          <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#A66D35]" />
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#141210] font-bold">
                Highlighted Events
              </h3>
            </div>
            <span className="text-xs font-mono text-[#A66D35]">
              {featuredArchives && featuredArchives.length > 0
                ? `${featuredArchives.length} Featured ${
                    featuredArchives.length === 1 ? "Archive" : "Archives"
                  }`
                : "0 Featured Archives"}
            </span>
          </div>

          {/* Featured Productions Slider Component */}
          <FeaturedEventSlider
            events={featuredArchives}
            sliderConfig={sliderSettings?.highlighted_events}
          />
        </div>
      </div>
    </section>
  );
}
