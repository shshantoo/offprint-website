"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  GraduationCap,
  Phone,
  Clock,
} from "lucide-react";
import type { SiteSettingsMap } from "@/lib/data-service";

type GeneralSettings = Partial<SiteSettingsMap["general"]>;

const INITIAL_SETTINGS: GeneralSettings = {
  brand_name_en: "OFFPRINT",
  brand_name_bn: "অফপ্রিন্ট",
  tagline: "Editorial Photography & Fine-Art Print Studio",
  email: "inquiry@offprint.agency",
  phone: "",
  address: "Gulshan & Banani Corporate Corridor, Dhaka, Bangladesh",
  operating_hours_label: "Sunday - Thursday (9:00 AM - 7:00 PM BST) • Saturday (10:00 AM - 6:00 PM BST)",
  instagram_url: "https://instagram.com/offprint.agency",
  facebook_url: "https://facebook.com/offprint.agency",
  linkedin_url: "https://linkedin.com/company/offprint-agency",
  youtube_url: "",
  whatsapp_number: "",
  footer_description:
    "Independent photography studio and fine-art print atelier in Dhaka, Bangladesh. Specializing in IUB Convocation portrait sessions, executive headshots, corporate summits, brand documentaries, and luxury physical print collateral.",
  footer_supporting_text: "Editorial Photography & Print Atelier",
  footer_copyright: "© 2026 OFFPRINT (অফপ্রিন্ট). All rights reserved. Registered under Laws of Bangladesh.",
  show_booking_links: true,
  show_print_links: false,
  show_print_merch_frontend: false,
  show_social_links: true,
};

function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function YoutubeIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
    </svg>
  );
}

