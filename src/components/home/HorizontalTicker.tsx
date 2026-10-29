"use client";

import React from "react";

interface HorizontalTickerProps {
  items?: string[];
  show?: boolean;
}

const DEFAULT_TICKER = [
  "IUB 27TH CONVOCATION APPOINTMENTS",
  "EXECUTIVE & C-SUITE PORTRAITURE",
  "CULTURAL & BRAND DOCUMENTARIES",
  "CORPORATE SUMMITS & PR STILLS",
  "FINE-ART ARCHIVAL PRINTS & FRAMES",
  "STUDIO & ON-LOCATION IN DHAKA",
];

export default function HorizontalTicker({ items, show = true }: HorizontalTickerProps) {
  if (show === false) return null;

  const displayItems = Array.isArray(items) && items.length > 0 ? items : DEFAULT_TICKER;

  return (
    <section
      aria-label="Studio Disciplines and Specialities"
      className="relative w-full overflow-hidden border-y border-[#E5DEC9] bg-[#F4EFE6] py-3.5 select-none"
    >
      <div className="flex w-max items-center animate-marquee">
        {/* Loop 1 */}
        <div className="flex items-center shrink-0">
          {displayItems.map((item, idx) => (
            <div key={`ticker-1-${idx}`} className="flex items-center">
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#3A2008] font-semibold whitespace-nowrap">
                {item}
              </span>
              <span className="mx-6 text-[10px] text-[#A66D35]">◆</span>
            </div>
          ))}
        </div>

        {/* Loop 2 (for seamless loop) */}
        <div className="flex items-center shrink-0" aria-hidden="true">
          {displayItems.map((item, idx) => (
            <div key={`ticker-2-${idx}`} className="flex items-center">
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#3A2008] font-semibold whitespace-nowrap">
                {item}
              </span>
              <span className="mx-6 text-[10px] text-[#A66D35]">◆</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
