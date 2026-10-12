"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PrintProduct, PrintCategory } from "@/types/database";
import { Printer, Sparkles, Layers, Box, Check, ArrowUpRight, Filter, ShieldCheck, X } from "lucide-react";

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
                  ? "bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b] shadow-lg shadow-[#4a2805]/40"
                  : "bg-[#141210] text-[#a89f91] hover:text-[#f5f0eb] border border-[#26201b] hover:border-[#3d3126]"
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
            className="group rounded-3xl bg-[#141210] border border-[#26201b] hover:border-[#c98a4b]/60 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-[#4a2805]/20"
          >
            <div>
              {/* Product Image */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-black/60">
                <img
                  src={prod.image_url}
                  alt={prod.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-transparent to-transparent opacity-80" />

                {/* Trending Badge */}
                {prod.is_trending && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-[#c98a4b] text-black font-bold shadow-md">
                      <Sparkles className="w-3 h-3" />
                      <span>Trending Selection</span>
                    </span>
                  </div>
                )}

                {/* Category Pill */}
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#0a0a0a]/90 backdrop-blur-md text-[#f5f0eb] border border-[#3d3126]">
                    {CATEGORY_MAP[prod.category]}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-[#f5f0eb] group-hover:text-[#c98a4b] transition-colors">
                    {prod.title}
                  </h3>
                  {prod.sample_finish && (
                    <span className="text-xs font-mono text-[#c98a4b] mt-0.5 block">
                      Sample Finish: {prod.sample_finish}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#a89f91]">
                    <Layers className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>Material & Print Specs</span>
                  </div>
                  <p className="text-xs text-[#d4cbbf] leading-relaxed">
                    {prod.material_specs}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-6 pt-0 border-t border-[#26201b] mt-4 flex items-center justify-between gap-4">
              <div className="text-xs text-[#a89f91]">
                <span className="text-[#696257]">MOQ: </span>
                <strong className="text-[#f5f0eb] font-mono">{prod.min_order_qty} units</strong>
              </div>

              <button
                onClick={() => setSelectedProductForModal(prod)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#4a2805] hover:bg-[#c98a4b] text-[#f5f0eb] hover:text-black border border-[#c98a4b]/40 transition-all duration-200"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedProductForModal(null)}
        >
          <div
            className="bg-[#141210] border border-[#3d3126] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProductForModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#0a0a0a] text-[#a89f91] hover:text-white border border-[#26201b]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#c98a4b]">
                Bespoke Order Specification
              </span>
              <h3 className="text-2xl font-bold text-[#f5f0eb]">
                {selectedProductForModal.title}
              </h3>
              <p className="text-xs text-[#a89f91] leading-relaxed">
                {selectedProductForModal.material_specs}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-xs text-[#a89f91] space-y-2">
              <div className="flex justify-between">
                <span>Minimum Order Quantity (MOQ):</span>
                <span className="font-mono text-[#f5f0eb]">{selectedProductForModal.min_order_qty} Units</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Production Turnaround:</span>
                <span className="font-mono text-[#f5f0eb]">5 - 8 Business Days (Dhaka)</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Swatch Inspection:</span>
                <span className="text-[#c98a4b]">Available upon request</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href={`/#quote?type=physical_merch&scope=${encodeURIComponent(
                  `${selectedProductForModal.title} (MOQ: ${selectedProductForModal.min_order_qty})`
                )}`}
                onClick={() => setSelectedProductForModal(null)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#c98a4b] text-black hover:bg-[#e5a96b] transition-colors"
              >
                <span>Proceed to Quote Builder with this Item</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              
              <a
                href="tel:+8801700000000"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-[#a89f91] hover:text-[#f5f0eb] border border-[#26201b] transition-colors"
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
