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
    <div className="py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141210] border border-[#3d3126] text-xs font-mono text-[#c98a4b]">
            <Printer className="w-3.5 h-3.5" />
            <span>Tactile Merchandise & Print Solutions</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#f5f0eb] tracking-tight">
            Curated Physical Collateral
          </h1>
          <p className="text-sm sm:text-base text-[#a89f91] leading-relaxed">
            Engineered with high GSM imported cotton stocks, precision fiber laser engraving, and optical-grade acrylic. Crafted exclusively for corporate executives, luxury brands, and high-profile summits in Bangladesh.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-[#a89f91]">
            <span className="flex items-center gap-1.5 bg-[#141210] px-3 py-1.5 rounded-lg border border-[#26201b]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#c98a4b]" />
              <span>Govt. Reg. Quality Compliant</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[#141210] px-3 py-1.5 rounded-lg border border-[#26201b]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#c98a4b]" />
              <span>Bespoke Offline Quotation</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[#141210] px-3 py-1.5 rounded-lg border border-[#26201b]">
              <Sparkles className="w-3.5 h-3.5 text-[#c98a4b]" />
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