export default function Footer() {
  const [settings, setSettings] = useState<GeneralSettings>(INITIAL_SETTINGS);

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const res = await fetch("/api/site-settings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && mounted) {
            setSettings((prev: GeneralSettings) => ({ ...prev, ...json.data }));
          }
        }
      } catch {
        // Fallback to initial defaults silently
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const showBooking = settings.show_booking_links !== false;
  const showPrint = Boolean(
    settings.show_print_merch_frontend ??
      settings.show_print_links ??
      false
  );
  const showSocial = settings.show_social_links !== false;

  return (
    <footer className="bg-[#F4EFE6] border-t border-[#E5DEC9] text-[#655E55] pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Info & Govt Reg */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center">
              <Image
                src="/brand/offprint-black-logo.png"
                alt="OFFPRINT Photography & Print Studio"
                width={150}
                height={42}
                className="h-10 w-auto object-contain"
              />
            </div>

            <p className="text-xs text-[#655E55] leading-relaxed max-w-sm">
              {settings.footer_description ||
                "Independent photography studio and fine-art print atelier in Dhaka, Bangladesh."}
            </p>

            {settings.footer_supporting_text && (
              <div className="flex items-center gap-2 text-xs text-[#141210] font-medium bg-[#FFFFFF] px-3.5 py-2 rounded-lg border border-[#E5DEC9] w-fit">
                <ShieldCheck className="w-4 h-4 text-[#A66D35] shrink-0" />
                <span>{settings.footer_supporting_text}</span>
              </div>
            )}

            {showBooking && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold hover:bg-[#5C4028] transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#D8B084]" />
                  <span>Book a Session</span>
                </Link>
                <Link
                  href="/client-portal"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFFFFF] text-[#3A2008] border border-[#DED6C6] text-xs font-semibold hover:bg-[#FAF7F2] transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Client Portal</span>
                </Link>
              </div>
            )}
          </div>

          {/* Booking & Photography */}
          {showBooking ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#141210]">
                Photography &amp; Booking
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-1.5 font-semibold text-[#3A2008] hover:text-[#A66D35] transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Special Event Booking</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/book/traditional"
                    className="hover:text-[#141210] transition-colors"
                  >
                    Traditional Photography Booking
                  </Link>
                </li>
                <li>
                  <Link
                    href="/works"
                    className="hover:text-[#141210] transition-colors"
                  >
                    Production Works Archive
                  </Link>
                </li>
                <li>
                  <Link
                    href="/client-portal"
                    className="hover:text-[#141210] transition-colors"
                  >
                    Reschedule or Manage Booking
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#quote"
                    className="hover:text-[#141210] transition-colors"
                  >
                    Custom Corporate Quote
                  </Link>
                </li>
              </ul>
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}

          {/* Physical Print & Merch */}
          {showPrint ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#141210]">
                Physical Print &amp; Merch
              </h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link
                    href="/print-solutions"
                    className="hover:text-[#141210] transition-colors"
                  >
                    650 GSM Debossed Business Cards
                  </Link>
                </li>
                <li>
                  <Link
                    href="/print-solutions"
                    className="hover:text-[#141210] transition-colors"
                  >
                    12mm Optical Clear Acrylic Frames
                  </Link>
                </li>
                <li>
                  <Link
                    href="/print-solutions"
                    className="hover:text-[#141210] transition-colors"
                  >
                    Bespoke Corporate Swag Suites
                  </Link>
                </li>
                <li>
                  <Link
                    href="/print-solutions"
                    className="hover:text-[#141210] transition-colors"
                  >
                    Laser Engraved Brass Pens
                  </Link>
                </li>
                <li>
                  <Link
                    href="/print-solutions"
                    className="hover:text-[#141210] transition-colors"
                  >
                    Matte Roll-up Summit Banners
                  </Link>
                </li>
              </ul>
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}

          {/* Contact Desk */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#141210]">
              Direct Studio Desk
            </h4>
            <div className="space-y-2.5 text-xs">
              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2 text-[#3D3730] hover:text-[#3A2008] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#A66D35] shrink-0" />
                  <span className="font-mono">{settings.email}</span>
                </a>
              )}
              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="flex items-center gap-2 text-[#3D3730] hover:text-[#3A2008] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#A66D35] shrink-0" />
                  <span className="font-mono">{settings.phone}</span>
                </a>
              )}
              {settings.address && (
                <div className="flex items-start gap-2 text-[11px] text-[#655E55]">
                  <MapPin className="w-3.5 h-3.5 text-[#A66D35] shrink-0 mt-0.5" />
                  <span>{settings.address}</span>
                </div>
              )}
              {settings.operating_hours_label && (
                <div className="flex items-start gap-2 text-[11px] text-[#8A8175]">
                  <Clock className="w-3.5 h-3.5 text-[#A66D35] shrink-0 mt-0.5" />
                  <span>{settings.operating_hours_label}</span>
                </div>
              )}

              {/* Social Media Links */}
              {showSocial && (
                <div className="pt-2 flex items-center gap-2.5">
                  {settings.instagram_url && (
                    <a
                      href={settings.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-md bg-[#FFFFFF] border border-[#E5DEC9] flex items-center justify-center text-[#5C4028] hover:text-[#141210] hover:border-[#3A2008] transition-colors"
                      aria-label="Instagram"
                    >
                      <InstagramIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {settings.facebook_url && (
                    <a
                      href={settings.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-md bg-[#FFFFFF] border border-[#E5DEC9] flex items-center justify-center text-[#5C4028] hover:text-[#141210] hover:border-[#3A2008] transition-colors"
                      aria-label="Facebook"
                    >
                      <FacebookIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {settings.linkedin_url && (
                    <a
                      href={settings.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-md bg-[#FFFFFF] border border-[#E5DEC9] flex items-center justify-center text-[#5C4028] hover:text-[#141210] hover:border-[#3A2008] transition-colors"
                      aria-label="LinkedIn"
                    >
                      <LinkedinIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {settings.youtube_url && (
                    <a
                      href={settings.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-md bg-[#FFFFFF] border border-[#E5DEC9] flex items-center justify-center text-[#5C4028] hover:text-[#141210] hover:border-[#3A2008] transition-colors"
                      aria-label="YouTube"
                    >
                      <YoutubeIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-8 border-t border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between text-xs text-[#655E55] gap-4">
          <div>
            {settings.footer_copyright ||
              "© 2026 OFFPRINT (অফপ্রিন্ট). All rights reserved. Registered under Laws of Bangladesh."}
          </div>
          <div className="flex items-center gap-6">
            <span>Studio Atelier • Dhaka</span>
            <Link href="/privacy" className="hover:text-[#141210] transition-colors">
              Booking Policy &amp; Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
