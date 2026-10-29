"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { EventArchive, EventArchiveCategory } from "@/types/database";
import {
  Calendar,
  Search,
  Sparkles,
  MapPin,
  ChevronRight,
  Building,
} from "lucide-react";

interface WorksArchiveClientProps {
  initialEventArchives: EventArchive[];
  initialCategories?: EventArchiveCategory[];
}

export default function WorksArchiveClient({
  initialEventArchives = [],
  initialCategories = [],
}: WorksArchiveClientProps) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");

  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (urlCategory) {
      setSelectedCat(urlCategory.toLowerCase());
    }
  }, [urlCategory]);

  // Dynamic Categories from Supabase (filtered to active)
  const activeCategories = initialCategories.filter((cat) => cat.is_active !== false);

  // Filtered Event Archives
  const filteredEvents = initialEventArchives.filter((ev) => {
    let matchesCat = selectedCat === "all";
    if (!matchesCat) {
      const target = selectedCat.toLowerCase();
      matchesCat =
        Boolean(ev.category_id && ev.category_id === selectedCat) ||
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
              ev.category_rel.id === selectedCat)
        );
    }

    if (!matchesCat) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.short_description.toLowerCase().includes(q) ||
      (ev.location && ev.location.toLowerCase().includes(q)) ||
      (ev.client_or_institution && ev.client_or_institution.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-10">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] shadow-2xs">
        {/* Dynamic Database Categories */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {/* All Archives Option */}
          <button
            onClick={() => setSelectedCat("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCat === "all"
                ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-2xs"
                : "bg-[#FAF7F2] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:bg-[#FFFFFF]"
            }`}
          >
            <span>All Archives</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedCat === "all"
                  ? "bg-[#5C4028] text-[#FAF7F2]"
                  : "bg-[#E5DEC9] text-[#5C5449]"
              }`}
            >
              {initialEventArchives.length}
            </span>
          </button>

          {/* Database Categories */}
          {activeCategories.map((cat) => {
            const isSelected =
              selectedCat === cat.slug.toLowerCase() ||
              selectedCat === cat.name.toLowerCase() ||
              selectedCat === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.slug.toLowerCase())}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-2xs"
                    : "bg-[#FAF7F2] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:bg-[#FFFFFF]"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-[#5C4028] text-[#FAF7F2]"
                      : "bg-[#E5DEC9] text-[#5C5449]"
                  }`}
                >
                  {cat.archive_count ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#877D70] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by event, client, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210] placeholder-[#877D70] focus:outline-none focus:border-[#3A2008] focus:bg-[#FFFFFF]"
          />
        </div>
      </div>

      {/* CURATED EVENT ARCHIVES (FROM SUPABASE) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#A66D35] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Documented Productions
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141210]">
              Event Archives &amp; Gallery Collections
            </h2>
          </div>
          <span className="text-xs font-mono text-[#877D70]">
            {filteredEvents.length} {filteredEvents.length === 1 ? "Archive" : "Archives"}
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-20 text-[#5C5449] space-y-3 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-8">
            <Sparkles className="w-6 h-6 text-[#A66D35] mx-auto opacity-70" />
            <p className="text-sm font-semibold text-[#141210]">No event archives match your criteria.</p>
            <p className="text-xs text-[#5C5449]">
              Try adjusting your search query or selecting a different category filter.
            </p>
            {(selectedCat !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCat("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs text-[#3A2008] font-bold underline inline-block"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/works/${ev.slug}`}
                className="group flex flex-col justify-between rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] overflow-hidden transition-all duration-300 hover:shadow-xl"
              >
                <div className="space-y-3">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#141210]">
                    {ev.cover_image_url ? (
                      <Image
                        src={ev.cover_image_url}
                        alt={ev.cover_alt_text || ev.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#3A2008]" />
                    )}

                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FAF7F2]/95 backdrop-blur-xs text-[#3A2008] border border-[#E5DEC9] shadow-2xs">
                        {(ev.category_rel?.name || ev.category?.replace(/_/g, " ") || "Convocation").toUpperCase()}
                      </span>
                    </div>

                    {ev.is_featured && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#3A2008] text-[#FAF7F2] shadow-2xs">
                          Featured
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 pt-2 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#877D70]">
                      <span className="flex items-center gap-1 text-[#A66D35]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{ev.event_date}</span>
                      </span>
                      {ev.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="w-3 h-3 text-[#A66D35]" />
                            <span className="truncate">{ev.location}</span>
                          </span>
                        </>
                      )}
                      {ev.client_or_institution && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate max-w-[140px]">
                            <Building className="w-3 h-3 text-[#A66D35]" />
                            <span className="truncate">{ev.client_or_institution}</span>
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-[#141210] group-hover:text-[#3A2008] transition-colors line-clamp-1">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-[#5C5449] line-clamp-2 leading-relaxed">
                      {ev.short_description}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-between text-xs text-[#3A2008] font-bold">
                    <span>View Event Gallery &amp; Highlights</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
