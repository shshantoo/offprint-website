"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PortfolioProject, PortfolioCategory } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Sparkles, Play, Eye, X, ArrowUpRight, Calendar, User, ChevronRight } from "lucide-react";

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
    <section className="py-20 bg-[#0a0a0a] relative border-t border-[#26201b]" id="works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#c98a4b]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curated Portfolio</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f5f0eb] tracking-tight">
              Flagship Media Deliverables
            </h2>
            <p className="text-sm text-[#a89f91] max-w-xl">
              From international summits at Dhaka luxury hotels to high-impact brand documentaries, explore our standout media productions.
            </p>
          </div>

          <Link
            href="/works"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#c98a4b] hover:text-[#f5f0eb] transition-colors"
          >
            <span>View Full Archive</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-10 pb-2 overflow-x-auto">
          {(Object.keys(CATEGORY_LABELS) as Array<PortfolioCategory | "all">).map((catKey) => {
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b]/60 shadow-lg shadow-[#4a2805]/40"
                    : "bg-[#141210] text-[#a89f91] hover:text-[#f5f0eb] border border-[#26201b] hover:border-[#3d3126]"
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
              className="group cursor-pointer rounded-2xl bg-[#141210] border border-[#26201b] hover:border-[#c98a4b]/60 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#4a2805]/20 flex flex-col"
            >
              {/* Media Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                <img
                  src={project.thumbnail_url}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />

                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#0a0a0a]/80 backdrop-blur-md text-[#c98a4b] border border-[#3d3126]">
                    {CATEGORY_LABELS[project.category] || project.category}
                  </span>
                </div>

                {/* Flagship Indicator */}
                {project.is_flagship && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#4a2805]/90 text-[#f5f0eb] border border-[#c98a4b]/40">
                      Flagship
                    </span>
                  </div>
                )}

                {/* Quick inspect hover icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#c98a4b] text-black text-xs font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Project</span>
                  </span>
                </div>
              </div>

              {/* Content info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#a89f91]">
                    <User className="w-3 h-3 text-[#c98a4b]" />
                    <span className="truncate">{project.client_name}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#f5f0eb] group-hover:text-[#c98a4b] transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-[#a89f91] line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#26201b] flex items-center justify-between text-xs text-[#696257]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#c98a4b]" />
                    <span>{formatDate(project.completed_date || undefined)}</span>
                  </span>
                  <span className="text-[#c98a4b] flex items-center gap-1 text-[11px] font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox / Modal */}
        {activeModalProject && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
            onClick={() => setActiveModalProject(null)}
          >
            <div
              className="bg-[#141210] border border-[#3d3126] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveModalProject(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#0a0a0a]/80 text-[#a89f91] hover:text-white border border-[#26201b]"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Main Media Preview */}
              <div className="relative aspect-video w-full bg-black">
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
                    className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#4a2805]/90 hover:bg-[#6e3c08] text-white text-xs font-semibold border border-[#c98a4b]/50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-[#c98a4b]" />
                    <span>Watch Video Reel</span>
                  </a>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#c98a4b] font-medium mb-1">
                    <span>{CATEGORY_LABELS[activeModalProject.category]}</span>
                    <span>•</span>
                    <span>{activeModalProject.client_name}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#f5f0eb]">
                    {activeModalProject.title}
                  </h3>
                  <p className="text-sm text-[#a89f91] mt-2 leading-relaxed">
                    {activeModalProject.description || "Comprehensive high-resolution media coverage executed under strict technical benchmarks."}
                  </p>
                </div>

                {/* Additional Gallery Preview */}
                {activeModalProject.gallery_urls && activeModalProject.gallery_urls.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#a89f91]">
                      Production Gallery Stills
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {activeModalProject.gallery_urls.map((url, idx) => (
                        <div key={idx} className="aspect-video rounded-lg overflow-hidden border border-[#26201b]">
                          <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Modal CTA */}
                <div className="pt-4 border-t border-[#26201b] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#696257]">
                    Completed: {formatDate(activeModalProject.completed_date || undefined)}
                  </div>
                  <Link
                    href={`#quote?type=event_coverage&scope=${encodeURIComponent(activeModalProject.title)}`}
                    onClick={() => setActiveModalProject(null)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#c98a4b] text-black hover:bg-[#e5a96b] transition-colors"
                  >
                    <span>Request Similar Project Scope</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
