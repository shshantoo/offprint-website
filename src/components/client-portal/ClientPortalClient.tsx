"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Booking, UserProfile } from "@/types/database";
import { formatDhakaDateTime, isCutoffOpen } from "@/lib/booking/timezone";
import {
  User,
  Mail,
  Lock,
  Phone,
  Building,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

type AuthMode = "signin" | "signup" | "forgot_password" | "update_password";
type PortalTab = "upcoming" | "completed" | "cancelled" | "profile";

export default function ClientPortalClient() {
  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [activeTab, setActiveTab] = useState<PortalTab>("upcoming");

  // Auth form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+880 ");
  const [company, setCompany] = useState("");
  const [studentId, setStudentId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Portal data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schemaReady, setSchemaReady] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Profile editor state
  const [profName, setProfName] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profCompany, setProfCompany] = useState("");
  const [profStudentId, setProfStudentId] = useState("");
  const [profSaving, setProfSaving] = useState(false);
  const [profSavedMessage, setProfSavedMessage] = useState<string | null>(null);

  const loadPortalData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [bookingsRes, profileRes] = await Promise.all([
        fetch("/api/bookings", { cache: "no-store" }),
        fetch("/api/client/profile", { cache: "no-store" }),
      ]);

      const bJson = await bookingsRes.json();
      if (bJson?.code === "SCHEMA_NOT_INSTALLED") {
        setSchemaReady(false);
      } else if (bookingsRes.ok) {
        setBookings(bJson.data || bJson.bookings || []);
        setSchemaReady(true);
      }

      if (profileRes.ok) {
        const pJson = await profileRes.json();
        const prof = pJson.data?.profile || pJson.profile;
        if (prof) {
          setProfile(prof);
          setProfName(prof.full_name || "");
          setProfPhone(prof.phone || "");
          setProfCompany(prof.company_or_institution || "");
          setProfStudentId(prof.student_id || "");
        }
      }
    } catch (err) {
      console.error("Failed to load client portal data:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthChecking(false);
      return;
    }

    supabase.auth.getUser().then(({ data }: { data: any }) => {
      if (data?.user) {
        setUserEmail(data.user.email || null);
        loadPortalData();
      }
      setAuthChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        if (event === "PASSWORD_RECOVERY") {
          setAuthMode("update_password");
        }
        if (session?.user) {
          setUserEmail(session.user.email || null);
          loadPortalData();
        } else {
          setUserEmail(null);
          setBookings([]);
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadPortalData]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Supabase client is not configured.");
      return;
    }

    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
    } catch (err: any) {
      setAuthError(err?.message || "Sign in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Supabase client is not configured.");
      return;
    }

    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            company_or_institution: company.trim() || null,
            student_id: studentId.trim() || null,
          },
        },
      });
      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session) {
        setAuthMessage("Account registered and signed in.");
      } else {
        setAuthMessage(
          "Registration submitted! Please check your email inbox for a confirmation link, or sign in directly if email confirmation is disabled."
        );
      }
    } catch (err: any) {
      setAuthError(err?.message || "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      setAuthLoading(true);
      const redirectTo = `${window.location.origin}/client-portal`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setAuthMessage("Password reset instructions have been sent to your email address.");
    } catch (err: any) {
      setAuthError(err?.message || "Password recovery request failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setAuthMessage("Your password has been updated.");
      setAuthMode("signin");
    } catch (err: any) {
      setAuthError(err?.message || "Failed to update password.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUserEmail(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfSavedMessage(null);
    try {
      setProfSaving(true);
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profName.trim(),
          phone: profPhone.trim(),
          company_or_institution: profCompany.trim() || null,
          student_id: profStudentId.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to update profile.");
        return;
      }
      setProfile(json.data || json.profile);
      setProfSavedMessage("Profile updated successfully.");
    } catch (err: any) {
      alert(err?.message || "Failed to save profile.");
    } finally {
      setProfSaving(false);
    }
  };

  if (authChecking) {
    return (
      <div className="max-w-md mx-auto rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#A66D35] animate-spin mx-auto" />
        <p className="text-sm text-[#5C5449]">Verifying your client session...</p>
      </div>
    );
  }

  // Unauthenticated View (Sign In / Sign Up / Password Recovery)
  if (!userEmail || authMode === "update_password") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-7 sm:p-10 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>OFFPRINT Client Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
              {authMode === "signin"
                ? "Sign In to Manage Bookings"
                : authMode === "signup"
                ? "Create Your Client Account"
                : authMode === "forgot_password"
                ? "Recover Your Password"
                : "Set New Password"}
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5449]">
              {authMode === "signin"
                ? "Access your upcoming convocation and studio sessions, reschedule slots, or review booking references."
                : authMode === "signup"
                ? "Register with the same email address used on your booking to automatically link your reservations."
                : "Enter your account email to receive a secure password reset link."}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          {authMode !== "update_password" && (
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setAuthError(null);
                  setAuthMessage(null);
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  authMode === "signin"
                    ? "bg-[#3A2008] text-[#FAF7F2] shadow-2xs"
                    : "text-[#5C5449] hover:text-[#141210]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError(null);
                  setAuthMessage(null);
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  authMode === "signup"
                    ? "bg-[#3A2008] text-[#FAF7F2] shadow-2xs"
                    : "text-[#5C5449] hover:text-[#141210]"
                }`}
              >
                Register Account
              </button>
            </div>
          )}

          {authError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authMessage && (
            <div className="p-4 rounded-2xl bg-[#EEF7F2] border border-[#2E6B4E]/30 text-xs text-[#2E6B4E] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authMessage}</span>
            </div>
          )}

          {authMode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthMode("forgot_password")}
                    className="text-xs text-[#3A2008] hover:text-[#A66D35] underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors disabled:opacity-50"
              >
                {authLoading ? "Signing In..." : "Sign In to Client Portal"}
              </button>
            </form>
          )}

          {authMode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nafisa Rahman"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Mobile Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711-000000"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono focus:outline-none focus:border-[#3A2008]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Institution / Company</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. IUB"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Student ID (if applicable)</span>
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 2021456"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono focus:outline-none focus:border-[#3A2008]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Create Password (min. 6 characters) *</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors disabled:opacity-50"
              >
                {authLoading ? "Creating Account..." : "Register Client Account"}
              </button>
            </form>
          )}

          {authMode === "forgot_password" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Account Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors"
              >
                {authLoading ? "Sending Recovery Email..." : "Send Password Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className="w-full text-xs text-[#5C5449] hover:text-[#141210] underline"
              >
                Return to Sign In
              </button>
            </form>
          )}

          {authMode === "update_password" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>New Password</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors"
              >
                {authLoading ? "Updating..." : "Save New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Authenticated Client Portal Dashboard
  const upcomingBookings = bookings.filter(
    (b) =>
      b.status === "confirmed" ||
      b.status === "pending" ||
      b.status === "rescheduled"
  );
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  const displayedBookings =
    activeTab === "upcoming"
      ? upcomingBookings
      : activeTab === "completed"
      ? completedBookings
      : cancelledBookings;

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-8 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A66D35]">
            <span>Authenticated Client Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="text-xs text-[#5C5449]">
            Signed in as <strong className="text-[#141210] font-mono">{userEmail}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-[#D9A673]" />
            <span>New Booking</span>
          </Link>

          <button
            type="button"
            onClick={loadPortalData}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-xs font-semibold text-[#141210] border border-[#E5DEC9]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-red-50 text-xs font-semibold text-[#5C5449] hover:text-red-700 border border-[#E5DEC9]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {!schemaReady && (
        <div className="rounded-3xl bg-[#FFFBEB] border border-[#F59E0B]/40 p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B86B19] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-[#5C5449]">
            The Supabase booking tables have not been migrated yet. Run{" "}
            <code className="font-mono text-[#141210]">supabase/schema.sql</code> in the Supabase SQL Editor to store and manage reservations.
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DEC9] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "upcoming"
              ? "bg-[#3A2008] text-[#FAF7F2]"
              : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
          }`}
        >
          Upcoming ({upcomingBookings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "completed"
              ? "bg-[#3A2008] text-[#FAF7F2]"
              : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
          }`}
        >
          Completed ({completedBookings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cancelled")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "cancelled"
              ? "bg-[#3A2008] text-[#FAF7F2]"
              : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
          }`}
        >
          Cancelled ({cancelledBookings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "profile"
              ? "bg-[#3A2008] text-[#FAF7F2]"
              : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
          }`}
        >
          My Profile
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" ? (
        <div className="max-w-2xl rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#141210]">Client Profile Information</h2>
            <p className="text-xs text-[#5C5449]">
              Keep your contact details and academic/company affiliation updated for faster booking check-ins.
            </p>
          </div>

          {profSavedMessage && (
            <div className="p-3.5 rounded-xl bg-[#EEF7F2] border border-[#2E6B4E]/30 text-xs text-[#2E6B4E] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{profSavedMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210]">Full Name *</label>
              <input
                type="text"
                required
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210]">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210]">Student ID</label>
                <input
                  type="text"
                  value={profStudentId}
                  onChange={(e) => setProfStudentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210]">
                Company or Academic Institution
              </label>
              <input
                type="text"
                value={profCompany}
                onChange={(e) => setProfCompany(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
              />
            </div>

            <button
              type="submit"
              disabled={profSaving}
              className="px-6 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              {profSaving ? "Saving Profile..." : "Update Profile"}
            </button>
          </form>
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center space-y-4">
          <Calendar className="w-8 h-8 text-[#A66D35] mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#141210]">
              No {activeTab} bookings found
            </h3>
            <p className="text-xs text-[#5C5449] max-w-md mx-auto">
              {activeTab === "upcoming"
                ? "You do not have any upcoming photography reservations linked to your email yet."
                : `You have no ${activeTab} bookings on record.`}
            </p>
          </div>
          {activeTab === "upcoming" && (
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
            >
              <span>Book a Photography Session</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedBookings.map((b) => {
            const isActiveStatus =
              b.status === "confirmed" ||
              b.status === "pending" ||
              b.status === "rescheduled";
            const canReschedule =
              isActiveStatus &&
              isCutoffOpen(b.start_at, b.reschedule_cutoff_hours ?? 24);
            const canCancel =
              isActiveStatus &&
              isCutoffOpen(b.start_at, b.cancellation_cutoff_hours ?? 24);

            return (
              <div
                key={b.id}
                className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] hover:border-[#A66D35] p-6 flex flex-col justify-between gap-5 shadow-2xs transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-[#3A2008]">
                      {b.booking_ref}
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase font-semibold ${
                        b.status === "confirmed" || b.status === "rescheduled"
                          ? "bg-[#EEF7F2] text-[#2E6B4E]"
                          : b.status === "completed"
                          ? "bg-[#F4EFE6] text-[#3A2008]"
                          : b.status === "cancelled"
                          ? "bg-red-50 text-red-700"
                          : "bg-[#FFFBEB] text-[#B86B19]"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35]">
                      {b.booking_type === "convocation"
                        ? "IUB Convocation Booking"
                        : "Traditional Photography"}
                    </span>
                    <h3 className="text-lg font-bold text-[#141210] mt-0.5">
                      {b.service_or_event_title}
                    </h3>
                    {b.package_name && (
                      <p className="text-xs text-[#5C4028] font-medium mt-0.5">
                        Package: {b.package_name}
                        {b.package_price_label ? ` (${b.package_price_label})` : ""}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-[#5C5449] pt-2 border-t border-[#E5DEC9]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#A66D35] shrink-0" />
                      <span className="font-semibold text-[#141210]">
                        {formatDhakaDateTime(b.start_at)}
                      </span>
                    </div>
                    {b.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#A66D35] shrink-0" />
                        <span>{b.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5DEC9] flex items-center justify-between gap-3">
                  <div className="text-[11px] text-[#877D70]">
                    {isActiveStatus
                      ? canReschedule || canCancel
                        ? "Eligible for online changes"
                        : "Within cutoff window"
                      : `Updated ${formatDhakaDateTime(b.updated_at)}`}
                  </div>

                  <Link
                    href={`/client-portal/bookings/${b.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    <span>Manage Booking</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
