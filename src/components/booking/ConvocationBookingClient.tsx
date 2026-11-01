"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InteractiveBookingCalendar from "./InteractiveBookingCalendar";
import type {
  BookingEvent,
  EventSession,
  PhotographyPackage,
  ComputedTimeSlot,
  DayAvailabilitySummary,
  CustomBookingQuestion,
} from "@/types/database";
import {
  GraduationCap,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  Mail,
  Phone,
  BookOpen,
  Users,
  FileText,
  ArrowRight,
  RefreshCw,
  Info,
  Sparkles,
} from "lucide-react";

interface ConvocationAvailabilityPayload {
  success?: boolean;
  schemaReady: boolean;
  error?: string;
  event: BookingEvent | null;
  sessions: EventSession[];
  packages: PhotographyPackage[];
  monthSummary: DayAvailabilitySummary[];
  slotsForDate: ComputedTimeSlot[];
  allEventSlots: ComputedTimeSlot[];
}

interface ConvocationBookingClientProps {
  eventSlug?: string;
}

function getOrCreateFlowToken(): string {
  if (typeof window === "undefined") return "server-flow-token";
  try {
    let token = window.sessionStorage.getItem("offprint_booking_flow_token");
    if (!token) {
      token =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      window.sessionStorage.setItem("offprint_booking_flow_token", token);
    }
    return token;
  } catch {
    return "session-token";
  }
}

