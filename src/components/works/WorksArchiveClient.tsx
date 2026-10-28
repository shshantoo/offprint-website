"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PortfolioProject, PortfolioCategory } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Play, X, ArrowUpRight, Calendar, User, Search } from "lucide-react";

interface WorksArchiveClientProps {
  initialProjects: PortfolioProject[];
}

const CATEGORY_MAP: Record<PortfolioCategory | "all", string> = {
  all: "All Productions",
  corporate_summit: "Corporate Summits",
  documentary: "Brand Documentaries",
  headshot: "Executive Headshots",
  workshop: "Workshops & Forums",
  wedding: "Seasonal Weddings",
};

export default function WorksArchiveClient({ initialProjects }: WorksArchiveClientProps) {
  const [selectedCat, setSelectedCat] = useState<PortfolioCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalProject, setActiveModalProject] = useState<PortfolioProject | null>(null);

  const filtered = initialProjects.filter((p) => {
    const matchesCat = selectedCat === "all" || p.category === selectedCat;
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-10">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] shadow-2xs">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(Object.keys(CATEGORY_MAP) as Array<PortfolioCategory | "all">).map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-2xs"
                    : "bg-[#FAF7F2] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
                }`}
              >
                {CATEGORY_MAP[cat]}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#877D70] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210] focus:outline-none focus:border-[#3A2008]"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#5C5449] space-y-2 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
          <p className="text-sm">No production records match your search.</p>
          <button
            onClick={() => {
              setSelectedCat("all");
              setSearchQuery("");
            }}
            className="text-xs text-[#3A2008] font-semibold underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              onClick={() => setActiveModalProject(proj)}
              className="group cursor-pointer rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-[#F4EFE6]">
                <img
                  src={proj.thumbnail_url}
                  alt={proj.cover_alt_text || proj.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FAF7F2]/95 backdrop-blur-xs text-[#3A2008] border border-[#E5DEC9]">
                    {CATEGORY_MAP[proj.category]}
                  </span>
                </div>

                {proj.is_flagship && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#3A2008] text-[#FAF7F2]">
                      Flagship
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#5C5449] mb-1">
                    <User className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span className="truncate font-medium">{proj.client_name}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#141210] group-hover:text-[#3A2008] transition-colors line-clamp-1">
                    {proj.title}
                  </h3>
                  {proj.description && (
                    <p className="text-xs text-[#5C5449] line-clamp-2 mt-1 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-between text-xs text-[#877D70]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>{formatDate(proj.completed_date || undefined)}</span>
                  </span>
                  <span className="text-[#3A2008] text-[11px] font-semibold flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {activeModalProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveModalProject(null)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModalProject(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#FAF7F2]/90 text-[#141210] hover:bg-[#F4EFE6] border border-[#E5DEC9]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative aspect-video w-full bg-[#141210]">
              <img
                src={activeModalProject.thumbnail_url}
                alt={activeModalProject.cover_alt_text || activeModalProject.title}
                className="w-full h-full object-cover"
              />
              {activeModalProject.video_url && (
                <a
                  href={activeModalProject.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-[#D9A673]" />
                  <span>Watch Video Reel</span>
                </a>
              )}
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#A66D35] font-semibold mb-1">
                  <span>{CATEGORY_MAP[activeModalProject.category]}</span>
                  <span>•</span>
                  <span>{activeModalProject.client_name}</span>
                </div>
                <h3 className="text-2xl font-bold text-[#141210]">
                  {activeModalProject.title}
                </h3>
                {activeModalProject.cover_caption && (
                  <p className="text-xs italic text-[#877D70] mt-1">
                    {activeModalProject.cover_caption}
                  </p>
                )}
                <p className="text-sm text-[#5C5449] mt-2 leading-relaxed">
                  {activeModalProject.description || "Comprehensive high-resolution media coverage executed under strict technical benchmarks."}
                </p>
              </div>

              {((activeModalProject.gallery_items && activeModalProject.gallery_items.length > 0) ||
                (activeModalProject.gallery_urls && activeModalProject.gallery_urls.length > 0)) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[#5C5449]">
                    Production Gallery Stills
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                      <div key={item.id || idx} className="rounded-xl overflow-hidden border border-[#E5DEC9] bg-[#FAF7F2] flex flex-col">
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
                    <span>Book a Session</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/#quote?type=event_coverage&scope=${encodeURIComponent(activeModalProject.title)}`}
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
  );
}
