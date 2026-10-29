import React from "react";
import type { Metadata } from "next";
import ProductsCatalogClient from "@/components/products/ProductsCatalogClient";
import { fetchPrintProducts } from "@/lib/data-service";
import { Printer, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Physical Print & Merch Solutions • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Explore luxury debossed business cards, optical acrylic frames, VIP corporate swag gift boxes, laser engraved pens, and summit banners in Bangladesh.",
};

export default async function PrintSolutionsPage() {
  const products = await fetchPrintProducts();

  return (
    <div className="py-16 md:py-24 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
            <Printer className="w-3.5 h-3.5" />
            <span>Tactile Merchandise & Print Solutions</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-6xl font-normal text-[#141210] tracking-tight">
            Curated Physical Collateral
          </h1>
          <p className="text-sm sm:text-base text-[#5C5449] leading-relaxed">
            Engineered with high GSM imported cotton stocks, precision fiber laser engraving, and optical-grade acrylic. Crafted exclusively for corporate executives, luxury brands, and high-profile summits in Bangladesh.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-[#5C5449]">
            <span className="flex items-center gap-1.5 bg-[#FFFFFF] px-3.5 py-1.5 rounded-xl border border-[#E5DEC9]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Govt. Reg. Quality Compliant</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[#FFFFFF] px-3.5 py-1.5 rounded-xl border border-[#E5DEC9]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Bespoke Offline Quotation</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[#FFFFFF] px-3.5 py-1.5 rounded-xl border border-[#E5DEC9]">
              <Sparkles className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Custom Brand Foiling & Engraving</span>
            </span>
          </div>
        </div>

        {/* Catalog Grid & Filters */}
        <ProductsCatalogClient initialProducts={products} />
      </div>
    </div>
  );
}
