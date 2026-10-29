"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookingEvent,
  EventSession,
  PhotographyPackage,
  EventArchive,
} from "@/types/database";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Plus,
  RefreshCw,
  Edit3,
  Copy,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowLeft,
  Sliders,
  Check,
  X,
  Upload,
  Eye,
  BookOpen,
  Search,
} from "lucide-react";

const WEEKDAYS = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

const SPECIAL_EVENT_CATEGORIES = [
  { value: "convocation", label: "University Convocation / Graduation" },
  { value: "corporate", label: "Corporate / Executive Portrait Drive" },
  { value: "festival", label: "Cultural Festival / Concert" },
  { value: "exhibition", label: "Exhibition / Art Fair" },
  { value: "campaign", label: "Brand Campaign / Editorial Pop-Up" },
  { value: "seasonal", label: "Seasonal / Holiday Mini-Sessions" },
  { value: "custom", label: "Custom Special Event" },
];

export default function SpecialEventsAdminClient() {
  const [viewMode, setViewMode] = useState<"list" | "editor">("list");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [_packages, setPackages] = useState<PhotographyPackage[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editor State
  const [editingEvent, setEditingEvent] = useState<Partial<BookingEvent>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [rebuildingSchedule, setRebuildingSchedule] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Break periods builder
  const [newBreakName, setNewBreakName] = useState("");
  const [newBreakStart, setNewBreakStart] = useState("13:00");
  const [newBreakEnd, setNewBreakEnd] = useState("14:00");

  // Single Session Override Modal
  const [editingSessionModal, setEditingSessionModal] = useState<EventSession | null>(null);
  const [savingSessionModal, setSavingSessionModal] = useState(false);

  // Related Event Archives
  const [availableArchives, setAvailableArchives] = useState<EventArchive[]>([]);
  const [relatedArchiveIds, setRelatedArchiveIds] = useState<string[]>([]);
  const [archiveSearch, setArchiveSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, archRes] = await Promise.all([
        fetch("/api/admin/events"),
        fetch("/api/admin/event-archives"),
      ]);
      const json = await res.json();
      if (json.events) setEvents(json.events);
      if (json.sessions) setSessions(json.sessions);
      if (json.slots) setSlots(json.slots);
      if (json.packages) setPackages(json.packages);

      if (archRes.ok) {
        const archJson = await archRes.json();
        if (archJson.success && Array.isArray(archJson.data)) {
          setAvailableArchives(archJson.data);
        }
      }
    } catch (err) {
      console.error("Failed to load events data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartNew = () => {
    setEditingEvent({
      title: "",
      slug: "",
      category: "convocation",
      description: "",
      status: "draft",
      is_booking_enabled: true,
      is_visible_on_booking_page: true,
      is_featured_on_home: false,
      operating_days: [0, 1, 2, 3, 4, 5, 6],
      operating_start_time: "09:00",
      operating_end_time: "18:00",
      default_slot_duration_mins: 30,
      slot_interval_mins: 30,
      default_slot_capacity: 1,
      buffer_before_mins: 0,
      buffer_after_mins: 10,
      cancellation_cutoff_hours: 24,
      reschedule_cutoff_hours: 24,
      cancellation_policy: "Standard cancellation policy applies. Cancellations allowed up to 24 hours before your session.",
      break_periods: [
        { name: "Lunch Break", start_time: "13:00", end_time: "14:00" },
      ],
      custom_questions: [],
      frame_printing_config: {
        enabled: false,
        title: "Archival Frame Printing",
        description: "Preserve your portraits in handcrafted archival frames.",
        max_quantity: 5,
        frame_types: [],
      },
      resource_pool: "primary_studio",
    });
    setRelatedArchiveIds([]);
    setIsFormDirty(false);
    setFeedback(null);
    setViewMode("editor");
  };

  const handleEditEvent = (ev: BookingEvent) => {
    setEditingEvent({
      ...ev,
      operating_days: Array.isArray(ev.operating_days) ? ev.operating_days : [0, 1, 2, 3, 4, 5, 6],
      operating_start_time: ev.operating_start_time || "09:00",
      operating_end_time: ev.operating_end_time || "18:00",
      slot_interval_mins: ev.slot_interval_mins || ev.default_slot_duration_mins || 30,
      break_periods: Array.isArray(ev.break_periods) ? ev.break_periods : [],
    });
    setRelatedArchiveIds([]);
    // Fetch associated event archives
    fetch(`/api/admin/event-associations?bookingEventId=${encodeURIComponent(ev.id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.event_archive_ids) {
          setRelatedArchiveIds(j.data.event_archive_ids);
        }
      })
      .catch(() => setRelatedArchiveIds([]));
    setIsFormDirty(false);
    setFeedback(null);
    setViewMode("editor");
  };

  const handleQuickToggleBooking = async (ev: BookingEvent) => {
    const updatedVal = !(ev.is_booking_enabled ?? true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "event",
          data: {
            ...ev,
            is_booking_enabled: updatedVal,
          },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setEvents((prev) =>
          prev.map((item) =>
            item.id === ev.id ? { ...item, is_booking_enabled: updatedVal } : item
          )
        );
        setFeedback({
          type: "success",
          text: `Booking ${updatedVal ? "Enabled" : "Disabled"} for "${ev.title}".`,
        });
      } else {
        setFeedback({ type: "error", text: json.error || "Failed to toggle booking." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleQuickToggleVisibility = async (ev: BookingEvent) => {
    const updatedVal = !(ev.is_visible_on_booking_page ?? true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "event",
          data: {
            ...ev,
            is_visible_on_booking_page: updatedVal,
          },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setEvents((prev) =>
          prev.map((item) =>
            item.id === ev.id ? { ...item, is_visible_on_booking_page: updatedVal } : item
          )
        );
        setFeedback({
          type: "success",
          text: `Hub Visibility ${updatedVal ? "Shown" : "Hidden"} for "${ev.title}".`,
        });
      } else {
        setFeedback({ type: "error", text: json.error || "Failed to toggle visibility." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleDuplicate = async (ev: BookingEvent) => {
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "duplicate_event",
          event_id: ev.id,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          text: `Duplicated "${ev.title}" into draft copy "${json.data?.title}".`,
        });
        await loadData();
      } else {
        setFeedback({ type: "error", text: json.error || "Failed to duplicate event." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleDelete = async (ev: BookingEvent) => {
    if (!window.confirm(`Permanently delete Special Booking Type "${ev.title}"? Confirmed active bookings will block deletion.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/events?entity=event&id=${encodeURIComponent(ev.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", text: `Deleted "${ev.title}".` });
        await loadData();
      } else {
        setFeedback({ type: "error", text: json.error || "Cannot delete event." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    }
  };

  const handleSaveUnifiedEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const computedSlug =
      (editingEvent.slug || "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/(^-|-$)/g, "") ||
      (editingEvent.title || "special-event")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/(^-|-$)/g, "");

    try {
      setSavingEvent(true);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "event",
          data: {
            ...editingEvent,
            slug: computedSlug,
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setEditingEvent(json.data);
        setIsFormDirty(false);

        // Persist archive associations
        if (json.data.id) {
          try {
            await fetch("/api/admin/event-associations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingEventId: json.data.id,
                archiveIds: relatedArchiveIds,
              }),
            });
          } catch (e) {
            console.error("Failed to persist event associations:", e);
          }
        }

        setFeedback({
          type: "success",
          text: `Special Booking Type "${json.data.title}" saved successfully.`,
        });
        await loadData();
      } else {
        setFeedback({ type: "error", text: json.error || "Failed to save event." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSavingEvent(false);
    }
  };

  const handleRebuildSchedule = async () => {
    if (!editingEvent.id) {
      alert("Please save the event first before generating schedule.");
      return;
    }
    if (!editingEvent.event_start_date || !editingEvent.event_end_date) {
      alert("Please set Event Start Date and Event End Date above first.");
      return;
    }

    try {
      setRebuildingSchedule(true);
      setFeedback(null);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "rebuild_event_schedule",
          event_id: editingEvent.id,
          start_date: editingEvent.event_start_date,
          end_date: editingEvent.event_end_date,
          operating_days: editingEvent.operating_days,
          operating_start_time: editingEvent.operating_start_time,
          operating_end_time: editingEvent.operating_end_time,
          slot_duration_mins: editingEvent.default_slot_duration_mins,
          slot_interval_mins: editingEvent.slot_interval_mins,
          capacity_per_slot: editingEvent.default_slot_capacity,
          buffer_before_mins: editingEvent.buffer_before_mins,
          buffer_after_mins: editingEvent.buffer_after_mins,
          break_periods: editingEvent.break_periods,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          text: json.message || "Schedule generated successfully!",
        });
        await loadData();
      } else {
        setFeedback({ type: "error", text: json.error || "Failed to generate schedule." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setRebuildingSchedule(false);
    }
  };

  const handleUploadCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const path = `special-events/${editingEvent.slug || "covers"}/${fileName}`;

      const { error: upErr } = await supabase.storage.from("portfolio-media").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage.from("portfolio-media").getPublicUrl(path);
      setEditingEvent((prev) => ({
        ...prev,
        hero_image_url: pubData.publicUrl,
        cover_storage_path: path,
      }));
      setIsFormDirty(true);
    } catch (err: any) {
      alert(`Cover upload failed: ${err.message}`);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddBreak = () => {
    if (!newBreakName.trim()) return;
    const current = Array.isArray(editingEvent.break_periods) ? [...editingEvent.break_periods] : [];
    current.push({
      name: newBreakName.trim(),
      start_time: newBreakStart,
      end_time: newBreakEnd,
    });
    setEditingEvent({ ...editingEvent, break_periods: current });
    setIsFormDirty(true);
    setNewBreakName("");
  };

  const handleRemoveBreak = (idx: number) => {
    const current = Array.isArray(editingEvent.break_periods) ? [...editingEvent.break_periods] : [];
    current.splice(idx, 1);
    setEditingEvent({ ...editingEvent, break_periods: current });
    setIsFormDirty(true);
  };

  const eventSessions = sessions.filter((s) => s.event_id === editingEvent.id);
  const eventSlots = slots.filter((sl) => sl.event_id === editingEvent.id);

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-[#EEF7F2] border border-[#2E6B4E]/30 text-[#2E6B4E]"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 1: CLEAN LIST OF SPECIAL EVENTS */}
      {/* =================================================================== */}
      {viewMode === "list" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35]">
                Special Event Booking Engine
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#141210]">
                Special Events ({events.length})
              </h2>
              <p className="text-xs text-[#5C5449]">
                University Convocations, Graduation Portrait Drives, and pop-up bookings with custom forms and dedicated calendars.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-xs font-semibold text-[#141210] border border-[#E5DEC9]"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#A66D35] ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleStartNew}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9A673]" />
                <span>Create Special Event</span>
              </button>
            </div>
          </div>

          {/* Events Table */}
          <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#141210]">
                <thead className="bg-[#FAF7F2] border-b border-[#E5DEC9] font-semibold text-[#5C5449] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Event &amp; Route</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Booking Switch</th>
                    <th className="py-3.5 px-4">Hub Visibility</th>
                    <th className="py-3.5 px-4">Date Range</th>
                    <th className="py-3.5 px-4">Sessions &amp; Slots</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DEC9]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#5C5449]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A66D35]" />
                        Loading special booking events...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#5C5449]">
                        No special booking events found. Click &quot;Create Special Event&quot; above to create one.
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => {
                      const evSessions = sessions.filter((s) => s.event_id === ev.id);
                      const evSlots = slots.filter((sl) => sl.event_id === ev.id);
                      const isBookingOn = ev.is_booking_enabled ?? true;
                      const isVisibleOnHub = ev.is_visible_on_booking_page ?? true;

                      return (
                        <tr key={ev.id} className="hover:bg-[#FAF7F2]/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#141210]">{ev.title}</div>
                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-[#5C5449]">
                              <a
                                href={`/book/special/${ev.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#3A2008] underline inline-flex items-center gap-1 hover:text-[#5C4028]"
                              >
                                /book/special/{ev.slug}
                                <ExternalLink className="w-3 h-3 text-[#A66D35]" />
                              </a>
                            </div>
                            {ev.venue && (
                              <div className="text-[11px] text-[#877D70]">{ev.venue}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                                ev.status === "published"
                                  ? "bg-[#EEF7F2] text-[#2E6B4E] border border-[#2E6B4E]/30"
                                  : ev.status === "draft"
                                  ? "bg-[#FFFBEB] text-[#B86B19] border border-[#F59E0B]/30"
                                  : "bg-[#F4EFE6] text-[#5C5449] border border-[#D5CCB4]"
                              }`}
                            >
                              {ev.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleQuickToggleBooking(ev)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                                isBookingOn
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                              }`}
                            >
                              {isBookingOn ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                                  <span>Enabled</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  <span>Disabled</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleQuickToggleVisibility(ev)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                                isVisibleOnHub
                                  ? "bg-[#FAF7F2] text-[#3A2008] border border-[#E5DEC9] hover:bg-[#FFFFFF]"
                                  : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                              }`}
                            >
                              {isVisibleOnHub ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-[#2E6B4E]" />
                                  <span>Visible</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] uppercase">Hidden</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#5C5449]">
                            {ev.event_start_date ? (
                              <span>
                                {ev.event_start_date}
                                {ev.event_end_date && ev.event_end_date !== ev.event_start_date
                                  ? ` → ${ev.event_end_date}`
                                  : ""}
                              </span>
                            ) : (
                              <span className="text-[#877D70]">Dates not set</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {evSessions.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                {evSessions.length} session{evSessions.length === 1 ? "" : "s"} ({evSlots.length} slots)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                0 sessions (Unconfigured)
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditEvent(ev)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold text-xs hover:bg-[#5C4028]"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(ev)}
                                className="p-1.5 rounded-lg text-[#5C5449] hover:bg-[#FAF7F2] hover:text-[#141210]"
                                title="Duplicate event"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#A66D35]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(ev)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                title="Delete event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: UNIFIED SINGLE SCHEDULING CONFIGURATION EDITOR */}
      {/* =================================================================== */}
      {viewMode === "editor" && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isFormDirty && !window.confirm("You have unsaved changes. Discard and return to list?")) {
                    return;
                  }
                  setViewMode("list");
                }}
                className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] hover:text-[#141210]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35]">
                  {editingEvent.id ? "Configure Special Booking Type" : "New Special Booking Type"}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#141210]">
                  {editingEvent.title || "Untitled Special Event"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveUnifiedEvent}
                disabled={savingEvent}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-[#D9A673]" />
                <span>{savingEvent ? "Saving..." : "Save Special Event"}</span>
              </button>
            </div>
          </div>

          {/* Dynamic Booking Status & Availability Indicator Banner */}
          {(() => {
            const isDraft = editingEvent.status === "draft";
            const isBookingDisabled = !(editingEvent.is_booking_enabled ?? true);
            const opensAt = editingEvent.booking_opens_at ? new Date(editingEvent.booking_opens_at) : null;
            const closesAt = editingEvent.booking_closes_at ? new Date(editingEvent.booking_closes_at) : null;
            const now = new Date();
            const isFuture = opensAt && opensAt > now;
            const isPast = closesAt && closesAt < now;
            const hasSessions = eventSessions.length > 0;

            if (isDraft) {
              return (
                <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/40 text-xs text-[#B86B19] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B86B19]" />
                  <div>
                    <strong className="block font-bold">Booking is Disabled (Status: Draft)</strong>
                    <span>This event is currently in draft mode. Visitors cannot reserve slots on the public booking page until you change Publication Status to &quot;Published&quot; below.</span>
                  </div>
                </div>
              );
            }

            if (isBookingDisabled) {
              return (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <strong className="block font-bold">Booking Switch Is Turned Off</strong>
                    <span>Client reservations are currently blocked because &quot;Booking Enabled&quot; is unchecked.</span>
                  </div>
                </div>
              );
            }

            if (!hasSessions) {
              return (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <div>
                    <strong className="block font-bold">Booking enabled — availability not configured (0 sessions scheduled)</strong>
                    <span>This event is published and booking is enabled, but no sessions or time slots exist yet. Click &quot;Generate / Rebuild Schedule &amp; Time Slots&quot; below to make slots available.</span>
                  </div>
                </div>
              );
            }

            if (isFuture) {
              return (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <strong className="block font-bold">Booking Window Opens Soon</strong>
                    <span>Public booking will unlock on {opensAt?.toLocaleString("en-US", { timeZone: "Asia/Dhaka" })} (Dhaka Time).</span>
                  </div>
                </div>
              );
            }

            if (isPast) {
              return (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                  <div>
                    <strong className="block font-bold">Booking Window Has Expired</strong>
                    <span>The booking deadline closed on {closesAt?.toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}. Update the deadline below to reopen bookings.</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 rounded-2xl bg-[#EEF7F2] border border-[#2E6B4E]/30 text-xs text-[#2E6B4E] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#2E6B4E]" />
                <div>
                  <strong className="block font-bold">Booking Is Live &amp; Active</strong>
                  <span>This event is published and accepting bookings on the schedule ({eventSessions.length} sessions, {eventSlots.length} available slots).</span>
                </div>
              </div>
            );
          })()}

          {/* Unified Form */}
          <form onSubmit={handleSaveUnifiedEvent} className="space-y-6">
            {/* Section 1: Event Identity & Content */}
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#A66D35]" />
                <span>1. Event Identity &amp; Content</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.title || ""}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, title: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. Independent University, Bangladesh 27th Convocation"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={editingEvent.slug || ""}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, slug: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. iub-27th-convocation"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={editingEvent.category || "convocation"}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, category: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  >
                    {SPECIAL_EVENT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Venue / Campus Location</label>
                  <input
                    type="text"
                    value={editingEvent.venue || ""}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, venue: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. IUB Main Campus, Bashundhara R/A, Dhaka"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1">Event Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={editingEvent.description || ""}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, description: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="Describe the portraiture experience, studio lighting, and session deliverables..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  />
                </div>

                {/* Hero / Cover Image Picker */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="font-semibold block text-xs">Hero Cover Photograph</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="url"
                      value={editingEvent.hero_image_url || ""}
                      onChange={(e) => {
                        setEditingEvent({ ...editingEvent, hero_image_url: e.target.value });
                        setIsFormDirty(true);
                      }}
                      placeholder="https://... or upload from device"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-xs"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#FFFFFF] border border-[#E5DEC9] font-semibold text-xs text-[#3A2008]">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingCover ? "Uploading..." : "Upload Cover"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUploadCoverImage}
                        disabled={uploadingCover}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Booking Access & Public Visibility */}
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#A66D35]" />
                <span>2. Booking Access &amp; Public Visibility</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Publication Status *</label>
                  <select
                    value={editingEvent.status || "draft"}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, status: e.target.value as any });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  >
                    <option value="draft">Draft (Private / Hidden)</option>
                    <option value="published">Published (Public)</option>
                    <option value="paused">Paused (Temporarily Halting)</option>
                    <option value="closed">Closed (Booking Concluded)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEvent.is_booking_enabled ?? true}
                      onChange={(e) => {
                        setEditingEvent({ ...editingEvent, is_booking_enabled: e.target.checked });
                        setIsFormDirty(true);
                      }}
                      className="rounded text-[#3A2008]"
                    />
                    <span className="font-bold text-[#141210]">Allow Slot Bookings</span>
                  </label>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEvent.is_visible_on_booking_page ?? true}
                      onChange={(e) => {
                        setEditingEvent({ ...editingEvent, is_visible_on_booking_page: e.target.checked });
                        setIsFormDirty(true);
                      }}
                      className="rounded text-[#3A2008]"
                    />
                    <span className="font-bold text-[#141210]">Visible on Booking Hub</span>
                  </label>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingEvent.is_featured_on_home)}
                      onChange={(e) => {
                        setEditingEvent({ ...editingEvent, is_featured_on_home: e.target.checked });
                        setIsFormDirty(true);
                      }}
                      className="rounded text-[#3A2008]"
                    />
                    <span className="font-bold text-[#141210]">Feature on Homepage</span>
                  </label>
                </div>
              </div>

              {/* Booking Window Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <label className="font-semibold block mb-1">Booking Opens At (Dhaka Time)</label>
                  <input
                    type="datetime-local"
                    value={
                      editingEvent.booking_opens_at
                        ? new Date(editingEvent.booking_opens_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      setEditingEvent({
                        ...editingEvent,
                        booking_opens_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Booking Closes At (Deadline)</label>
                  <input
                    type="datetime-local"
                    value={
                      editingEvent.booking_closes_at
                        ? new Date(editingEvent.booking_closes_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      setEditingEvent({
                        ...editingEvent,
                        booking_closes_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2.5: Related Event Archives */}
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DEC9] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#3A2008] text-[#FAF7F2] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#141210]">
                      2.5 Related Event Archives ({relatedArchiveIds.length} Linked)
                    </h3>
                    <p className="text-[11px] text-[#5C5449]">
                      Associate photographic event archives from your Works Archive with this booking event.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Archives Chips */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#141210] block">
                  Currently Associated Archives:
                </span>
                {relatedArchiveIds.length === 0 ? (
                  <p className="text-xs text-[#877D70] italic">
                    No event archives linked yet. Select from the dropdown below to connect one.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {relatedArchiveIds.map((archId) => {
                      const arch = availableArchives.find((a) => a.id === archId);
                      return (
                        <div
                          key={archId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold text-[#3A2008]"
                        >
                          <span>{arch ? arch.title : `Archive (${archId.slice(0, 8)})`}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRelatedArchiveIds((prev) => prev.filter((id) => id !== archId));
                              setIsFormDirty(true);
                            }}
                            className="p-0.5 rounded-full hover:bg-[#E5DEC9] text-[#877D70] hover:text-[#141210]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Searchable Add Archive Selector */}
              <div className="pt-2 border-t border-[#E5DEC9] space-y-2">
                <label className="text-xs font-semibold text-[#141210] block">
                  Add Event Archive Association
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#877D70]" />
                    <input
                      type="text"
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      placeholder="Search available archives by title..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs"
                    />
                  </div>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !relatedArchiveIds.includes(val)) {
                        setRelatedArchiveIds((prev) => [...prev, val]);
                        setIsFormDirty(true);
                      }
                      e.target.value = "";
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-medium text-[#141210]"
                  >
                    <option value="">-- Choose Archive to Link --</option>
                    {availableArchives
                      .filter(
                        (a) =>
                          !relatedArchiveIds.includes(a.id) &&
                          (!archiveSearch ||
                            a.title.toLowerCase().includes(archiveSearch.toLowerCase()))
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.event_date || "No date"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Daily Operating Schedule & Slot Rules */}
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#A66D35]" />
                <span>3. Daily Operating Schedule &amp; Slot Rules</span>
              </h3>

              {/* Operating Days Selector */}
              <div>
                <label className="font-semibold block mb-1.5 text-xs">Operating Days of Week</label>
                <div className="flex flex-wrap items-center gap-2">
                  {WEEKDAYS.map((wd) => {
                    const currentDays = Array.isArray(editingEvent.operating_days) ? editingEvent.operating_days : [0, 1, 2, 3, 4, 5, 6];
                    const isSelected = currentDays.includes(wd.day);
                    return (
                      <button
                        key={wd.day}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? currentDays.filter((d) => d !== wd.day)
                            : [...currentDays, wd.day].sort();
                          setEditingEvent({ ...editingEvent, operating_days: updated });
                          setIsFormDirty(true);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                          isSelected
                            ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008]"
                            : "bg-[#FAF7F2] text-[#5C5449] border border-[#E5DEC9] hover:bg-[#FFFFFF]"
                        }`}
                      >
                        {wd.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Operating Hours & Durations */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Daily Start</label>
                  <input
                    type="time"
                    value={editingEvent.operating_start_time || "09:00"}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, operating_start_time: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Daily End</label>
                  <input
                    type="time"
                    value={editingEvent.operating_end_time || "18:00"}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, operating_end_time: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={editingEvent.default_slot_duration_mins || 30}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, default_slot_duration_mins: Number(e.target.value) });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Interval (mins)</label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={editingEvent.slot_interval_mins || 30}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, slot_interval_mins: Number(e.target.value) });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Slot Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editingEvent.default_slot_capacity || 1}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, default_slot_capacity: Number(e.target.value) });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Buffer After (mins)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editingEvent.buffer_after_mins || 10}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, buffer_after_mins: Number(e.target.value) });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>
              </div>

              {/* Break Periods Builder */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-3">
                <span className="font-bold text-[#141210] text-xs block">
                  Daily Break Periods (Excluded from Slot Generation)
                </span>

                {Array.isArray(editingEvent.break_periods) && editingEvent.break_periods.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingEvent.break_periods.map((bp, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-semibold text-[#141210]"
                      >
                        <span>{bp.name}:</span>
                        <span className="font-mono text-[#A66D35]">
                          {bp.start_time} - {bp.end_time}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBreak(idx)}
                          className="text-[#877D70] hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <input
                    type="text"
                    value={newBreakName}
                    onChange={(e) => setNewBreakName(e.target.value)}
                    placeholder="Break Name (e.g. Lunch)"
                    className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs"
                  />
                  <input
                    type="time"
                    value={newBreakStart}
                    onChange={(e) => setNewBreakStart(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono text-xs"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={newBreakEnd}
                    onChange={(e) => setNewBreakEnd(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddBreak}
                    className="px-3 py-1.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold text-xs hover:bg-[#5C4028]"
                  >
                    Add Break
                  </button>
                </div>
              </div>
            </div>

            {/* Section 4: Automated Schedule Generator */}
            <div className="rounded-3xl bg-[#FAF7F2] border border-[#E5DEC9] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A66D35] font-bold">
                    Automated Availability Engine
                  </span>
                  <h3 className="text-base font-bold text-[#141210]">
                    4. Generate / Rebuild Schedule &amp; Time Slots
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleRebuildSchedule}
                  disabled={rebuildingSchedule}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#D9A673] ${rebuildingSchedule ? "animate-spin" : ""}`} />
                  <span>{rebuildingSchedule ? "Generating Slots..." : "Generate / Rebuild Schedule"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Session Schedule Start Date *</label>
                  <input
                    type="date"
                    required
                    value={editingEvent.event_start_date || ""}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, event_start_date: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Session Schedule End Date *</label>
                  <input
                    type="date"
                    required
                    value={editingEvent.event_end_date || ""}
                    onChange={(e) => {
                      setEditingEvent({ ...editingEvent, event_end_date: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#5C5449]">
                Generating the schedule creates conflict-free time slots for each operating day between the Start and End dates, applying your daily operating hours and excluding break periods. Existing booked slots are preserved.
              </p>
            </div>

            {/* Section 5: Read-Only Sessions List with Single-Session Overrides */}
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#A66D35]" />
                  <span>5. Scheduled Sessions &amp; Time Slots ({eventSessions.length})</span>
                </span>
                <span className="font-mono text-xs text-[#A66D35]">
                  {eventSlots.length} available slots
                </span>
              </h3>

              {eventSessions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5C5449] rounded-2xl border border-dashed border-[#E5DEC9] bg-[#FAF7F2]">
                  No sessions scheduled for this event yet. Use the schedule generator above to populate sessions.
                </div>
              ) : (
                <div className="rounded-2xl border border-[#E5DEC9] overflow-hidden">
                  <table className="w-full text-left text-xs text-[#141210]">
                    <thead className="bg-[#FAF7F2] border-b border-[#E5DEC9] text-[10px] font-semibold text-[#5C5449] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Session Title</th>
                        <th className="py-2.5 px-3">Operating Window</th>
                        <th className="py-2.5 px-3">Duration &amp; Cap</th>
                        <th className="py-2.5 px-3">Slot Count</th>
                        <th className="py-2.5 px-3 text-right">Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DEC9]">
                      {eventSessions.map((sess) => {
                        const sessSlots = slots.filter((sl) => sl.session_id === sess.id);
                        return (
                          <tr key={sess.id} className="hover:bg-[#FAF7F2]/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#3A2008]">
                              {sess.session_date}
                            </td>
                            <td className="py-2.5 px-3 font-medium">{sess.title}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#5C5449]">
                              {sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {sess.slot_duration_mins}m • cap: {sess.capacity_per_slot}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                                {sessSlots.length} slots
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setEditingSessionModal(sess)}
                                className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold hover:bg-[#FFFFFF]"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold text-[#5C5449] hover:text-[#141210]"
              >
                ← Back to Events List
              </button>

              <button
                type="submit"
                disabled={savingEvent}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-[#D9A673]" />
                <span>{savingEvent ? "Saving..." : "Save Special Event"}</span>
              </button>
            </div>
          </form>

          {/* Single Session Override Modal */}
          {editingSessionModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
              onClick={() => setEditingSessionModal(null)}
            >
              <div
                className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
                  <h4 className="font-bold text-base text-[#141210]">
                    Override Session ({editingSessionModal.session_date})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingSessionModal(null)}
                    className="p-1 rounded-lg text-[#877D70] hover:text-[#141210]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-semibold block mb-1">Session Title</label>
                    <input
                      type="text"
                      value={editingSessionModal.title}
                      onChange={(e) =>
                        setEditingSessionModal({
                          ...editingSessionModal,
                          title: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={editingSessionModal.start_time.slice(0, 5)}
                        onChange={(e) =>
                          setEditingSessionModal({
                            ...editingSessionModal,
                            start_time: `${e.target.value}:00`,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">End Time</label>
                      <input
                        type="time"
                        value={editingSessionModal.end_time.slice(0, 5)}
                        onChange={(e) =>
                          setEditingSessionModal({
                            ...editingSessionModal,
                            end_time: `${e.target.value}:00`,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Duration (mins)</label>
                      <input
                        type="number"
                        min={10}
                        value={editingSessionModal.slot_duration_mins}
                        onChange={(e) =>
                          setEditingSessionModal({
                            ...editingSessionModal,
                            slot_duration_mins: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">Capacity</label>
                      <input
                        type="number"
                        min={1}
                        value={editingSessionModal.capacity_per_slot}
                        onChange={(e) =>
                          setEditingSessionModal({
                            ...editingSessionModal,
                            capacity_per_slot: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DEC9]">
                  <button
                    type="button"
                    onClick={() => setEditingSessionModal(null)}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-semibold text-[#5C5449]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingSessionModal}
                    onClick={async () => {
                      try {
                        setSavingSessionModal(true);
                        const res = await fetch("/api/admin/events", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            entity: "session",
                            data: editingSessionModal,
                          }),
                        });
                        if (res.ok) {
                          setEditingSessionModal(null);
                          await loadData();
                        } else {
                          const json = await res.json();
                          alert(json.error || "Failed to update session");
                        }
                      } finally {
                        setSavingSessionModal(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold"
                  >
                    {savingSessionModal ? "Saving..." : "Save Override"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
