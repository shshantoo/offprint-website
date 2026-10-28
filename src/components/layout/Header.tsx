"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ArrowUpRight,
  Calendar,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Book a Session", href: "/book" },
    { label: "Works Archive", href: "/works" },
    { label: "Print & Merch", href: "/print-solutions" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* Main Editorial Navigation */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-200",
          scrolled
            ? "bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E5DEC9] py-3.5 shadow-sm"
            : "bg-[#FAF7F2] border-b border-[#E5DEC9] py-4.5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-[#3A2008] border border-[#5C4028] flex items-center justify-center text-[#FAF7F2] font-bold text-lg shadow-xs group-hover:bg-[#5C4028] transition-colors">
              <span className="font-mono text-[#FAF7F2]">O</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-[#141210]">
                  OFFPRINT
                </span>
                <span className="text-xs font-semibold text-[#3A2008] tracking-wider px-1.5 py-0.5 rounded bg-[#F4EFE6] border border-[#DED6C6]">
                  অফপ্রিন্ট
                </span>
              </div>
              <span className="text-[10px] text-[#655E55] tracking-widest uppercase font-mono">
                Photography &amp; Print Studio
              </span>
            </div>
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
                    "text-sm font-medium transition-colors hover:text-[#141210] relative py-1",
                    isActive ? "text-[#141210] font-semibold" : "text-[#655E55]"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3A2008] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/client-portal"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#3A2008] bg-[#FFFFFF] hover:bg-[#F4EFE6] border border-[#DED6C6] transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>My Bookings</span>
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-[#3A2008] text-[#FAF7F2] hover:bg-[#5C4028] transition-colors shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[#D8B084]" />
              <span>Book a Session</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/book"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#3A2008] text-[#FAF7F2]"
            >
              Book Now
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#141210] hover:bg-[#F4EFE6] border border-[#E5DEC9]"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#FFFFFF] border-b border-[#E5DEC9] px-4 pt-4 pb-6 mt-3 space-y-3 shadow-lg">
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
