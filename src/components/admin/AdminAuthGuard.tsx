"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, KeyRound, ShieldCheck, ArrowRight, LogOut, LayoutDashboard, Film, Printer, Home, CheckCircle } from "lucide-react";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

const ADMIN_PASSCODE = "OFFPRINT2026";
const AUTH_STORAGE_KEY = "offprint_admin_session_auth";

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (session === "authorized") {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === ADMIN_PASSCODE) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "authorized");
      setIsAuthenticated(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Invalid administrative passkey. Try: OFFPRINT2026");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
    setPasscode("");
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-xs text-[#a89f91]">
        Verifying administrator session credentials...
      </div>
    );
  }

  // If not authenticated, render login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#141210] border border-[#3d3126] p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#4a2805]/40 border border-[#c98a4b] text-[#c98a4b] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#c98a4b]">
              OFFPRINT • Administrative Gate
            </span>
            <h1 className="text-2xl font-bold text-[#f5f0eb]">
              Operations & CRM Portal
            </h1>
            <p className="text-xs text-[#a89f91]">
              Access restricted to authorized agency producers and executives.
            </p>
          </div>

          {/* Quick Demo Key Notice */}
          <div className="p-3 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-xs text-[#a89f91] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#c98a4b]" />
              <span>Dev Passkey:</span>
            </div>
            <button
              type="button"
              onClick={() => setPasscode("OFFPRINT2026")}
              className="font-mono text-[#c98a4b] bg-[#141210] px-2 py-0.5 rounded border border-[#3d3126] hover:bg-[#1c1815]"
            >
              OFFPRINT2026 (Click to Fill)
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#f5f0eb] block mb-1.5">
                Master Security Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] font-mono tracking-wider"
              />
              {errorMsg && (
                <span className="text-[11px] text-red-400 mt-1 block">{errorMsg}</span>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#c98a4b] text-black hover:bg-[#e5a96b] transition-colors flex items-center justify-center gap-2"
            >
              <span>Unlock Admin Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-[#696257] hover:text-[#a89f91] transition-colors"
            >
              ← Return to live public website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated layout wrapper
  const navTabs = [
    { label: "Leads CRM", href: "/admin/leads", icon: LayoutDashboard },
    { label: "Portfolio Works", href: "/admin/portfolio", icon: Film },
    { label: "Print Merchandise", href: "/admin/products", icon: Printer },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0eb] flex flex-col">
      {/* Top Admin Sub-Navigation Header */}
      <div className="bg-[#141210] border-b border-[#26201b] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin/leads" className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm text-[#f5f0eb]">
                OFFPRINT
              </span>
              <span className="text-[10px] font-mono uppercase bg-[#4a2805] text-[#c98a4b] px-2 py-0.5 rounded border border-[#6e3c08]">
                CRM Studio
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-2">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b]/50"
                        : "text-[#a89f91] hover:text-[#f5f0eb] hover:bg-[#1a1715]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-[#a89f91] hover:text-[#f5f0eb] transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-[#c98a4b]" />
              <span className="hidden md:inline">View Public Site</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#26201b] hover:border-red-800 text-xs text-[#a89f91] hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
