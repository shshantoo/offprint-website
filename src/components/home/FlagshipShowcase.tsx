"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PortfolioProject, PortfolioCategory } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  Sparkles,
  Play,
  Eye,
  X,
  ArrowUpRight,
  Calendar,
  User,
  ChevronRight,
  Camera,
} from "lucide-react";

interface FlagshipShowcaseProps {
  initialProjects: PortfolioProject[];
}

const CATEGORY_LABELS: Record<PortfolioCategory | "all", string> = {
  all: "All Flagship Works",
  corporate_summit: "Corporate Summits",
  documentary: "Documentaries",
  headshot: "Executive Headshots",
  workshop: "Workshops",
  wedding: "Seasonal Weddings",
};

export default function FlagshipShowcase({ initialProjects }: FlagshipShowcaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<PortfolioCategory | "all">("all");
  const [activeModalProject, setActiveModalProject] = useState<PortfolioProject | null>(null);

  const filteredProjects = initialProjects.filter((p) => {
    if (selectedCategory === "all") return true;
    return p.category === selectedCategory;
  });

  return (
    <section className="py-20 bg-[#F4EFE6]/60 relative border-t border-[#E5DEC9]" id="works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#A66D35]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curated Portfolio</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#141210] tracking-tight">
              Flagship Media Deliverables
            </h2>
            <p className="text-sm text-[#5C5449] max-w-xl">
              From international summits at Dhaka luxury hotels to high-impact brand documentaries and executive portraiture, explore our signature visual productions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Book a Session</span>
            </Link>
            <Link
              href="/works"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#3A2008] hover:text-[#A66D35] transition-colors"
            >
              <span>View Full Archive</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-10 pb-2 overflow-x-auto">
          {(Object.keys(CATEGORY_LABELS) as Array<PortfolioCategory | "all">).map((catKey) => {
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
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

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setActiveModalProject(project)}
              className="group cursor-pointer rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col"
            >
              {/* Media Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-[#F4EFE6]">
                <img
                  src={project.thumbnail_url}
                  alt={project.cover_alt_text || project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FAF7F2]/95 backdrop-blur-xs text-[#3A2008] border border-[#E5DEC9]">
                    {CATEGORY_LABELS[project.category] || project.category}
                  </span>
                </div>

                {/* Flagship Indicator */}
                {project.is_flagship && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#3A2008] text-[#FAF7F2]">
                      Flagship
                    </span>
                  </div>
                )}

                {/* Quick inspect hover icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#141210]/30 backdrop-blur-[1px]">
                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF7F2] text-[#141210] text-xs font-semibold shadow-md">
                    <Eye className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Inspect Project</span>
                  </span>
                </div>
              </div>

              {/* Content info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#5C5449]">
                    <User className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span className="truncate font-medium">{project.client_name}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#141210] group-hover:text-[#3A2008] transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-[#5C5449] line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-between text-xs text-[#877D70]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>{formatDate(project.completed_date || undefined)}</span>
                  </span>
                  <span className="text-[#3A2008] flex items-center gap-1 text-[11px] font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox / Modal */}
        {activeModalProject && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs animate-in fade-in"
            onClick={() => setActiveModalProject(null)}
          >
            <div
              className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveModalProject(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#FAF7F2]/90 text-[#141210] hover:bg-[#F4EFE6] border border-[#E5DEC9]"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Main Media Preview */}
              <div className="relative aspect-video w-full bg-[#141210]">
                <img
                  src={activeModalProject.thumbnail_url}
                  alt={activeModalProject.title}
                  className="w-full h-full object-cover"
                />
                {activeModalProject.video_url && (
                  <a
                    href={activeModalProject.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-[#D9A673]" />
                    <span>Watch Video Reel</span>
                  </a>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#A66D35] font-semibold mb-1">
                    <span>{CATEGORY_LABELS[activeModalProject.category]}</span>
                    <span>•</span>
                    <span>{activeModalProject.client_name}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#141210]">
                    {activeModalProject.title}
                  </h3>
                  <p className="text-sm text-[#5C5449] mt-2 leading-relaxed">
                    {activeModalProject.description || "Comprehensive high-resolution media coverage executed under strict technical benchmarks."}
                  </p>
                </div>

                {/* Additional Gallery Preview */}
                {((activeModalProject.gallery_items && activeModalProject.gallery_items.length > 0) ||
                  (activeModalProject.gallery_urls && activeModalProject.gallery_urls.length > 0)) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#5C5449]">
                      Production Gallery Stills
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(activeModalProject.gallery_items && activeModalProject.gallery_items.length > 0
                        ? activeModalProject.gallery_items
                        : activeModalProject.gallery_urls.map((url, idx) => ({
                            id: `g-${idx}`,
                            url,
                            caption: "",
                            alt_text: `${activeModalProject.title} — Gallery ${idx + 1}`,
                            sort_order: idx + 1,
                          }))
                      ).map((item, idx) => (
                        <div key={item.id || idx} className="rounded-xl overflow-hidden border border-[#E5DEC9] bg-[#FAF7F2]">
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={item.url}
                              alt={item.alt_text || `Gallery ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {item.caption && (
                            <div className="px-2.5 py-1.5 text-[11px] text-[#5C5449] border-t border-[#E5DEC9]">
                              {item.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Modal CTA */}
                <div className="pt-4 border-t border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#5C5449]">
                    Completed: {formatDate(activeModalProject.completed_date || undefined)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <Link
                      href="/book/traditional"
                      onClick={() => setActiveModalProject(null)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#3A2008] text-[#FAF7F2] hover:bg-[#5C4028] transition-colors"
                    >
                      <span>Book Photography Session</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`#quote?type=event_coverage&scope=${encodeURIComponent(activeModalProject.title)}`}
                      onClick={() => setActiveModalProject(null)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#F4EFE6] text-[#3A2008] border border-[#D5CCB4] hover:bg-[#E5DEC9] transition-colors"
                    >
                      <span>Custom Quote</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
