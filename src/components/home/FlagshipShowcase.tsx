"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PortfolioProject, PortfolioCategory, EventArchive, EventArchiveCategory } from "@/types/database";
import { formatDate } from "@/lib/utils";
import FeaturedEventSlider from "./FeaturedEventSlider";
import {
  Play,
  Eye,
  X,
  ArrowUpRight,
  ChevronRight,
  Camera,
} from "lucide-react";

interface FlagshipShowcaseProps {
  initialProjects?: PortfolioProject[];
  featuredArchives?: EventArchive[];
  categories?: EventArchiveCategory[];
  heading?: string;
  subheading?: string;
  show?: boolean;
}

const CATEGORY_LABELS: Record<PortfolioCategory | "all", string> = {
  all: "All Flagship Works",
  corporate_summit: "Corporate Summits",
  documentary: "Brand Documentaries",
  headshot: "Executive Headshots",
  workshop: "Workshops & Forums",
  wedding: "Seasonal Weddings",
};

export default function FlagshipShowcase({
  initialProjects = [],
  featuredArchives = [],
  categories = [],
  heading = "Editorial Photography Showcase",
  subheading = "From academic convocations to executive portraiture and cultural brand visual stories, explore our signature productions in Dhaka and beyond.",
  show = true,
}: FlagshipShowcaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<PortfolioCategory | "all">("all");
  const [activeModalProject, setActiveModalProject] = useState<PortfolioProject | null>(null);
  const [modalActiveImage, setModalActiveImage] = useState<string | null>(null);

  if (show === false) return null;

  const filteredProjects = initialProjects.filter((p) => {
    if (selectedCategory === "all") return true;
    return p.category === selectedCategory;
  });

  // Featured flagship centerpiece project (first flagship or first project)
  const centerpieceProject =
    filteredProjects.find((p) => p.is_flagship) || filteredProjects[0] || initialProjects[0];

  const openModal = (proj: PortfolioProject) => {
    setActiveModalProject(proj);
    setModalActiveImage(proj.thumbnail_url);
  };

  const closeModal = () => {
    setActiveModalProject(null);
    setModalActiveImage(null);
  };

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-[#FAF7F2] relative border-t border-[#E5DEC9]"
      id="works"
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
              <span>View Full Archive</span>
              <ChevronRight className="w-4 h-4 text-[#A66D35]" />
            </Link>
          </div>
        </div>

        {/* Dynamic Category Overview & Filter Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#5C5449]">
            <span className="uppercase tracking-[0.2em]">PRODUCTION DISCIPLINES &amp; ARCHIVES</span>
            <span className="text-[#A66D35]">
              {categories && categories.length > 0 ? `${categories.length} Categories Active` : "Database Categories"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                  : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:border-[#D5CCB4]"
              }`}
            >
              All Flagship Works
            </button>

            {categories && categories.length > 0
              ? categories.map((cat) => {
                  return (
                    <Link
                      key={cat.id}
                      href={`/works?category=${encodeURIComponent(cat.slug || cat.name)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:border-[#3A2008] hover:bg-[#FAF7F2]"
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-[#A66D35] font-bold">
                        {cat.archive_count ?? 0}
                      </span>
                    </Link>
                  );
                })
              : (Object.keys(CATEGORY_LABELS) as Array<PortfolioCategory | "all">)
                  .filter((k) => k !== "all")
                  .map((catKey) => (
                    <button
                      key={catKey}
                      onClick={() => setSelectedCategory(catKey)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCategory === catKey
                          ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                          : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:border-[#D5CCB4]"
                      }`}
                    >
                      {CATEGORY_LABELS[catKey]}
                    </button>
                  ))}
          </div>
        </div>

        {/* CENTERPIECE: Featured Flagship Work Composition */}
        {centerpieceProject && (
          <div className="group relative rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-10 lg:p-12 shadow-sm transition-all hover:border-[#D5CCB4] overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#E8ECE5]/60 blur-3xl pointer-events-none"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
              <div className="lg:col-span-7 space-y-4">
                <div
                  onClick={() => openModal(centerpieceProject)}
                  className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#161311] border border-[#E5DEC9] cursor-pointer group/img"
                >
                  <Image
                    src={centerpieceProject.thumbnail_url}
                    alt={centerpieceProject.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover object-center filter contrast-[1.02] transition-transform duration-700 ease-out group-hover/img:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#3A2008]/85 backdrop-blur-md text-[#FAF7F2] text-[10px] font-mono uppercase tracking-widest border border-white/10">
                      Signature Commission
                    </span>
                  </div>

                  {centerpieceProject.video_url && (
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-[#FAF7F2] text-xs font-mono">
                      <Play className="w-3.5 h-3.5 text-[#D9A673] fill-current" />
                      <span>Motion Record</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                      {CATEGORY_LABELS[centerpieceProject.category] || "Editorial Production"}
                    </span>
                    <span className="h-px w-6 bg-[#E5DEC9]" />
                    <span className="text-xs font-mono text-[#5C5449]">
                      {formatDate(centerpieceProject.completed_date || undefined)}
                    </span>
                  </div>

                  <h3 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#141210] leading-tight">
                    {centerpieceProject.title}
                  </h3>

                  <p className="text-sm text-[#5C5449] leading-relaxed">
                    {centerpieceProject.description}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E3C08] block">
                    COMMISSION CREDENTIALS
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#5C5449]">Client Organization:</span>
                    <span className="font-semibold text-[#141210]">
                      {centerpieceProject.client_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#5C5449]">Delivery Status:</span>
                    <span className="text-[#2E6B4E] font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#2E6B4E]" />
                      Archival Record Complete
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openModal(centerpieceProject)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Gallery Frames</span>
                  </button>

                  <Link
                    href={`/works?project=${centerpieceProject.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E5DEC9] text-xs font-medium text-[#141210] transition-colors"
                  >
                    <span>Full Story</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#A66D35]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADDITIONAL GALLERY PORTFOLIO ENTRIES — FEATURED PRODUCTIONS SLIDER */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5C5449]">
              ADDITIONAL GALLERY PORTFOLIO ENTRIES
            </span>
            <span className="text-xs font-mono text-[#A66D35]">
              {featuredArchives && featuredArchives.length > 0
                ? `${featuredArchives.length} Featured ${featuredArchives.length === 1 ? "Archive" : "Archives"}`
                : "0 Featured Archives"}
            </span>
          </div>

          <FeaturedEventSlider events={featuredArchives} />
        </div>

        {/* Gallery Inspection Lightbox Modal */}
        {activeModalProject && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
            onClick={closeModal}
          >
            <div
              className="relative w-full max-w-5xl rounded-3xl bg-[#161311] border border-white/10 text-[#FAF7F2] overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                    {CATEGORY_LABELS[activeModalProject.category] || "Photography Production"}
                  </span>
                  <h3 className="font-editorial text-2xl font-normal text-[#FAF7F2] mt-0.5">
                    {activeModalProject.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-[#FAF7F2]" />
                </button>
              </div>

              {/* Main Expanded Photograph */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10">
                <Image
                  src={modalActiveImage || activeModalProject.thumbnail_url}
                  alt={activeModalProject.title}
                  fill
                  sizes="(max-width: 1200px) 100vw, 1000px"
                  className="object-contain object-center"
                />
              </div>

              {/* Gallery Thumbnails Strip */}
              {activeModalProject.gallery_urls && activeModalProject.gallery_urls.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#8A8175]">
                    Available Photographic Frames
                  </span>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    <button
                      type="button"
                      onClick={() => setModalActiveImage(activeModalProject.thumbnail_url)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden border shrink-0 cursor-pointer ${
                        modalActiveImage === activeModalProject.thumbnail_url
                          ? "border-[#A66D35] ring-2 ring-[#A66D35]"
                          : "border-white/20 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={activeModalProject.thumbnail_url}
                        alt="Thumbnail"
                        fill
                        className="object-cover"
                      />
                    </button>
                    {activeModalProject.gallery_urls.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setModalActiveImage(url)}
                        className={`relative w-20 h-14 rounded-lg overflow-hidden border shrink-0 cursor-pointer ${
                          modalActiveImage === url
                            ? "border-[#A66D35] ring-2 ring-[#A66D35]"
                            : "border-white/20 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={url}
                          alt={`Frame ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer info & Booking link */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs">
                <p className="text-[#BDB5A7] max-w-xl">
                  {activeModalProject.description}
                </p>

                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A66D35] hover:bg-[#C48B52] text-[#161311] font-semibold uppercase tracking-wider text-xs transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Reserve Session Like This</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
