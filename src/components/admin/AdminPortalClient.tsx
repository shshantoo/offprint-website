"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Booking,
  BookingEvent,
  CustomBookingQuestion,
  EventSession,
  PhotographyService,
  PhotographyPackage,
  AvailabilityRule,
  AvailabilityBlock,
  BookingStatusHistory,
  EmailNotification,
  CalendarSyncLog,
  EmailTemplate,
  FramePrintingConfig,
} from "@/types/database";
import {
  formatDhakaDateTime,
  formatDhakaDateISO,
  formatDhakaTime,
} from "@/lib/booking/timezone";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import PortfolioCMSClient from "./PortfolioCMSClient";
import ProductsCMSClient from "./ProductsCMSClient";
import LeadsCRMClient from "./LeadsCRMClient";
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  BookOpen,
  Sliders,
  Mail,
  Globe,
  Search,
  Download,
  Plus,
  RefreshCw,
  Eye,
  AlertTriangle,
  Lock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Ban,
  Link2,
  Image as ImageIcon,
  ShieldCheck,
  Copy,
  ExternalLink,
  Upload,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Edit3,
} from "lucide-react";

type AdminMainTab =
  | "dashboard"
  | "bookings"
  | "calendar"
  | "scheduling"
  | "portfolio"
  | "integrations"
  | "cms"
  | "security";

type CalendarViewMode = "day" | "week" | "month";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
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

