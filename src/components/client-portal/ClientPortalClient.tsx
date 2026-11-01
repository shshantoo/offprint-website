"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Booking, UserProfile } from "@/types/database";
import { formatDhakaDateTime, isCutoffOpen } from "@/lib/booking/timezone";
import {
  Mail,
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
  Download,
  ExternalLink,
} from "lucide-react";

type AuthStep = "enter_email" | "enter_otp";
type PortalTab = "upcoming" | "completed" | "cancelled" | "profile";

export default function ClientPortalClient() {
  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("enter_email");
  const [activeTab, setActiveTab] = useState<PortalTab>("upcoming");

  // Passwordless Auth fields
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Portal data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workflowStages, setWorkflowStages] = useState<any[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Profile editor state
  const [profName, setProfName] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profCompany, setProfCompany] = useState("");
  const [profStudentId, setProfStudentId] = useState("");
  const [profSaving, setProfSaving] = useState(false);
  const [profSavedMessage, setProfSavedMessage] = useState<string | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const loadPortalData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [bookingsRes, profileRes, stagesRes] = await Promise.all([
        fetch("/api/bookings", { cache: "no-store" }),
        fetch("/api/client/profile", { cache: "no-store" }),
        fetch("/api/workflow-stages", { cache: "no-store" }).catch(() => null),
      ]);

      if (stagesRes && stagesRes.ok) {
        const stagesJson = await stagesRes.json();
        if (stagesJson.success && Array.isArray(stagesJson.data)) {
          setWorkflowStages(stagesJson.data);
        }
      }

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
      (_event: string, session: any) => {
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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Authentication service is temporarily unavailable. Please try again shortly.");
      return;
    }

    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setAuthStep("enter_otp");
      setCooldownSeconds(60);
      setAuthMessage(
        `We have dispatched a 6-digit verification code to ${cleanEmail}. Please enter the code below to access your client portal.`
      );
    } catch (err: any) {
      setAuthError(err?.message || "Failed to send verification code. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    const cleanOtp = otpToken.trim().replace(/\s+/g, "");
    if (!cleanOtp) {
      setAuthError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("Authentication service is temporarily unavailable. Please try again shortly.");
      return;
    }

    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: "email",
      });

      if (error) {
        setAuthError(
          error.message.includes("expired")
            ? "Your verification code has expired. Please request a new one."
            : error.message || "Invalid verification code. Please check and try again."
        );
        return;
      }

      if (data?.user) {
        setUserEmail(data.user.email || email.trim().toLowerCase());
        loadPortalData();
      }
    } catch (err: any) {
      setAuthError(err?.message || "Verification failed. Please try again.");
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
    setBookings([]);
    setProfile(null);
    setAuthStep("enter_email");
    setOtpToken("");
    setAuthError(null);
    setAuthMessage(null);
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

  // Unauthenticated View: Passwordless OTP Access
  if (!userEmail) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-7 sm:p-10 shadow-sm space-y-6">
          <div className="flex justify-center pb-1">
            <Image
              src="/brand/offprint-black-logo.png"
              alt="OFFPRINT"
              width={190}
              height={65}
              className="w-[170px] sm:w-[190px] h-auto object-contain shrink-0"
            />
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>OFFPRINT Passwordless Client Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
              {authStep === "enter_email" ? "Client Portal Sign In" : "Enter Verification Code"}
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
              {authStep === "enter_email"
                ? "Access your upcoming convocation and photography bookings using only your email address. No password required."
                : `Enter the 6-digit one-time passcode sent to ${email}.`}
            </p>
          </div>

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

          {/* STEP 1: Email Input */}
          {authStep === "enter_email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Booking Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
                <p className="text-[11px] text-[#877D70]">
                  Enter the email address used during your photography reservation. We will send a secure one-time verification code.
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors disabled:opacity-50"
              >
                {authLoading ? "Sending Code..." : "Continue with Email"}
              </button>
            </form>
          )}

          {/* STEP 2: OTP Code Verification */}
          {authStep === "enter_otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>6-Digit Verification Code</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep("enter_email");
                      setOtpToken("");
                      setAuthError(null);
                      setAuthMessage(null);
                    }}
                    className="text-xs text-[#A66D35] hover:underline"
                  >
                    Change Email
                  </button>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={8}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder="000000"
                  className="w-full px-4 py-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-center font-mono text-xl tracking-widest text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
                <p className="text-[11px] text-[#877D70] text-center">
                  Verification codes expire after 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading || !otpToken.trim()}
                className="w-full py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] transition-colors disabled:opacity-50"
              >
                {authLoading ? "Verifying..." : "Verify & Enter Portal"}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={cooldownSeconds > 0 || authLoading}
                  onClick={() => handleSendOtp()}
                  className="text-xs font-semibold text-[#3A2008] hover:text-[#A66D35] disabled:opacity-50 disabled:hover:text-[#3A2008]"
                >
                  {cooldownSeconds > 0
                    ? `Resend code in ${cooldownSeconds}s`
                    : "Did not receive code? Resend"}
                </button>
              </div>
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
            Reservation management is currently updating. If you need immediate assistance with an existing booking, please contact our studio at inquiry@offprint.agency.
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

                  {/* Production Workflow Stage Tracker */}
                  {b.status !== "cancelled" && (
                    <div className="pt-2 border-t border-[#E5DEC9] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#877D70] uppercase">
                          Workflow Stage
                        </span>
                        <span className="font-semibold text-[#3A2008]">
                          {b.workflow_stage?.name || (b.status === "completed" ? "Shoot Completed" : "Booking Confirmed")}
                        </span>
                      </div>
                      {(() => {
                        const stageCount = workflowStages.length > 0 ? workflowStages.length : 5;
                        const currentOrder = b.workflow_stage?.sort_order ?? (b.status === "completed" ? 2 : 1);
                        const matchedIdx = workflowStages.length > 0
                          ? workflowStages.findIndex((s) => s.sort_order === currentOrder)
                          : currentOrder - 1;
                        const activeIdx = matchedIdx >= 0 ? matchedIdx : 0;

                        return (
                          <div
                            className="grid gap-1.5"
                            style={{ gridTemplateColumns: `repeat(${stageCount}, minmax(0, 1fr))` }}
                          >
                            {Array.from({ length: stageCount }).map((_, stepIdx) => {
                              const isReached = stepIdx <= activeIdx;
                              const isCurrent = stepIdx === activeIdx;
                              return (
                                <div
                                  key={stepIdx}
                                  className={`h-1.5 rounded-full transition-all ${
                                    isCurrent
                                      ? "bg-[#3A2008]"
                                      : isReached
                                      ? "bg-[#A66D35]"
                                      : "bg-[#E5DEC9]"
                                  }`}
                                  title={`Workflow Stage ${stepIdx + 1}`}
                                />
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Photo-Bank Gallery Card */}
                  {b.delivery_url && (() => {
                    const isExpired = Boolean(
                      b.delivery_expires_at &&
                        new Date(b.delivery_expires_at) <= new Date()
                    );
                    if (isExpired) {
                      return (
                        <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#92400E]">
                              Photo-Bank Gallery Expired
                            </span>
                            <span className="text-[10px] font-mono text-[#92400E]">
                              {formatDhakaDateTime(b.delivery_expires_at!)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#78350F]">
                            The validity period for this gallery has elapsed. To request re-activation, please{" "}
                            <Link
                              href="/contact"
                              className="underline font-semibold hover:text-[#141210]"
                            >
                              contact the studio
                            </Link>.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="p-3.5 rounded-2xl bg-[#EEF7F2] border border-[#2E6B4E]/25 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#2E6B4E] text-[#FFFFFF] flex items-center justify-center shrink-0">
                              <Download className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#2E6B4E]">
                                Photo-Bank Ready
                              </div>
                              {b.delivery_expires_at && (
                                <div className="text-[10px] text-[#2E6B4E]/80 font-mono">
                                  Valid until {formatDhakaDateTime(b.delivery_expires_at)}
                                </div>
                              )}
                            </div>
                          </div>
                          <a
                            href={b.delivery_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2E6B4E] hover:bg-[#23533c] text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
                          >
                            <span>Access Gallery</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {b.delivery_message && (
                          <p className="text-[11px] text-[#2E6B4E]/90 italic bg-white/70 p-2 rounded-xl border border-[#2E6B4E]/10">
                            &ldquo;{b.delivery_message}&rdquo;
                          </p>
                        )}
                      </div>
                    );
                  })()}
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
