"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import InteractiveBookingCalendar from "@/components/booking/InteractiveBookingCalendar";
import {
  Booking,
  BookingStatusHistory,
  ComputedTimeSlot,
  DayAvailabilitySummary,
} from "@/types/database";
import { checkPolicyDeadline, formatDhakaDateTime } from "@/lib/booking/timezone";
import {
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  ShieldCheck,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Download,
  ExternalLink,
} from "lucide-react";

interface BookingDetailClientProps {
  bookingId: string;
}

export default function BookingDetailClient({ bookingId }: BookingDetailClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [history, setHistory] = useState<BookingStatusHistory[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);

  // Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Reschedule state
  const [availLoading, setAvailLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ComputedTimeSlot | null>(null);
  const [computedSlots, setComputedSlots] = useState<ComputedTimeSlot[]>([]);
  const [monthSummary, setMonthSummary] = useState<DayAvailabilitySummary[]>([]);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Unable to load booking details.");
        return;
      }
      const data = json.data || json;
      setBooking(data.booking);
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
    async function fetchStages() {
      try {
        const res = await fetch("/api/workflow-stages");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setPipelineStages(json.data);
          }
        }
      } catch {
        // fallback to defaults
      }
    }
    fetchStages();
  }, [loadBooking]);

  const loadRescheduleAvailability = useCallback(
    async (b: Booking, monthStr: string, dateStr: string | null) => {
      try {
        setAvailLoading(true);
        const [yearPart, monthPart] = monthStr.split("-");
        const params = new URLSearchParams({
          type: b.booking_type,
          year: yearPart,
          month: String(Number(monthPart)),
          excludeBookingId: b.id,
        });

        if (b.booking_type === "convocation") {
          params.set("slug", "iub-27th-convocation");
          if (b.event_id) params.set("eventId", b.event_id);
        } else if (b.service_id) {
          params.set("serviceId", b.service_id);
          params.set("durationMins", String(b.duration_mins || 60));
        }

        if (dateStr) {
          params.set("date", dateStr);
        }

        const res = await fetch(`/api/availability?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const summaryList: DayAvailabilitySummary[] = json.monthSummary || [];
        setMonthSummary(summaryList);

        const slotsList: ComputedTimeSlot[] =
          b.booking_type === "convocation"
            ? json.allEventSlots || json.slotsForDate || []
            : json.slotsForDate || [];
        setComputedSlots(slotsList);

        const openDates = summaryList
          .filter((d) => d.status === "available")
          .map((d) => d.date)
          .sort();
        if (openDates.length > 0 && !dateStr) {
          setSelectedDate(openDates[0]);
        }
      } catch (err) {
        console.error("Failed to fetch reschedule availability:", err);
      } finally {
        setAvailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (showRescheduleModal && booking) {
      loadRescheduleAvailability(booking, currentMonth, selectedDate);
    }
  }, [
    showRescheduleModal,
    booking,
    currentMonth,
    selectedDate,
    loadRescheduleAvailability,
  ]);

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !selectedSlot) return;

    setActionFeedback(null);
    try {
      setActionSubmitting(true);
      const res = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          new_slot_id: selectedSlot.slot_id || null,
          new_date: selectedSlot.date,
          new_start_at: selectedSlot.start_at,
          new_end_at: selectedSlot.end_at,
          reason:
            rescheduleReason.trim() || "Client requested reschedule via portal",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setActionFeedback({
          type: "error",
          text: json.error || "Unable to reschedule booking.",
        });
        return;
      }

      setShowRescheduleModal(false);
      setSelectedSlot(null);
      setRescheduleReason("");
      setActionFeedback({
        type: "success",
        text: "Your booking has been rescheduled and a confirmation email has been queued.",
      });
      await loadBooking();
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        text: err?.message || "Network error while rescheduling.",
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setActionFeedback(null);
    try {
      setActionSubmitting(true);
      const res = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: cancelReason.trim() || "Cancelled by client via portal",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setActionFeedback({
          type: "error",
          text: json.error || "Unable to cancel booking.",
        });
        return;
      }

      setShowCancelModal(false);
      setActionFeedback({
        type: "success",
        text: "Your booking has been cancelled and its time slot has been released.",
      });
      await loadBooking();
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        text: err?.message || "Network error while cancelling.",
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#A66D35] animate-spin mx-auto" />
        <p className="text-sm text-[#5C5449]">Loading booking record...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-10 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-[#B86B19] mx-auto" />
        <h2 className="text-xl font-bold text-[#141210]">
          {error || "Booking Not Found"}
        </h2>
        <p className="text-xs text-[#5C5449]">
          Please ensure you are signed in to the Client Portal with the email address associated with this booking.
        </p>
        <Link
          href="/client-portal"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Client Portal</span>
        </Link>
      </div>
    );
  }

  const isActive =
    booking.status === "confirmed" ||
    booking.status === "pending" ||
    booking.status === "rescheduled";
  const rescheduleCheck = checkPolicyDeadline(
    booking.start_at,
    booking.reschedule_cutoff_hours ?? 24
  );
  const cancelCheck = checkPolicyDeadline(
    booking.start_at,
    booking.cancellation_cutoff_hours ?? 24
  );
  const canReschedule = isActive && rescheduleCheck.allowed;
  const canCancel = isActive && cancelCheck.allowed;
  const slotsForSelectedDate = computedSlots.filter(
    (s) => s.date === selectedDate
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/client-portal"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5C4028] hover:text-[#141210]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Client Portal</span>
        </Link>

        <button
          type="button"
          onClick={loadBooking}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5449] hover:text-[#141210]"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#A66D35]" />
          <span>Refresh Status</span>
        </button>
      </div>

      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
            actionFeedback.type === "success"
              ? "bg-[#EEF7F2] border-[#2E6B4E]/30 text-[#2E6B4E]"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* Main Booking Card */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-10 shadow-xs space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5DEC9] pb-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm font-extrabold px-3.5 py-1 rounded-xl bg-[#F4EFE6] border border-[#D5CCB4] text-[#3A2008]">
                {booking.booking_ref}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono uppercase font-semibold ${
                  booking.status === "confirmed" || booking.status === "rescheduled"
                    ? "bg-[#EEF7F2] text-[#2E6B4E]"
                    : booking.status === "completed"
                    ? "bg-[#F4EFE6] text-[#3A2008]"
                    : booking.status === "cancelled"
                    ? "bg-red-50 text-red-700"
                    : "bg-[#FFFBEB] text-[#B86B19]"
                }`}
              >
                {booking.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141210] pt-1">
              {booking.service_or_event_title}
            </h1>
            {booking.package_name && (
              <p className="text-sm font-medium text-[#5C4028]">
                Package: {booking.package_name}
                {booking.package_price_label
                  ? ` • ${booking.package_price_label}`
                  : ""}
              </p>
            )}
          </div>

          {/* Self-service Action Buttons */}
          {isActive && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!canReschedule}
                onClick={() => {
                  setActionFeedback(null);
                  setShowRescheduleModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#D9A673]" />
                <span>Reschedule Slot</span>
              </button>

              <button
                type="button"
                disabled={!canCancel}
                onClick={() => {
                  setActionFeedback(null);
                  setShowCancelModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FAF7F2] hover:bg-red-50 text-red-700 border border-red-200 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Booking</span>
              </button>
            </div>
          )}
        </div>

        {/* Production Workflow Progression */}
        {booking.status !== "cancelled" && (() => {
          const stepsToRender = pipelineStages.length > 0
            ? pipelineStages.map((s, idx) => ({
                order: idx + 1,
                sort_order: s.sort_order,
                name: s.name,
                desc: s.client_facing_description || s.description || "",
                color: s.color,
              }))
            : [
                { order: 1, sort_order: 1, name: "Booking Received", desc: "Reserved & scheduled" },
                { order: 2, sort_order: 2, name: "Photos Sorted", desc: "Session wrap & cull" },
                { order: 3, sort_order: 3, name: "Color Grading", desc: "Retouching in studio" },
                { order: 4, sort_order: 4, name: "Print Review", desc: "Final quality check" },
                { order: 5, sort_order: 5, name: "Gallery Delivered", desc: "High-res downloads" },
              ];

          const currentSortOrder =
            booking.workflow_stage?.sort_order ??
            (booking.status === "completed" ? 2 : 1);

          const currentStepIndex = stepsToRender.findIndex(
            (s) => s.sort_order === currentSortOrder
          );
          const activeDisplayIndex =
            currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

          return (
            <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DEC9] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A66D35]">
                    Live Production Tracker
                  </span>
                  <h3 className="text-sm font-bold text-[#141210]">
                    {booking.workflow_stage?.name ||
                      (booking.status === "completed"
                        ? "Shoot Completed & Sorting"
                        : "Booking Confirmed & Scheduled")}
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#5C5449]">
                  Stage {activeDisplayIndex} of {stepsToRender.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                {stepsToRender.map((step, idx) => {
                  const isCompleted = idx < (currentStepIndex >= 0 ? currentStepIndex : 0);
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div
                      key={step.order}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        isCurrent
                          ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008] shadow-sm"
                          : isCompleted
                          ? "bg-[#EEF7F2] text-[#2E6B4E] border-[#2E6B4E]/30"
                          : "bg-[#FFFFFF] text-[#877D70] border-[#E5DEC9] opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold mb-1">
                        <span>Step {idx + 1}</span>
                        {isCompleted && (
                          <CheckCircle2 className="w-3 h-3 text-[#2E6B4E]" />
                        )}
                      </div>
                      <div className="font-bold text-xs truncate">{step.name}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isCurrent
                            ? "text-[#FAF7F2]/80"
                            : isCompleted
                            ? "text-[#2E6B4E]/80"
                            : "text-[#877D70]"
                        }`}
                      >
                        {step.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Photo-Bank Deliverable Gallery Card */}
        {booking.delivery_url &&
          (() => {
            const isExpired = Boolean(
              booking.delivery_expires_at &&
                new Date(booking.delivery_expires_at) <= new Date()
            );

            if (isExpired) {
              return (
                <div className="p-6 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        !
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#92400E]">
                          Photo-Bank Gallery Expired
                        </h4>
                        <p className="text-xs text-[#B45309]">
                          Access ended on{" "}
                          {formatDhakaDateTime(booking.delivery_expires_at!)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#92400E] hover:bg-[#78350F] text-white text-xs font-semibold transition-colors"
                    >
                      <span>Contact Studio for Archival Reactivation</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-xs text-[#78350F] pt-2 border-t border-[#FDE68A]">
                    For security and storage management, client links are active for a scheduled duration. If you did not download all of your photographs or require fresh raw/retouched files, our archive department can generate a renewed link.
                  </p>
                </div>
              );
            }

            return (
              <div className="p-6 rounded-2xl bg-[#EEF7F2] border border-[#2E6B4E]/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2E6B4E] text-[#FFFFFF] flex items-center justify-center shrink-0 shadow-xs">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#2E6B4E] font-bold">
                        Direct Photo-Bank Deliverable
                      </span>
                      <h3 className="text-base font-extrabold text-[#141210]">
                        Your High-Resolution Photos Are Ready
                      </h3>
                      {booking.delivery_expires_at && (
                        <p className="text-xs text-[#2E6B4E] font-medium mt-0.5">
                          Gallery access remains active until{" "}
                          <strong>
                            {formatDhakaDateTime(booking.delivery_expires_at)}
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <a
                    href={booking.delivery_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#2E6B4E] hover:bg-[#23533c] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Access Private Photo-Bank</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {booking.delivery_message && (
                  <div className="p-3.5 rounded-xl bg-white/80 border border-[#2E6B4E]/20 text-xs text-[#2E6B4E]/90">
                    <span className="font-semibold block mb-0.5 text-[#141210]">
                      Photographer Note:
                    </span>
                    &ldquo;{booking.delivery_message}&rdquo;
                  </div>
                )}
              </div>
            );
          })()}

        {/* Grid of Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
              <Clock className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Scheduled Time (Asia/Dhaka)</span>
            </div>
            <div className="text-sm font-bold text-[#141210]">
              {formatDhakaDateTime(booking.start_at)}
            </div>
            <div className="text-xs text-[#5C5449]">
              Ends: {formatDhakaDateTime(booking.end_at)} ({booking.duration_mins} mins)
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
              <MapPin className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Location / Venue</span>
            </div>
            <div className="text-sm font-bold text-[#141210]">
              {booking.location || "OFFPRINT Studio, Dhaka"}
            </div>
            {booking.student_id && (
              <div className="text-xs text-[#5C5449] font-mono">
                Student ID: {booking.student_id} (Guests: {booking.guests_count})
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
              <User className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Client Information</span>
            </div>
            <div className="text-sm font-bold text-[#141210]">
              {booking.client_name}
            </div>
            <div className="text-xs text-[#5C5449] space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#A66D35]" />
                <span>{booking.client_email}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3 h-3 text-[#A66D35]" />
                <span>{booking.client_phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Deadlines & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[#F4EFE6] border border-[#D5CCB4] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#141210]">
              <ShieldCheck className="w-4 h-4 text-[#A66D35]" />
              <span>Rescheduling & Cancellation Deadlines</span>
            </div>
            <div className="space-y-1 text-[#5C5449]">
              <p>
                <strong>Reschedule Deadline:</strong>{" "}
                {formatDhakaDateTime(rescheduleCheck.deadlineIso)}
                {" — "}
                <span
                  className={
                    canReschedule ? "text-[#2E6B4E] font-semibold" : "text-[#B86B19]"
                  }
                >
                  {canReschedule ? "Eligible" : "Window Closed"}
                </span>
              </p>
              <p>
                <strong>Cancellation Deadline:</strong>{" "}
                {formatDhakaDateTime(cancelCheck.deadlineIso)}
                {" — "}
                <span
                  className={
                    canCancel ? "text-[#2E6B4E] font-semibold" : "text-[#B86B19]"
                  }
                >
                  {canCancel ? "Eligible" : "Window Closed"}
                </span>
              </p>
              <p className="pt-1 text-[11px]">
                Rescheduled count: {booking.rescheduled_count} time(s).
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2 text-xs">
            <div className="font-bold text-[#141210]">
              Session Notes & Instructions
            </div>
            <p className="text-[#5C5449] leading-relaxed">
              {booking.client_notes ||
                "No special instructions recorded for this reservation."}
            </p>
            {booking.cancellation_reason && (
              <p className="text-red-700 font-medium pt-2">
                Cancellation Reason: {booking.cancellation_reason}
              </p>
            )}
          </div>
        </div>

        {/* Status History */}
        {history.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[#E5DEC9]">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#5C5449] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Reservation Activity Log</span>
            </h3>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#141210] uppercase font-mono">
                      {item.previous_status
                        ? `${item.previous_status} → ${item.new_status}`
                        : item.new_status}
                    </span>
                    {item.reason && (
                      <span className="text-[#5C5449] ml-2">
                        — {item.reason}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-[#877D70]">
                    {formatDhakaDateTime(item.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setShowRescheduleModal(false)}
        >
          <div
            className="bg-[#FAF7F2] border border-[#E5DEC9] rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                  Atomic Slot Transfer
                </span>
                <h2 className="text-2xl font-bold text-[#141210]">
                  Reschedule Booking {booking.booking_ref}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="p-2 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <InteractiveBookingCalendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
              }}
              monthSummary={monthSummary}
              slotsForSelectedDate={slotsForSelectedDate}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              loading={availLoading}
            />

            <form
              onSubmit={handleConfirmReschedule}
              className="space-y-4 pt-2 border-t border-[#E5DEC9]"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210]">
                  Reason for Rescheduling (Optional)
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Convocation gown collection time shifted"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-sm text-[#141210]"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#FFFFFF] border border-[#D5CCB4] text-xs font-semibold text-[#141210]"
                >
                  Keep Current Slot
                </button>
                <button
                  type="submit"
                  disabled={!selectedSlot || actionSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
                >
                  {actionSubmitting
                    ? "Transferring Slot..."
                    : selectedSlot
                    ? `Confirm New Slot (${selectedSlot.date} • ${selectedSlot.start_time_label} – ${selectedSlot.end_time_label})`
                    : "Select a New Slot Above"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
              <h2 className="text-xl font-bold text-[#141210]">
                Cancel Reservation {booking.booking_ref}?
              </h2>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-2 rounded-full bg-[#FAF7F2] border border-[#E5DEC9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5C5449] leading-relaxed">
              Cancelling this booking will immediately release your reserved time slot ({formatDhakaDateTime(booking.start_at)}) back to the public calendar and send a cancellation confirmation email.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210]">
                  Reason for Cancellation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please let us know why you need to cancel..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CCB4] text-xs font-semibold text-[#141210]"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
                >
                  {actionSubmitting ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

