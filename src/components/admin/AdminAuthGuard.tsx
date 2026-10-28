"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Home,
  AlertTriangle,
  RefreshCw,
  LayoutDashboard,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

interface AdminMeResponse {
  authenticated: boolean;
  isAdmin: boolean;
  mustChangeCredentials: boolean;
  schemaReady: boolean;
  user: { id: string; email: string | null } | null;
  profile: {
    role: string;
    username?: string | null;
    full_name: string | null;
    must_change_credentials?: boolean;
    credentials_changed_at?: string | null;
  } | null;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [checking, setChecking] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminMeResponse | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // First-login mandatory credential setup states
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSubmitting, setSetupSubmitting] = useState(false);

  const pathname = usePathname();

  const verifyAdminSession = useCallback(async () => {
    try {
      setChecking(true);
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as AdminMeResponse;
        setAdminStatus(json);
        if (json.profile?.username && !newUsername) {
          setNewUsername(json.profile.username);
        }
      } else {
        setAdminStatus({
          authenticated: false,
          isAdmin: false,
          mustChangeCredentials: false,
          schemaReady: true,
          user: null,
          profile: null,
        });
      }
    } catch {
      setAdminStatus({
        authenticated: false,
        isAdmin: false,
        mustChangeCredentials: false,
        schemaReady: true,
        user: null,
        profile: null,
      });
    } finally {
      setChecking(false);
    }
  }, [newUsername]);

  useEffect(() => {
    verifyAdminSession();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      verifyAdminSession();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [verifyAdminSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Invalid administrator username/email or password.");
        return;
      }

      setCurrentPassword(password);
      setPassword("");
      await verifyAdminSession();
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstLoginCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (newPassword !== confirmPassword) {
      setSetupError("Password confirmation does not match your new password.");
      return;
    }

    try {
      setSetupSubmitting(true);
      const res = await fetch("/api/admin/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "first_login",
          username: newUsername.trim(),
          currentPassword: currentPassword || undefined,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSetupError(
          json.error || "Failed to complete mandatory administrator credential setup."
        );
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      await verifyAdminSession();
    } catch (err: any) {
      setSetupError(err?.message || "Failed to update administrator credentials.");
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAdminStatus({
      authenticated: false,
      isAdmin: false,
      mustChangeCredentials: false,
      schemaReady: true,
      user: null,
      profile: null,
    });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-3 text-xs text-[#5C5449]">
        <RefreshCw className="w-6 h-6 text-[#A66D35] animate-spin" />
        <span>Verifying Supabase administrator credentials &amp; role...</span>
      </div>
    );
  }

  // Case 1: Not signed in at all
  if (!adminStatus?.authenticated) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-8 shadow-lg space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#3A2008] text-[#FAF7F2] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#A66D35]">
              OFFPRINT • Executive &amp; Studio Administration
            </span>
            <h1 className="text-2xl font-extrabold text-[#141210]">
              Admin Portal Sign In
            </h1>
            <p className="text-xs text-[#5C5449]">
              Sign in with your administrator username or email address.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Administrator Username or Email</span>
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="username or admin@offprint.agency"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>
                {submitting ? "Verifying Credentials..." : "Sign In to Admin Portal"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#E5DEC9]">
            <Link
              href="/"
              className="text-xs text-[#5C5449] hover:text-[#141210] transition-colors"
            >
              ← Return to public website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Signed in, but user is not granted 'admin' role
  if (!adminStatus.isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-8 shadow-lg space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/40 text-[#B86B19] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#B86B19]">
              Authorization Check
            </span>
            <h1 className="text-2xl font-extrabold text-[#141210]">
              Administrator Role Required
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
              Signed in as{" "}
              <strong className="text-[#141210] font-mono">
                {adminStatus.user?.email}
              </strong>
              . Your account is currently assigned the{" "}
              <code className="font-mono text-[#3A2008]">client</code> role and does
              not have administrator privileges.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2 text-xs">
            <div className="font-bold text-[#141210]">
              How to Provision Your Administrator Account in Supabase SQL Editor:
            </div>
            <p className="text-[#5C5449]">
              Run the provisioning helper in the Supabase SQL Editor to promote your
              account and trigger the mandatory first-login username &amp; password
              setup:
            </p>
            <pre className="p-3 rounded-xl bg-[#141210] text-[#FAF7F2] font-mono text-[11px] overflow-x-auto">
              {`SELECT public.provision_initial_admin('${
                adminStatus.user?.email || "your-email@example.com"
              }', 'admin_setup');`}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={verifyAdminSession}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Check Admin Role</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF7F2] text-[#5C5449] hover:text-red-700 border border-[#E5DEC9] text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Verified Admin User, but Mandatory First-Login Credential Change is Required
  if (adminStatus.mustChangeCredentials) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#3A2008] text-[#FAF7F2] flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#F59E0B]/40 text-[11px] font-mono font-semibold text-[#B86B19] uppercase tracking-wider">
              Mandatory First-Login Security Setup
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-[#141210]">
              Set Your Administrator Username &amp; Password
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
              Welcome,{" "}
              <strong className="text-[#141210] font-mono">
                {adminStatus.user?.email}
              </strong>
              . Before accessing the OFFPRINT Admin Portal, you must set a permanent
              administrator username and update your password.
            </p>
          </div>

          {setupError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{setupError}</span>
            </div>
          )}

          <form onSubmit={handleFirstLoginCredentialSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center justify-between">
                <span>New Administrator Username *</span>
                <span className="text-[11px] font-normal text-[#8A8175]">
                  3–32 chars (letters, numbers, . _ -)
                </span>
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={32}
                placeholder="e.g., sabbir.admin"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center justify-between">
                <span>New Password *</span>
                <span className="text-[11px] font-normal text-[#8A8175]">
                  Min 8 chars, letters &amp; numbers
                </span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Enter strong new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210]">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[11px] text-[#5C5449] space-y-1">
              <div className="font-semibold text-[#141210] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E6B4E]" />
                <span>Atomic Security Verification</span>
              </div>
              <p>
                Your new password is updated directly in Supabase Auth, and your unique
                username is stored in your administrator profile. You will only be
                unlocked once both updates succeed.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold text-[#5C5449] hover:text-red-700"
              >
                Sign Out
              </button>

              <button
                type="submit"
                disabled={setupSubmitting}
                className="flex-1 py-3.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>
                  {setupSubmitting
                    ? "Saving New Credentials..."
                    : "Save Credentials & Enter Portal"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Case 4: Verified Admin User with Completed Credential Setup
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#141210] flex flex-col">
      {/* Top Admin Header */}
      <div className="bg-[#FFFFFF] border-b border-[#E5DEC9] sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/admin-portal" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#3A2008] text-[#FAF7F2] flex items-center justify-center font-mono font-bold text-xs">
                OP
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-sm text-[#141210]">
                  OFFPRINT
                </span>
                <span className="ml-2 text-[10px] font-mono uppercase bg-[#F4EFE6] text-[#3A2008] px-2 py-0.5 rounded border border-[#D5CCB4] font-semibold">
                  Admin Operations &amp; CMS
                </span>
              </div>
            </Link>

            {pathname !== "/admin-portal" && (
              <Link
                href="/admin-portal"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold text-[#3A2008]"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Unified Admin Hub</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#5C5449] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E6B4E]" />
              {adminStatus.profile?.username && (
                <strong className="text-[#141210]">
                  @{adminStatus.profile.username}
                </strong>
              )}
              <span>({adminStatus.user?.email})</span>
            </span>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-medium text-[#5C5449] hover:text-[#141210] transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-[#A66D35]" />
              <span className="hidden sm:inline">Public Site</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] hover:border-red-300 text-xs font-medium text-[#5C5449] hover:text-red-700 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
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
