import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Calendar, ArrowUpRight } from "lucide-react";
import InteractiveQuoteBuilder from "@/components/home/InteractiveQuoteBuilder";

export const metadata: Metadata = {
  title: "Contact & Inquiries • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Direct corporate line, appointment booking link, and project inquiry desk for OFFPRINT in Dhaka, Bangladesh.",
};

export default function ContactPage() {
  return (
    <div className="py-16 md:py-24 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
            <Phone className="w-3.5 h-3.5" />
            <span>Direct Communications Desk</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-6xl font-normal text-[#141210] tracking-tight">
            Connect With Our Studio
          </h1>
          <p className="text-sm sm:text-base text-[#5C5449]">
            Reach out directly for photography session inquiries, material swatch previews, or corporate merchandise volume quotations.
          </p>
          <div className="pt-2">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#D9A673]" />
              <span>Book an Appointment Slot Online</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#141210]">Direct Hotline</h3>
            <p className="text-xs text-[#5C5449]">
              For urgent summit scheduling & executive consultations.
            </p>
            <a
              href="tel:+8801700000000"
              className="text-sm font-mono font-semibold text-[#3A2008] hover:underline block"
            >
              +880 1700-000000
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#141210]">Official Email</h3>
            <p className="text-xs text-[#5C5449]">
              Send RFP documents, project briefs, and brand assets.
            </p>
            <a
              href="mailto:inquiry@offprint.agency"
              className="text-sm font-mono font-semibold text-[#3A2008] hover:underline block"
            >
              inquiry@offprint.agency
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#3A2008]">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#141210]">Dhaka Headquarters</h3>
            <p className="text-xs text-[#5C5449]">
              Gulshan & Banani Corporate Corridor, Dhaka, Bangladesh.
            </p>
            <div className="text-xs text-[#877D70] font-mono">
              Operating Sun - Thu (9:00 AM - 7:00 PM BST)
            </div>
          </div>
        </div>

        {/* Embedded Inquiry Form */}
        <InteractiveQuoteBuilder />
      </div>
    </div>
  );
}
