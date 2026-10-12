import React from "react";
import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock, ShieldCheck, Sparkles } from "lucide-react";
import InteractiveQuoteBuilder from "@/components/home/InteractiveQuoteBuilder";

export const metadata: Metadata = {
  title: "Contact & Inquiries • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Direct corporate line and project inquiry desk for OFFPRINT in Dhaka, Bangladesh.",
};

export default function ContactPage() {
  return (
    <div className="py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141210] border border-[#3d3126] text-xs font-mono text-[#c98a4b]">
            <Phone className="w-3.5 h-3.5" />
            <span>Direct Communications Desk</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[#f5f0eb] tracking-tight">
            Connect With Our Desk
          </h1>
          <p className="text-sm sm:text-base text-[#a89f91]">
            Reach out directly for media production dates, material swatch previews, or corporate merchandise volume inquiries.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#141210] border border-[#26201b] hover:border-[#c98a4b]/50 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#26201b] flex items-center justify-center text-[#c98a4b]">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#f5f0eb]">Direct Hotline</h3>
            <p className="text-xs text-[#a89f91]">
              For urgent summit scheduling & executive consultations.
            </p>
            <a
              href="tel:+8801700000000"
              className="text-sm font-mono font-semibold text-[#c98a4b] hover:underline block"
            >
              +880 1700-000000
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-[#141210] border border-[#26201b] hover:border-[#c98a4b]/50 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#26201b] flex items-center justify-center text-[#c98a4b]">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#f5f0eb]">Official Email</h3>
            <p className="text-xs text-[#a89f91]">
              Send RFP documents, project briefs, and brand assets.
            </p>
            <a
              href="mailto:inquiry@offprint.agency"
              className="text-sm font-mono font-semibold text-[#c98a4b] hover:underline block"
            >
              inquiry@offprint.agency
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-[#141210] border border-[#26201b] hover:border-[#c98a4b]/50 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#26201b] flex items-center justify-center text-[#c98a4b]">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#f5f0eb]">Dhaka Headquarters</h3>
            <p className="text-xs text-[#a89f91]">
              Gulshan & Banani Corporate Corridor, Dhaka, Bangladesh.
            </p>
            <div className="text-xs text-[#696257] font-mono">
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
