import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import WorksArchiveClient from "@/components/works/WorksArchiveClient";
import { fetchEventArchives } from "@/lib/data-service";
import { Film, Calendar, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Works Archive • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Explore photography event archives, academic convocations, executive portraits, and cultural brand visual stories in Bangladesh.",
};

export default async function WorksPage() {
  const eventArchives = await fetchEventArchives({ includeUnpublished: false });

  return (
    <div className="py-16 md:py-24 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
              <Film className="w-3.5 h-3.5" />
              <span>Curated Photographic Archive</span>
            </div>
            <h1 className="font-editorial text-4xl sm:text-6xl font-normal text-[#141210] tracking-tight">
              Production Archive
            </h1>
            <p className="text-sm sm:text-base text-[#5C5449] leading-relaxed">
              Every academic convocation, summit, documentary, and portrait series captured by OFFPRINT represents a benchmark in technical precision and narrative clarity.
            </p>
          </div>

          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors self-start md:self-auto"
          >
            <Calendar className="w-4 h-4 text-[#D9A673]" />
            <span>Book a Session</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <WorksArchiveClient initialEventArchives={eventArchives} />
      </div>
    </div>
  );
}
