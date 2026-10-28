"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PrintProduct, PrintCategory } from "@/types/database";
import { Sparkles, Layers, ArrowUpRight, X } from "lucide-react";

interface ProductsCatalogClientProps {
  initialProducts: PrintProduct[];
}

const CATEGORY_MAP: Record<PrintCategory | "all", string> = {
  all: "All Print & Merch",
  cards: "Luxury Cards",
  frames: "Executive Frames",
  corporate_swag: "Corporate Swag Boxes",
  pens: "Engraved Pens",
  banners: "Summit Banners",
};

export default function ProductsCatalogClient({ initialProducts }: ProductsCatalogClientProps) {
  const [selectedCat, setSelectedCat] = useState<PrintCategory | "all">("all");
  const [selectedProductForModal, setSelectedProductForModal] = useState<PrintProduct | null>(null);

  const filtered = initialProducts.filter((p) => {
    if (selectedCat === "all") return true;
    return p.category === selectedCat;
  });

  return (
    <div className="space-y-12">
      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
        {(Object.keys(CATEGORY_MAP) as Array<PrintCategory | "all">).map((cat) => {
          const isSelected = selectedCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                isSelected
                  ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                  : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:border-[#D5CCB4]"
              }`}
            >
              {CATEGORY_MAP[cat]}
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((prod) => (
          <div
            key={prod.id}
            className="group rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg"
          >
            <div>
              {/* Product Image */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-[#F4EFE6]">
                <img
                  src={prod.image_url}
                  alt={prod.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Trending Badge */}
                {prod.is_trending && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-[#3A2008] text-[#FAF7F2] font-bold shadow-sm">
                      <Sparkles className="w-3 h-3 text-[#D9A673]" />
                      <span>Trending Selection</span>
                    </span>
                  </div>
                )}

                {/* Category Pill */}
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FAF7F2]/95 backdrop-blur-xs text-[#3A2008] border border-[#E5DEC9]">
                    {CATEGORY_MAP[prod.category]}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-[#141210] group-hover:text-[#3A2008] transition-colors">
                    {prod.title}
                  </h3>
                  {prod.sample_finish && (
                    <span className="text-xs font-mono text-[#A66D35] mt-0.5 block">
                      Sample Finish: {prod.sample_finish}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#5C5449]">
                    <Layers className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Material & Print Specs</span>
                  </div>
                  <p className="text-xs text-[#141210] leading-relaxed">
                    {prod.material_specs}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-6 pt-4 border-t border-[#E5DEC9] mt-2 flex items-center justify-between gap-4">
              <div className="text-xs text-[#5C5449]">
                <span className="text-[#877D70]">MOQ: </span>
                <strong className="text-[#141210] font-mono">{prod.min_order_qty} units</strong>
              </div>

              <button
                onClick={() => setSelectedProductForModal(prod)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-all duration-200"
              >
                <span>Request Sample / Quote</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quote / Sample Order Modal */}
      {selectedProductForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedProductForModal(null)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProductForModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF7F2] text-[#141210] hover:bg-[#F4EFE6] border border-[#E5DEC9]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                Bespoke Order Specification
              </span>
              <h3 className="text-2xl font-bold text-[#141210]">
                {selectedProductForModal.title}
              </h3>
              <p className="text-xs text-[#5C5449] leading-relaxed">
                {selectedProductForModal.material_specs}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#5C5449] space-y-2">
              <div className="flex justify-between">
                <span>Minimum Order Quantity (MOQ):</span>
                <span className="font-mono font-semibold text-[#141210]">{selectedProductForModal.min_order_qty} Units</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Production Turnaround:</span>
                <span className="font-mono font-semibold text-[#141210]">5 - 8 Business Days (Dhaka)</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Swatch Inspection:</span>
                <span className="text-[#A66D35] font-semibold">Available upon request</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href={`/#quote?type=physical_merch&scope=${encodeURIComponent(
                  `${selectedProductForModal.title} (MOQ: ${selectedProductForModal.min_order_qty})`
                )}`}
                onClick={() => setSelectedProductForModal(null)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#3A2008] text-[#FAF7F2] hover:bg-[#5C4028] transition-colors"
              >
                <span>Proceed to Quote Builder with this Item</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              <a
                href="tel:+8801700000000"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] transition-colors"
              >
                <span>Call Production Manager (+880 1700-000000)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
