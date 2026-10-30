import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import ProductsCatalogClient from "@/components/products/ProductsCatalogClient";
import { fetchPrintProducts, fetchSiteSettings } from "@/lib/data-service";
import { Printer, ShieldCheck, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Physical Print & Merch Solutions • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Explore luxury debossed business cards, optical acrylic frames, VIP corporate swag gift boxes, laser engraved pens, and summit banners in Bangladesh.",
};

export default async function PrintSolutionsPage() {
  const [products, siteSettings] = await Promise.all([
    fetchPrintProducts(),
    fetchSiteSettings(),
  ]);

  const showPrintMerch = Boolean(
    siteSettings.general.show_print_merch_frontend ??
      siteSettings.general.show_print_links ??
      false
  );

  if (!showPrintMerch) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center py-24 bg-[#FAF7F2] text-center px-4">
        <div className="max-w-md mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#F4EFE6] border border-[#E5DEC9] flex items-center justify-center mx-auto text-[#A66D35]">
            <Printer className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
              Studio Notice
            </span>
            <h1 className="font-editorial text-2xl sm:text-3xl font-normal text-[#141210]">
              Print &amp; Merchandise Wing Unavailable
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
            Our physical print, debossed stationery, and bespoke swag catalog is currently offline for scheduled curator updates. You may explore our published photography archives or reserve a studio session.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider hover:bg-[#5C4028] transition-colors"
            >
              <span>Explore Works Archive</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D9A673]" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#E5DEC9] text-[#141210] text-xs font-semibold uppercase tracking-wider hover:bg-[#F4EFE6] transition-colors"
            >
              <span>Contact Studio Desk</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
