"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Menu, X, ArrowUpRight, Camera, Printer, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Works", href: "/works" },
    { label: "Services", href: "/#services" },
    { label: "Print & Merch", href: "/print-solutions" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* Top Govt Trust Banner Bar */}
      <div className="bg-[#141210] border-b border-[#26201b] text-xs text-[#a89f91] py-1.5 px-4 tracking-wide">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c98a4b]" />
            <span className="font-medium text-[#f5f0eb]">Govt. Reg. Entity in Bangladesh</span>
            <span className="text-[#696257]">•</span>
            <span className="hidden sm:inline">50+ Delivered Summits & Corporate Projects</span>
            <span className="sm:hidden">50+ Projects</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hidden md:inline text-[#a89f91]">Est. Sep 2025 • Dhaka Hub</span>
            <Link
              href="/admin/leads"
              className="flex items-center gap-1 text-[#a89f91] hover:text-[#c98a4b] transition-colors"
            >
              <Lock className="w-3 h-3 text-[#c98a4b]" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Navigation */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#26201b] py-3 shadow-2xl shadow-black/60"
            : "bg-[#0a0a0a]/70 backdrop-blur-sm border-b border-[#26201b]/60 py-4.5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-[#4a2805] to-[#141210] border border-[#3d3126] flex items-center justify-center text-[#f5f0eb] font-bold text-lg shadow-inner group-hover:border-[#c98a4b] transition-all">
              <span className="font-mono text-[#c98a4b]">O</span>
              <div className="absolute inset-0 rounded-lg bg-[#c98a4b]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-lg text-[#f5f0eb] group-hover:text-white transition-colors">
                  OFFPRINT
                </span>
                <span className="text-xs font-medium text-[#c98a4b] tracking-wider px-1.5 py-0.5 rounded bg-[#4a2805]/40 border border-[#6e3c08]/50">
                  অফপ্রিন্ট
                </span>
              </div>
              <span className="text-[10px] text-[#a89f91] tracking-widest uppercase font-mono">
                Media & Print Solutions
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-all hover:text-[#f5f0eb] relative py-1",
                    isActive ? "text-[#f5f0eb]" : "text-[#a89f91]"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c98a4b] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/#quote"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-[#4a2805] to-[#6e3c08] text-[#f5f0eb] hover:from-[#6e3c08] hover:to-[#c98a4b] hover:text-black border border-[#c98a4b]/40 shadow-lg shadow-black/40 hover:shadow-[#c98a4b]/20 transition-all duration-300"
            >
              <span>Request Quote</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/#quote"
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b]/30"
            >
              Quote
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#a89f91] hover:text-[#f5f0eb] hover:bg-[#141210] border border-[#26201b]"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0e0c0a] border-b border-[#26201b] px-4 pt-4 pb-6 mt-3 space-y-3">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[#a89f91] hover:text-[#f5f0eb] hover:bg-[#141210] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="pt-3 border-t border-[#26201b] flex flex-col gap-2">
              <Link
                href="/#quote"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-[#c98a4b] text-black"
              >
                Request Bespoke Quote
              </Link>
              <Link
                href="/admin/leads"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs text-[#a89f91] flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-[#c98a4b]" />
                <span>Admin CRM Portal</span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
