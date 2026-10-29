"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PortfolioProject, PortfolioCategory } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  Play,
  Eye,
  X,
  ArrowUpRight,
  ChevronRight,
  Camera,
  Maximize2,
} from "lucide-react";

interface FlagshipShowcaseProps {
  initialProjects: PortfolioProject[];
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
  initialProjects,
  heading = "Editorial Photography Showcase",
  subheading = "From international summits at Dhaka luxury hotels to high-impact brand documentaries and executive portraiture, explore our signature visual productions.",
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

  // Remaining projects for the asymmetrical editorial grid
  const gridProjects = filteredProjects.filter((p) => p.id !== centerpieceProject?.id);

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
        {/* Section Header with Oversized Editorial Number & Typography */}
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
              <Camera className="w-3.5 h-3.5 text-[#A66D35]" />
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

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5 pb-2 overflow-x-auto">
          {(Object.keys(CATEGORY_LABELS) as Array<PortfolioCategory | "all">).map((catKey) => {
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                    : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:border-[#D5CCB4]"
                }`}
              >
                {CATEGORY_LABELS[catKey]}
              </button>
            );
          })}
        </div>

        {/* CENTERPIECE 1: Large Featured Composition (Inspired by Reference Image) */}
        {centerpieceProject && (
          <div className="group relative rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-10 lg:p-12 shadow-sm transition-all hover:border-[#D5CCB4] overflow-hidden">
            {/* Subtle background grey-green architectural tone for editorial contrast */}
            <div
              aria-hidden="true"
              className="absolute top-0 right-0 w-1/3 h-full bg-[#E8ECE5]/40 pointer-events-none -z-0"
            />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Oversized Image with subtle zoom interaction */}
              <div
                onClick={() => openModal(centerpieceProject)}
                className="lg:col-span-8 relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#161311] cursor-pointer shadow-md"
              >
                <Image
                  src={centerpieceProject.thumbnail_url}
                  alt={centerpieceProject.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 70vw"
                  priority
                  className="object-cover object-center filter contrast-[1.02] group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#161311]/80 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity" />

                {/* Inspect Overlay Pill */}
                <div className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161311]/80 backdrop-blur-md text-[10px] font-mono uppercase tracking-widest text-[#FAF7F2] border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Maximize2 className="w-3 h-3 text-[#A66D35]" />
                  <span>Inspect Photograph</span>
                </div>

                <div className="absolute top-4 left-4 px-3 py-1 rounded bg-[#161311]/80 backdrop-blur-md border border-white/10 text-[10px] font-mono uppercase tracking-widest text-[#D5CCB4]">
                  FLAGSHIP PRODUCTION • 01
                </div>
              </div>

              {/* Right Column: Editorial Typography & Metadata */}
              <div className="lg:col-span-4 space-y-6">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#A66D35] block">
                    {CATEGORY_LABELS[centerpieceProject.category]}
                  </span>
                  <h3 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-normal text-[#141210] leading-snug">
                    {centerpieceProject.title}
                  </h3>
                  <p className="text-xs font-mono text-[#6E3C08] font-semibold">
                    Client: {centerpieceProject.client_name}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
                  {centerpieceProject.description}
                </p>

                <div className="pt-4 border-t border-[#E5DEC9] space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#5C5449]">
                    <span className="font-mono">Completed Date</span>
                    <span className="font-medium text-[#141210]">
                      {formatDate(centerpieceProject.completed_date || undefined)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#5C5449]">
                    <span className="font-mono">Media Deliverables</span>
                    <span className="font-medium text-[#141210]">
                      {centerpieceProject.gallery_urls?.length || 4} Master Stills
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

        {/* ASYMMETRICAL EDITORIAL GRID (Inspired by Reference Image & Visual Rhythm) */}
        {gridProjects.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5C5449]">
                ADDITIONAL GALLERY PORTFOLIO ENTRIES
              </span>
              <span className="text-xs font-mono text-[#A66D35]">
                {gridProjects.length} Works Displayed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {gridProjects.map((project, idx) => {
                // Alternate styling for editorial variety: 
                // idx % 3 === 0 uses soft sage surface (#E8ECE5), 
                // idx % 3 === 1 uses warm sand (#F4EFE6), 
                // idx % 3 === 2 uses crisp white (#FFFFFF)
                const surfaceBg =
                  idx % 3 === 0
                    ? "bg-[#E8ECE5]/70 border-[#D2DACD]"
                    : idx % 3 === 1
                    ? "bg-[#F4EFE6] border-[#E5DEC9]"
                    : "bg-[#FFFFFF] border-[#E5DEC9]";

                return (
                  <article
                    key={project.id}
                    className={`group rounded-2xl border p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between ${surfaceBg}`}
                  >
                    <div className="space-y-4">
                      {/* Image Frame with Aspect Ratio Variety */}
                      <div
                        onClick={() => openModal(project)}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#161311] cursor-pointer"
                      >
                        <Image
                          src={project.thumbnail_url}
                          alt={project.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover object-center filter contrast-[1.03] group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />

                        <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono uppercase tracking-widest text-[#FAF7F2]">
                          {CATEGORY_LABELS[project.category]}
                        </div>

                        {project.video_url && (
                          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#3A2008]/90 text-[#FAF7F2] flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </div>
                        )}
                      </div>

                      {/* Project Title & Metadata */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#6E3C08]">
                          <span>{project.client_name}</span>
                          <span>{formatDate(project.completed_date || undefined)}</span>
                        </div>
                        <h4 className="font-editorial text-xl font-normal text-[#141210] group-hover:text-[#3A2008] transition-colors leading-snug">
                          {project.title}
                        </h4>
                        <p className="text-xs text-[#5C5449] line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 mt-4 border-t border-[#E5DEC9]/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => openModal(project)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#3A2008] group-hover:text-[#A66D35] transition-colors cursor-pointer"
                      >
                        <span>View Frames</span>
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>

                      <span className="text-[10px] font-mono text-[#8A8175]">
                        {(project.gallery_urls?.length || 0) + 1} STILLS
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

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
                    {CATEGORY_LABELS[activeModalProject.category]}
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
