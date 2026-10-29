"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import InteractiveBookingCalendar from "./InteractiveBookingCalendar";
import {
  PhotographyService,
  PhotographyPackage,
  ComputedTimeSlot,
  DayAvailabilitySummary,
} from "@/types/database";
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Building,
  FileText,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface TraditionalAvailabilityPayload {
  success?: boolean;
  schemaReady: boolean;
  error?: string;
  services: PhotographyService[];
  selectedService: PhotographyService | null;
  packages: PhotographyPackage[];
  monthSummary: DayAvailabilitySummary[];
  slotsForDate: ComputedTimeSlot[];
}

export default function TraditionalBookingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TraditionalAvailabilityPayload | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ComputedTimeSlot | null>(null);

  // Client form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("+880 ");
  const [companyOrInstitution, setCompanyOrInstitution] = useState("");
  const [locationPreference, setLocationPreference] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadAvailability = useCallback(
    async (svcId: string, monthStr: string, dateStr: string | null) => {
      try {
        setLoading(true);
        const [yearPart, monthPart] = monthStr.split("-");
        const params = new URLSearchParams({
          type: "traditional",
          year: yearPart,
          month: String(Number(monthPart)),
        });
        if (svcId) params.set("serviceId", svcId);
        if (dateStr) params.set("date", dateStr);

        const res = await fetch(`/api/availability?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as TraditionalAvailabilityPayload;
        setData(json);

        if (json.selectedService && !svcId) {
          setSelectedServiceId(json.selectedService.id);
        }

        if (json.selectedService) {
          const servicePackages = (json.packages || []).filter(
            (p) => p.service_id === json.selectedService?.id
          );
          if (servicePackages.length > 0) {
            setSelectedPackageId((prev) =>
              servicePackages.some((p) => p.id === prev)
                ? prev
                : servicePackages[0].id
            );
          } else {
            setSelectedPackageId("");
          }

          if (!locationPreference) {
            setLocationPreference(
              json.selectedService.default_location_type === "studio"
                ? "OFFPRINT Studio, Gulshan-2, Dhaka"
                : "Client Location (Dhaka)"
            );
          }
        }

        // Auto-select first available date in the month if none selected
        const availableDates = (json.monthSummary || [])
          .filter((d) => d.status === "available")
          .map((d) => d.date)
          .sort();
        if (availableDates.length > 0 && !dateStr) {
          setSelectedDate(availableDates[0]);
        }
      } catch (err) {
        console.error("Failed to fetch traditional availability:", err);
      } finally {
        setLoading(false);
      }
    },
    [locationPreference]
  );

  useEffect(() => {
    loadAvailability(selectedServiceId, currentMonth, selectedDate);
  }, [selectedServiceId, currentMonth, selectedDate, loadAvailability]);

  // Keep selectedSlot valid when slots refresh
  useEffect(() => {
    if (!data) return;
    setSelectedSlot((prev) => {
      if (!prev) return null;
      const match = (data.slotsForDate || []).find(
        (s) => s.start_at === prev.start_at
      );
      if (!match || match.state !== "available" || match.remaining_capacity <= 0) {
        return null;
      }
      return match;
    });
  }, [data]);

  const activeService =
    data?.selectedService ||
    (data?.services || []).find((s) => s.id === selectedServiceId) ||
    null;

  const servicePackages = (data?.packages || []).filter(
    (p) => p.service_id === activeService?.id
  );

  const selectedPackage =
    servicePackages.find((p) => p.id === selectedPackageId) || null;

  const slotsForSelectedDate = data?.slotsForDate || [];

  const handleServiceChange = (svc: PhotographyService) => {
    setSelectedServiceId(svc.id);
    setSelectedSlot(null);
    setLocationPreference(
      svc.default_location_type === "studio"
        ? "OFFPRINT Studio, Gulshan-2, Dhaka"
        : "Client Venue / On-Location (Dhaka)"
    );
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!activeService) {
      setSubmitError("Please select a photography service.");
      return;
    }

    if (!selectedSlot) {
      setSubmitError(
        "Please select an available date and time slot on the calendar."
      );
      return;
    }

    try {
      setSubmitting(true);
      const durationMins =
        selectedPackage?.duration_mins ||
        selectedSlot.duration_mins ||
        activeService.base_duration_mins;

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_type: "traditional",
          service_id: activeService.id,
          package_id: selectedPackage?.id || null,
          booking_date: selectedSlot.date,
          start_at: selectedSlot.start_at,
          end_at: selectedSlot.end_at,
          duration_mins: durationMins,
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          client_phone: clientPhone.trim(),
          company_or_institution: companyOrInstitution.trim() || null,
          location: locationPreference.trim() || "OFFPRINT Studio, Gulshan-2, Dhaka",
          client_notes: clientNotes.trim() || null,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setSubmitError(
          result.error ||
            "Unable to reserve this slot. It may have just been booked."
        );
        await loadAvailability(selectedServiceId, currentMonth, selectedDate);
        return;
      }

      const booking = result.data || result.booking;
      router.push(
        `/booking/confirmation?id=${encodeURIComponent(
          booking.id
        )}&ref=${encodeURIComponent(booking.booking_ref)}`
      );
    } catch (err: any) {
      setSubmitError(
        err?.message || "Network error while submitting reservation."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Unmigrated Schema Warning */}
      {data && !data.schemaReady && (
        <div className="rounded-3xl bg-[#FFFBEB] border border-[#F59E0B]/40 p-6 sm:p-8 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-[#B86B19] shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#141210]">
              Online Reservations Temporarily Unavailable
            </h3>
            <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
              {data.error ||
                "Online appointment scheduling is temporarily updating. Please contact our studio team directly at inquiry@offprint.agency or try again shortly."}
            </p>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5DEC9] pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
              <Camera className="w-3.5 h-3.5" />
              <span>Studio & On-Location Appointment Scheduling</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#141210] tracking-tight">
              Traditional Photography Booking
            </h1>
            <p className="text-sm sm:text-base text-[#5C5449] leading-relaxed">
              Select a photography service, optional package, and preferred date and time slot. Our live scheduling engine coordinates across studio and convocation calendars to prevent conflicts.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadAvailability(selectedServiceId, currentMonth, selectedDate)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-xs font-semibold text-[#3A2008] border border-[#E5DEC9] self-start lg:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh Availability</span>
          </button>
        </div>

        {/* Step 1: Select Photography Service */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
              Step 1 • Select Photography Service Type
            </span>
            <span className="text-xs text-[#5C5449]">
              Managed dynamically by studio administration
            </span>
          </div>

          {!data?.services || data.services.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FAF7F2] border border-dashed border-[#D5CCB4] text-center text-xs text-[#5C5449]">
              {data?.schemaReady
                ? "No active traditional photography services are currently published."
                : "Photography services are currently being updated. Please check back shortly or contact our desk."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.services.map((svc) => {
                const isSelected = activeService?.id === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleServiceChange(svc)}
                    className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008] shadow-md"
                        : "bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border-[#E5DEC9] hover:border-[#A66D35]"
                    }`}
                  >
                    <div className="space-y-2">
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${
                          isSelected
                            ? "bg-[#5C4028] text-[#D9A673]"
                            : "bg-[#FFFFFF] text-[#A66D35] border border-[#E5DEC9]"
                        }`}
                      >
                        {svc.category}
                      </span>
                      <h3 className="text-base font-bold leading-snug">
                        {svc.name}
                      </h3>
                      {svc.short_description && (
                        <p
                          className={`text-xs line-clamp-3 leading-relaxed ${
                            isSelected ? "text-[#E5DEC9]" : "text-[#5C5449]"
                          }`}
                        >
                          {svc.short_description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-current/10 flex items-center justify-between text-xs font-mono">
                      <span>{svc.base_duration_mins} mins</span>
                      <span className="font-bold uppercase">
                        {svc.default_location_type}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Optional Service Packages */}
        {servicePackages.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[#E5DEC9]">
            <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35] block">
              Step 2 • Choose Package Option for {activeService?.name}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicePackages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-[#F4EFE6] border-2 border-[#3A2008]"
                        : "bg-[#FAF7F2] border-[#E5DEC9] hover:border-[#A66D35]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-[#141210]">
                          {pkg.name}
                        </h4>
                        <span className="text-xs font-mono text-[#A66D35]">
                          Duration: {pkg.duration_mins} mins
                        </span>
                      </div>
                      <div className="text-lg font-extrabold font-mono text-[#3A2008]">
                        {pkg.price_label}
                      </div>
                    </div>

                    {pkg.description && (
                      <p className="text-xs text-[#5C5449]">{pkg.description}</p>
                    )}

                    {pkg.deliverables && pkg.deliverables.length > 0 && (
                      <ul className="space-y-1 pt-2 border-t border-[#E5DEC9]">
                        {pkg.deliverables.map((d, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-1.5 text-xs text-[#141210]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#A66D35] shrink-0" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 3 & 4: Interactive Calendar + Client Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
              Step 3 • Select Preferred Date & Available Time Slot
            </span>
            <h2 className="text-2xl font-bold text-[#141210]">
              Live Studio & Location Availability
            </h2>
          </div>

          <InteractiveBookingCalendar
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSelectedSlot(null);
            }}
            monthSummary={data?.monthSummary || []}
            slotsForSelectedDate={slotsForSelectedDate}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            loading={loading}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
              Step 4 • Client Details & Venue Instructions
            </span>
            <h2 className="text-2xl font-bold text-[#141210]">
              Review & Confirm Booking
            </h2>
          </div>

          {/* Booking Summary Card */}
          <div className="rounded-3xl bg-[#F4EFE6] border border-[#D5CCB4] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D5CCB4] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#3A2008] font-mono">
                Appointment Summary
              </h3>
              <span className="text-[11px] font-mono text-[#5C5449]">
                Asia/Dhaka (BST)
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-[#5C5449]">Service Type:</span>
                <span className="font-semibold text-[#141210] text-right">
                  {activeService?.name || "Select a service"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-[#5C5449]">Selected Package:</span>
                <span className="font-semibold text-[#141210] text-right">
                  {selectedPackage
                    ? `${selectedPackage.name} (${selectedPackage.price_label})`
                    : activeService
                    ? `Standard (${activeService.base_duration_mins}m)`
                    : "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-[#5C5449]">Date & Time (BST):</span>
                <span className="font-mono font-semibold text-[#3A2008] text-right">
                  {selectedSlot
                    ? `${selectedSlot.date} • ${selectedSlot.start_time_label} – ${selectedSlot.end_time_label}`
                    : "Select a slot on the calendar"}
                </span>
              </div>

              {activeService && (
                <div className="flex justify-between gap-4">
                  <span className="text-[#5C5449]">Notice & Buffer Policy:</span>
                  <span className="font-mono text-[#141210] text-right">
                    {activeService.min_notice_hours}h notice •{" "}
                    {activeService.buffer_after_mins}m buffer
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D5CCB4] text-[11px] text-[#5C5449] leading-relaxed">
              <strong className="text-[#141210]">
                Reschedule & Cancellation:
              </strong>{" "}
              Eligible up to {activeService?.reschedule_cutoff_hours || 24} hours
              prior to your appointment via the Client Portal.
            </div>
          </div>

          {/* Client Form */}
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
                <span>Your Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Farhan Karim"
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
                  placeholder="farhan@organization.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Phone Number *</span>
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Company / Institution (Optional)</span>
              </label>
              <input
                type="text"
                value={companyOrInstitution}
                onChange={(e) => setCompanyOrInstitution(e.target.value)}
                placeholder="e.g. Eastern Bank PLC / Personal Family Session"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Session Venue / Location Address *</span>
              </label>
              <input
                type="text"
                required
                value={locationPreference}
                onChange={(e) => setLocationPreference(e.target.value)}
                placeholder="OFFPRINT Studio, Gulshan-2 OR your full venue address"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Additional Requirements & Instructions</span>
              </label>
              <textarea
                rows={3}
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Backdrop preferences, number of executives, lighting requirements, or security gate instructions..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !activeService || !selectedSlot}
              className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-semibold uppercase tracking-widest bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {submitting
                  ? "Reserving Appointment..."
                  : !selectedSlot
                  ? "Select an Available Time Slot Above"
                  : "Confirm Photography Booking"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
