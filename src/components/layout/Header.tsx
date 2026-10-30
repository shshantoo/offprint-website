"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ArrowUpRight,
  Calendar,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  showPrintMerch?: boolean;
}

export default function Header({ showPrintMerch = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [printVisible, setPrintVisible] = useState(showPrintMerch);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/site-settings")
      .then((res) => res.json())
      .then((json) => {
        if (mounted && json.success && json.data) {
          const isVisible = Boolean(
            json.data.show_print_merch_frontend ??
              json.data.show_print_links ??
              false
          );
          setPrintVisible(isVisible);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const isTransparent = isHome && !scrolled;

  const navLinks = [
    { label: "Book a Session", href: "/book" },
    { label: "Works Archive", href: "/works" },
    ...(printVisible ? [{ label: "Print & Merch", href: "/print-solutions" }] : []),
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* Main Editorial Navigation */}
      <header
        className={cn(
          "w-full transition-all duration-300",
          isTransparent
            ? "absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/75 via-black/35 to-transparent text-[#FAF7F2] py-5 border-transparent"
            : cn(
                "sticky top-0 z-50 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E5DEC9] py-3.5 shadow-xs text-[#141210]",
                isHome && scrolled ? "fixed top-0 left-0 right-0 animate-fadeIn" : ""
              )
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo Only */}
          <Link
            href="/"
            className="flex items-center group transition-transform active:scale-95"
            aria-label="OFFPRINT Photography & Print Studio"
          >
            <Image
              src={isTransparent ? "/brand/offprint-white-logo.png" : "/brand/offprint-black-logo.png"}
              alt="OFFPRINT Photography & Print Studio"
              width={140}
              height={40}
              className="h-9 w-auto object-contain transition-opacity duration-300"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href) && link.href !== "/book") ||
                (link.href === "/book" && pathname === "/book");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors relative py-1",
                    isTransparent
                      ? isActive
                        ? "text-[#FAF7F2] font-semibold"
                        : "text-[#FAF7F2]/80 hover:text-[#FAF7F2]"
                      : isActive
                      ? "text-[#141210] font-semibold"
                      : "text-[#655E55] hover:text-[#141210]"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                        isTransparent ? "bg-[#FAF7F2]" : "bg-[#3A2008]"
                      )}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/client-portal"
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors",
                isTransparent
                  ? "text-[#FAF7F2] bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xs"
                  : "text-[#3A2008] bg-[#FFFFFF] hover:bg-[#F4EFE6] border border-[#DED6C6]"
              )}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>My Bookings</span>
            </Link>
            <Link
              href="/book"
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs",
                isTransparent
                  ? "bg-[#FAF7F2] text-[#141210] hover:bg-white"
                  : "bg-[#3A2008] text-[#FAF7F2] hover:bg-[#5C4028]"
              )}
            >
              <Calendar className={cn("w-3.5 h-3.5", isTransparent ? "text-[#3A2008]" : "text-[#D8B084]")} />
              <span>Book a Session</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/book"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                isTransparent ? "bg-[#FAF7F2] text-[#141210]" : "bg-[#3A2008] text-[#FAF7F2]"
              )}
            >
              Book Now
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                isTransparent
                  ? "text-[#FAF7F2] hover:bg-white/10 border border-white/20"
                  : "text-[#141210] hover:bg-[#F4EFE6] border border-[#E5DEC9]"
              )}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#FFFFFF] border-b border-[#E5DEC9] px-4 pt-4 pb-6 mt-3 space-y-3 shadow-lg text-[#141210]">
            <nav className="flex flex-col space-y-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#3D3730] hover:text-[#141210] hover:bg-[#FAF7F2] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="pt-3 border-t border-[#E5DEC9] flex flex-col gap-2">
              <Link
                href="/book"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-[#3A2008] text-[#FAF7F2]"
              >
                Book a Photography Session
              </Link>
              <Link
                href="/client-portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg text-xs font-semibold text-[#3A2008] bg-[#F4EFE6] border border-[#DED6C6] flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Client Portal (Manage Bookings)</span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
