import React from "react";
import type { Metadata } from "next";
import WorksArchiveClient from "@/components/works/WorksArchiveClient";
import { fetchPortfolioProjects } from "@/lib/data-service";
import { Film, Sparkles, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Works Archive • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Explore 50+ delivered media productions across summits, brand documentaries, executive headshots, and corporate forums in Bangladesh.",
};

export default async function WorksPage() {
  const projects = await fetchPortfolioProjects();

  return (
    <div className="py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141210] border border-[#3d3126] text-xs font-mono text-[#c98a4b]">
            <Film className="w-3.5 h-3.5" />
            <span>50+ Delivered Productions</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#f5f0eb] tracking-tight">
            Production Archive
          </h1>
          <p className="text-sm sm:text-base text-[#a89f91] leading-relaxed">
            Every summit, documentary, and portrait series captured by OFFPRINT represents a benchmark in technical precision and narrative clarity.
          </p>
        </div>

        <WorksArchiveClient initialProjects={projects} />
      </div>
    </div>
  );
}
