"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PortfolioProject, PortfolioCategory } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Film, Play, Eye, X, ArrowUpRight, Calendar, User, Search } from "lucide-react";

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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#141210] border border-[#26201b]">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(Object.keys(CATEGORY_MAP) as Array<PortfolioCategory | "all">).map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b] shadow-md"
                    : "bg-[#0a0a0a] text-[#a89f91] hover:text-[#f5f0eb] border border-[#26201b]"
                }`}
              >
                {CATEGORY_MAP[cat]}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#a89f91] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#26201b] text-xs text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#a89f91] space-y-2">
          <p className="text-sm">No production records match your search.</p>
          <button
            onClick={() => {
              setSelectedCat("all");
              setSearchQuery("");
            }}
            className="text-xs text-[#c98a4b] underline"
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
              className="group cursor-pointer rounded-2xl bg-[#141210] border border-[#26201b] hover:border-[#c98a4b]/60 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-[#4a2805]/20"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                <img
                  src={proj.thumbnail_url}
                  alt={proj.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />

                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#0a0a0a]/80 backdrop-blur-md text-[#c98a4b] border border-[#3d3126]">
                    {CATEGORY_MAP[proj.category]}
                  </span>
                </div>

                {proj.is_flagship && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#4a2805]/90 text-[#f5f0eb] border border-[#c98a4b]/40">
                      Flagship
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#a89f91] mb-1">
                    <User className="w-3 h-3 text-[#c98a4b]" />
                    <span className="truncate">{proj.client_name}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#f5f0eb] group-hover:text-[#c98a4b] transition-colors line-clamp-1">
                    {proj.title}
                  </h3>
                  {proj.description && (
                    <p className="text-xs text-[#a89f91] line-clamp-2 mt-1 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#26201b] flex items-center justify-between text-xs text-[#696257]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#c98a4b]" />
                    <span>{formatDate(proj.completed_date || undefined)}</span>
                  </span>
                  <span className="text-[#c98a4b] text-[11px] font-medium flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3 h-3" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setActiveModalProject(null)}
        >
          <div
            className="bg-[#141210] border border-[#3d3126] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModalProject(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#0a0a0a]/80 text-[#a89f91] hover:text-white border border-[#26201b]"
            >
              <X className="w-4 h-4" />
            </button>

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

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#c98a4b] font-medium mb-1">
                  <span>{CATEGORY_MAP[activeModalProject.category]}</span>
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

              <div className="pt-4 border-t border-[#26201b] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#696257]">
                  Completed: {formatDate(activeModalProject.completed_date || undefined)}
                </div>
                <Link
                  href={`/#quote?type=event_coverage&scope=${encodeURIComponent(activeModalProject.title)}`}
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
  );
}