export default function AdminPortalClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as AdminMainTab) || "dashboard";
  const [activeTab, setActiveTab] = useState<AdminMainTab>(initialTab);

  // Overview state
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  // Bookings list & filters state
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");

  // Booking Inspector Modal state (shared between Bookings tab & Calendar tab!)
  const [inspectingBookingId, setInspectingBookingId] = useState<string | null>(
    null
  );
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(
    null
  );
  const [_inspectedHistory, setInspectedHistory] = useState<
    BookingStatusHistory[]
  >([]);
  const [inspectedEmails, setInspectedEmails] = useState<EmailNotification[]>(
    []
  );
  const [inspectedCalLogs, setInspectedCalLogs] = useState<CalendarSyncLog[]>(
    []
  );
  const [inspectedClientHistory, setInspectedClientHistory] = useState<
    Booking[]
  >([]);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [internalNotesDraft, setInternalNotesDraft] = useState("");
  const [rescheduleStartInput, setRescheduleStartInput] = useState("");
  const [rescheduleEndInput, setRescheduleEndInput] = useState("");
  const [inspectorFeedback, setInspectorFeedback] = useState<string | null>(
    null
  );

  // Booking Inspector Session & Extras Modifier state
  const [modifierDuration, setModifierDuration] = useState<number>(30);
  const [modifierPackageId, setModifierPackageId] = useState<string>("");
  const [modifierFrameSelected, setModifierFrameSelected] = useState<boolean>(false);
  const [modifierFrameTypeId, setModifierFrameTypeId] = useState<string>("");
  const [modifierFrameQty, setModifierFrameQty] = useState<number>(1);

  // Create Booking Modal state
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);
  const [createKind, setCreateKind] = useState<"convocation" | "traditional">(
    "traditional"
  );
  const [createServiceId, setCreateServiceId] = useState("");
  const [createEventId, setCreateEventId] = useState("");
  const [createSlotId, setCreateSlotId] = useState("");
  const [createPackageId] = useState("");
  const [createStartAt, setCreateStartAt] = useState("");
  const [createDuration, setCreateDuration] = useState(60);
  const [createClientName, setCreateClientName] = useState("");
  const [createClientEmail, setCreateClientEmail] = useState("");
  const [createClientPhone, setCreateClientPhone] = useState("+880 ");
  const [createStudentId, setCreateStudentId] = useState("");
  const [createLocation, setCreateLocation] = useState(
    "OFFPRINT Studio, Gulshan-2"
  );
  const [createNotes] = useState("");

  // Calendar View State
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>("month");
  const [calendarFocalDate, setCalendarFocalDate] = useState<string>(() =>
    formatDhakaDateISO(new Date())
  );

  // Events, Services & Availability state
  const [eventsData, setEventsData] = useState<{
    events: BookingEvent[];
    sessions: EventSession[];
    slots: any[];
    services: PhotographyService[];
    packages: PhotographyPackage[];
    rules: AvailabilityRule[];
    blocks: AvailabilityBlock[];
  }>({
    events: [],
    sessions: [],
    slots: [],
    services: [],
    packages: [],
    rules: [],
    blocks: [],
  });
  const [schedSubTab, setSchedSubTab] = useState<
    "convocation" | "services" | "packages" | "hours"
  >("convocation");

  // Special Event Editor (supports IUB Convocation & any new Special Booking Type)
  const [editingEvent, setEditingEvent] = useState<Partial<BookingEvent>>({
    slug: "iub-27th-convocation",
    title: "IUB 27th Convocation Photography",
    category: "convocation",
    subtitle: "Exclusive Graduation Portrait & Family Sessions",
    description:
      "Celebrate your milestone at Independent University, Bangladesh (IUB) 27th Convocation with OFFPRINT editorial portraiture.",
    venue: "IUB Campus, Bashundhara R/A & OFFPRINT Studio",
    status: "published",
    timezone: "Asia/Dhaka",
    default_slot_duration_mins: 30,
    buffer_before_mins: 0,
    buffer_after_mins: 10,
    default_slot_capacity: 2,
    min_notice_hours: 12,
    max_advance_days: 90,
    reschedule_cutoff_hours: 48,
    cancellation_cutoff_hours: 48,
    cancellation_policy:
      "Rescheduling or cancellation is permitted up to 48 hours prior to your reserved convocation slot.",
    custom_questions: [],
    resource_pool: "primary_studio",
  });
  const [eventConflictError, setEventConflictError] = useState<string | null>(
    null
  );
  const [eventSuccessMsg, setEventSuccessMsg] = useState<string | null>(null);
  const [uploadingEventCover, setUploadingEventCover] = useState(false);

  // New Session Generator form
  const [newSessionEventId, setNewSessionEventId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState(
    "Morning Convocation Portrait Session"
  );
  const [newSessionDate, setNewSessionDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [newSessionStart, setNewSessionStart] = useState("09:00");
  const [newSessionEnd, setNewSessionEnd] = useState("13:00");
  const [newSessionDuration, setNewSessionDuration] = useState(30);
  const [newSessionBuffer, setNewSessionBuffer] = useState(10);
  const [newSessionCapacity, setNewSessionCapacity] = useState(2);

  // New Traditional Service form
  const [svcName, setSvcName] = useState("");
  const [svcSlug, setSvcSlug] = useState("");
  const [svcCat, setSvcCat] = useState("portrait");
  const [svcDuration, setSvcDuration] = useState(60);
  const [svcBufferAfter, setSvcBufferAfter] = useState(15);
  const [svcNoticeHours] = useState(12);
  const [svcLocationType, setSvcLocationType] = useState("studio");
  const [svcDesc, setSvcDesc] = useState("");

  // New Package form
  const [pkgName, setPkgName] = useState("");
  const [pkgTargetType, setPkgTargetType] = useState<"event" | "service">(
    "event"
  );
  const [pkgTargetId, setPkgTargetId] = useState("");
  const [pkgPriceLabel, setPkgPriceLabel] = useState("BDT 4,500");
  const [pkgDuration, setPkgDuration] = useState(30);
  const [pkgDesc] = useState(
    "Editorial portrait session with high-resolution retouched digital gallery."
  );
  const [pkgDeliverables, setPkgDeliverables] = useState(
    "15 Edited High-Res Portraits, Raw Digital Archive"
  );
  // Dynamic Package Modal (Independent CRUD for Special Booking Types & Services)
  const [editingPackageModal, setEditingPackageModal] =
    useState<Partial<PhotographyPackage> | null>(null);
  const [isNewPackageModal, setIsNewPackageModal] = useState<boolean>(false);
  const [packageSaveError, setPackageSaveError] = useState<string | null>(null);
  const [packageSaveLoading, setPackageSaveLoading] = useState<boolean>(false);
  const [packageFilterTarget, setPackageFilterTarget] = useState<string>("all");

  // Dynamic Archival Frame Options Editor state
  const [newFrameName, setNewFrameName] = useState("");
  const [newFrameDim, setNewFrameDim] = useState("");
  const [newFramePrice, setNewFramePrice] = useState<number>(2200);
  const [newFrameDesc, setNewFrameDesc] = useState("");

  // New Block form
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Google & Email Integrations state
  const [googleIntegration, setGoogleIntegration] = useState<any>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<string>("booking_confirmed");
  const [tplName, setTplName] = useState("Booking Confirmation");
  const [tplSubject, setTplSubject] = useState("");
  const [tplHeading, setTplHeading] = useState("");
  const [tplIntro, setTplIntro] = useState("");
  const [tplInstructions, setTplInstructions] = useState("");
  const [tplFooter, setTplFooter] = useState("");

  // CMS Sub-tab state
  const [cmsSubTab, setCmsSubTab] = useState<
    "site_settings" | "portfolio" | "products" | "leads"
  >("site_settings");
  const [siteSettings, setSiteSettings] = useState<Record<string, any>>({});

  // Account & Security state
  const [adminProfile, setAdminProfile] = useState<{
    id: string;
    email: string;
    username: string | null;
    fullName: string | null;
    credentialsChangedAt: string | null;
  } | null>(null);
  const [secUsername, setSecUsername] = useState("");
  const [secCurrentPassword, setSecCurrentPassword] = useState("");
  const [secNewPassword, setSecNewPassword] = useState("");
  const [secConfirmPassword, setSecConfirmPassword] = useState("");
  const [secLoading, setSecLoading] = useState(false);
  const [secFeedback, setSecFeedback] = useState<string | null>(null);
  const [secError, setSecError] = useState<string | null>(null);

  // Loaders
  const loadAdminProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.user) {
          setAdminProfile(json.user);
          setSecUsername((prev) => prev || json.user.username || "");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.ok) {
        setOverview(await res.json());
      }
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      setBookingsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (kindFilter !== "all") params.set("bookingType", kindFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFromFilter) params.set("dateFrom", dateFromFilter);
      if (dateToFilter) params.set("dateTo", dateToFilter);

      const res = await fetch(`/api/admin/bookings?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setBookings(json.data || json.bookings || []);
      }
    } finally {
      setBookingsLoading(false);
    }
  }, [searchQuery, kindFilter, statusFilter, dateFromFilter, dateToFilter]);

  const loadEventsAndScheduling = useCallback(async (preferredEventId?: string) => {
    const res = await fetch("/api/admin/events", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const loadedEvents: BookingEvent[] = json.events || [];
      setEventsData({
        events: loadedEvents,
        sessions: json.sessions || [],
        slots: json.slots || [],
        services: json.services || [],
        packages: json.packages || [],
        rules: json.rules || [],
        blocks: json.blocks || [],
      });
      if (loadedEvents.length > 0) {
        const target =
          (preferredEventId &&
            loadedEvents.find((ev) => ev.id === preferredEventId)) ||
          loadedEvents[0];
        setEditingEvent(target);
        setNewSessionEventId(target.id);
        setCreateEventId((prev) => prev || target.id);
      }
      if (json.services && json.services.length > 0) {
        setCreateServiceId((prev) => prev || json.services[0].id);
      }
    }
  }, []);

  const loadIntegrationsAndCms = useCallback(async () => {
    const [gRes, cmsRes] = await Promise.all([
      fetch("/api/admin/integrations/google", { cache: "no-store" }),
      fetch("/api/admin/cms", { cache: "no-store" }),
    ]);

    if (gRes.ok) {
      const gJson = await gRes.json();
      setGoogleIntegration(gJson);
      const tpls = (gJson.templates || []) as EmailTemplate[];
      setEmailTemplates(tpls);
      const currentTpl =
        tpls.find((t) => t.id === selectedTemplateKey) || tpls[0];
      if (currentTpl) {
        setTplName(currentTpl.name);
        setTplSubject(currentTpl.subject_template);
        setTplHeading(currentTpl.heading);
        setTplIntro(currentTpl.intro_text);
        setTplInstructions(currentTpl.instructions_text);
        setTplFooter(currentTpl.footer_text);
      }
    }
    if (cmsRes.ok) {
      const cJson = await cmsRes.json();
      setSiteSettings(cJson.data || cJson.siteSettings || {});
    }
  }, [selectedTemplateKey]);

  useEffect(() => {
    loadAdminProfile();
    loadOverview();
    loadBookings();
    loadEventsAndScheduling();
    loadIntegrationsAndCms();
  }, [
    loadAdminProfile,
    loadOverview,
    loadBookings,
    loadEventsAndScheduling,
    loadIntegrationsAndCms,
  ]);

  // Open Booking Inspector Modal
  const openBookingInspector = async (bookingId: string) => {
    setInspectingBookingId(bookingId);
    setInspectorLoading(true);
    setInspectorFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingId)}`,
        {
          cache: "no-store",
        }
      );
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        setInspectedBooking(payload.booking);
        setInternalNotesDraft(payload.booking?.internal_notes || "");
        setModifierDuration(payload.booking?.duration_mins || 30);
        setModifierPackageId(payload.booking?.package_id || "");
        setModifierFrameSelected(Boolean(payload.booking?.frame_printing_selected));
        setModifierFrameTypeId(payload.booking?.frame_type_id || "");
        setModifierFrameQty(payload.booking?.frame_quantity || 1);
        setInspectedHistory(payload.history || []);
        setInspectedEmails(payload.emailNotifications || []);
        setInspectedCalLogs(payload.calendarSyncLogs || []);
        setInspectedClientHistory(payload.clientBookingHistory || []);
      }
    } finally {
      setInspectorLoading(false);
    }
  };

  const handleBookingAdminAction = async (payload: Record<string, any>) => {
    if (!inspectedBooking) return;
    setInspectorFeedback(null);
    const res = await fetch(
      `/api/admin/bookings/${encodeURIComponent(inspectedBooking.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      setInspectorFeedback(`Error: ${json.error || "Action failed"}`);
      return;
    }
    setInspectorFeedback("Updated successfully.");
    await openBookingInspector(inspectedBooking.id);
    await loadBookings();
    await loadOverview();
  };

  const handleExportBookingsCSV = () => {
    if (bookings.length === 0) return alert("No bookings to export.");
    const headers = [
      "Reference",
      "Type",
      "Status",
      "Service/Event",
      "Package",
      "Start (UTC)",
      "End (UTC)",
      "Duration (m)",
      "Client Name",
      "Client Email",
      "Client Phone",
      "Student ID",
      "Location",
      "Package Price",
      "Frame Printing Selected",
      "Frame Type",
      "Frame Qty",
      "Frame Price (BDT)",
      "Total Price (BDT)",
      "Custom Fields",
    ];
    const rows = bookings.map((b) => [
      b.booking_ref,
      b.booking_type,
      b.status,
      `"${(b.service_or_event_title || "").replace(/"/g, '""')}"`,
      `"${(b.package_name || "").replace(/"/g, '""')}"`,
      b.start_at,
      b.end_at,
      b.duration_mins,
      `"${b.client_name.replace(/"/g, '""')}"`,
      b.client_email,
      b.client_phone,
      b.student_id || "",
      `"${(b.location || "").replace(/"/g, '""')}"`,
      `"${(b.package_price_label || "").replace(/"/g, '""')}"`,
      b.frame_printing_selected ? "YES" : "NO",
      `"${(b.frame_type_name || "").replace(/"/g, '""')}"`,
      b.frame_quantity || 0,
      b.frame_total_price || 0,
      b.total_price != null ? b.total_price : b.package_base_price || 0,
      `"${JSON.stringify(b.custom_fields || {}).replace(/"/g, '""')}"`,
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute(
      "download",
      `offprint_bookings_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateBookingForClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, any> = {
      booking_type: createKind,
      package_id: createPackageId || null,
      client_name: createClientName.trim(),
      client_email: createClientEmail.trim(),
      client_phone: createClientPhone.trim(),
      student_id: createStudentId.trim() || null,
      location: createLocation.trim(),
      client_notes: createNotes.trim() || null,
    };

    if (createKind === "convocation") {
      const slot = eventsData.slots.find((s) => s.id === createSlotId);
      if (!slot) return alert("Please select an event time slot.");
      body.event_id = createEventId;
      body.session_id = slot.session_id;
      body.slot_id = slot.id;
      body.booking_date = slot.slot_date || formatDhakaDateISO(slot.start_at);
      body.start_at = slot.start_at;
      body.end_at = slot.end_at;
      body.duration_mins = 30;
    } else {
      if (!createStartAt) return alert("Please specify a start date/time.");
      const startIso = new Date(createStartAt).toISOString();
      const endIso = new Date(
        new Date(createStartAt).getTime() + createDuration * 60000
      ).toISOString();
      body.service_id = createServiceId;
      body.booking_date = formatDhakaDateISO(startIso);
      body.start_at = startIso;
      body.end_at = endIso;
      body.duration_mins = createDuration;
    }

    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return alert(json.error || "Failed to create booking.");
    }
    setShowCreateBookingModal(false);
    await loadBookings();
    await loadOverview();
  };

  // Calendar Navigation helpers
  const shiftCalendarDate = (deltaDays: number) => {
    const cur = new Date(`${calendarFocalDate}T12:00:00+06:00`);
    cur.setUTCDate(cur.getUTCDate() + deltaDays);
    setCalendarFocalDate(formatDhakaDateISO(cur));
  };

  const handleStartNewSpecialEvent = () => {
    setEventConflictError(null);
    setEventSuccessMsg(null);
    setEditingEvent({
      id: undefined,
      slug: "",
      title: "",
      category: "convocation",
      subtitle: "",
      description: "",
      venue: "OFFPRINT Studio, Gulshan-2",
      hero_image_url: "",
      cover_storage_path: null,
      status: "draft",
      timezone: "Asia/Dhaka",
      event_start_date: null,
      event_end_date: null,
      event_start_time: "09:00",
      event_end_time: "18:00",
      default_slot_duration_mins: 30,
      buffer_before_mins: 0,
      buffer_after_mins: 10,
      default_slot_capacity: 2,
      min_notice_hours: 12,
      max_advance_days: 90,
      reschedule_cutoff_hours: 48,
      cancellation_cutoff_hours: 48,
      cancellation_policy:
        "Rescheduling or cancellation is permitted up to 48 hours prior to your reserved slot.",
      custom_questions: [
        {
          id: "participant_id",
          label: "Student / Participant ID",
          type: "short_text",
          required: false,
          placeholder: "Enter ID if applicable",
        },
      ],
      booking_restrictions: null,
      is_featured_on_home: false,
      resource_pool: "primary_studio",
    });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventConflictError(null);
    setEventSuccessMsg(null);
    const computedSlug =
      (editingEvent.slug || "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/(^-|-$)/g, "") ||
      (editingEvent.title || "special-event")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "event",
        data: {
          default_slot_duration_mins: 30,
          buffer_before_mins: 0,
          buffer_after_mins: 10,
          default_slot_capacity: 2,
          resource_pool: "primary_studio",
          ...editingEvent,
          slug: computedSlug,
        },
      }),
    });
    const json = await res.json();
    if (res.ok) {
      const savedId = json.data?.id || editingEvent.id;
      await loadEventsAndScheduling(savedId);
      setEventSuccessMsg(
        `Special Booking Type "${json.data?.title || editingEvent.title}" saved successfully.`
      );
    } else {
      setEventConflictError(json.error || "Failed to save Special Booking Type.");
    }
  };

  const handleDuplicateEvent = async () => {
    if (!editingEvent.id) return;
    setEventConflictError(null);
    setEventSuccessMsg(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "duplicate_event",
        data: {
          source_event_id: editingEvent.id,
        },
      }),
    });
    const json = await res.json();
    if (res.ok && json.data) {
      await loadEventsAndScheduling(json.data.id);
      setEventSuccessMsg(
        `Duplicated "${editingEvent.title}" into draft "${json.data.title}" (/book/special/${json.data.slug}).`
      );
    } else {
      setEventConflictError(json.error || "Failed to duplicate event.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent.id) return;
    if (
      !window.confirm(
        `Delete Special Booking Type "${editingEvent.title}"? Confirmed bookings are protected and will block deletion.`
      )
    ) {
      return;
    }
    setEventConflictError(null);
    setEventSuccessMsg(null);
    const res = await fetch(
      `/api/admin/events?entity=event&id=${encodeURIComponent(editingEvent.id)}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (res.ok) {
      await loadEventsAndScheduling();
      setEventSuccessMsg("Special Booking Type deleted.");
    } else {
      setEventConflictError(
        json.error || "Cannot delete event due to active bookings."
      );
    }
  };

  const handleUploadEventCover = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEventCover(true);
    setEventConflictError(null);
    try {
      const folder = `special-events/${editingEvent.slug || "covers"}`;
      const supabase = getSupabaseBrowserClient();
      let publicUrl: string | null = null;
      let storagePath: string | null = null;

      if (supabase) {
        try {
          const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
          const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
          const baseName =
            file.name
              .replace(/\.[a-zA-Z0-9]+$/, "")
              .toLowerCase()
              .replace(/[^a-z0-9._-]+/g, "-")
              .slice(0, 48) || "cover";
          const path = `projects/${folder}/${Date.now()}-${baseName}${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("portfolio-media")
            .upload(path, file, {
              contentType: file.type,
              cacheControl: "31536000",
              upsert: true,
            });

          if (!uploadError) {
            const { data: pubData } = supabase.storage
              .from("portfolio-media")
              .getPublicUrl(path);
            publicUrl = pubData.publicUrl;
            storagePath = path;
          }
        } catch {
          // fallback to server route
        }
      }

      if (!publicUrl || !storagePath) {
        const fd = new FormData();
        fd.append("files", file);
        fd.append("folder", folder);
        const res = await fetch("/api/admin/storage/portfolio", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok || !json.uploaded?.[0]) {
          setEventConflictError(json.error || "Cover upload failed.");
          return;
        }
        const uploaded = json.uploaded[0];
        publicUrl = uploaded.public_url || uploaded.publicUrl;
        storagePath = uploaded.storage_path || uploaded.storagePath;
      }

      setEditingEvent((prev) => ({
        ...prev,
        hero_image_url: publicUrl,
        cover_storage_path: storagePath,
      }));
      setEventSuccessMsg(
        "Cover image uploaded to Supabase Storage. Click Save Event Settings to publish."
      );
    } finally {
      setUploadingEventCover(false);
      e.target.value = "";
    }
  };

  const handleAddCustomQuestion = () => {
    const current = Array.isArray(editingEvent.custom_questions)
      ? [...editingEvent.custom_questions]
      : [];
    const nextIdx = current.length + 1;
    current.push({
      id: `question_${nextIdx}`,
      label: `Custom Question ${nextIdx}`,
      type: "short_text",
      required: false,
      placeholder: "",
      help_text: "",
      options: [],
    });
    setEditingEvent({ ...editingEvent, custom_questions: current });
  };

  const handleUpdateCustomQuestion = (
    index: number,
    patch: Partial<CustomBookingQuestion>
  ) => {
    const current = Array.isArray(editingEvent.custom_questions)
      ? [...editingEvent.custom_questions]
      : [];
    if (!current[index]) return;
    current[index] = { ...current[index], ...patch };
    setEditingEvent({ ...editingEvent, custom_questions: current });
  };

  const handleMoveCustomQuestion = (index: number, dir: -1 | 1) => {
    const current = Array.isArray(editingEvent.custom_questions)
      ? [...editingEvent.custom_questions]
      : [];
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    setEditingEvent({ ...editingEvent, custom_questions: current });
  };

  const handleRemoveCustomQuestion = (index: number) => {
    const current = Array.isArray(editingEvent.custom_questions)
      ? [...editingEvent.custom_questions]
      : [];
    current.splice(index, 1);
    setEditingEvent({ ...editingEvent, custom_questions: current });
  };

  // Helper to manage frame_printing_config inside editingEvent
  const updateEventFrameConfig = (
    updater: (prev: FramePrintingConfig) => FramePrintingConfig
  ) => {
    const current: FramePrintingConfig = editingEvent.frame_printing_config || {
      enabled: false,
      title: "Archival Gallery Frame Printing",
      description:
        "Preserve your graduation portrait in an archival exhibition-grade frame. Masterfully mounted, matted, and delivered ready to hang.",
      max_quantity: 5,
      instructions:
        "Frames are handcrafted and delivered within 10–14 business days after your photo selection is finalized.",
      frame_types: [],
    };
    const updated = updater(current);
    setEditingEvent({
      ...editingEvent,
      frame_printing_config: updated,
    });
  };

  const handleAddFrameType = () => {
    if (!newFrameName.trim() || !newFrameDim.trim() || !newFramePrice) return;
    const newId = `frame_${Date.now()}`;
    updateEventFrameConfig((prev) => ({
      ...prev,
      frame_types: [
        ...(prev.frame_types || []),
        {
          id: newId,
          name: newFrameName.trim(),
          dimensions: newFrameDim.trim(),
          price: Number(newFramePrice) || 0,
          description: newFrameDesc.trim(),
          is_active: true,
        },
      ],
    }));
    setNewFrameName("");
    setNewFrameDim("");
    setNewFramePrice(2200);
    setNewFrameDesc("");
  };

  const handleRemoveFrameType = (frameId: string) => {
    updateEventFrameConfig((prev) => ({
      ...prev,
      frame_types: (prev.frame_types || []).filter((f) => f.id !== frameId),
    }));
  };

  const handleToggleFrameTypeActive = (frameId: string) => {
    updateEventFrameConfig((prev) => ({
      ...prev,
      frame_types: (prev.frame_types || []).map((f) =>
        f.id === frameId ? { ...f, is_active: !f.is_active } : f
      ),
    }));
  };

  // Dedicated Package CRUD Operations
  const handleOpenCreatePackageForEvent = (eventId: string) => {
    setIsNewPackageModal(true);
    setPackageSaveError(null);
    setEditingPackageModal({
      event_id: eventId,
      service_id: null,
      name: "",
      subtitle: "",
      description:
        "Exclusive portraiture session with professional editorial lighting and retouching.",
      duration_mins: editingEvent.default_slot_duration_mins || 30,
      price_label: "BDT 5,000",
      price_numeric: 5000,
      currency: "BDT",
      deliverables: [
        "15 Edited High-Resolution Portraits",
        "Private Online Delivery Gallery",
        "Full Print Rights",
      ],
      inclusions: [
        "Professional Studio Lighting",
        "Academic Gown & Cap Assistance",
      ],
      restrictions: "Valid graduation gown pass required for campus entry.",
      instructions: "Please arrive 10 minutes prior to your scheduled session.",
      frame_printing_enabled: true,
      is_active: true,
      is_featured: false,
      sort_order:
        (eventsData.packages.filter((p) => p.event_id === eventId).length || 0) +
        1,
    });
  };

  const handleOpenEditPackage = (pkg: PhotographyPackage) => {
    setIsNewPackageModal(false);
    setPackageSaveError(null);
    setEditingPackageModal({
      ...pkg,
      price_numeric: pkg.price_numeric ?? 0,
      deliverables: Array.isArray(pkg.deliverables) ? pkg.deliverables : [],
      inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
    });
  };

  const handleSavePackageModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackageModal || !editingPackageModal.name) return;
    setPackageSaveLoading(true);
    setPackageSaveError(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "package",
          data: {
            ...editingPackageModal,
            price_numeric: Number(editingPackageModal.price_numeric) || 0,
            duration_mins: Number(editingPackageModal.duration_mins) || 30,
            currency: editingPackageModal.currency || "BDT",
            sort_order: Number(editingPackageModal.sort_order) || 0,
            deliverables: Array.isArray(editingPackageModal.deliverables)
              ? editingPackageModal.deliverables
              : String(editingPackageModal.deliverables || "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
            inclusions: Array.isArray(editingPackageModal.inclusions)
              ? editingPackageModal.inclusions
              : String(editingPackageModal.inclusions || "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPackageSaveError(json.error || "Failed to save package.");
        return;
      }
      setEditingPackageModal(null);
      await loadEventsAndScheduling();
    } catch (err: any) {
      setPackageSaveError(err.message || "Failed to save package.");
    } finally {
      setPackageSaveLoading(false);
    }
  };

  const handleDuplicatePackage = async (packageId: string) => {
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "duplicate_package",
          package_id: packageId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to duplicate package.");
        return;
      }
      await loadEventsAndScheduling();
    } catch (err: any) {
      alert(err.message || "Failed to duplicate package.");
    }
  };

  const handleReorderPackage = async (
    pkg: PhotographyPackage,
    direction: -1 | 1
  ) => {
    const siblingPackages = eventsData.packages
      .filter((p) =>
        pkg.event_id
          ? p.event_id === pkg.event_id
          : p.service_id === pkg.service_id
      )
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const currentIndex = siblingPackages.findIndex((p) => p.id === pkg.id);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= siblingPackages.length) return;

    const currentPkg = siblingPackages[currentIndex];
    const targetPkg = siblingPackages[targetIndex];

    const items = [
      { id: currentPkg.id, sort_order: targetIndex },
      { id: targetPkg.id, sort_order: currentIndex },
    ];

    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "reorder_packages",
        items,
      }),
    });
    await loadEventsAndScheduling();
  };

  const handleDeletePackage = async (pkg: PhotographyPackage) => {
    const confirmed = window.confirm(
      `Delete or archive package "${pkg.name}"?\n\nIf active or historical bookings reference this package, it will be automatically archived and deactivated rather than deleted, preserving client records.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/admin/events?entity=package&id=${encodeURIComponent(pkg.id)}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to delete package.");
        return;
      }
      alert(json.message || `Package processed: ${json.action || "completed"}`);
      await loadEventsAndScheduling();
    } catch (err: any) {
      alert(err.message || "Failed to delete package.");
    }
  };

  const handleCreateSessionAndGenerateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEventId = editingEvent.id || newSessionEventId;
    if (!targetEventId)
      return alert("Save the Special Booking Type first before adding sessions.");
    setEventConflictError(null);
    setEventSuccessMsg(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "session",
        data: {
          event_id: targetEventId,
          title: newSessionTitle,
          session_date: newSessionDate,
          start_time: newSessionStart,
          end_time: newSessionEnd,
          slot_duration_mins: Number(newSessionDuration),
          buffer_before_mins: 0,
          buffer_after_mins: Number(newSessionBuffer),
          capacity_per_slot: Number(newSessionCapacity),
          is_active: true,
          auto_generate_slots: true,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setEventConflictError(json.error || "Failed to create session.");
      return;
    }

    await loadEventsAndScheduling(targetEventId);
    setEventSuccessMsg(
      `Session created and ${json.generatedSlotsCount || 0} time slots generated!`
    );
  };

  const handleUpdateAccountCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);
    setSecFeedback(null);
    setSecLoading(true);
    try {
      const payload: Record<string, string> = {
        currentPassword: secCurrentPassword,
      };
      if (secUsername.trim()) {
        payload.username = secUsername.trim().toLowerCase();
      }
      if (secNewPassword) {
        payload.newPassword = secNewPassword;
        payload.confirmNewPassword = secConfirmPassword;
      }
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setSecError(json.error || "Failed to update administrator credentials.");
        return;
      }
      setSecCurrentPassword("");
      setSecNewPassword("");
      setSecConfirmPassword("");
      setSecFeedback(
        json.message || "Administrator credentials updated successfully."
      );
      await loadAdminProfile();
    } finally {
      setSecLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug =
      svcSlug ||
      svcName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "service",
        data: {
          name: svcName,
          slug,
          category: svcCat,
          short_description:
            svcDesc || "Editorial studio and on-location photography session.",
          full_description: svcDesc || null,
          base_duration_mins: Number(svcDuration),
          allowed_durations: [Number(svcDuration)],
          buffer_before_mins: 0,
          buffer_after_mins: Number(svcBufferAfter),
          min_notice_hours: Number(svcNoticeHours),
          max_advance_days: 90,
          cancellation_cutoff_hours: 24,
          reschedule_cutoff_hours: 24,
          default_location_type: svcLocationType || "studio",
          resource_pool: "primary_studio",
          max_concurrent_bookings: 1,
          is_active: true,
          sort_order: eventsData.services.length + 1,
        },
      }),
    });
    if (res.ok) {
      setSvcName("");
      setSvcSlug("");
      setSvcDesc("");
      await loadEventsAndScheduling();
    } else {
      const json = await res.json();
      alert(json.error || "Failed to save service.");
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "package",
        data: {
          name: pkgName,
          event_id:
            pkgTargetType === "event" ? pkgTargetId || editingEvent.id : null,
          service_id:
            pkgTargetType === "service"
              ? pkgTargetId || eventsData.services[0]?.id
              : null,
          description: pkgDesc,
          price_label: pkgPriceLabel,
          duration_mins: Number(pkgDuration),
          deliverables: pkgDeliverables
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          is_featured: false,
          is_active: true,
          sort_order: eventsData.packages.length + 1,
        },
      }),
    });
    if (res.ok) {
      setPkgName("");
      await loadEventsAndScheduling();
    } else {
      const json = await res.json();
      alert(json.error || "Failed to save package.");
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockStart || !blockEnd) return;
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "availability_block",
        data: {
          title: blockTitle,
          start_at: new Date(blockStart).toISOString(),
          end_at: new Date(blockEnd).toISOString(),
          reason: blockReason || null,
          resource_pool: "primary_studio",
        },
      }),
    });
    if (res.ok) {
      setBlockTitle("");
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      await loadEventsAndScheduling();
    }
  };

  const handleConnectGoogle = async () => {
    const res = await fetch("/api/admin/integrations/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect_oauth" }),
    });
    const json = await res.json();
    if (!res.ok)
      return alert(
        json.error || "Google OAuth is not configured in .env.local."
      );
    window.location.href = json.authUrl;
  };

  const handleSaveEmailTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/integrations/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_email_template",
        template: {
          id: selectedTemplateKey,
          name: tplName || selectedTemplateKey,
          subject_template: tplSubject,
          heading: tplHeading,
          intro_text: tplIntro,
          instructions_text: tplInstructions,
          footer_text: tplFooter,
          include_policy_summary: true,
          is_active: true,
        },
      }),
    });
    if (res.ok) {
      alert("Email template saved!");
      await loadIntegrationsAndCms();
    } else {
      const json = await res.json();
      alert(json.error || "Failed to save email template.");
    }
  };

  const handleSaveSiteSetting = async (key: string, value: any) => {
    const res = await fetch("/api/admin/cms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        value,
      }),
    });
    if (res.ok) {
      alert(`Saved setting: ${key}`);
      await loadIntegrationsAndCms();
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] shadow-2xs">
        {[
          {
            id: "dashboard",
            label: "Dashboard Overview",
            icon: LayoutDashboard,
          },
          { id: "bookings", label: "Bookings CRM", icon: BookOpen },
          { id: "calendar", label: "Studio Calendar", icon: CalendarIcon },
          {
            id: "scheduling",
            label: "Special Events & Services",
            icon: Sliders,
          },
          {
            id: "portfolio",
            label: "Portfolio & Storage",
            icon: ImageIcon,
          },
          {
            id: "integrations",
            label: "Google & Email Templates",
            icon: Mail,
          },
          { id: "cms", label: "Website Content & Leads", icon: Globe },
          {
            id: "security",
            label: "Account & Security",
            icon: ShieldCheck,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminMainTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                isActive
                  ? "bg-[#3A2008] text-[#FAF7F2] shadow-xs"
                  : "text-[#5C5449] hover:text-[#141210] hover:bg-[#FAF7F2]"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? "text-[#D9A673]" : "text-[#A66D35]"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
                Studio Operations Dashboard
              </h1>
              <p className="text-xs text-[#5C5449]">
                Live PostgreSQL metrics across IUB 27th Convocation and Traditional Bookings (Asia/Dhaka).
              </p>
            </div>
            <button
              type="button"
              onClick={loadOverview}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-semibold text-[#141210]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  overviewLoading ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </button>
          </div>

          {overview && !overview.schemaReady && (
            <div className="p-5 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/40 text-xs text-[#5C5449] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B86B19] shrink-0" />
              <div>
                <strong className="text-[#141210] block">
                  Database Migration Pending
                </strong>
                Run{" "}
                <code className="font-mono text-[#3A2008]">
                  supabase/schema.sql
                </code>{" "}
                in your Supabase SQL Editor to initialize the booking tables and RPCs.
              </div>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
              <span className="text-xs text-[#5C5449]">Upcoming</span>
              <div className="text-3xl font-extrabold font-mono text-[#3A2008] mt-1">
                {overview?.metrics?.upcomingBookings ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
              <span className="text-xs text-[#5C5449]">Confirmed</span>
              <div className="text-3xl font-extrabold font-mono text-[#2E6B4E] mt-1">
                {overview?.metrics?.confirmedBookings ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
              <span className="text-xs text-[#5C5449]">Convocation</span>
              <div className="text-3xl font-extrabold font-mono text-[#A66D35] mt-1">
                {overview?.metrics?.convocationBookings ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
              <span className="text-xs text-[#5C5449]">Traditional</span>
              <div className="text-3xl font-extrabold font-mono text-[#3A2008] mt-1">
                {overview?.metrics?.traditionalBookings ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
              <span className="text-xs text-[#5C5449]">Cancelled</span>
              <div className="text-3xl font-extrabold font-mono text-red-700 mt-1">
                {overview?.metrics?.cancelledBookings ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
              <span className="text-xs text-[#5C5449]">Failed Syncs</span>
              <div className="text-3xl font-extrabold font-mono text-[#141210] mt-1">
                {overview?.metrics?.failedIntegrationsCount ?? 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bookings by Service or Event */}
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141210]">
                Bookings by Service / Event
              </h3>
              {!overview?.byServiceOrEvent ||
              overview.byServiceOrEvent.length === 0 ? (
                <p className="text-xs text-[#5C5449]">
                  No bookings recorded yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overview.byServiceOrEvent.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs"
                    >
                      <span className="font-semibold text-[#141210]">
                        {item.title}
                      </span>
                      <span className="font-mono font-bold text-[#3A2008]">
                        {item.active ?? item.total ?? 0} active /{" "}
                        {item.total ?? 0} total
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming IUB Convocation Sessions */}
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#141210]">
                  Upcoming IUB Convocation Sessions
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("scheduling")}
                  className="text-xs font-semibold text-[#3A2008] underline"
                >
                  Configure Sessions →
                </button>
              </div>
              {!overview?.upcomingConvocationSessions ||
              overview.upcomingConvocationSessions.length === 0 ? (
                <p className="text-xs text-[#5C5449]">
                  No upcoming convocation sessions configured yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overview.upcomingConvocationSessions.map(
                    (sess: EventSession) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#141210]">
                            {sess.title}
                          </div>
                          <div className="text-[#5C5449] font-mono">
                            {sess.session_date} ({sess.start_time.slice(0, 5)} -{" "}
                            {sess.end_time.slice(0, 5)})
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-[#F4EFE6] text-[#3A2008] font-mono">
                          {sess.slot_duration_mins}m / cap{" "}
                          {sess.capacity_per_slot}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS MANAGEMENT */}
      {activeTab === "bookings" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
                Bookings Management
              </h1>
              <p className="text-xs text-[#5C5449]">
                Search, filter, create, reschedule, cancel, or inspect reservations and integration logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateBookingModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Create Booking for Client</span>
              </button>

              <button
                type="button"
                onClick={handleExportBookingsCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] text-[#141210] border border-[#D5CCB4] text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 text-[#A66D35]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 text-[#877D70] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference, client, email, phone, student ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210]"
              />
            </div>

            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210]"
            >
              <option value="all">All Booking Types</option>
              <option value="convocation">IUB Convocation</option>
              <option value="traditional">Traditional Photography</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210]"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full px-2 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[11px] text-[#141210]"
                title="From Date"
              />
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full px-2 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[11px] text-[#141210]"
                title="To Date"
              />
            </div>
          </div>

          {/* Bookings Table */}
          <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E5DEC9] text-[#5C5449] font-mono uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Ref & Type</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Event / Service & Package</th>
                    <th className="py-3.5 px-4">Date & Time (Asia/Dhaka)</th>
                    <th className="py-3.5 px-4">Duration & Extra</th>
                    <th className="py-3.5 px-4">Total (BDT)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DEC9]">
                  {bookingsLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-[#5C5449]"
                      >
                        Loading bookings...
                      </td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-[#5C5449]"
                      >
                        No bookings match the current filters.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-[#FAF7F2]/70 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-[#3A2008]">
                            {b.booking_ref}
                          </div>
                          <span className="text-[10px] font-mono uppercase text-[#A66D35]">
                            {b.booking_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#141210]">
                            {b.client_name}
                          </div>
                          <div className="text-[11px] text-[#5C5449]">
                            {b.client_email}
                          </div>
                          <div className="text-[11px] font-mono text-[#877D70]">
                            {b.client_phone}
                            {b.student_id ? ` • ID: ${b.student_id}` : ""}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#141210]">
                            {b.service_or_event_title}
                          </div>
                          {b.package_name && (
                            <div className="text-[11px] text-[#5C4028]">
                              {b.package_name}
                              {b.package_price_label
                                ? ` (${b.package_price_label})`
                                : ""}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#141210]">
                          {formatDhakaDateTime(b.start_at)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs font-bold text-[#141210]">
                            {b.duration_mins || 30} mins
                          </div>
                          {b.frame_printing_selected ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B86B19] font-mono text-[10px] font-semibold border border-[#F59E0B]/30">
                              🖼️ {b.frame_type_name || "Frame Print"} (x{b.frame_quantity || 1})
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 text-[10px] text-[#877D70]">
                              Digital Only
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-[#3A2008]">
                          ৳{((b.total_price != null ? b.total_price : b.package_base_price) || 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-semibold ${
                              b.status === "confirmed" ||
                              b.status === "rescheduled"
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
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openBookingInspector(b.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#3A2008] text-[#141210] hover:text-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDIO CALENDAR (DAY, WEEK, MONTH VIEWS) */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF] p-6 rounded-3xl border border-[#E5DEC9]">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-[#141210]">
                Unified Studio & Convocation Calendar
              </h1>
              <p className="text-xs text-[#5C5449]">
                Click any booking card to open its full inspector modal without losing your current calendar view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* View Switcher: Day / Week / Month */}
              <div className="inline-flex rounded-xl bg-[#FAF7F2] p-1 border border-[#E5DEC9]">
                {(["day", "week", "month"] as CalendarViewMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCalendarMode(mode)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        calendarMode === mode
                          ? "bg-[#3A2008] text-[#FAF7F2]"
                          : "text-[#5C5449] hover:text-[#141210]"
                      }`}
                    >
                      {mode}
                    </button>
                  )
                )}
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    shiftCalendarDate(
                      calendarMode === "day"
                        ? -1
                        : calendarMode === "week"
                        ? -7
                        : -30
                    )
                  }
                  className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={calendarFocalDate}
                  onChange={(e) =>
                    e.target.value && setCalendarFocalDate(e.target.value)
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono text-[#141210]"
                />
                <button
                  type="button"
                  onClick={() =>
                    shiftCalendarDate(
                      calendarMode === "day"
                        ? 1
                        : calendarMode === "week"
                        ? 7
                        : 30
                    )
                  }
                  className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-5 px-4 text-xs text-[#5C5449]">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#3A2008]" />
              <span>IUB Convocation Booking</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#2E6B4E]" />
              <span>Traditional Photography Booking</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#B86B19]" />
              <span>Blocked / Unavailable Period</span>
            </span>
          </div>

          {/* Render Day, Week, or Month View */}
          {(() => {
            const focal = new Date(`${calendarFocalDate}T00:00:00+06:00`);
            const daysToRender: string[] = [];

            if (calendarMode === "day") {
              daysToRender.push(calendarFocalDate);
            } else if (calendarMode === "week") {
              const startOfWeek = new Date(focal);
              startOfWeek.setUTCDate(
                startOfWeek.getUTCDate() - startOfWeek.getUTCDay()
              );
              for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setUTCDate(d.getUTCDate() + i);
                daysToRender.push(formatDhakaDateISO(d));
              }
            } else {
              const year = parseInt(calendarFocalDate.slice(0, 4), 10);
              const monthIndex =
                parseInt(calendarFocalDate.slice(5, 7), 10) - 1;
              const daysInMonth = new Date(
                Date.UTC(year, monthIndex + 1, 0)
              ).getUTCDate();
              for (let d = 1; d <= daysInMonth; d++) {
                daysToRender.push(
                  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
                    d
                  ).padStart(2, "0")}`
                );
              }
            }

            return (
              <div
                className={`grid gap-4 ${
                  calendarMode === "day"
                    ? "grid-cols-1"
                    : calendarMode === "week"
                    ? "grid-cols-1 md:grid-cols-7"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {daysToRender.map((dateStr) => {
                  const dayBookings = bookings.filter(
                    (b) =>
                      b.status !== "cancelled" &&
                      formatDhakaDateISO(b.start_at) === dateStr
                  );
                  const dayBlocks = eventsData.blocks.filter(
                    (bl) => formatDhakaDateISO(bl.start_at) === dateStr
                  );

                  return (
                    <div
                      key={dateStr}
                      className="rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] p-4 space-y-3 min-h-[150px]"
                    >
                      <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-2">
                        <span className="font-mono text-xs font-bold text-[#141210]">
                          {dateStr}
                        </span>
                        <span className="text-[11px] text-[#877D70]">
                          {dayBookings.length} booking(s)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {dayBlocks.map((bl) => (
                          <div
                            key={bl.id}
                            className="p-2.5 rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/40 text-[#B86B19] text-xs space-y-0.5"
                          >
                            <div className="flex items-center gap-1 font-bold">
                              <Ban className="w-3 h-3" />
                              <span>BLOCKED: {bl.title}</span>
                            </div>
                            <div className="text-[10px] font-mono">
                              {formatDhakaTime(bl.start_at)} -{" "}
                              {formatDhakaTime(bl.end_at)}
                            </div>
                          </div>
                        ))}

                        {dayBookings.map((b) => {
                          const isConv = b.booking_type === "convocation";
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => openBookingInspector(b.id)}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all space-y-1 ${
                                isConv
                                  ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008] hover:bg-[#5C4028]"
                                  : "bg-[#EEF7F2] text-[#141210] border-[#2E6B4E]/30 hover:border-[#2E6B4E]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                                <span className="font-bold">
                                  {formatDhakaTime(b.start_at)}
                                </span>
                                <span>{b.booking_ref}</span>
                              </div>
                              <div className="font-bold truncate">
                                {b.client_name}
                              </div>
                              <div className="text-[10px] opacity-85 truncate">
                                {b.service_or_event_title}
                              </div>
                            </button>
                          );
                        })}

                        {dayBookings.length === 0 && dayBlocks.length === 0 && (
                          <div className="text-[11px] text-[#B8AFA0] py-4 text-center">
                            No scheduled items
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: SPECIAL EVENTS, SERVICES & AVAILABILITY */}
      {activeTab === "scheduling" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DEC9] pb-3">
            {[
              {
                id: "convocation",
                label: "Special Booking Types & Convocation",
              },
              { id: "services", label: "Traditional Photography Services" },
              { id: "packages", label: "Photography Packages" },
              { id: "hours", label: "Operating Hours & Blackout Dates" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSchedSubTab(st.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                  schedSubTab === st.id
                    ? "bg-[#3A2008] text-[#FAF7F2]"
                    : "bg-[#FFFFFF] text-[#5C5449] border border-[#E5DEC9]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {schedSubTab === "convocation" && (
            <div className="space-y-6">
              {/* Special Booking Types Switcher Bar */}
              <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35]">
                      Dynamic Special Booking Engine
                    </span>
                    <h2 className="text-xl font-extrabold text-[#141210]">
                      Manage Special Booking Types ({eventsData.events.length})
                    </h2>
                    <p className="text-xs text-[#5C5449]">
                      Create, duplicate, publish, pause, or archive any special event booking type with custom form questions and dedicated time-slot calendars.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartNewSpecialEvent}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Special Booking Type</span>
                    </button>
                    {editingEvent.id && (
                      <>
                        <button
                          type="button"
                          onClick={handleDuplicateEvent}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border border-[#D5CCB4] text-xs font-semibold"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#A66D35]" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteEvent}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Event Selector Pills */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {eventsData.events.map((ev) => {
                    const isSelected = editingEvent.id === ev.id;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setEditingEvent(ev);
                          setNewSessionEventId(ev.id);
                          setEventConflictError(null);
                          setEventSuccessMsg(null);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008] shadow-xs"
                            : "bg-[#FAF7F2] text-[#141210] border-[#E5DEC9] hover:border-[#A66D35]"
                        }`}
                      >
                        <span className="font-bold">{ev.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                            ev.status === "published"
                              ? "bg-[#EEF7F2] text-[#2E6B4E]"
                              : ev.status === "draft"
                              ? "bg-[#FFFBEB] text-[#B86B19]"
                              : "bg-[#F4EFE6] text-[#5C5449]"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </button>
                    );
                  })}
                  {!editingEvent.id && (
                    <span className="px-3.5 py-2 rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/40 text-[#B86B19] text-xs font-bold">
                      * Unsaved New Special Booking Type
                    </span>
                  )}
                </div>

                {editingEvent.slug && (
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#5C5449]">
                    <span className="font-mono">
                      Public Booking Route:{" "}
                      <a
                        href={`/book/special/${editingEvent.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3A2008] font-bold underline inline-flex items-center gap-1"
                      >
                        /book/special/{editingEvent.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                    {editingEvent.slug === "iub-27th-convocation" && (
                      <span className="font-mono">
                        Legacy Alias:{" "}
                        <a
                          href="/book/convocation"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#3A2008] font-bold underline inline-flex items-center gap-1"
                        >
                          /book/convocation
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </span>
                    )}
                  </div>
                )}

                {eventConflictError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                    <div>
                      <strong className="block font-bold">
                        Schedule / Conflict Protection Alert
                      </strong>
                      <span>{eventConflictError}</span>
                    </div>
                  </div>
                )}

                {eventSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-[#EEF7F2] border border-[#2E6B4E]/30 text-xs text-[#2E6B4E] flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{eventSuccessMsg}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left 7 Cols: Special Booking Type Full Form + Custom Questions Builder */}
                <form
                  onSubmit={handleSaveEvent}
                  className="lg:col-span-7 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
                    <h3 className="text-lg font-bold text-[#141210]">
                      {editingEvent.id
                        ? `Configure: ${editingEvent.title}`
                        : "Create New Special Booking Type"}
                    </h3>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#3A2008] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingEvent.is_featured_on_home)}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            is_featured_on_home: e.target.checked,
                          })
                        }
                      />
                      <span>Feature on Booking Hub</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingEvent.title || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingEvent((prev) => ({
                            ...prev,
                            title: val,
                            slug:
                              !prev.id && !prev.slug
                                ? val
                                    .toLowerCase()
                                    .replace(/[^a-z0-9-]+/g, "-")
                                    .replace(/(^-|-$)/g, "")
                                : prev.slug,
                          }));
                        }}
                        placeholder="e.g. IUB 27th Convocation Photography"
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">
                        URL Slug (/book/special/[slug]) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingEvent.slug || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            slug: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]+/g, "-"),
                          })
                        }
                        placeholder="e.g. nsu-convocation-2026"
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">
                        Event Category *
                      </label>
                      <select
                        value={editingEvent.category || "convocation"}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            category: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      >
                        {SPECIAL_EVENT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">
                        Publication Status *
                      </label>
                      <select
                        value={editingEvent.status || "draft"}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            status: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-semibold"
                      >
                        <option value="draft">Draft (Pre-Release)</option>
                        <option value="published">
                          Published (Live Bookings Open)
                        </option>
                        <option value="paused">
                          Paused (Temporarily Disabled)
                        </option>
                        <option value="closed">Closed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">
                        Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={editingEvent.subtitle || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            subtitle: e.target.value,
                          })
                        }
                        placeholder="Exclusive Graduation Portrait & Family Sessions"
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Venue / Campus Setup
                      </label>
                      <input
                        type="text"
                        value={editingEvent.venue || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            venue: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                  </div>

                  {/* Cover Image URL + Upload to Supabase Storage */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="font-semibold text-[#141210]">
                        Cover / Banner Image (Supabase Storage or URL)
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingEventCover
                            ? "Uploading..."
                            : "Upload Cover Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          onChange={handleUploadEventCover}
                          disabled={uploadingEventCover}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={editingEvent.hero_image_url || ""}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          hero_image_url: e.target.value,
                        })
                      }
                      placeholder="https://... or upload directly to portfolio-media bucket"
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono text-[11px]"
                    />
                  </div>

                  {/* Date Range & Time Window */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editingEvent.event_start_date || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            event_start_date: e.target.value || null,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={editingEvent.event_end_date || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            event_end_date: e.target.value || null,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Default Slot (m)
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={editingEvent.default_slot_duration_mins ?? 30}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            default_slot_duration_mins: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Slot Capacity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editingEvent.default_slot_capacity ?? 2}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            default_slot_capacity: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                  </div>

                  {/* Cutoff & Advance Rules */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">
                        Buffer After (m)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editingEvent.buffer_after_mins ?? 10}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            buffer_after_mins: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Min Notice (h)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editingEvent.min_notice_hours ?? 12}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            min_notice_hours: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Reschedule Cutoff (h)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editingEvent.reschedule_cutoff_hours ?? 48}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            reschedule_cutoff_hours: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Cancel Cutoff (h)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editingEvent.cancellation_cutoff_hours ?? 48}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            cancellation_cutoff_hours: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="font-semibold block mb-1">
                      Event Description & Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={editingEvent.description || ""}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">
                        Cancellation & Reschedule Policy
                      </label>
                      <textarea
                        rows={2}
                        value={editingEvent.cancellation_policy || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            cancellation_policy: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        Special Booking Restrictions (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={editingEvent.booking_restrictions || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            booking_restrictions: e.target.value || null,
                          })
                        }
                        placeholder="e.g. Valid university convocation gown pass required for campus entry."
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                  </div>

                  {/* Dynamic Custom Booking Form Questions Builder */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-[#141210]">
                          Custom Booking Form Questions (
                          {(editingEvent.custom_questions || []).length})
                        </h4>
                        <p className="text-[11px] text-[#5C5449]">
                          Configure event-specific intake fields (Short Text, Long Text, Dropdown, Single Choice, Multiple Choice).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomQuestion}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question</span>
                      </button>
                    </div>

                    {(editingEvent.custom_questions || []).length === 0 ? (
                      <div className="py-4 text-center text-[#877D70] text-[11px]">
                        No custom questions configured. Standard client contact fields will still be collected.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {(editingEvent.custom_questions || []).map(
                          (q, qIdx) => (
                            <div
                              key={qIdx}
                              className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] uppercase font-bold text-[#A66D35]">
                                  Question #{qIdx + 1} ({q.id})
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMoveCustomQuestion(qIdx, -1)
                                    }
                                    className="p-1 rounded bg-[#FAF7F2] hover:bg-[#F4EFE6]"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMoveCustomQuestion(qIdx, 1)
                                    }
                                    className="p-1 rounded bg-[#FAF7F2] hover:bg-[#F4EFE6]"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveCustomQuestion(qIdx)
                                    }
                                    className="p-1 rounded text-red-700 hover:bg-red-50"
                                    title="Remove Question"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-semibold text-[#5C5449] mb-0.5">
                                    Question Label *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={q.label}
                                    onChange={(e) => {
                                      const lbl = e.target.value;
                                      const autoId = lbl
                                        .toLowerCase()
                                        .replace(/[^a-z0-9_]+/g, "_")
                                        .replace(/(^_|_$)/g, "");
                                      handleUpdateCustomQuestion(qIdx, {
                                        label: lbl,
                                        id:
                                          q.id.startsWith("question_") && autoId
                                            ? autoId
                                            : q.id,
                                      });
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5C5449] mb-0.5">
                                    Field Type *
                                  </label>
                                  <select
                                    value={q.type || q.field_type || "short_text"}
                                    onChange={(e) =>
                                      handleUpdateCustomQuestion(qIdx, {
                                        type: e.target.value as any,
                                        field_type: e.target.value as any,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                                  >
                                    <option value="short_text">
                                      Short Text
                                    </option>
                                    <option value="long_text">Long Text</option>
                                    <option value="dropdown">
                                      Dropdown Select
                                    </option>
                                    <option value="single_choice">
                                      Single Choice (Radio)
                                    </option>
                                    <option value="multiple_choice">
                                      Multiple Choice (Checkboxes)
                                    </option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <div className="sm:col-span-2">
                                  <input
                                    type="text"
                                    value={q.placeholder || ""}
                                    onChange={(e) =>
                                      handleUpdateCustomQuestion(qIdx, {
                                        placeholder: e.target.value,
                                      })
                                    }
                                    placeholder="Placeholder or helper hint..."
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                                  />
                                </div>
                                <label className="inline-flex items-center gap-1.5 font-semibold text-[#141210] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(q.required)}
                                    onChange={(e) =>
                                      handleUpdateCustomQuestion(qIdx, {
                                        required: e.target.checked,
                                      })
                                    }
                                  />
                                  <span>Required Field</span>
                                </label>
                              </div>

                              {((q.type || q.field_type) === "dropdown" ||
                                (q.type || q.field_type) === "single_choice" ||
                                (q.type || q.field_type) === "multiple_choice") && (
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5C5449] mb-0.5">
                                    Options (comma-separated) *
                                  </label>
                                  <input
                                    type="text"
                                    value={(q.options || []).join(", ")}
                                    onChange={(e) =>
                                      handleUpdateCustomQuestion(qIdx, {
                                        options: e.target.value
                                          .split(",")
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    placeholder="Option 1, Option 2, Option 3"
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Archival Frame Printing Configuration */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#141210] text-sm">
                            Archival Frame Printing Add-on Option
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                              editingEvent.frame_printing_config?.enabled
                                ? "bg-[#EEF7F2] text-[#2E6B4E]"
                                : "bg-[#F4EFE6] text-[#877D70]"
                            }`}
                          >
                            {editingEvent.frame_printing_config?.enabled
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C5449]">
                          Offer optional museum-grade framed prints during booking checkout with custom frame sizes, prices, and limits.
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(
                            editingEvent.frame_printing_config?.enabled
                          )}
                          onChange={(e) =>
                            updateEventFrameConfig((prev) => ({
                              ...prev,
                              enabled: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#D5CCB4] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D5CCB4] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E6B4E]"></div>
                      </label>
                    </div>

                    {editingEvent.frame_printing_config?.enabled && (
                      <div className="space-y-4 pt-2 border-t border-[#E5DEC9]">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-[#5C5449] mb-1">
                              Section Title in Booking Flow *
                            </label>
                            <input
                              type="text"
                              value={
                                editingEvent.frame_printing_config?.title || ""
                              }
                              onChange={(e) =>
                                updateEventFrameConfig((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="e.g. Archival Gallery Frame Printing"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#5C5449] mb-1">
                              Max Quantity Per Session
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={
                                editingEvent.frame_printing_config
                                  ?.max_quantity ?? 5
                              }
                              onChange={(e) =>
                                updateEventFrameConfig((prev) => ({
                                  ...prev,
                                  max_quantity: Number(e.target.value),
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#5C5449] mb-1">
                              Description / Value Proposition
                            </label>
                            <textarea
                              rows={2}
                              value={
                                editingEvent.frame_printing_config
                                  ?.description || ""
                              }
                              onChange={(e) =>
                                updateEventFrameConfig((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="e.g. Masterfully framed and delivered ready to hang..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#5C5449] mb-1">
                              Production & Delivery Turnaround Instructions
                            </label>
                            <textarea
                              rows={2}
                              value={
                                editingEvent.frame_printing_config
                                  ?.instructions || ""
                              }
                              onChange={(e) =>
                                updateEventFrameConfig((prev) => ({
                                  ...prev,
                                  instructions: e.target.value,
                                }))
                              }
                              placeholder="e.g. Handcrafted and delivered within 10–14 business days..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9]"
                            />
                          </div>
                        </div>

                        {/* Frame Types List */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#141210]">
                              Configured Frame Sizes & Pricing (
                              {editingEvent.frame_printing_config?.frame_types
                                ?.length || 0}
                              )
                            </span>
                          </div>

                          {!editingEvent.frame_printing_config?.frame_types ||
                          editingEvent.frame_printing_config.frame_types
                            .length === 0 ? (
                            <div className="p-3 text-center text-[#877D70] bg-[#FFFFFF] rounded-xl border border-dashed border-[#D5CCB4]">
                              No frame options configured yet. Add frame styles below.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2.5">
                              {editingEvent.frame_printing_config.frame_types.map(
                                (ft) => (
                                  <div
                                    key={ft.id}
                                    className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#141210]">
                                          {ft.name}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-[10px] font-mono">
                                          {ft.dimensions}
                                        </span>
                                        <span className="font-mono font-bold text-[#A66D35]">
                                          ৳{(ft.price || 0).toLocaleString()} BDT
                                        </span>
                                      </div>
                                      {ft.description && (
                                        <p className="text-[11px] text-[#5C5449]">
                                          {ft.description}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(ft.is_active)}
                                          onChange={() =>
                                            handleToggleFrameTypeActive(ft.id)
                                          }
                                        />
                                        <span>Active</span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveFrameType(ft.id)
                                        }
                                        className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                                        title="Remove Frame Option"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {/* Add New Frame Option Form */}
                          <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-3 mt-2">
                            <span className="font-bold text-[#3A2008] text-[11px] block">
                              + Add New Frame Option
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] text-[#5C5449] mb-0.5">
                                  Frame Style / Name *
                                </label>
                                <input
                                  type="text"
                                  value={newFrameName}
                                  onChange={(e) =>
                                    setNewFrameName(e.target.value)
                                  }
                                  placeholder="e.g. Archival Wood Frame"
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#5C5449] mb-0.5">
                                  Dimensions / Size *
                                </label>
                                <input
                                  type="text"
                                  value={newFrameDim}
                                  onChange={(e) =>
                                    setNewFrameDim(e.target.value)
                                  }
                                  placeholder="e.g. 12x18 inches"
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#5C5449] mb-0.5">
                                  Price (BDT) *
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={newFramePrice}
                                  onChange={(e) =>
                                    setNewFramePrice(Number(e.target.value))
                                  }
                                  placeholder="2200"
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 items-center">
                              <input
                                type="text"
                                value={newFrameDesc}
                                onChange={(e) =>
                                  setNewFrameDesc(e.target.value)
                                }
                                placeholder="Material & finish description (e.g. Teak wood moulding with acid-free matboard)"
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]"
                              />
                              <button
                                type="button"
                                onClick={handleAddFrameType}
                                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-[#3A2008] text-[#FAF7F2] font-semibold text-[11px]"
                              >
                                Add Frame Style
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
                  >
                    {editingEvent.id
                      ? "Save Special Booking Type Settings"
                      : "Create & Save Special Booking Type"}
                  </button>
                </form>

                {/* Right 5 Cols: Session & Automatic Time Slot Generator for Selected Event */}
                <div className="lg:col-span-5 space-y-6">
                  <form
                    onSubmit={handleCreateSessionAndGenerateSlots}
                    className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4"
                  >
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#A66D35]">
                        Target Event: {editingEvent.title || "Unsaved Event"}
                      </span>
                      <h3 className="text-lg font-bold text-[#141210]">
                        Add Session & Auto-Generate Time Slots
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="font-semibold block mb-1">
                          Session Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={newSessionTitle}
                          onChange={(e) => setNewSessionTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">
                          Session Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={newSessionDate}
                          onChange={(e) => setNewSessionDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">
                          Slot Duration (mins)
                        </label>
                        <input
                          type="number"
                          min={10}
                          value={newSessionDuration}
                          onChange={(e) =>
                            setNewSessionDuration(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">
                          Start Time (BST)
                        </label>
                        <input
                          type="time"
                          required
                          value={newSessionStart}
                          onChange={(e) => setNewSessionStart(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">
                          End Time (BST)
                        </label>
                        <input
                          type="time"
                          required
                          value={newSessionEnd}
                          onChange={(e) => setNewSessionEnd(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="font-semibold block mb-1">
                          Buffer After (mins) & Capacity Per Slot
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={0}
                            value={newSessionBuffer}
                            onChange={(e) =>
                              setNewSessionBuffer(Number(e.target.value))
                            }
                            placeholder="Buffer (m)"
                            className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                          />
                          <input
                            type="number"
                            min={1}
                            value={newSessionCapacity}
                            onChange={(e) =>
                              setNewSessionCapacity(Number(e.target.value))
                            }
                            placeholder="Cap"
                            className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!editingEvent.id}
                      className="w-full py-2.5 rounded-xl bg-[#3A2008] disabled:opacity-50 text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
                    >
                      {editingEvent.id
                        ? "Create Session & Generate Slots"
                        : "Save Event First to Add Sessions"}
                    </button>
                  </form>

                  {/* Existing Sessions List for Active Event */}
                  <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-3">
                    {(() => {
                      const eventSessions = editingEvent.id
                        ? eventsData.sessions.filter(
                            (s) => s.event_id === editingEvent.id
                          )
                        : [];
                      const eventSlots = editingEvent.id
                        ? eventsData.slots.filter(
                            (sl) => sl.event_id === editingEvent.id
                          )
                        : [];
                      return (
                        <>
                          <h4 className="text-sm font-bold text-[#141210]">
                            Sessions for This Event ({eventSessions.length}) &
                            Time Slots ({eventSlots.length})
                          </h4>
                          {eventSessions.length === 0 ? (
                            <p className="text-xs text-[#5C5449]">
                              No sessions generated for this event yet.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {eventSessions.map((s) => (
                                <div
                                  key={s.id}
                                  className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-[#141210]">
                                      {s.title}
                                    </div>
                                    <div className="font-mono text-[#5C5449]">
                                      {s.session_date} •{" "}
                                      {s.start_time.slice(0, 5)}-
                                      {s.end_time.slice(0, 5)} (
                                      {s.slot_duration_mins}m +{" "}
                                      {s.buffer_after_mins}m buffer, cap{" "}
                                      {s.capacity_per_slot})
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setEventConflictError(null);
                                      const res = await fetch(
                                        `/api/admin/events?entity=session&id=${s.id}`,
                                        { method: "DELETE" }
                                      );
                                      const json = await res.json();
                                      if (!res.ok) {
                                        setEventConflictError(
                                          json.error ||
                                            "Cannot delete session with active bookings."
                                        );
                                        return;
                                      }
                                      await loadEventsAndScheduling(
                                        editingEvent.id
                                      );
                                    }}
                                    className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Dedicated Event Photography Packages Section for this Event */}
              {editingEvent.id && (
                <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#141210]">
                          Event Photography Packages
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono font-bold text-[#A66D35]">
                          {
                            eventsData.packages.filter(
                              (p) => p.event_id === editingEvent.id
                            ).length
                          }{" "}
                          packages
                        </span>
                      </div>
                      <p className="text-xs text-[#5C5449]">
                        Manage photography package options, session durations, deliverables, and prices specific to &ldquo;{editingEvent.title}&rdquo;.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenCreatePackageForEvent(editingEvent.id!)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Package for this Event</span>
                    </button>
                  </div>

                  {eventsData.packages.filter(
                    (p) => p.event_id === editingEvent.id
                  ).length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#877D70] bg-[#FAF7F2] rounded-2xl border border-dashed border-[#D5CCB4]">
                      No packages configured for this event. Click &ldquo;Create Package for this Event&rdquo; to add options (e.g. Standard, Premium).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {eventsData.packages
                        .filter((p) => p.event_id === editingEvent.id)
                        .sort(
                          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                        )
                        .map((pkg, idx, arr) => (
                          <div
                            key={pkg.id}
                            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                              pkg.is_active
                                ? "bg-[#FAF7F2] border-[#E5DEC9]"
                                : "bg-[#F4EFE6]/50 border-dashed border-[#D5CCB4] opacity-75"
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-base text-[#141210]">
                                    {pkg.name}
                                  </h4>
                                  {pkg.subtitle && (
                                    <p className="text-[11px] text-[#A66D35] font-medium">
                                      {pkg.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      handleReorderPackage(pkg, -1)
                                    }
                                    className="p-1 rounded bg-[#FFFFFF] border border-[#E5DEC9] disabled:opacity-30 hover:bg-[#F4EFE6]"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === arr.length - 1}
                                    onClick={() =>
                                      handleReorderPackage(pkg, 1)
                                    }
                                    className="p-1 rounded bg-[#FFFFFF] border border-[#E5DEC9] disabled:opacity-30 hover:bg-[#F4EFE6]"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-extrabold text-[#3A2008] font-mono">
                                  ৳{(pkg.price_numeric ?? 0).toLocaleString()}{" "}
                                  {pkg.currency || "BDT"}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-[10px] font-mono font-semibold text-[#5C5449]">
                                  ⏱️ {pkg.duration_mins} mins
                                </span>
                                {pkg.frame_printing_enabled !== false ? (
                                  <span className="px-2 py-0.5 rounded-full bg-[#EEF7F2] text-[#2E6B4E] text-[10px] font-semibold">
                                    Frame Eligible
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B86B19] text-[10px] font-semibold">
                                    Digital Only
                                  </span>
                                )}
                                {!pkg.is_active && (
                                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold">
                                    Archived / Inactive
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#5C5449] line-clamp-2">
                                {pkg.description}
                              </p>

                              {pkg.deliverables &&
                                pkg.deliverables.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {pkg.deliverables
                                      .slice(0, 3)
                                      .map((d, dIdx) => (
                                        <span
                                          key={dIdx}
                                          className="px-2 py-0.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] text-[10px] text-[#5C5449]"
                                        >
                                          ✓ {d}
                                        </span>
                                      ))}
                                    {pkg.deliverables.length > 3 && (
                                      <span className="px-2 py-0.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] text-[10px] text-[#877D70]">
                                        +{pkg.deliverables.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-[#E5DEC9]">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPackage(pkg)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] text-[#141210] border border-[#D5CCB4] text-xs font-semibold"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#A66D35]" />
                                <span>Edit</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDuplicatePackage(pkg.id)
                                  }
                                  className="p-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] text-[#5C5449] border border-[#E5DEC9]"
                                  title="Duplicate Package"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePackage(pkg)}
                                  className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700"
                                  title="Delete or Archive Package"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {schedSubTab === "services" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <form
                onSubmit={handleCreateService}
                className="lg:col-span-5 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4 text-xs"
              >
                <h3 className="text-lg font-bold text-[#141210]">
                  Add Traditional Photography Service
                </h3>
                <div>
                  <label className="font-semibold block mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={svcName}
                    onChange={(e) => setSvcName(e.target.value)}
                    placeholder="e.g. Executive Portrait & Headshot Session"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Category</label>
                    <input
                      type="text"
                      value={svcCat}
                      onChange={(e) => setSvcCat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Default Location Type
                    </label>
                    <select
                      value={svcLocationType}
                      onChange={(e) => setSvcLocationType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    >
                      <option value="studio">Studio</option>
                      <option value="on_location">On-Location</option>
                      <option value="hybrid">Hybrid (Studio or Venue)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Duration (mins)
                    </label>
                    <input
                      type="number"
                      value={svcDuration}
                      onChange={(e) => setSvcDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Buffer After (mins)
                    </label>
                    <input
                      type="number"
                      value={svcBufferAfter}
                      onChange={(e) =>
                        setSvcBufferAfter(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    Short Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={svcDesc}
                    onChange={(e) => setSvcDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold uppercase tracking-wider"
                >
                  Save Photography Service
                </button>
              </form>

              <div className="lg:col-span-7 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
                <h3 className="text-lg font-bold text-[#141210]">
                  Configured Traditional Services ({eventsData.services.length})
                </h3>
                <div className="space-y-3">
                  {eventsData.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-sm text-[#141210]">
                          {svc.name}
                        </div>
                        <div className="text-[#5C5449] font-mono mt-0.5">
                          {svc.category} • {svc.base_duration_mins}m +{" "}
                          {svc.buffer_after_mins}m buffer •{" "}
                          {svc.default_location_type}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(
                            `/api/admin/events?entity=service&id=${svc.id}`,
                            { method: "DELETE" }
                          );
                          await loadEventsAndScheduling();
                        }}
                        className="p-2 text-red-700 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {schedSubTab === "packages" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <form
                onSubmit={handleCreatePackage}
                className="lg:col-span-5 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4 text-xs"
              >
                <h3 className="text-lg font-bold text-[#141210]">
                  Create Package Option
                </h3>
                <div>
                  <label className="font-semibold block mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    placeholder="e.g. Graduate & Family Prestige"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">
                      Attach To
                    </label>
                    <select
                      value={pkgTargetType}
                      onChange={(e) => setPkgTargetType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    >
                      <option value="event">Convocation Event</option>
                      <option value="service">Traditional Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Target Item
                    </label>
                    <select
                      value={pkgTargetId}
                      onChange={(e) => setPkgTargetId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    >
                      {pkgTargetType === "event"
                        ? eventsData.events.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.title}
                            </option>
                          ))
                        : eventsData.services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Price Label *
                    </label>
                    <input
                      type="text"
                      required
                      value={pkgPriceLabel}
                      onChange={(e) => setPkgPriceLabel(e.target.value)}
                      placeholder="BDT 4,500"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Duration (mins)
                    </label>
                    <input
                      type="number"
                      value={pkgDuration}
                      onChange={(e) => setPkgDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    Deliverables (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={pkgDeliverables}
                    onChange={(e) => setPkgDeliverables(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold uppercase tracking-wider"
                >
                  Save Package
                </button>
              </form>

              <div className="lg:col-span-7 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#141210]">
                      All Configured Packages ({eventsData.packages.length})
                    </h3>
                    <p className="text-xs text-[#5C5449]">
                      Edit, duplicate, reorder, or archive packages across events and traditional services.
                    </p>
                  </div>

                  <select
                    value={packageFilterTarget}
                    onChange={(e) => setPackageFilterTarget(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold"
                  >
                    <option value="all">All Packages ({eventsData.packages.length})</option>
                    <optgroup label="Special Events">
                      {eventsData.events.map((ev) => (
                        <option key={ev.id} value={`event:${ev.id}`}>
                          {ev.title}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Traditional Services">
                      {eventsData.services.map((svc) => (
                        <option key={svc.id} value={`service:${svc.id}`}>
                          {svc.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {eventsData.packages
                  .filter((p) => {
                    if (packageFilterTarget === "all") return true;
                    if (packageFilterTarget.startsWith("event:")) {
                      return p.event_id === packageFilterTarget.replace("event:", "");
                    }
                    if (packageFilterTarget.startsWith("service:")) {
                      return p.service_id === packageFilterTarget.replace("service:", "");
                    }
                    return true;
                  })
                  .map((p, idx, arr) => {
                    const attachedEvent = eventsData.events.find(
                      (ev) => ev.id === p.event_id
                    );
                    const attachedService = eventsData.services.find(
                      (s) => s.id === p.service_id
                    );
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          p.is_active
                            ? "bg-[#FAF7F2] border-[#E5DEC9]"
                            : "bg-[#F4EFE6]/50 border-dashed border-[#D5CCB4] opacity-75"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#141210]">
                              {p.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-[10px] font-mono text-[#5C5449]">
                              {attachedEvent
                                ? `Event: ${attachedEvent.title}`
                                : attachedService
                                ? `Service: ${attachedService.name}`
                                : "Unattached"}
                            </span>
                            {!p.is_active && (
                              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="text-[#5C5449] font-mono flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[#3A2008]">
                              ৳{(p.price_numeric ?? 0).toLocaleString()} {p.currency || "BDT"} ({p.price_label})
                            </span>
                            <span>•</span>
                            <span>⏱️ {p.duration_mins} mins</span>
                            <span>•</span>
                            <span className={p.frame_printing_enabled !== false ? "text-[#2E6B4E]" : "text-[#B86B19]"}>
                              {p.frame_printing_enabled !== false ? "Frame Eligible" : "Digital Only"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleReorderPackage(p, -1)}
                            className="p-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] disabled:opacity-30 hover:bg-[#F4EFE6]"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => handleReorderPackage(p, 1)}
                            className="p-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] disabled:opacity-30 hover:bg-[#F4EFE6]"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditPackage(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] text-[#141210] border border-[#D5CCB4] text-xs font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#A66D35]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicatePackage(p.id)}
                            className="p-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] text-[#5C5449] border border-[#E5DEC9]"
                            title="Duplicate Package"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(p)}
                            className="p-1.5 text-red-700 hover:bg-red-50 rounded-xl"
                            title="Delete or Archive Package"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {schedSubTab === "hours" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Weekly Operating Hours */}
              <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4">
                <h3 className="text-lg font-bold text-[#141210]">
                  Weekly Studio Operating Hours (Asia/Dhaka)
                </h3>
                <div className="space-y-2.5">
                  {eventsData.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={rule.is_open}
                          onChange={async (e) => {
                            await fetch("/api/admin/events", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                entity: "availability_rules",
                                data: [{ ...rule, is_open: e.target.checked }],
                              }),
                            });
                            await loadEventsAndScheduling();
                          }}
                        />
                        <span className="font-bold text-[#141210] w-24">
                          {WEEKDAY_NAMES[rule.day_of_week]}
                        </span>
                      </div>
                      <span className="font-mono text-[#5C5449]">
                        {rule.is_open
                          ? `${rule.start_time.slice(0, 5)} - ${rule.end_time.slice(
                              0,
                              5
                            )}`
                          : "Closed"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blackout Blocks */}
              <div className="space-y-6">
                <form
                  onSubmit={handleCreateBlock}
                  className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4 text-xs"
                >
                  <h3 className="text-lg font-bold text-[#141210]">
                    Block Dates / Holidays / Unavailable Ranges
                  </h3>
                  <div>
                    <label className="font-semibold block mb-1">
                      Block Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={blockTitle}
                      onChange={(e) => setBlockTitle(e.target.value)}
                      placeholder="e.g. Studio Equipment Maintenance / Govt Holiday"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={blockStart}
                        onChange={(e) => setBlockStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={blockEnd}
                        onChange={(e) => setBlockEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold uppercase tracking-wider"
                  >
                    Add Blackout Period
                  </button>
                </form>

                <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-3">
                  <h4 className="text-sm font-bold text-[#141210]">
                    Active Blocked Periods ({eventsData.blocks.length})
                  </h4>
                  {eventsData.blocks.map((bl) => (
                    <div
                      key={bl.id}
                      className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#141210]">
                          {bl.title}
                        </div>
                        <div className="font-mono text-[#5C5449]">
                          {formatDhakaDateTime(bl.start_at)} →{" "}
                          {formatDhakaDateTime(bl.end_at)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(
                            `/api/admin/events?entity=availability_block&id=${bl.id}`,
                            { method: "DELETE" }
                          );
                          await loadEventsAndScheduling();
                        }}
                        className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: GOOGLE & EMAIL INTEGRATIONS */}
      {activeTab === "integrations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Google OAuth 2.0 Connection */}
          <div className="lg:col-span-5 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                  Google Workspace Sync
                </span>
                <h2 className="text-xl font-bold text-[#141210]">
                  Google Calendar & Gmail API
                </h2>
              </div>
              <Link2 className="w-5 h-5 text-[#3A2008]" />
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5C5449]">
                  OAuth Credentials in Env:
                </span>
                <span
                  className={`font-mono font-bold ${
                    googleIntegration?.status?.oauth_configured_in_env
                      ? "text-[#2E6B4E]"
                      : "text-[#B86B19]"
                  }`}
                >
                  {googleIntegration?.status?.oauth_configured_in_env
                    ? "Configured"
                    : "Not Set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5449]">
                  Connected Google Account:
                </span>
                <span className="font-mono font-bold text-[#141210]">
                  {googleIntegration?.status?.connected_email ||
                    "Not Connected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5449]">Target Calendar ID:</span>
                <span className="font-mono text-[#141210]">
                  {googleIntegration?.status?.calendar_id || "primary"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="px-5 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
              >
                {googleIntegration?.status?.connected
                  ? "Reconnect Google Account"
                  : "Connect Google Account (OAuth 2.0)"}
              </button>

              {googleIntegration?.status?.connected && (
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/admin/integrations/google", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "disconnect" }),
                    });
                    await loadIntegrationsAndCms();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Right: Email Template Editor */}
          <form
            onSubmit={handleSaveEmailTemplate}
            className="lg:col-span-7 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                  Transactional Gmail Templates
                </span>
                <h2 className="text-xl font-bold text-[#141210]">
                  Email Notification Template Editor
                </h2>
              </div>

              <select
                value={selectedTemplateKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setSelectedTemplateKey(key);
                  const found = emailTemplates.find((t) => t.id === key);
                  if (found) {
                    setTplName(found.name);
                    setTplSubject(found.subject_template);
                    setTplHeading(found.heading);
                    setTplIntro(found.intro_text);
                    setTplInstructions(found.instructions_text);
                    setTplFooter(found.footer_text);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-semibold text-[#141210]"
              >
                <option value="booking_confirmed">Booking Confirmed</option>
                <option value="booking_rescheduled">Booking Rescheduled</option>
                <option value="booking_cancelled">Booking Cancelled</option>
                <option value="booking_updated">Booking Updated</option>
                <option value="schedule_changed">Schedule Changed</option>
              </select>
            </div>

            <p className="text-[#5C5449]">
              Supported placeholders:{" "}
              <code className="font-mono">{"{{client_name}}"}</code>,{" "}
              <code className="font-mono">{"{{booking_ref}}"}</code>,{" "}
              <code className="font-mono">{"{{service_or_event_title}}"}</code>,{" "}
              <code className="font-mono">{"{{date_label}}"}</code>,{" "}
              <code className="font-mono">{"{{time_label}}"}</code>,{" "}
              <code className="font-mono">{"{{location}}"}</code>. All dynamic
              client values are HTML-escaped automatically.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">
                  Email Subject Template *
                </label>
                <input
                  type="text"
                  required
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">
                  Email Heading *
                </label>
                <input
                  type="text"
                  required
                  value={tplHeading}
                  onChange={(e) => setTplHeading(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">
                Intro Paragraph *
              </label>
              <textarea
                rows={3}
                required
                value={tplIntro}
                onChange={(e) => setTplIntro(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">
                Arrival & Preparation Instructions
              </label>
              <textarea
                rows={3}
                value={tplInstructions}
                onChange={(e) => setTplInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Footer Text *</label>
              <input
                type="text"
                required
                value={tplFooter}
                onChange={(e) => setTplFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold uppercase tracking-wider"
            >
              Save Email Template
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: WEBSITE CONTENT, PORTFOLIO, PRINT & LEADS CMS */}
      {activeTab === "cms" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DEC9] pb-3">
            {[
              { id: "site_settings", label: "Site & Booking Copy" },
              { id: "portfolio", label: "Portfolio Works CMS" },
              { id: "products", label: "Print Merchandise CMS" },
              { id: "leads", label: "Custom Project Leads CRM" },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setCmsSubTab(sub.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                  cmsSubTab === sub.id
                    ? "bg-[#3A2008] text-[#FAF7F2]"
                    : "bg-[#FFFFFF] text-[#5C5449] border border-[#E5DEC9]"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {cmsSubTab === "site_settings" && (
            <div className="max-w-3xl rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4 text-xs">
              <h3 className="text-lg font-bold text-[#141210]">
                Public Website & Booking Copy Settings
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="font-semibold block mb-1">
                    Booking Entry Page Subheading
                  </label>
                  <textarea
                    rows={3}
                    value={siteSettings.booking_page?.subheading || ""}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        booking_page: {
                          ...(siteSettings.booking_page || {}),
                          subheading: e.target.value,
                        },
                      })
                    }
                    placeholder="Select your photography booking pathway below..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveSiteSetting(
                        "booking_page",
                        siteSettings.booking_page || {}
                      )
                    }
                    className="mt-2 px-4 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold"
                  >
                    Save Booking Page Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {cmsSubTab === "portfolio" && <PortfolioCMSClient />}
          {cmsSubTab === "products" && <ProductsCMSClient />}
          {cmsSubTab === "leads" && <LeadsCRMClient />}
        </div>
      )}

      {/* TAB 7: PORTFOLIO & SUPABASE STORAGE MEDIA MANAGER */}
      {activeTab === "portfolio" && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
              Supabase Storage Bucket: portfolio-media
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141210]">
              Portfolio Works & Image Storage Manager
            </h1>
            <p className="text-xs text-[#5C5449]">
              Upload multi-image galleries directly from your computer to Supabase Storage, preview before saving, reorder frames, edit captions & alt text, and manage cover thumbnails.
            </p>
          </div>
          <PortfolioCMSClient />
        </div>
      )}

      {/* TAB 8: ACCOUNT & SECURITY SETTINGS */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                  Verified Supabase Auth Identity
                </span>
                <h2 className="text-xl font-bold text-[#141210]">
                  Administrator Profile
                </h2>
              </div>
              <ShieldCheck className="w-6 h-6 text-[#3A2008]" />
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5C5449]">Current Username:</span>
                <span className="font-mono font-bold text-[#3A2008]">
                  {adminProfile?.username
                    ? `@${adminProfile.username}`
                    : "Not Set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5449]">Auth Email:</span>
                <span className="font-mono font-semibold text-[#141210]">
                  {adminProfile?.email || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5449]">Role:</span>
                <span className="px-2 py-0.5 rounded bg-[#EEF7F2] text-[#2E6B4E] font-mono text-[10px] uppercase font-bold">
                  Administrator
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5449]">Credentials Updated:</span>
                <span className="font-mono text-[#5C5449]">
                  {adminProfile?.credentialsChangedAt
                    ? formatDhakaDateTime(adminProfile.credentialsChangedAt)
                    : "Initial Setup"}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#5C5449] leading-relaxed">
              You can sign in to the OFFPRINT Admin Portal using either your{" "}
              <strong className="text-[#141210]">@username</strong> or your
              email address. Changing your username or password requires
              confirming your current password.
            </p>
          </div>

          <form
            onSubmit={handleUpdateAccountCredentials}
            className="lg:col-span-7 rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4 text-xs"
          >
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                Account & Security
              </span>
              <h2 className="text-xl font-bold text-[#141210]">
                Update Administrator Username & Password
              </h2>
            </div>

            {secError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{secError}</span>
              </div>
            )}

            {secFeedback && (
              <div className="p-3.5 rounded-xl bg-[#EEF7F2] border border-[#2E6B4E]/30 text-[#2E6B4E] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{secFeedback}</span>
              </div>
            )}

            <div>
              <label className="font-semibold block mb-1">
                Administrator Username (3-32 lowercase letters, numbers, ., _, -)
              </label>
              <input
                type="text"
                value={secUsername}
                onChange={(e) =>
                  setSecUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "")
                  )
                }
                placeholder="offprint_admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={secNewPassword}
                  onChange={(e) => setSecNewPassword(e.target.value)}
                  placeholder="Min 8 chars, upper + lower + number"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={secConfirmPassword}
                  onChange={(e) => setSecConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5DEC9]">
              <label className="font-semibold block mb-1 text-[#3A2008]">
                Current Password (Required to Authorize Changes) *
              </label>
              <input
                type="password"
                required
                value={secCurrentPassword}
                onChange={(e) => setSecCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CCB4]"
              />
            </div>

            <button
              type="submit"
              disabled={secLoading}
              className="px-6 py-3 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] disabled:opacity-50 text-[#FAF7F2] font-semibold uppercase tracking-wider"
            >
              {secLoading
                ? "Verifying & Updating..."
                : "Save Username & Password"}
            </button>
          </form>
        </div>
      )}

      {/* SHARED MODAL: BOOKING INSPECTOR */}
      {inspectingBookingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setInspectingBookingId(null)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                  Booking Inspector & Audit Docket
                </span>
                <h2 className="text-2xl font-bold text-[#141210]">
                  {inspectedBooking?.booking_ref || "Loading..."}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectingBookingId(null)}
                className="p-2 rounded-full bg-[#FAF7F2] border border-[#E5DEC9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectorFeedback && (
              <div className="p-3.5 rounded-xl bg-[#F4EFE6] border border-[#D5CCB4] text-xs font-semibold text-[#3A2008]">
                {inspectorFeedback}
              </div>
            )}

            {inspectorLoading || !inspectedBooking ? (
              <div className="py-12 text-center text-xs text-[#5C5449]">
                Loading booking details...
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Status & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9]">
                  <div className="space-y-0.5">
                    <span className="text-[#5C5449]">Current Status:</span>
                    <div className="text-sm font-extrabold uppercase font-mono text-[#3A2008]">
                      {inspectedBooking.status}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleBookingAdminAction({
                          action: "update_status",
                          status: "confirmed",
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#EEF7F2] text-[#2E6B4E] font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBookingAdminAction({
                          action: "update_status",
                          status: "completed",
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold"
                    >
                      Mark Completed
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBookingAdminAction({
                          action: "cancel",
                          reason: "Cancelled by studio administrator",
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-red-50 text-red-700 font-semibold"
                    >
                      Cancel & Release Slot
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBookingAdminAction({
                          action: "retry_integrations",
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D5CCB4] text-[#141210] font-semibold"
                    >
                      Retry Email & Calendar Sync
                    </button>
                  </div>
                </div>

                {/* Session Pricing & Production Docket */}
                <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35] font-bold">
                        Session Pricing & Production Docket
                      </span>
                      <h3 className="font-bold text-sm text-[#141210]">
                        Package & Add-on Breakdown
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#5C5449] block">
                        Total Investment
                      </span>
                      <span className="text-xl font-mono font-extrabold text-[#3A2008]">
                        ৳
                        {(
                          (inspectedBooking.total_price != null
                            ? inspectedBooking.total_price
                            : inspectedBooking.package_base_price) || 0
                        ).toLocaleString()}{" "}
                        BDT
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9]">
                      <div className="text-[10px] font-mono uppercase text-[#877D70]">
                        Photography Package
                      </div>
                      <div className="font-bold text-[#141210] mt-0.5 text-xs">
                        {inspectedBooking.package_name || "Standard Session"}
                      </div>
                      <div className="text-[11px] font-mono text-[#5C4028] mt-1">
                        ৳
                        {(
                          inspectedBooking.package_base_price || 0
                        ).toLocaleString()}{" "}
                        BDT • {inspectedBooking.duration_mins || 30} mins
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9]">
                      <div className="text-[10px] font-mono uppercase text-[#877D70]">
                        Archival Frame Printing
                      </div>
                      {inspectedBooking.frame_printing_selected ? (
                        <>
                          <div className="font-bold text-[#141210] mt-0.5 text-xs">
                            {inspectedBooking.frame_type_name || "Custom Frame"}
                          </div>
                          <div className="text-[11px] font-mono text-[#A66D35] mt-1">
                            Qty: {inspectedBooking.frame_quantity || 1} × ৳
                            {(
                              inspectedBooking.frame_unit_price || 0
                            ).toLocaleString()}{" "}
                            = ৳
                            {(
                              inspectedBooking.frame_total_price || 0
                            ).toLocaleString()}{" "}
                            BDT
                          </div>
                        </>
                      ) : (
                        <div className="font-medium text-[#5C5449] mt-0.5 text-xs">
                          Digital Deliverables Only
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9]">
                      <div className="text-[10px] font-mono uppercase text-[#877D70]">
                        Resource Allocation
                      </div>
                      <div className="font-bold text-[#141210] mt-0.5 text-xs font-mono">
                        {inspectedBooking.resource_pool || "primary_studio"}
                      </div>
                      <div className="text-[11px] text-[#5C5449] mt-1">
                        Buffer: +{inspectedBooking.buffer_after_mins || 10} mins
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Duration, Package & Extra Frames Modifier */}
                {(() => {
                  const currentEvent = eventsData.events.find(
                    (ev) => ev.id === inspectedBooking.event_id
                  );
                  const availableFrameTypes =
                    currentEvent?.frame_printing_config?.frame_types?.filter(
                      (f) => f.is_active
                    ) || [];
                  const chosenPackage = eventsData.packages.find(
                    (p) => p.id === modifierPackageId
                  );
                  const chosenFrame = availableFrameTypes.find(
                    (f) => f.id === modifierFrameTypeId
                  );

                  const previewBasePrice =
                    chosenPackage?.price_numeric ??
                    inspectedBooking.package_base_price ??
                    0;
                  const previewFrameUnitPrice =
                    modifierFrameSelected && chosenFrame
                      ? chosenFrame.price
                      : 0;
                  const previewFrameTotal = modifierFrameSelected
                    ? previewFrameUnitPrice * modifierFrameQty
                    : 0;
                  const previewGrandTotal = previewBasePrice + previewFrameTotal;

                  return (
                    <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-[#141210] text-sm">
                            Session Duration, Package & Extra Frames Modifier
                          </h4>
                          <p className="text-[11px] text-[#5C5449]">
                            Change assigned photography package, adjust booking duration, or attach/modify archival frame prints with live schedule verification.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="font-semibold block mb-1">
                            Assigned Package
                          </label>
                          <select
                            value={modifierPackageId}
                            onChange={(e) => {
                              const newPkgId = e.target.value;
                              setModifierPackageId(newPkgId);
                              const found = eventsData.packages.find(
                                (p) => p.id === newPkgId
                              );
                              if (found) {
                                setModifierDuration(found.duration_mins);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9]"
                          >
                            <option value="">
                              -- Retain Current Package --
                            </option>
                            {eventsData.packages
                              .filter(
                                (p) =>
                                  !inspectedBooking.event_id ||
                                  p.event_id === inspectedBooking.event_id
                              )
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (৳
                                  {p.price_numeric?.toLocaleString() ??
                                    p.price_label}{" "}
                                  • {p.duration_mins}m)
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold block mb-1">
                            Duration Override (mins)
                          </label>
                          <input
                            type="number"
                            min={10}
                            step={5}
                            value={modifierDuration}
                            onChange={(e) =>
                              setModifierDuration(Number(e.target.value))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono"
                          />
                        </div>

                        <div>
                          <label className="font-semibold block mb-1">
                            Archival Frame Printing
                          </label>
                          <div className="pt-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#141210]">
                              <input
                                type="checkbox"
                                checked={modifierFrameSelected}
                                onChange={(e) => {
                                  setModifierFrameSelected(e.target.checked);
                                  if (
                                    e.target.checked &&
                                    !modifierFrameTypeId
                                  ) {
                                    const firstFrame = availableFrameTypes[0];
                                    if (firstFrame)
                                      setModifierFrameTypeId(firstFrame.id);
                                  }
                                }}
                              />
                              <span>Include Frame Print</span>
                            </label>
                          </div>
                        </div>

                        {modifierFrameSelected && (
                          <>
                            <div>
                              <label className="font-semibold block mb-1">
                                Frame Style & Size
                              </label>
                              <select
                                value={modifierFrameTypeId}
                                onChange={(e) =>
                                  setModifierFrameTypeId(e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9]"
                              >
                                {availableFrameTypes.map((ft) => (
                                  <option key={ft.id} value={ft.id}>
                                    {ft.name} ({ft.dimensions}) — ৳
                                    {ft.price.toLocaleString()}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="font-semibold block mb-1">
                                Frame Quantity
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={modifierFrameQty}
                                onChange={(e) =>
                                  setModifierFrameQty(
                                    Math.max(1, Number(e.target.value))
                                  )
                                }
                                className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E5DEC9]">
                        <div className="text-xs font-mono">
                          <span className="text-[#5C5449]">
                            Recalculated Total Preview:{" "}
                          </span>
                          <span className="font-bold text-[#3A2008] text-sm">
                            ৳{previewGrandTotal.toLocaleString()} BDT
                          </span>
                          {modifierFrameSelected && (
                            <span className="text-[#877D70] ml-2">
                              (Base: ৳{previewBasePrice.toLocaleString()} +
                              Frames: ৳{previewFrameTotal.toLocaleString()})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!inspectedBooking) return;
                            await handleBookingAdminAction({
                              action: "update_package_and_pricing",
                              duration_mins: Number(modifierDuration),
                              package_id: modifierPackageId || null,
                              package_name:
                                chosenPackage?.name ||
                                inspectedBooking.package_name,
                              package_price_label:
                                chosenPackage?.price_label ||
                                inspectedBooking.package_price_label,
                              package_base_price: previewBasePrice,
                              frame_printing_selected: modifierFrameSelected,
                              frame_type_id: modifierFrameSelected
                                ? modifierFrameTypeId
                                : null,
                              frame_type_name:
                                modifierFrameSelected && chosenFrame
                                  ? `${chosenFrame.name} (${chosenFrame.dimensions})`
                                  : null,
                              frame_quantity: modifierFrameSelected
                                ? modifierFrameQty
                                : 0,
                              frame_unit_price: modifierFrameSelected
                                ? previewFrameUnitPrice
                                : 0,
                              frame_total_price: modifierFrameSelected
                                ? previewFrameTotal
                                : 0,
                              total_price: previewGrandTotal,
                            });
                          }}
                          className="px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold text-xs transition-colors"
                        >
                          Apply Session, Extras & Duration Changes
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Editable Booking Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={inspectedBooking.client_name}
                      onChange={(e) =>
                        setInspectedBooking({
                          ...inspectedBooking,
                          client_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Client Email
                    </label>
                    <input
                      type="email"
                      value={inspectedBooking.client_email}
                      onChange={(e) =>
                        setInspectedBooking({
                          ...inspectedBooking,
                          client_email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Client Phone
                    </label>
                    <input
                      type="text"
                      value={inspectedBooking.client_phone}
                      onChange={(e) =>
                        setInspectedBooking({
                          ...inspectedBooking,
                          client_phone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      handleBookingAdminAction({
                        action: "update_details",
                        client_name: inspectedBooking.client_name,
                        client_email: inspectedBooking.client_email,
                        client_phone: inspectedBooking.client_phone,
                        location: inspectedBooking.location,
                        client_notes: inspectedBooking.client_notes,
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold"
                  >
                    Save Client Details
                  </button>
                </div>

                {/* Custom Booking Form Responses (Special Booking Types) */}
                {inspectedBooking.custom_fields &&
                  Object.keys(inspectedBooking.custom_fields).length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2.5">
                      <div className="font-bold text-[#141210]">
                        Custom Event Booking Form Responses
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(inspectedBooking.custom_fields).map(
                          ([key, val]) => (
                            <div
                              key={key}
                              className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9]"
                            >
                              <div className="text-[10px] font-mono uppercase text-[#A66D35]">
                                {key.replace(/_/g, " ")}
                              </div>
                              <div className="font-semibold text-[#141210] mt-0.5">
                                {Array.isArray(val)
                                  ? val.join(", ")
                                  : String(val || "—")}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Admin Reschedule Box */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-3">
                  <div className="font-bold text-[#141210]">
                    Current Time: {formatDhakaDateTime(inspectedBooking.start_at)}{" "}
                    → {formatDhakaDateTime(inspectedBooking.end_at)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="font-semibold block mb-1">
                        New Start
                      </label>
                      <input
                        type="datetime-local"
                        value={rescheduleStartInput}
                        onChange={(e) =>
                          setRescheduleStartInput(e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">
                        New End
                      </label>
                      <input
                        type="datetime-local"
                        value={rescheduleEndInput}
                        onChange={(e) => setRescheduleEndInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!rescheduleStartInput || !rescheduleEndInput)
                          return;
                        const newStartIso = new Date(
                          rescheduleStartInput
                        ).toISOString();
                        const newEndIso = new Date(
                          rescheduleEndInput
                        ).toISOString();
                        handleBookingAdminAction({
                          action: "reschedule",
                          new_date: formatDhakaDateISO(newStartIso),
                          new_start_at: newStartIso,
                          new_end_at: newEndIso,
                          reason: "Admin rescheduled session",
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold"
                    >
                      Reschedule Atomically
                    </button>
                  </div>
                </div>

                {/* Private Admin Internal Notes */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-3">
                  <div className="font-bold text-[#141210] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>
                      Private Internal Studio Notes (Hidden from Clients)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={internalNotesDraft}
                      onChange={(e) => setInternalNotesDraft(e.target.value)}
                      placeholder="Add internal producer note..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleBookingAdminAction({
                          action: "update_internal_notes",
                          internal_notes: internalNotesDraft,
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold"
                    >
                      Save Note
                    </button>
                  </div>
                </div>

                {/* Integration Logs & Client History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2">
                    <div className="font-bold text-[#141210]">
                      Email & Calendar Integration Logs
                    </div>
                    {inspectedEmails.map((em) => (
                      <div
                        key={em.id}
                        className="text-[11px] flex justify-between"
                      >
                        <span>Email ({em.notification_type}):</span>
                        <span className="font-mono font-bold">{em.status}</span>
                      </div>
                    ))}
                    {inspectedCalLogs.map((cl) => (
                      <div
                        key={cl.id}
                        className="text-[11px] flex justify-between"
                      >
                        <span>Calendar ({cl.operation}):</span>
                        <span className="font-mono font-bold">{cl.status}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2">
                    <div className="font-bold text-[#141210]">
                      Client Booking History ({inspectedClientHistory.length})
                    </div>
                    {inspectedClientHistory.map((ch) => (
                      <div
                        key={ch.id}
                        className="text-[11px] flex justify-between"
                      >
                        <span className="font-mono">{ch.booking_ref}</span>
                        <span>
                          {ch.service_or_event_title} ({ch.status})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE BOOKING FOR CLIENT */}
      {showCreateBookingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setShowCreateBookingModal(false)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 text-xs max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
              <h3 className="text-xl font-bold text-[#141210]">
                Create Booking on Behalf of Client
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateBookingModal(false)}
                className="p-2 rounded-full bg-[#FAF7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateBookingForClient}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">
                    Booking Type
                  </label>
                  <select
                    value={createKind}
                    onChange={(e) => setCreateKind(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  >
                    <option value="traditional">Traditional Photography</option>
                    <option value="convocation">IUB Convocation</option>
                  </select>
                </div>

                {createKind === "traditional" ? (
                  <div>
                    <label className="font-semibold block mb-1">Service</label>
                    <select
                      value={createServiceId}
                      onChange={(e) => setCreateServiceId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    >
                      {eventsData.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-semibold block mb-1">
                      Convocation Slot
                    </label>
                    <select
                      value={createSlotId}
                      onChange={(e) => setCreateSlotId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    >
                      <option value="">Select Slot...</option>
                      {eventsData.slots.map((sl) => (
                        <option key={sl.id} value={sl.id}>
                          {formatDhakaDateTime(sl.start_at)} (Cap:{" "}
                          {sl.booked_count}/{sl.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {createKind === "traditional" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={createStartAt}
                      onChange={(e) => setCreateStartAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Duration (mins)
                    </label>
                    <input
                      type="number"
                      value={createDuration}
                      onChange={(e) =>
                        setCreateDuration(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createClientName}
                    onChange={(e) => setCreateClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    Client Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createClientEmail}
                    onChange={(e) => setCreateClientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    Client Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={createClientPhone}
                    onChange={(e) => setCreateClientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    Student ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={createStudentId}
                    onChange={(e) => setCreateStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold uppercase tracking-wider"
              >
                Create Confirmed Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHARED MODAL: PACKAGE EDITOR & CREATOR */}
      {editingPackageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setEditingPackageModal(null)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                  Photography Package Management
                </span>
                <h2 className="text-xl font-bold text-[#141210]">
                  {isNewPackageModal
                    ? "Create Photography Package"
                    : `Edit: ${editingPackageModal.name || "Package"}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingPackageModal(null)}
                className="p-2 rounded-full bg-[#FAF7F2] border border-[#E5DEC9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {packageSaveError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {packageSaveError}
              </div>
            )}

            <form
              onSubmit={handleSavePackageModal}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPackageModal.name || ""}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g. Graduate & Family Prestige"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1">
                    Subtitle / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingPackageModal.subtitle || ""}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        subtitle: e.target.value,
                      })
                    }
                    placeholder="e.g. Comprehensive Convocation Experience"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    Price Numeric (BDT) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingPackageModal.price_numeric ?? 0}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setEditingPackageModal({
                        ...editingPackageModal,
                        price_numeric: num,
                        price_label: `BDT ${num.toLocaleString()}`,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    Display Price Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPackageModal.price_label || ""}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        price_label: e.target.value,
                      })
                    }
                    placeholder="e.g. BDT 6,000"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    Booking Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={720}
                    step={5}
                    required
                    value={editingPackageModal.duration_mins ?? 30}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        duration_mins: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    value={editingPackageModal.sort_order ?? 0}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        sort_order: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Package Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingPackageModal.description || ""}
                  onChange={(e) =>
                    setEditingPackageModal({
                      ...editingPackageModal,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what is included in this photography session..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Deliverables (one per line)
                </label>
                <textarea
                  rows={3}
                  value={
                    Array.isArray(editingPackageModal.deliverables)
                      ? editingPackageModal.deliverables.join("\n")
                      : String(editingPackageModal.deliverables || "")
                  }
                  onChange={(e) =>
                    setEditingPackageModal({
                      ...editingPackageModal,
                      deliverables: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="15 Edited High-Res Portraits&#10;Private Online Gallery&#10;Full Print Rights"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">
                    Inclusions (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={
                      Array.isArray(editingPackageModal.inclusions)
                        ? editingPackageModal.inclusions.join("\n")
                        : String(editingPackageModal.inclusions || "")
                    }
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        inclusions: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Professional Lighting&#10;Cap & Gown Assistance"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    Restrictions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={editingPackageModal.restrictions || ""}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        restrictions: e.target.value || null,
                      })
                    }
                    placeholder="e.g. Up to 4 family members only"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Client Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={editingPackageModal.instructions || ""}
                  onChange={(e) =>
                    setEditingPackageModal({
                      ...editingPackageModal,
                      instructions: e.target.value || null,
                    })
                  }
                  placeholder="e.g. Please arrive 10 minutes prior to session"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#141210]">
                  <input
                    type="checkbox"
                    checked={
                      editingPackageModal.frame_printing_enabled !== false
                    }
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        frame_printing_enabled: e.target.checked,
                      })
                    }
                  />
                  <span>Frame Printing Eligible</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#141210]">
                  <input
                    type="checkbox"
                    checked={editingPackageModal.is_active !== false}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  <span>Active Package</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#141210]">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPackageModal.is_featured)}
                    onChange={(e) =>
                      setEditingPackageModal({
                        ...editingPackageModal,
                        is_featured: e.target.checked,
                      })
                    }
                  />
                  <span>Featured Badge</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5DEC9]">
                <button
                  type="button"
                  onClick={() => setEditingPackageModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={packageSaveLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold disabled:opacity-50"
                >
                  {packageSaveLoading ? "Saving..." : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