export default function ConvocationBookingClient({
  eventSlug = "iub-27th-convocation",
}: ConvocationBookingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConvocationAvailabilityPayload | null>(null);

  // Calendar & Selection state
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ComputedTimeSlot | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  // Temporary Slot Hold State
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState<number>(0);
  const [holdError, setHoldError] = useState<string | null>(null);

  // Optional Frame Printing State
  const [framePrintingSelected, setFramePrintingSelected] = useState<boolean>(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string>("");
  const [frameQuantity, setFrameQuantity] = useState<number>(1);

  // Client Form State
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("+880 ");
  const [companyOrInstitution, setCompanyOrInstitution] = useState("");
  const [studentId, setStudentId] = useState("");
  const [degreeOrDepartment, setDegreeOrDepartment] = useState("");
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [locationPreference, setLocationPreference] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [customFields, setCustomFields] = useState<
    Record<string, string | string[]>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadAvailability = useCallback(
    async (monthStr: string = currentMonth, dateStr: string | null = selectedDate) => {
      try {
        setLoading(true);
        const [yearPart, monthPart] = monthStr.split("-");
        const flowToken = getOrCreateFlowToken();
        const params = new URLSearchParams({
          type: "special",
          slug: eventSlug,
          year: yearPart,
          month: String(Number(monthPart)),
          flow_token: flowToken,
        });
        if (dateStr) {
          params.set("date", dateStr);
        }

        const res = await fetch(`/api/availability?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as ConvocationAvailabilityPayload;
        setData(json);

        const activePkgs = (json.packages || []).filter((p) => p.is_active !== false);
        if (activePkgs.length === 1) {
          setSelectedPackageId(activePkgs[0].id);
        } else if (activePkgs.length > 1 && !selectedPackageId) {
          setSelectedPackageId(activePkgs[0].id);
        }

        if (json.event?.venue && !locationPreference) {
          setLocationPreference(json.event.venue);
        }

        const allOpenSlots = (json.allEventSlots || []).filter(
          (s) => s.state === "available" && s.remaining_capacity > 0
        );

        if (allOpenSlots.length > 0 && !dateStr) {
          const firstDate = allOpenSlots[0].date;
          setSelectedDate(firstDate);
          if (firstDate.slice(0, 7) !== monthStr) {
            setCurrentMonth(firstDate.slice(0, 7));
          }
        } else if (json.sessions && json.sessions.length > 0 && !dateStr) {
          const firstSessionDate = json.sessions[0].session_date;
          setSelectedDate(firstSessionDate);
          if (firstSessionDate.slice(0, 7) !== monthStr) {
            setCurrentMonth(firstSessionDate.slice(0, 7));
          }
        }
      } catch (err) {
        console.error("Failed to fetch special event availability:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentMonth, selectedDate, selectedPackageId, eventSlug, locationPreference]
  );

  useEffect(() => {
    loadAvailability(currentMonth, selectedDate);
  }, [currentMonth, selectedDate, loadAvailability]);

  useEffect(() => {
    if (!data) return;
    setSelectedSlot((prev) => {
      if (!prev) return null;
      const allSlots = data.allEventSlots || data.slotsForDate || [];
      const updated = allSlots.find(
        (s) => s.slot_id === prev.slot_id && s.start_at === prev.start_at
      );
      if (!updated || updated.state !== "available" || updated.remaining_capacity <= 0) {
        return null;
      }
      return updated;
    });
  }, [data]);

  // Hold Countdown Timer Effect
  useEffect(() => {
    if (!holdId || holdRemainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setHoldRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSelectedSlot(null);
          setHoldId(null);
          setHoldError("Your temporary time-slot reservation has expired. Please select a time slot again.");
          loadAvailability(currentMonth, selectedDate);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [holdId, holdRemainingSeconds, currentMonth, selectedDate, loadAvailability]);

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setHoldId(null);
    setHoldRemainingSeconds(0);
    setHoldError(null);
  };

  const handleSelectSlot = async (slot: ComputedTimeSlot) => {
    if (!slot || !slot.slot_id) return;
    if (selectedSlot?.slot_id === slot.slot_id && holdId && holdRemainingSeconds > 0) {
      return;
    }

    setHoldError(null);
    const flowToken = getOrCreateFlowToken();

    try {
      const res = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acquire",
          event_id: event?.id,
          session_id: slot.session_id,
          slot_id: slot.slot_id,
          flow_token: flowToken,
          hold_duration_mins: event?.slot_hold_duration_mins || 5,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setHoldError(
          json.error ||
            "This time slot is temporarily held or fully booked by another visitor. Please select a different slot."
        );
        loadAvailability(currentMonth, selectedDate);
        return;
      }

      setSelectedSlot(slot);
      setHoldId(json.hold_id || null);
      setHoldRemainingSeconds(
        json.remaining_seconds || (event?.slot_hold_duration_mins || 5) * 60
      );
    } catch {
      setSelectedSlot(slot);
    }
  };

  const handleCustomFieldChange = (key: string, value: string | string[]) => {
    setCustomFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggleMultiChoiceOption = (key: string, option: string) => {
    setCustomFields((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const slotsForSelectedDate = (data?.allEventSlots || data?.slotsForDate || []).filter(
    (s) => s.date === selectedDate
  );

  const activePackages = useMemo(() => {
    return (data?.packages || []).filter((p) => p.is_active !== false);
  }, [data?.packages]);

  const selectedPackage =
    activePackages.find((p) => p.id === selectedPackageId) ||
    activePackages[0] ||
    null;
  const event = data?.event || null;
  const isEventBookable = event?.status === "published";

  const customQuestions: CustomBookingQuestion[] = useMemo(() => {
    return Array.isArray(event?.custom_questions)
      ? [...event.custom_questions].sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        )
      : [];
  }, [event]);

  const hasCustomStudentIdQuestion = customQuestions.some(
    (q) => q.key === "student_id"
  );
  const hasCustomDepartmentQuestion = customQuestions.some(
    (q) => q.key === "degree_or_department"
  );

  const displayCustomQuestions = customQuestions.filter((q) => {
    if (q.is_visible === false) return false;
    const key = q.key || q.id;
    if (
      key &&
      [
        "full_name",
        "client_email",
        "client_phone",
        "guests_count",
        "company_or_institution",
      ].includes(key)
    ) {
      return false;
    }
    return true;
  });

  const frameConfig = event?.frame_printing_config || null;
  const activeFrameTypes = useMemo(() => {
    return (
      event?.frame_printing_config?.frame_types?.filter(
        (f) => f.is_active !== false
      ) || []
    );
  }, [event]);

  useEffect(() => {
    if (activeFrameTypes.length > 0 && !selectedFrameId) {
      setSelectedFrameId(activeFrameTypes[0].id);
    }
  }, [activeFrameTypes, selectedFrameId]);

  const isFramePrintingAvailable = Boolean(
    frameConfig?.enabled &&
      activeFrameTypes.length > 0 &&
      selectedPackage?.frame_printing_enabled !== false &&
      (!frameConfig.eligible_package_ids?.length ||
        (selectedPackage?.id &&
          frameConfig.eligible_package_ids.includes(selectedPackage.id)))
  );

  const selectedFrame =
    activeFrameTypes.find((f) => f.id === selectedFrameId) ||
    activeFrameTypes[0] ||
    null;

  const packagePriceNumeric =
    selectedPackage?.price_numeric ||
    (selectedPackage?.price_label
      ? Number(selectedPackage.price_label.replace(/[^0-9]/g, "")) || 0
      : 0);

  const frameTotalPrice =
    framePrintingSelected && selectedFrame
      ? Number(selectedFrame.price) * frameQuantity
      : 0;

  const totalEstimatedPrice = packagePriceNumeric + frameTotalPrice;
  const chosenDuration =
    selectedPackage?.duration_mins ||
    selectedSlot?.duration_mins ||
    event?.default_slot_duration_mins ||
    30;

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!event || !isEventBookable) {
      setSubmitError(
        "This event is not currently open for online reservations."
      );
      return;
    }

    if (!selectedSlot || !selectedSlot.slot_id) {
      setSubmitError(
        "Please select an available date and time slot before confirming."
      );
      return;
    }

    // Client-side validation for required custom questions
    for (const q of customQuestions) {
      if (q.is_visible === false) continue;
      const qKey = q.key || q.id;
      if (!qKey) continue;
      const qType = q.field_type || q.type;
      if (qType === "heading") continue;

      if (
        [
          "full_name",
          "client_email",
          "client_phone",
          "guests_count",
          "company_or_institution",
        ].includes(qKey)
      ) {
        continue;
      }

      const val = customFields[qKey];
      if (q.required) {
        if (qType === "multiple_choice" || qType === "checkbox") {
          if (!Array.isArray(val) || val.length === 0) {
            setSubmitError(`Please select at least one option for "${q.label}".`);
            return;
          }
        } else {
          if (val === undefined || val === null || String(val).trim() === "") {
            setSubmitError(`"${q.label}" is required.`);
            return;
          }
        }
      }

      if (q.validation_regex && typeof val === "string" && val.trim() !== "") {
        try {
          const reg = new RegExp(q.validation_regex);
          if (!reg.test(val.trim())) {
            setSubmitError(
              q.validation_message ||
                `"${q.label}" does not match the required format.`
            );
            return;
          }
        } catch {
          // ignore invalid regex
        }
      }
    }

    const resolvedStudentId =
      typeof customFields.student_id === "string" && customFields.student_id.trim()
        ? customFields.student_id.trim()
        : studentId.trim() || null;

    const resolvedDept =
      typeof customFields.degree_or_department === "string" &&
      customFields.degree_or_department.trim()
        ? customFields.degree_or_department.trim()
        : degreeOrDepartment.trim() || null;

    try {
      setSubmitting(true);
      const slotStartMs = Date.parse(selectedSlot.start_at);
      const computedEndAt = new Date(
        slotStartMs + chosenDuration * 60_000
      ).toISOString();

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_type:
            event.slug === "iub-27th-convocation" ? "convocation" : "special",
          event_id: event.id,
          session_id: selectedSlot.session_id || null,
          slot_id: selectedSlot.slot_id,
          hold_id: holdId || null,
          flow_token: getOrCreateFlowToken(),
          package_id: selectedPackage?.id || null,
          booking_date: selectedSlot.date,
          start_at: selectedSlot.start_at,
          end_at: computedEndAt,
          duration_mins: chosenDuration,
          frame_printing_selected: framePrintingSelected,
          frame_type_id:
            framePrintingSelected && selectedFrame ? selectedFrame.id : null,
          frame_quantity: framePrintingSelected ? frameQuantity : 0,
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          client_phone: clientPhone.trim(),
          company_or_institution: companyOrInstitution.trim() || null,
          student_id: resolvedStudentId,
          degree_or_department: resolvedDept,
          guests_count: Number(guestsCount) || 1,
          location:
            locationPreference.trim() ||
            event.venue ||
            "OFFPRINT Studio, Dhaka",
          client_notes: clientNotes.trim() || null,
          custom_fields: {
            ...customFields,
            full_name: clientName.trim(),
            client_email: clientEmail.trim(),
            client_phone: clientPhone.trim(),
            guests_count: Number(guestsCount) || 1,
            company_or_institution: companyOrInstitution.trim() || null,
            student_id: resolvedStudentId,
            degree_or_department: resolvedDept,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setSubmitError(
          result.error ||
            "Unable to complete reservation. Please re-check slot availability."
        );
        await loadAvailability(currentMonth, selectedDate);
        return;
      }

      setHoldId(null);
      setHoldRemainingSeconds(0);

      const booking = result.data || result.booking;
      router.push(
        `/booking/confirmation?id=${encodeURIComponent(
          booking.id
        )}&ref=${encodeURIComponent(booking.booking_ref)}`
      );
    } catch (err: any) {
      setSubmitError(err?.message || "Network error while creating reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#A66D35] animate-spin mx-auto" />
        <p className="text-sm font-medium text-[#141210]">
          Checking availability &amp; event schedule...
        </p>
      </div>
    );
  }

  if (data && data.schemaReady && !event) {
    return (
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-[#A66D35] mx-auto" />
        <h2 className="text-2xl font-extrabold text-[#141210]">
          Special Booking Event Not Found
        </h2>
        <p className="text-xs sm:text-sm text-[#5C5449] max-w-md mx-auto">
          No special booking event matches the URL slug{" "}
          <code className="font-mono text-[#3A2008]">{eventSlug}</code>.
        </p>
        <div className="pt-2">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
          >
            <span>Return to All Booking Options</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Event Hero / Status Banner */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] overflow-hidden shadow-xs">
        {event?.hero_image_url && (
          <div className="relative h-52 sm:h-64 w-full overflow-hidden bg-[#141210] border-b border-[#E5DEC9]">
            <img
              src={event.hero_image_url}
              alt={event.title}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/70 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#FAF7F2]/95 text-[#3A2008] text-xs font-mono uppercase tracking-wider font-semibold">
                {event.category?.replace(/_/g, " ") || "Special Event"}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#E5DEC9] pb-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
                {event?.category === "convocation" ||
                event?.category === "graduation" ? (
                  <GraduationCap className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  {event?.subtitle ||
                    `${
                      event?.category?.replace(/_/g, " ").toUpperCase() ||
                      "SPECIAL EVENT"
                    } • Live Time-Slot Reservations`}
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#141210] tracking-tight">
                {event?.title || "IUB 27th Convocation Photography"}
              </h1>
              <p className="text-sm sm:text-base text-[#5C5449] leading-relaxed">
                {event?.description}
              </p>
            </div>

            {/* Event Status Pill */}
            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider font-semibold border ${
                  event?.status === "published"
                    ? "bg-[#EEF7F2] text-[#2E6B4E] border-[#2E6B4E]/30"
                    : event?.status === "paused"
                    ? "bg-[#FFFBEB] text-[#B86B19] border-[#B86B19]/30"
                    : "bg-[#F4EFE6] text-[#5C4028] border-[#D5CCB4]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    event?.status === "published"
                      ? "bg-[#2E6B4E]"
                      : "bg-[#B86B19]"
                  }`}
                />
                <span>
                  {event?.status === "published"
                    ? "Bookings Open"
                    : event?.status === "draft"
                    ? "Schedule Being Finalized"
                    : event?.status === "paused"
                    ? "Bookings Temporarily Paused"
                    : event?.status === "closed"
                    ? "Bookings Closed"
                    : "Event Archived"}
                </span>
              </span>

              <button
                type="button"
                onClick={() => loadAvailability(currentMonth, selectedDate)}
                className="inline-flex items-center gap-1.5 text-xs text-[#5C5449] hover:text-[#141210] font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Refresh Live Availability</span>
              </button>
            </div>
          </div>

          {/* Structured Event Info Blocks (Configurable & Dynamic) */}
          {(() => {
            const rawBlocks =
              Array.isArray(event?.info_blocks) && event.info_blocks.length > 0
                ? event.info_blocks
                : [
                    {
                      id: "venue",
                      type: "venue",
                      heading: "Venue & Location",
                      value: event?.venue || "OFFPRINT Studio, Dhaka",
                      is_visible: true,
                    },
                    {
                      id: "sessions",
                      type: "sessions",
                      heading: "Configured Sessions",
                      value:
                        data?.sessions && data.sessions.length > 0
                          ? `${data.sessions.length} Active Session Date${
                              data.sessions.length > 1 ? "s" : ""
                            }`
                          : "Dates Announced Soon",
                      is_visible: true,
                    },
                    {
                      id: "cutoff",
                      type: "cutoff",
                      heading: "Reschedule / Cancel Cutoff",
                      value: event
                        ? `${event.reschedule_cutoff_hours}h Reschedule / ${event.cancellation_cutoff_hours}h Cancel`
                        : "48h Prior Notice",
                      is_visible: true,
                    },
                    {
                      id: "lock",
                      type: "lock",
                      heading: "Timezone & Slot Lock",
                      value: `${event?.timezone || "Asia/Dhaka"} (BST) · ${
                        event?.slot_hold_duration_mins || 5
                      }m Hold Lock`,
                      is_visible: true,
                    },
                  ];

            const visibleBlocks = rawBlocks.filter(
              (b) => (b as any).is_visible !== false
            );

            if (visibleBlocks.length === 0) return null;

            return (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(
                  4,
                  visibleBlocks.length
                )} gap-4`}
              >
                {visibleBlocks.map((b: any, idx: number) => {
                  let liveValue = b.value;
                  let IconComp = Sparkles;
                  if (b.type === "venue") {
                    IconComp = MapPin;
                    liveValue = b.value || event?.venue || "OFFPRINT Studio, Dhaka";
                  } else if (b.type === "sessions") {
                    IconComp = Calendar;
                    liveValue =
                      data?.sessions && data.sessions.length > 0
                        ? `${data.sessions.length} Active Session Date${
                            data.sessions.length > 1 ? "s" : ""
                          }`
                        : "Dates Announced Soon";
                  } else if (b.type === "cutoff") {
                    IconComp = Clock;
                    liveValue =
                      b.value ||
                      (event
                        ? `${event.reschedule_cutoff_hours}h Reschedule / ${event.cancellation_cutoff_hours}h Cancel`
                        : "24h Notice");
                  } else if (b.type === "lock") {
                    IconComp = ShieldCheck;
                    liveValue =
                      b.value ||
                      `${event?.timezone || "Asia/Dhaka"} (BST) · ${
                        event?.slot_hold_duration_mins || 5
                      }m Hold Lock`;
                  }

                  return (
                    <div
                      key={b.id || idx}
                      className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
                        <IconComp className="w-3.5 h-3.5 text-[#A66D35]" />
                        <span>{b.heading}</span>
                      </div>
                      <div className="text-sm font-bold text-[#141210]">
                        {liveValue}
                      </div>
                      {b.description && (
                        <p className="text-[11px] text-[#5C5449] leading-relaxed">
                          {b.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Integrated Single Package Display (When Exactly 1 Package is Configured) */}
          {activePackages.length === 1 && (
            <div className="p-6 rounded-3xl bg-[#F4EFE6] border border-[#3A2008]/20 space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D5CCB4] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A66D35] font-semibold">
                    Included Photography Package
                  </span>
                  <h3 className="text-xl font-bold text-[#141210]">
                    {activePackages[0].name}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#5C5449] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E5DEC9]">
                    {activePackages[0].duration_mins} mins session
                  </span>
                  <span className="text-2xl font-extrabold text-[#3A2008] font-mono">
                    {activePackages[0].price_label}
                  </span>
                </div>
              </div>

              {activePackages[0].description && (
                <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
                  {activePackages[0].description}
                </p>
              )}

              {activePackages[0].deliverables &&
                activePackages[0].deliverables.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activePackages[0].deliverables.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210] font-medium"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#A66D35] shrink-0" />
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>
                )}
            </div>
          )}

          {event?.instructions && (
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#5C5449] space-y-1">
              <div className="font-bold text-[#141210]">
                Session Preparation &amp; Instructions:
              </div>
              <p className="leading-relaxed">{event.instructions}</p>
              {event.booking_restrictions && (
                <p className="text-[11px] text-[#3A2008] font-medium pt-1">
                  Eligibility / Restrictions: {event.booking_restrictions}
                </p>
              )}
            </div>
          )}

          {/* Non-published event notice */}
          {event && event.status !== "published" && (
            <div className="p-5 rounded-2xl bg-[#F4EFE6] border border-[#D5CCB4] flex items-start gap-3">
              <Info className="w-5 h-5 text-[#3A2008] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm text-[#5C5449]">
                <p className="font-bold text-[#141210]">
                  {event.status === "draft"
                    ? `The "${event.title}" schedule is currently in pre-release configuration.`
                    : `This event is currently marked as "${event.status}" and is not accepting public reservations.`}
                </p>
                <p>
                  You can review the event details below or{" "}
                  <Link
                    href="/book/traditional"
                    className="text-[#3A2008] font-semibold underline"
                  >
                    book a Traditional Photography Session
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 1: Event Packages (Only rendered when 2 or more packages are configured) */}
      {activePackages.length >= 2 && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                Step 1 • Photography Package
              </span>
              <h2 className="text-2xl font-bold text-[#141210]">
                Select Your Event Portrait Package
              </h2>
            </div>
            <span className="text-xs text-[#5C5449]">
              All packages include high-resolution color-graded gallery delivery
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activePackages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`cursor-pointer rounded-3xl p-6 flex flex-col justify-between border transition-all ${
                    isSelected
                      ? "bg-[#F4EFE6] border-2 border-[#3A2008] shadow-md"
                      : "bg-[#FFFFFF] border-[#E5DEC9] hover:border-[#A66D35]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-[#141210]">
                          {pkg.name}
                        </h3>
                        <span className="text-xs font-mono text-[#A66D35]">
                          {pkg.duration_mins} mins session
                        </span>
                      </div>
                      {pkg.is_featured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#3A2008] text-[#FAF7F2] text-[10px] font-mono uppercase">
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="text-2xl font-extrabold text-[#3A2008] font-mono">
                      {pkg.price_label}
                    </div>

                    {pkg.description && (
                      <p className="text-xs text-[#5C5449] leading-relaxed">
                        {pkg.description}
                      </p>
                    )}

                    {pkg.deliverables && pkg.deliverables.length > 0 && (
                      <ul className="space-y-1.5 pt-2 border-t border-[#E5DEC9]">
                        {pkg.deliverables.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-[#141210]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#A66D35] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-5 mt-5 border-t border-[#E5DEC9] flex items-center justify-between text-xs font-semibold">
                    <span
                      className={isSelected ? "text-[#3A2008]" : "text-[#5C5449]"}
                    >
                      {isSelected ? "Selected Package" : "Click to Select"}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-[#3A2008] bg-[#3A2008]"
                          : "border-[#D5CCB4]"
                      }`}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FAF7F2]" />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1.5: Optional Archival Frame Printing Add-on */}
      {isFramePrintingAvailable && (
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                Optional Production Upgrade
              </span>
              <h2 className="text-2xl font-bold text-[#141210]">
                {frameConfig?.title || "Archival Frame Printing"}
              </h2>
              <p className="text-xs sm:text-sm text-[#5C5449] mt-0.5">
                {frameConfig?.description ||
                  "Museum-grade framing and photographic print production"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono text-[#3A2008] self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Direct Studio Print &amp; Mount</span>
            </span>
          </div>

          {/* Toggle between Photography Only vs Photography + Frame */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFramePrintingSelected(false)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                !framePrintingSelected
                  ? "bg-[#F4EFE6] border-2 border-[#3A2008] shadow-xs"
                  : "bg-[#FAF7F2] border-[#E5DEC9] hover:border-[#A66D35]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#141210]">
                  Photography Session Only
                </span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    !framePrintingSelected
                      ? "border-[#3A2008] bg-[#3A2008]"
                      : "border-[#D5CCB4]"
                  }`}
                >
                  {!framePrintingSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FAF7F2]" />
                  )}
                </span>
              </div>
              <p className="text-xs text-[#5C5449] mt-1">
                Color-graded high-resolution digital gallery delivery only.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFramePrintingSelected(true)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                framePrintingSelected
                  ? "bg-[#F4EFE6] border-2 border-[#3A2008] shadow-xs"
                  : "bg-[#FAF7F2] border-[#E5DEC9] hover:border-[#A66D35]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#141210]">
                    Photography + Archival Frame
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#A66D35] text-[#FAF7F2] text-[10px] font-mono uppercase font-semibold">
                    Recommended
                  </span>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    framePrintingSelected
                      ? "border-[#3A2008] bg-[#3A2008]"
                      : "border-[#D5CCB4]"
                  }`}
                >
                  {framePrintingSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FAF7F2]" />
                  )}
                </span>
              </div>
              <p className="text-xs text-[#5C5449] mt-1">
                Includes your choice of custom-crafted wooden or metallic frame
                with museum glass.
              </p>
            </button>
          </div>

          {/* Sub-selector for Frame Types & Quantity when selected */}
          {framePrintingSelected && (
            <div className="pt-4 border-t border-[#E5DEC9] space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#3A2008] font-mono">
                Select Your Frame Size &amp; Style:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeFrameTypes.map((frame) => {
                  const isFramePicked = selectedFrameId === frame.id;
                  return (
                    <div
                      key={frame.id}
                      onClick={() => setSelectedFrameId(frame.id)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isFramePicked
                          ? "bg-[#FFFFFF] border-2 border-[#3A2008] shadow-md ring-1 ring-[#3A2008]"
                          : "bg-[#FAF7F2] border-[#E5DEC9] hover:border-[#A66D35]"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-[#141210]">
                            {frame.name}
                          </h4>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              isFramePicked
                                ? "border-[#3A2008] bg-[#3A2008]"
                                : "border-[#D5CCB4]"
                            }`}
                          >
                            {isFramePicked && (
                              <span className="w-1 h-1 rounded-full bg-[#FAF7F2]" />
                            )}
                          </span>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#EFE9DF] text-[11px] font-mono text-[#5C5449]">
                          {frame.dimensions}
                        </span>
                        {frame.description && (
                          <p className="text-xs text-[#5C5449] leading-relaxed">
                            {frame.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-[#E5DEC9] flex items-center justify-between">
                        <span className="text-xs text-[#5C5449]">
                          Add-on Price:
                        </span>
                        <span className="text-sm font-extrabold font-mono text-[#3A2008]">
                          + BDT {Number(frame.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quantity Stepper & Instructions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9]">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[#141210]">
                    Frame Print Quantity
                  </div>
                  <div className="text-[11px] text-[#5C5449]">
                    Maximum {frameConfig?.max_quantity || 5} framed prints per
                    photography session reservation.
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFrameQuantity((q) => Math.max(1, q - 1))}
                    disabled={frameQuantity <= 1}
                    className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] flex items-center justify-center text-sm font-bold disabled:opacity-40 hover:bg-[#EFE9DF]"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-sm text-[#141210]">
                    {frameQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFrameQuantity((q) =>
                        Math.min(frameConfig?.max_quantity || 5, q + 1)
                      )
                    }
                    disabled={frameQuantity >= (frameConfig?.max_quantity || 5)}
                    className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] flex items-center justify-center text-sm font-bold disabled:opacity-40 hover:bg-[#EFE9DF]"
                  >
                    +
                  </button>
                </div>
              </div>

              {frameConfig?.instructions && (
                <div className="p-3.5 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-[11px] text-[#5C5449] leading-relaxed">
                  <strong className="text-[#3A2008]">
                    Turnaround &amp; Fulfillment:
                  </strong>{" "}
                  {frameConfig.instructions}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2 & 3: Interactive Calendar + Dynamic Booking Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
              {activePackages.length >= 2
                ? "Step 2 • Date & Time Slot Selection"
                : "Step 1 • Date & Time Slot Selection"}
            </span>
            <h2 className="text-2xl font-bold text-[#141210]">
              Choose Your Event Date &amp; Time Slot
            </h2>
          </div>

          {/* Temporary Slot Reservation Countdown Banner */}
          {selectedSlot && holdRemainingSeconds > 0 && (
            <div className="p-4 rounded-2xl bg-[#3A2008] text-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-[#5C4028] animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#5C4028] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#D9A673] animate-pulse" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                    <span>Time Slot Temporarily Reserved</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
                  </div>
                  <p className="text-[11px] text-[#E5DEC9]">
                    Reserved for you ({selectedSlot.start_time_label} – {selectedSlot.end_time_label}). Please complete your details before the timer runs out.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#141210]/60 px-3.5 py-2 rounded-xl border border-[#D9A673]/30 shrink-0 self-start sm:self-auto">
                <span className="text-[10px] uppercase font-mono text-[#D9A673] font-semibold tracking-wider">
                  Time Left:
                </span>
                <span className="font-mono text-base font-extrabold text-[#FAF7F2]">
                  {String(Math.floor(holdRemainingSeconds / 60)).padStart(2, "0")}:
                  {String(holdRemainingSeconds % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
          )}

          {holdError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Slot Hold Notice</p>
                <p>{holdError}</p>
              </div>
            </div>
          )}

          <InteractiveBookingCalendar
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            monthSummary={data?.monthSummary || []}
            slotsForSelectedDate={slotsForSelectedDate}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSelectSlot}
            loading={loading}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
              {activePackages.length >= 2
                ? "Step 3 • Participant Details & Confirmation"
                : "Step 2 • Participant Details & Confirmation"}
            </span>
            <h2 className="text-2xl font-bold text-[#141210]">
              Complete Your Reservation
            </h2>
          </div>

          {/* Booking Summary Card */}
          <div className="rounded-3xl bg-[#F4EFE6] border border-[#D5CCB4] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D5CCB4] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#3A2008] font-mono">
                Reservation Summary
              </h3>
              <span className="text-[11px] font-mono text-[#5C5449]">
                {event?.timezone || "Asia/Dhaka"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-[#5C5449]">Event:</span>
                <span className="font-semibold text-[#141210] text-right">
                  {event?.title}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-[#5C5449]">Selected Package:</span>
                <span className="font-semibold text-[#141210] text-right">
                  {selectedPackage
                    ? `${selectedPackage.name} (${selectedPackage.price_label})`
                    : "Standard Event Session"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-[#5C5449]">Date &amp; Slot (BST):</span>
                <span className="font-mono font-semibold text-[#3A2008] text-right">
                  {selectedSlot
                    ? `${selectedSlot.date} • ${selectedSlot.start_time_label} – ${selectedSlot.end_time_label}`
                    : "Select a slot on the calendar"}
                </span>
              </div>

              {selectedSlot && (
                <div className="flex justify-between gap-4">
                  <span className="text-[#5C5449]">Duration &amp; Capacity:</span>
                  <span className="font-mono text-[#141210] text-right">
                    {chosenDuration}m (
                    {selectedSlot.remaining_capacity} spot
                    {selectedSlot.remaining_capacity === 1 ? "" : "s"} remaining)
                  </span>
                </div>
              )}

              {/* Dynamic Live Price Breakdown */}
              <div className="pt-2.5 border-t border-[#D5CCB4] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5C5449]">Package Base Price:</span>
                  <span className="font-mono font-bold text-[#141210]">
                    BDT {packagePriceNumeric.toLocaleString()}
                  </span>
                </div>

                {framePrintingSelected && selectedFrame && (
                  <div className="flex justify-between text-xs text-[#A66D35]">
                    <span>
                      Frame Add-on ({frameQuantity}x {selectedFrame.dimensions}):
                    </span>
                    <span className="font-mono font-bold">
                      + BDT {frameTotalPrice.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-[#3A2008] pt-1.5 border-t border-[#D5CCB4]">
                  <span>Total Investment:</span>
                  <span className="font-mono">
                    BDT {totalEstimatedPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D5CCB4] text-[11px] text-[#5C5449] leading-relaxed">
              <strong className="text-[#141210]">Policy:</strong>{" "}
              {event?.cancellation_policy ||
                "Free rescheduling or cancellation prior to your session window via the Client Portal."}
            </div>
          </div>

          {/* Client & Custom Questions Form */}
          <form
            onSubmit={handleSubmitBooking}
            className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-7 shadow-2xs space-y-4"
          >
            {submitError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Nafisa Rahman"
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
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Mobile Phone *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+880 1711-000000"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono focus:outline-none focus:border-[#3A2008]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Participants / Guests Count</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={guestsCount}
                  onChange={(e) =>
                    setGuestsCount(parseInt(e.target.value, 10) || 1)
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>University / Organization</span>
                </label>
                <input
                  type="text"
                  value={companyOrInstitution}
                  onChange={(e) => setCompanyOrInstitution(e.target.value)}
                  placeholder="e.g., Independent University, Bangladesh"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>
            </div>

            {/* Fallback Student ID & Department fields only if custom_questions doesn't already define them */}
            {!hasCustomStudentIdQuestion &&
              (event?.category === "convocation" ||
                event?.category === "graduation" ||
                eventSlug === "iub-27th-convocation") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210]">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g., 2021456"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono"
                  />
                </div>
              )}

            {!hasCustomDepartmentQuestion &&
              (event?.category === "convocation" ||
                event?.category === "graduation" ||
                eventSlug === "iub-27th-convocation") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210]">
                    Department / Academic Program
                  </label>
                  <input
                    type="text"
                    value={degreeOrDepartment}
                    onChange={(e) => setDegreeOrDepartment(e.target.value)}
                    placeholder="e.g., BBA Finance / CSE"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
                  />
                </div>
              )}

            {/* Dynamic Custom Questions Configured by Administrator */}
            {displayCustomQuestions.length > 0 && (
              <div className="pt-2 border-t border-[#E5DEC9] space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35] font-semibold">
                  Event-Specific Questions
                </div>

                {displayCustomQuestions.map((q) => {
                  const qKey = q.key || q.id;
                  if (!qKey) return null;
                  const qType = q.field_type || q.type || "short_text";
                  const val = customFields[qKey];

                  if (qType === "heading") {
                    return (
                      <div
                        key={q.id || qKey}
                        className="pt-3 pb-1 border-t border-[#E5DEC9] first:border-t-0 first:pt-0"
                      >
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A66D35]">
                          {q.label}
                        </h4>
                        {q.description && (
                          <p className="text-[11px] text-[#5C5449] mt-0.5">
                            {q.description}
                          </p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={q.id || qKey} className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#141210] block">
                        {q.label} {q.required && <span className="text-red-600">*</span>}
                      </label>
                      {q.description && (
                        <p className="text-[11px] text-[#5C5449]">{q.description}</p>
                      )}

                      {qType === "short_text" && (
                        <input
                          type="text"
                          required={q.required}
                          minLength={q.min_length ?? undefined}
                          maxLength={q.max_length ?? undefined}
                          placeholder={q.placeholder || ""}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            handleCustomFieldChange(qKey, e.target.value)
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                        />
                      )}

                      {qType === "email" && (
                        <input
                          type="email"
                          required={q.required}
                          placeholder={q.placeholder || "you@example.com"}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            handleCustomFieldChange(qKey, e.target.value)
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                        />
                      )}

                      {qType === "phone" && (
                        <input
                          type="tel"
                          required={q.required}
                          placeholder={q.placeholder || "+880 1711-000000"}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            handleCustomFieldChange(qKey, e.target.value)
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono focus:outline-none focus:border-[#3A2008]"
                        />
                      )}

                      {qType === "number" && (
                        <input
                          type="number"
                          required={q.required}
                          min={q.min_value ?? undefined}
                          max={q.max_value ?? undefined}
                          placeholder={q.placeholder || ""}
                          value={val !== undefined ? String(val) : ""}
                          onChange={(e) =>
                            handleCustomFieldChange(qKey, e.target.value)
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] font-mono focus:outline-none focus:border-[#3A2008]"
                        />
                      )}

                      {qType === "date" && (
                        <input
                          type="date"
                          required={q.required}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            handleCustomFieldChange(qKey, e.target.value)
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                        />
                      )}

                      {qType === "long_text" && (
                        <textarea
                          rows={3}
                          required={q.required}
                          minLength={q.min_length || undefined}
                          maxLength={q.max_length || undefined}
                          placeholder={q.placeholder || ""}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            handleCustomFieldChange(qKey, e.target.value)
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                        />
                      )}

                      {qType === "dropdown" && (
                        <select
                          required={q.required}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) =>
                            handleCustomFieldChange(qKey, e.target.value)
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                        >
                          <option value="">Select an option...</option>
                          {(q.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {(qType === "single_choice" || qType === "radio") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.options || []).map((opt) => {
                            const selected = val === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleCustomFieldChange(qKey, opt)}
                                className={`px-3.5 py-2 rounded-xl border text-left text-xs font-medium transition-all ${
                                  selected
                                    ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008]"
                                    : "bg-[#FAF7F2] text-[#141210] border-[#E5DEC9] hover:border-[#A66D35]"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {(qType === "multiple_choice" || qType === "checkbox") && (
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {(q.options || []).map((opt) => {
                            const checked =
                              Array.isArray(val) && val.includes(opt);
                            return (
                              <label
                                key={opt}
                                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border cursor-pointer text-xs transition-all ${
                                  checked
                                    ? "bg-[#F4EFE6] border-[#3A2008] text-[#141210] font-semibold"
                                    : "bg-[#FAF7F2] border-[#E5DEC9] text-[#5C5449]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    handleToggleMultiChoiceOption(qKey, opt)
                                  }
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Preferred Meeting Point / Venue Location</span>
              </label>
              <input
                type="text"
                value={locationPreference}
                onChange={(e) => setLocationPreference(e.target.value)}
                placeholder={event?.venue || "OFFPRINT Studio / Campus Booth"}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Additional Requests or Notes</span>
              </label>
              <textarea
                rows={2}
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Optional notes for our photography team..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !isEventBookable || !selectedSlot}
              className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {submitting
                  ? "Reserving Slot..."
                  : !isEventBookable
                  ? "Bookings Not Open for This Event"
                  : !selectedSlot
                  ? "Select an Available Time Slot Above"
                  : "Confirm Event Reservation"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
