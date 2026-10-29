"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Folder,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  Upload,
  Calendar,
  MapPin,
  Building,
  ChevronUp,
  ChevronDown,
  Layers,
  X,
} from "lucide-react";
import SearchableFolderSelector from "./SearchableFolderSelector";
import type {
  EventArchive,
  EventArchiveCategory,
  EventHighlight,
  MediaFolderWithMeta,
  MediaFolderPhoto,
  MediaFolderType,
  EventHeroSlide,
  BookingEvent,
} from "@/types/database";

export default function WorkArchiveAdminClient() {
  const [activeTab, setActiveTab] = useState<"events" | "folders">("events");

  // Notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const notify = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ---------------------------------------------------------------------------
  // DYNAMIC CATEGORIES STATE
  // ---------------------------------------------------------------------------
  const [availableCategories, setAvailableCategories] = useState<EventArchiveCategory[]>([]);
  const [eventCategoryId, setEventCategoryId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // EVENTS STATE
  // ---------------------------------------------------------------------------
  const [events, setEvents] = useState<EventArchive[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventSearch, setEventSearch] = useState("");

  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventArchive | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCategory, setEventCategory] = useState("Convocation");
  const [eventLocation, setEventLocation] = useState("");
  const [eventClient, setEventClient] = useState("");
  const [eventShortDesc, setEventShortDesc] = useState("");
  const [eventFullDesc, setEventFullDesc] = useState("");
  const [eventCoverUrl, setEventCoverUrl] = useState("");
  const [eventFolderId, setEventFolderId] = useState<string | null>(null);
  const [eventPublished, setEventPublished] = useState(true);
  const [eventFeatured, setEventFeatured] = useState(false);
  const [eventSortOrder, setEventSortOrder] = useState(0);
  const [eventHeroSlides, setEventHeroSlides] = useState<EventHeroSlide[]>([]);
  const [savingEvent, setSavingEvent] = useState(false);

  // Related Booking Coverage state
  const [availableBookingEvents, setAvailableBookingEvents] = useState<BookingEvent[]>([]);
  const [relatedBookingEventIds, setRelatedBookingEventIds] = useState<string[]>([]);
  const [bookingEventSearch, setBookingEventSearch] = useState("");

  // Quick slide add modal for event
  const [showAddSlideModal, setShowAddSlideModal] = useState(false);
  const [newSlideUrl, setNewSlideUrl] = useState("");
  const [newSlideCaption, setNewSlideCaption] = useState("");
  const [newSlideFocal, setNewSlideFocal] = useState("center");

  // Highlights management state
  const [activeEventForHighlights, setActiveEventForHighlights] = useState<EventArchive | null>(null);
  const [highlights, setHighlights] = useState<EventHighlight[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<EventHighlight | null>(null);
  const [hlTitle, setHlTitle] = useState("");
  const [hlSlug, setHlSlug] = useState("");
  const [hlShortDesc, setHlShortDesc] = useState("");
  const [hlCoverUrl, setHlCoverUrl] = useState("");
  const [hlFolderId, setHlFolderId] = useState<string | null>(null);
  const [hlPublished, setHlPublished] = useState(true);
  const [hlSortOrder, setHlSortOrder] = useState(0);
  const [hlHeroSlides, setHlHeroSlides] = useState<EventHeroSlide[]>([]);
  const [savingHighlight, setSavingHighlight] = useState(false);

  // ---------------------------------------------------------------------------
  // FOLDERS STATE
  // ---------------------------------------------------------------------------
  const [folderTabType, setFolderTabType] = useState<MediaFolderType>("event-archive");
  const [folders, setFolders] = useState<MediaFolderWithMeta[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [activeFolderForPhotos, setActiveFolderForPhotos] = useState<MediaFolderWithMeta | null>(null);
  const [folderPhotos, setFolderPhotos] = useState<MediaFolderPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [syncingStorage, setSyncingStorage] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Folder create modal state
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------
  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch("/api/admin/event-archives");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEvents(json.data);
      } else if (!json.success) {
        notify(json.error || "Failed to load event archives", "error");
      }
    } catch {
      notify("Network error loading event archives", "error");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      setLoadingFolders(true);
      const res = await fetch(`/api/admin/media-folders?type=${folderTabType}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFolders(json.data);
      } else if (!json.success) {
        notify(json.error || "Failed to load photo folders", "error");
      }
    } catch {
      notify("Network error loading photo folders", "error");
    } finally {
      setLoadingFolders(false);
    }
  }, [folderTabType]);

  const loadHighlights = useCallback(async (eventId: string) => {
    try {
      setLoadingHighlights(true);
      const res = await fetch(`/api/admin/event-archives/${eventId}/highlights`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHighlights(json.data);
      } else {
        notify(json.error || "Failed to load highlights", "error");
      }
    } catch {
      notify("Network error loading highlights", "error");
    } finally {
      setLoadingHighlights(false);
    }
  }, []);

  const loadFolderPhotos = useCallback(async (folderId: string) => {
    try {
      setLoadingPhotos(true);
      const res = await fetch(`/api/admin/media-folders/${folderId}/photos`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFolderPhotos(json.data);
      } else {
        notify(json.error || "Failed to load photos", "error");
      }
    } catch {
      notify("Network error loading folder photos", "error");
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/event-categories");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAvailableCategories(json.data);
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // ---------------------------------------------------------------------------
  // EVENT CRUD HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenCreateEvent = () => {
    setEditingEvent(null);
    setEventTitle("");
    setEventSlug("");
    setEventDate(new Date().toISOString().split("T")[0]);
    const firstCat = availableCategories.find((c) => c.is_active) || availableCategories[0];
    setEventCategoryId(firstCat ? firstCat.id : null);
    setEventCategory(firstCat ? firstCat.name : "Convocation");
    setEventLocation("");
    setEventClient("");
    setEventShortDesc("");
    setEventFullDesc("");
    setEventCoverUrl("");
    setEventFolderId(null);
    setEventPublished(true);
    setEventFeatured(false);
    setEventSortOrder(events.length + 1);
    setEventHeroSlides([]);
    setRelatedBookingEventIds([]);
    setIsEventModalOpen(true);

    if (availableBookingEvents.length === 0) {
      fetch("/api/admin/events")
        .then((r) => r.json())
        .then((j) => {
          if (j.events) setAvailableBookingEvents(j.events);
        })
        .catch(() => {});
    }
  };

  const handleOpenEditEvent = (ev: EventArchive) => {
    setEditingEvent(ev);
    setEventTitle(ev.title);
    setEventSlug(ev.slug);
    setEventDate(ev.event_date);
    setEventCategoryId(ev.category_id || (ev.category_rel ? ev.category_rel.id : null));
    setEventCategory(ev.category || (ev.category_rel ? ev.category_rel.name : "Convocation"));
    setEventLocation(ev.location || "");
    setEventClient(ev.client_or_institution || "");
    setEventShortDesc(ev.short_description);
    setEventFullDesc(ev.full_description || "");
    setEventCoverUrl(ev.cover_image_url || "");
    setEventFolderId(ev.folder_id || null);
    setEventPublished(Boolean(ev.is_published));
    setEventFeatured(Boolean(ev.is_featured));
    setEventSortOrder(ev.sort_order);
    setEventHeroSlides(ev.hero_slides || []);
    setRelatedBookingEventIds([]);
    setIsEventModalOpen(true);

    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((j) => {
        if (j.events) setAvailableBookingEvents(j.events);
      })
      .catch(() => {});

    fetch(`/api/admin/event-associations?archiveId=${encodeURIComponent(ev.id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.booking_event_ids) {
          setRelatedBookingEventIds(j.data.booking_event_ids);
        }
      })
      .catch(() => {});
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventShortDesc.trim()) {
      notify("Title and Short Description are required.", "error");
      return;
    }

    try {
      setSavingEvent(true);
      const payload = {
        ...(editingEvent ? { id: editingEvent.id } : {}),
        title: eventTitle.trim(),
        slug: eventSlug.trim() || undefined,
        event_date: eventDate,
        category: eventCategory,
        category_id: eventCategoryId || null,
        location: eventLocation.trim() || null,
        client_or_institution: eventClient.trim() || null,
        short_description: eventShortDesc.trim(),
        full_description: eventFullDesc.trim() || null,
        cover_image_url: eventCoverUrl.trim() || null,
        folder_id: eventFolderId || null,
        is_published: eventPublished,
        is_featured: eventFeatured,
        sort_order: Number(eventSortOrder) || 0,
        hero_slides: eventHeroSlides,
      };

      const res = await fetch("/api/admin/event-archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save event archive.");
      }

      // Persist related booking events association
      if (json.data?.id) {
        try {
          await fetch("/api/admin/event-associations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              archiveId: json.data.id,
              bookingEventIds: relatedBookingEventIds,
            }),
          });
        } catch (e) {
          console.error("Failed to persist booking event associations:", e);
        }
      }

      notify(editingEvent ? "Event archive updated." : "Event archive published.");
      setIsEventModalOpen(false);
      await loadEvents();
    } catch (err: any) {
      notify(err.message || "Failed to save event.", "error");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? Its associated highlights will also be removed. The underlying photo folders and storage files will be safely preserved.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/event-archives?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete event archive.");
      }

      notify("Event archive deleted.");
      await loadEvents();
      if (activeEventForHighlights?.id === id) {
        setActiveEventForHighlights(null);
      }
    } catch (err: any) {
      notify(err.message || "Failed to delete event.", "error");
    }
  };

  const handleToggleEventPublish = async (ev: EventArchive) => {
    try {
      const res = await fetch("/api/admin/event-archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ev.id,
          title: ev.title,
          short_description: ev.short_description,
          is_published: !ev.is_published,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to toggle status.");
      }
      notify(ev.is_published ? "Event un-published (Draft)." : "Event published.");
      await loadEvents();
    } catch (err: any) {
      notify(err.message, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // SLIDE MANAGEMENT HELPERS
  // ---------------------------------------------------------------------------
  const handleAddSlideToEvent = () => {
    if (!newSlideUrl.trim()) return;
    const newSlide: EventHeroSlide = {
      id: `slide-${Date.now()}`,
      image_url: newSlideUrl.trim(),
      caption: newSlideCaption.trim() || null,
      focal_point: newSlideFocal,
      sort_order: eventHeroSlides.length + 1,
      is_cover: eventHeroSlides.length === 0,
    };
    setEventHeroSlides([...eventHeroSlides, newSlide]);
    if (!eventCoverUrl) {
      setEventCoverUrl(newSlide.image_url);
    }
    setNewSlideUrl("");
    setNewSlideCaption("");
    setShowAddSlideModal(false);
  };

  const handleMoveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= eventHeroSlides.length) return;
    const copy = [...eventHeroSlides];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setEventHeroSlides(copy.map((s, idx) => ({ ...s, sort_order: idx + 1 })));
  };

  const handleRemoveSlide = (index: number) => {
    const updated = eventHeroSlides
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({ ...s, sort_order: idx + 1 }));
    setEventHeroSlides(updated);
  };

  // ---------------------------------------------------------------------------
  // HIGHLIGHT CRUD HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenHighlights = (ev: EventArchive) => {
    setActiveEventForHighlights(ev);
    loadHighlights(ev.id);
  };

  const handleOpenCreateHighlight = () => {
    setEditingHighlight(null);
    setHlTitle("");
    setHlSlug("");
    setHlShortDesc("");
    setHlCoverUrl("");
    setHlFolderId(null);
    setHlPublished(true);
    setHlSortOrder(highlights.length + 1);
    setHlHeroSlides([]);
    setIsHighlightModalOpen(true);
  };

  const handleOpenEditHighlight = (hl: EventHighlight) => {
    setEditingHighlight(hl);
    setHlTitle(hl.title);
    setHlSlug(hl.slug);
    setHlShortDesc(hl.short_description);
    setHlCoverUrl(hl.cover_image_url);
    setHlFolderId(hl.folder_id || null);
    setHlPublished(hl.is_published);
    setHlSortOrder(hl.sort_order);
    setHlHeroSlides(hl.hero_slides || []);
    setIsHighlightModalOpen(true);
  };

  const handleSaveHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventForHighlights) return;
    if (!hlTitle.trim() || !hlShortDesc.trim() || !hlCoverUrl.trim()) {
      notify("Title, short description, and cover image are required for a highlight.", "error");
      return;
    }

    try {
      setSavingHighlight(true);
      const payload = {
        ...(editingHighlight ? { id: editingHighlight.id } : {}),
        title: hlTitle.trim(),
        slug: hlSlug.trim() || undefined,
        short_description: hlShortDesc.trim(),
        cover_image_url: hlCoverUrl.trim(),
        folder_id: hlFolderId || null,
        is_published: hlPublished,
        sort_order: Number(hlSortOrder) || 0,
        hero_slides: hlHeroSlides,
      };

      const res = await fetch(
        `/api/admin/event-archives/${activeEventForHighlights.id}/highlights`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save highlight.");
      }

      notify(editingHighlight ? "Highlight updated." : "Highlight published.");
      setIsHighlightModalOpen(false);
      await loadHighlights(activeEventForHighlights.id);
    } catch (err: any) {
      notify(err.message || "Failed to save highlight.", "error");
    } finally {
      setSavingHighlight(false);
    }
  };

  const handleDeleteHighlight = async (highlightId: string, title: string) => {
    if (!activeEventForHighlights) return;
    if (!confirm(`Delete highlight "${title}"? Underlying photos will be preserved.`)) return;

    try {
      const res = await fetch(
        `/api/admin/event-archives/${activeEventForHighlights.id}/highlights?highlightId=${encodeURIComponent(highlightId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete highlight.");
      }
      notify("Highlight deleted.");
      await loadHighlights(activeEventForHighlights.id);
    } catch (err: any) {
      notify(err.message, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // FOLDER & PHOTO HANDLERS
  // ---------------------------------------------------------------------------
  const handleSyncStorage = async () => {
    try {
      setSyncingStorage(true);
      const res = await fetch("/api/admin/media-folders/sync", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        notify(json.message || "Storage synchronized successfully!");
        await loadFolders();
        await loadEvents();
      } else {
        notify(json.error || "Failed to sync storage", "error");
      }
    } catch (err: any) {
      notify(err.message || "Network error syncing storage", "error");
    } finally {
      setSyncingStorage(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setCreatingFolder(true);
      const res = await fetch("/api/admin/media-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          folder_type: folderTabType,
          description: newFolderDesc.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create folder.");
      }

      notify(`Created folder under ${json.data.storage_prefix}`);
      setIsCreateFolderModalOpen(false);
      setNewFolderName("");
      setNewFolderDesc("");
      await loadFolders();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder: MediaFolderWithMeta) => {
    if (folder.assigned_events_count > 0 || folder.assigned_highlights_count > 0) {
      alert(
        `Cannot delete this folder because it is assigned to ${folder.assigned_events_count} event(s) and ${folder.assigned_highlights_count} highlight(s). Reassign them first.`
      );
      return;
    }

    if (
      !confirm(
        `Permanently delete folder "${folder.name}" (${folder.photo_count} photos)? Underlying Supabase Storage files will be preserved.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/media-folders?id=${encodeURIComponent(folder.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete folder.");
      }
      notify("Folder removed.");
      if (activeFolderForPhotos?.id === folder.id) {
        setActiveFolderForPhotos(null);
      }
      await loadFolders();
    } catch (err: any) {
      notify(err.message, "error");
    }
  };

  const handleUploadFolderPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeFolderForPhotos) return;

    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch(
        `/api/admin/media-folders/${activeFolderForPhotos.id}/photos`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload photos.");
      }

      notify(`Uploaded ${json.count || files.length} photograph(s).`);
      await loadFolderPhotos(activeFolderForPhotos.id);
      await loadFolders();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!activeFolderForPhotos) return;
    if (!confirm("Permanently delete this photograph?")) return;

    try {
      const res = await fetch(
        `/api/admin/media-folders/${activeFolderForPhotos.id}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete photo.");
      }
      notify("Photograph removed.");
      await loadFolderPhotos(activeFolderForPhotos.id);
      await loadFolders();
    } catch (err: any) {
      notify(err.message, "error");
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!eventSearch.trim()) return true;
    const q = eventSearch.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.short_description.toLowerCase().includes(q) ||
      (ev.location && ev.location.toLowerCase().includes(q)) ||
      (ev.client_or_institution && ev.client_or_institution.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 text-[#141210]">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border p-4 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all ${
            feedback.type === "success"
              ? "border-[#2E6B4E]/30 bg-[#EEF7F2] text-[#2E6B4E]"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="h-4 w-4 shrink-0 text-[#2E6B4E]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DEC9] pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#141210] flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-[#A66D35]" />
            Work Archive &amp; Storage Media
          </h2>
          <p className="text-xs text-[#5C5449] mt-0.5">
            Manage genuine photography event archives, dedicated folders, multiple hero slides, and event highlights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-2xl bg-[#FAF7F2] p-1 border border-[#E5DEC9]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("events");
                setActiveEventForHighlights(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "events"
                  ? "bg-[#3A2008] text-[#FAF7F2] shadow-2xs"
                  : "text-[#5C5449] hover:text-[#141210]"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Event Archives ({events.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("folders");
                setActiveEventForHighlights(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "folders"
                  ? "bg-[#3A2008] text-[#FAF7F2] shadow-2xs"
                  : "text-[#5C5449] hover:text-[#141210]"
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>Photo Folders</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: EVENT ARCHIVES */}
      {/* =================================================================== */}
      {activeTab === "events" && !activeEventForHighlights && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#877D70]" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search event archives by title, location, client..."
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] py-2 pl-9 pr-4 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadEvents}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#141210] hover:bg-[#FFFFFF]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingEvents ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleOpenCreateEvent}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-4 py-2 text-xs font-semibold text-[#FAF7F2] uppercase tracking-wider shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                Publish Event Archive
              </button>
            </div>
          </div>

          {loadingEvents ? (
            <div className="py-16 text-center text-xs text-[#877D70]">
              <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-[#A66D35]" />
              Loading event archives from Supabase...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E5DEC9] bg-[#FFFFFF] p-12 text-center text-[#877D70]">
              <p className="text-sm font-semibold text-[#141210]">No event archives found.</p>
              <p className="text-xs text-[#5C5449] mt-1">
                Publish your first event archive to showcase photography collections on the website.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateEvent}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-4 py-2 text-xs font-semibold text-[#FAF7F2]"
              >
                <Plus className="h-4 w-4" />
                Publish First Event Archive
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="group flex flex-col justify-between rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-5 shadow-2xs hover:border-[#A66D35] transition-all"
                >
                  <div className="space-y-3.5">
                    {/* Cover Preview */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2]">
                      {ev.cover_image_url ? (
                        <Image
                          src={ev.cover_image_url}
                          alt={ev.cover_alt_text || ev.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#877D70]">
                          <ImageIcon className="h-6 w-6 text-[#877D70] mb-1" />
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            ev.is_published
                              ? "bg-[#EEF7F2] text-[#2E6B4E] border border-[#2E6B4E]/30"
                              : "bg-[#FFFBEB] text-[#B86B19] border border-[#F59E0B]/30"
                          }`}
                        >
                          {ev.is_published ? "Published" : "Draft"}
                        </span>
                        {ev.is_featured && (
                          <span className="rounded-full bg-[#FAF7F2] border border-[#A66D35]/30 px-2 py-0.5 text-[9px] font-bold uppercase text-[#3A2008] flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 text-[#A66D35]" />
                            Featured on Dashboard
                          </span>
                        )}
                        {ev.hero_slides && ev.hero_slides.length > 0 && (
                          <span className="rounded-full bg-[#3A2008] px-2 py-0.5 text-[9px] font-mono text-[#FAF7F2]">
                            {ev.hero_slides.length} slides
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#877D70]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#A66D35]" />
                          {ev.event_date}
                        </span>
                        {ev.location && (
                          <>
                            <span>•</span>
                            <span className="truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#A66D35]" />
                              {ev.location}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-[#141210] line-clamp-1">
                        {ev.title}
                      </h3>

                      <p className="text-xs text-[#5C5449] line-clamp-2 leading-relaxed">
                        {ev.short_description}
                      </p>
                    </div>

                    {/* Storage Folder Binding */}
                    <div className="rounded-xl bg-[#FAF7F2] p-2.5 text-xs border border-[#E5DEC9]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#5C5449] flex items-center gap-1">
                          <Folder className="h-3 w-3 text-[#A66D35]" />
                          Photo Folder:
                        </span>
                        <span className="font-mono text-[#141210] truncate max-w-[140px] font-medium">
                          {ev.folder?.name || "None (Unassigned)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex items-center justify-between border-t border-[#E5DEC9] pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenHighlights(ev)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] px-2.5 py-1 text-[11px] font-semibold text-[#3A2008] hover:bg-[#FFFFFF]"
                      >
                        <Sparkles className="h-3 w-3 text-[#A66D35]" />
                        <span>Highlights</span>
                      </button>

                      <a
                        href={`/works/${ev.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#877D70] hover:text-[#141210]"
                        title="View public page"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleEventPublish(ev)}
                        className="rounded-lg p-1.5 text-[#5C5449] hover:bg-[#FAF7F2] hover:text-[#141210]"
                        title={ev.is_published ? "Unpublish" : "Publish"}
                      >
                        {ev.is_published ? (
                          <Eye className="h-3.5 w-3.5 text-[#2E6B4E]" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-[#877D70]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditEvent(ev)}
                        className="rounded-lg p-1.5 text-[#5C5449] hover:bg-[#FAF7F2] hover:text-[#141210]"
                        title="Edit event archive"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id, ev.title)}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        title="Delete event archive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: EVENT HIGHLIGHTS (DEDICATED SUB-PAGE) */}
      {/* =================================================================== */}
      {activeTab === "events" && activeEventForHighlights && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveEventForHighlights(null)}
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] p-2 text-[#5C5449] hover:bg-[#FFFFFF] hover:text-[#141210]"
                title="Back to Event Archives"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35]">
                  Event Highlights Manager
                </span>
                <h3 className="text-base font-bold text-[#141210]">
                  {activeEventForHighlights.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateHighlight}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-3.5 py-2 text-xs font-semibold text-[#FAF7F2]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Event Highlight
            </button>
          </div>

          <div className="rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2] p-4 text-xs text-[#5C5449]">
            <p>
              Highlights appear <strong>strictly on this event&apos;s page</strong> (<code className="font-mono text-[#3A2008]">/works/{activeEventForHighlights.slug}</code>). Each highlight selects its own dedicated folder from <code className="font-mono text-[#3A2008]">event-archive-highlights/</code>.
            </p>
          </div>

          {loadingHighlights ? (
            <div className="py-12 text-center text-xs text-[#877D70]">
              <RefreshCw className="mx-auto h-4 w-4 animate-spin mb-2 text-[#A66D35]" />
              Loading event highlights...
            </div>
          ) : highlights.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E5DEC9] bg-[#FFFFFF] p-12 text-center text-[#877D70]">
              <p className="text-sm font-semibold text-[#141210]">No highlights for this event yet.</p>
              <p className="text-xs text-[#5C5449] mt-1">
                When an event has 0 highlights, the highlights section on its public page is completely omitted.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateHighlight}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-4 py-2 text-xs font-semibold text-[#FAF7F2]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Highlight
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {highlights.map((hl) => (
                <div
                  key={hl.id}
                  className="relative flex flex-col justify-between rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-5 shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2]">
                      <Image
                        src={hl.cover_image_url}
                        alt={hl.title}
                        fill
                        className="object-cover"
                        sizes="300px"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            hl.is_published
                              ? "bg-[#EEF7F2] text-[#2E6B4E] border border-[#2E6B4E]/30"
                              : "bg-[#FFFBEB] text-[#B86B19] border border-[#F59E0B]/30"
                          }`}
                        >
                          {hl.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-[#141210] text-sm">{hl.title}</h4>
                      <p className="text-xs text-[#5C5449] line-clamp-2 mt-1">
                        {hl.short_description}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#FAF7F2] p-2.5 text-xs border border-[#E5DEC9]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#5C5449] flex items-center gap-1">
                          <Folder className="h-3 w-3 text-[#A66D35]" />
                          Highlight Folder:
                        </span>
                        <span className="font-mono text-[#141210] truncate max-w-[130px] font-medium">
                          {hl.folder?.name || "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-[#E5DEC9] pt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEditHighlight(hl)}
                      className="rounded-lg p-1.5 text-[#5C5449] hover:bg-[#FAF7F2] hover:text-[#141210]"
                      title="Edit highlight"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHighlight(hl.id, hl.title)}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      title="Delete highlight"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: SUPABASE PHOTO FOLDERS & DIRECT FILE UPLOAD */}
      {/* =================================================================== */}
      {activeTab === "folders" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex rounded-2xl bg-[#FAF7F2] p-1 border border-[#E5DEC9]">
              <button
                type="button"
                onClick={() => {
                  setFolderTabType("event-archive");
                  setActiveFolderForPhotos(null);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  folderTabType === "event-archive"
                    ? "bg-[#3A2008] text-[#FAF7F2] shadow-2xs"
                    : "text-[#5C5449] hover:text-[#141210]"
                }`}
              >
                Event Archives (event-archives/)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFolderTabType("event-highlight");
                  setActiveFolderForPhotos(null);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  folderTabType === "event-highlight"
                    ? "bg-[#3A2008] text-[#FAF7F2] shadow-2xs"
                    : "text-[#5C5449] hover:text-[#141210]"
                }`}
              >
                Highlights (event-archive-highlights/)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncStorage}
                disabled={syncingStorage}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] hover:bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#3A2008] transition-colors disabled:opacity-50"
                title="Scan Supabase Storage bucket and reconcile photo folders"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#A66D35] ${syncingStorage ? "animate-spin" : ""}`} />
                <span>{syncingStorage ? "Syncing..." : "Sync with Storage"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateFolderModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-4 py-2 text-xs font-semibold text-[#FAF7F2]"
              >
                <FolderPlus className="h-4 w-4" />
                Create Storage Folder
              </button>
            </div>
          </div>

          {/* Active Folder Photos Viewer */}
          {activeFolderForPhotos ? (
            <div className="space-y-4 rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveFolderForPhotos(null)}
                    className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] p-2 text-[#5C5449] hover:bg-[#FFFFFF] hover:text-[#141210]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h3 className="font-bold text-[#141210] text-base flex items-center gap-2">
                      <Folder className="h-4 w-4 text-[#A66D35]" />
                      {activeFolderForPhotos.name}
                    </h3>
                    <p className="font-mono text-[11px] text-[#877D70]">
                      {activeFolderForPhotos.storage_prefix}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-3.5 py-2 text-xs font-semibold text-[#FAF7F2]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingPhotos ? "Uploading..." : "Upload Photos"}</span>
                    <input
                      ref={photoInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleUploadFolderPhotos}
                      disabled={uploadingPhotos}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {loadingPhotos ? (
                <div className="py-16 text-center text-xs text-[#877D70]">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-[#A66D35]" />
                  Loading folder photographs...
                </div>
              ) : folderPhotos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#E5DEC9] bg-[#FAF7F2] p-12 text-center text-[#877D70]">
                  <p className="font-semibold text-[#141210]">No photographs in this folder yet.</p>
                  <p className="text-xs text-[#5C5449] mt-1">
                    Upload images above, or upload to Supabase Storage at{" "}
                    <code className="font-mono text-[#3A2008]">
                      portfolio-media/{activeFolderForPhotos.storage_prefix}
                    </code>
                    .
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {folderPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2] shadow-2xs"
                    >
                      <Image
                        src={photo.public_url}
                        alt={photo.alt_text || photo.file_name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 20vw"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/90 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 p-3 flex flex-col justify-between">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="rounded-lg bg-red-600/90 p-1.5 text-white hover:bg-red-700"
                            title="Delete photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-white font-medium line-clamp-1">
                          {photo.caption || photo.file_name}
                        </p>
                      </div>

                      {photo.is_cover && (
                        <span className="absolute top-2 left-2 rounded-full bg-[#3A2008] px-2 py-0.5 text-[9px] font-bold uppercase text-[#FAF7F2]">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Folder Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {loadingFolders ? (
                <div className="col-span-full py-16 text-center text-xs text-[#877D70]">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-[#A66D35]" />
                  Loading photo folders...
                </div>
              ) : folders.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-dashed border-[#E5DEC9] bg-[#FFFFFF] p-12 text-center text-[#877D70]">
                  <p className="font-semibold text-[#141210]">No photo folders found in this category.</p>
                  <button
                    type="button"
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-4 py-2 text-xs font-semibold text-[#FAF7F2]"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Create First Folder
                  </button>
                </div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex flex-col justify-between rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-5 shadow-2xs hover:border-[#A66D35] transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-[#A66D35]" />
                          <h4 className="font-bold text-[#141210] text-sm truncate max-w-[200px]">
                            {folder.name}
                          </h4>
                        </div>
                        {folder.photo_count > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-mono text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            {folder.photo_count} photos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-mono text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            0 photos (empty)
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-[11px] text-[#877D70] truncate">
                        {folder.storage_prefix}
                      </p>

                      {folder.description && (
                        <p className="text-xs text-[#5C5449] line-clamp-2">
                          {folder.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-[#877D70] pt-1">
                        <span>Assigned to {folder.assigned_events_count} event(s)</span>
                        <span>•</span>
                        <span>{folder.assigned_highlights_count} highlight(s)</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#E5DEC9] pt-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFolderForPhotos(folder);
                          loadFolderPhotos(folder.id);
                        }}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#3A2008] hover:text-[#5C4028]"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>View / Upload Photos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(folder)}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        title="Delete folder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE / EDIT EVENT ARCHIVE */}
      {/* =================================================================== */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto text-[#141210]">
            <h3 className="text-xl font-extrabold text-[#141210] mb-5 flex items-center gap-2.5 border-b border-[#E5DEC9] pb-4">
              <Calendar className="h-5 w-5 text-[#A66D35]" />
              <span>{editingEvent ? "Edit Event Archive" : "Publish New Event Archive"}</span>
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#141210] mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. IUB 27th Convocation"
                    required
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2.5 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141210] mb-1">
                    URL Slug (auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={eventSlug}
                    onChange={(e) => setEventSlug(e.target.value)}
                    placeholder="iub-27th-convocation"
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-mono text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#141210] mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3 py-2 text-xs text-[#141210] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141210] mb-1">
                    Event Category
                  </label>
                  <select
                    value={
                      eventCategoryId ||
                      (availableCategories.find(
                        (c) => c.name.toLowerCase() === eventCategory.toLowerCase()
                      )?.id ?? "")
                    }
                    onChange={(e) => {
                      const selId = e.target.value;
                      setEventCategoryId(selId || null);
                      const found = availableCategories.find((c) => c.id === selId);
                      if (found) {
                        setEventCategory(found.name);
                      }
                    }}
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3 py-2 text-xs text-[#141210] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  >
                    {availableCategories.length === 0 ? (
                      <option value="">Convocation</option>
                    ) : (
                      availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} {!cat.is_active ? "(Inactive)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141210] mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={eventSortOrder}
                    onChange={(e) => setEventSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3 py-2 text-xs text-[#141210] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#141210] mb-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#A66D35]" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. IUB Permanent Campus, Dhaka"
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141210] mb-1 flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-[#A66D35]" />
                    Client or Institution
                  </label>
                  <input
                    type="text"
                    value={eventClient}
                    onChange={(e) => setEventClient(e.target.value)}
                    placeholder="e.g. Independent University, Bangladesh"
                    className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Short Description (Shown on cards &amp; overview) *
                </label>
                <textarea
                  value={eventShortDesc}
                  onChange={(e) => setEventShortDesc(e.target.value)}
                  placeholder="Concise 1-2 sentence overview of the event archive..."
                  rows={2}
                  required
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Full Description (Optional editorial context)
                </label>
                <textarea
                  value={eventFullDesc}
                  onChange={(e) => setEventFullDesc(e.target.value)}
                  placeholder="Extended editorial notes, equipment details, crew credits..."
                  rows={3}
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Primary Cover Image URL
                </label>
                <input
                  type="url"
                  value={eventCoverUrl}
                  onChange={(e) => setEventCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or public Supabase URL"
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs font-mono text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>

              {/* Folder Selector */}
              <SearchableFolderSelector
                folderType="event-archive"
                selectedFolderId={eventFolderId}
                onSelectFolder={(f) => setEventFolderId(f?.id || null)}
                label="Assign Photography Folder (event-archives/)"
                hint="Assigning a photo folder populates this event's main photo gallery."
              />

              {/* Hero Slides Manager */}
              <div className="rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#141210] flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-[#A66D35]" />
                      Hero Slideshow ({eventHeroSlides.length} slides)
                    </h4>
                    <p className="text-[11px] text-[#5C5449] mt-0.5">
                      Configure multiple slides for the event page hero. If none are added, the hero automatically displays photographs from the assigned folder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddSlideModal(true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-3 py-1.5 text-xs font-semibold text-[#FAF7F2]"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Slide</span>
                  </button>
                </div>

                {eventHeroSlides.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E5DEC9] bg-[#FFFFFF] p-4 text-center text-xs text-[#877D70]">
                    No custom hero slides configured. Folder photographs will automatically serve as the hero slideshow.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventHeroSlides.map((slide, idx) => (
                      <div
                        key={slide.id || idx}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E5DEC9] bg-[#FFFFFF] p-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-[#E5DEC9] bg-[#FAF7F2] shrink-0">
                            <Image
                              src={slide.image_url}
                              alt={slide.caption || "Hero slide"}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#141210] line-clamp-1">
                              {slide.caption || `Slide #${idx + 1}`}
                            </p>
                            <p className="text-[10px] font-mono text-[#877D70]">
                              Focal: {slide.focal_point || "center"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(idx, -1)}
                            disabled={idx === 0}
                            className="rounded-lg p-1 text-[#877D70] hover:bg-[#FAF7F2] disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(idx, 1)}
                            disabled={idx === eventHeroSlides.length - 1}
                            className="rounded-lg p-1 text-[#877D70] hover:bg-[#FAF7F2] disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlide(idx)}
                            className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Booking Coverage */}
              <div className="rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2] p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-[#141210] flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#A66D35]" />
                    Related Booking Coverage ({relatedBookingEventIds.length} Linked)
                  </h4>
                  <p className="text-[11px] text-[#5C5449] mt-0.5">
                    Connect applicable booking events from your studio calendar. Linked events that are publicly visible will display direct booking links on this event archive page.
                  </p>
                </div>

                {/* Selected Booking Events Chips */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#141210] block">
                    Currently Associated Booking Events:
                  </span>
                  {relatedBookingEventIds.length === 0 ? (
                    <p className="text-xs text-[#877D70] italic">
                      No booking events linked yet. Select from the dropdown below to connect one.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {relatedBookingEventIds.map((bId) => {
                        const bEv = availableBookingEvents.find((b) => b.id === bId);
                        return (
                          <div
                            key={bId}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-semibold text-[#3A2008]"
                          >
                            <span>{bEv ? bEv.title : `Booking Event (${bId.slice(0, 8)})`}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setRelatedBookingEventIds((prev) => prev.filter((id) => id !== bId));
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

                {/* Searchable Add Booking Event Selector */}
                <div className="pt-2 border-t border-[#E5DEC9] space-y-2">
                  <label className="text-xs font-semibold text-[#141210] block">
                    Add Booking Event Association
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#877D70]" />
                      <input
                        type="text"
                        value={bookingEventSearch}
                        onChange={(e) => setBookingEventSearch(e.target.value)}
                        placeholder="Search booking events by title..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs"
                      />
                    </div>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !relatedBookingEventIds.includes(val)) {
                          setRelatedBookingEventIds((prev) => [...prev, val]);
                        }
                        e.target.value = "";
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-medium text-[#141210]"
                    >
                      <option value="">-- Choose Booking Event to Link --</option>
                      {availableBookingEvents
                        .filter(
                          (b) =>
                            !relatedBookingEventIds.includes(b.id) &&
                            (!bookingEventSearch ||
                              b.title.toLowerCase().includes(bookingEventSearch.toLowerCase()))
                        )
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title} ({b.category || "Special Event"})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Publication Toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2] p-4 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventPublished}
                    onChange={(e) => setEventPublished(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#3A2008]"
                  />
                  <div>
                    <span className="font-semibold text-[#141210] block">Published on Live Works Archive</span>
                    <span className="text-[11px] text-[#5C5449]">Makes this production visible to visitors in the /works directory.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-3 sm:pt-0 sm:border-l sm:border-[#E5DEC9] sm:pl-6">
                  <input
                    type="checkbox"
                    checked={eventFeatured}
                    onChange={(e) => setEventFeatured(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#3A2008]"
                  />
                  <div>
                    <span className="font-semibold text-[#141210] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#A66D35]" />
                      <span>Featured on Dashboard</span>
                    </span>
                    <span className="text-[11px] text-[#5C5449] block">
                      Includes this published production in the dashboard&apos;s Additional Gallery Portfolio Entries rotation.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DEC9]">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-5 py-2.5 text-xs font-semibold text-[#141210] hover:bg-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-5 py-2.5 text-xs font-semibold text-[#FAF7F2] disabled:opacity-50 shadow-2xs"
                >
                  {savingEvent && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingEvent ? "Update Event Archive" : "Publish Event Archive"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD SLIDE TO EVENT */}
      {/* =================================================================== */}
      {showAddSlideModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#141210]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-6 shadow-2xl text-[#141210] space-y-4">
            <h4 className="text-base font-bold text-[#141210] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#A66D35]" />
              Add Hero Slide
            </h4>

            <div>
              <label className="block text-xs font-semibold text-[#141210] mb-1">
                Slide Image URL *
              </label>
              <input
                type="url"
                value={newSlideUrl}
                onChange={(e) => setNewSlideUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs font-mono text-[#141210] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141210] mb-1">
                Caption / Title (Optional)
              </label>
              <input
                type="text"
                value={newSlideCaption}
                onChange={(e) => setNewSlideCaption(e.target.value)}
                placeholder="e.g. Convocation Hall Atmosphere"
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141210] mb-1">
                Focal Point Alignment
              </label>
              <select
                value={newSlideFocal}
                onChange={(e) => setNewSlideFocal(e.target.value)}
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3 py-2 text-xs text-[#141210] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
              >
                <option value="center">Center (Balanced)</option>
                <option value="top">Top (Headshots &amp; Architecture)</option>
                <option value="bottom">Bottom (Landscape Floor)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddSlideModal(false)}
                className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-4 py-2 text-xs font-semibold text-[#141210]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSlideToEvent}
                className="rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-4 py-2 text-xs font-semibold text-[#FAF7F2]"
              >
                Add Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE / EDIT EVENT HIGHLIGHT */}
      {/* =================================================================== */}
      {isHighlightModalOpen && activeEventForHighlights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xl my-8 text-[#141210]">
            <h3 className="text-xl font-extrabold text-[#141210] mb-4 flex items-center gap-2 border-b border-[#E5DEC9] pb-4">
              <Sparkles className="h-5 w-5 text-[#A66D35]" />
              <span>
                {editingHighlight
                  ? `Edit Highlight: ${editingHighlight.title}`
                  : `Add Highlight to ${activeEventForHighlights.title}`}
              </span>
            </h3>

            <form onSubmit={handleSaveHighlight} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Highlight Title *
                </label>
                <input
                  type="text"
                  value={hlTitle}
                  onChange={(e) => setHlTitle(e.target.value)}
                  placeholder="e.g. Stage Graduation Walk &amp; Degrees"
                  required
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2.5 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  URL Slug (unique to this event)
                </label>
                <input
                  type="text"
                  value={hlSlug}
                  onChange={(e) => setHlSlug(e.target.value)}
                  placeholder="stage-graduation-walk"
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-mono text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Short Description *
                </label>
                <textarea
                  value={hlShortDesc}
                  onChange={(e) => setHlShortDesc(e.target.value)}
                  placeholder="One sentence highlighting what this sub-collection captures..."
                  rows={2}
                  required
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Highlight Cover Image URL *
                </label>
                <input
                  type="url"
                  value={hlCoverUrl}
                  onChange={(e) => setHlCoverUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs font-mono text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>

              {/* Dedicated Highlight Folder Selector */}
              <SearchableFolderSelector
                folderType="event-highlight"
                selectedFolderId={hlFolderId}
                onSelectFolder={(f) => setHlFolderId(f?.id || null)}
                label="Assign Highlight Photo Folder (event-archive-highlights/)"
                hint="Highlight folders are segregated under event-archive-highlights/."
              />

              <div className="flex items-center justify-between rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2] p-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#141210]">
                  <input
                    type="checkbox"
                    checked={hlPublished}
                    onChange={(e) => setHlPublished(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#3A2008]"
                  />
                  <span>Published (Visible on event page)</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#141210]">Sort Order:</span>
                  <input
                    type="number"
                    value={hlSortOrder}
                    onChange={(e) => setHlSortOrder(Number(e.target.value))}
                    className="w-16 rounded-xl border border-[#E5DEC9] bg-[#FFFFFF] px-2 py-1 text-xs text-center font-mono text-[#141210]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DEC9]">
                <button
                  type="button"
                  onClick={() => setIsHighlightModalOpen(false)}
                  className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-5 py-2.5 text-xs font-semibold text-[#141210] hover:bg-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHighlight}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-5 py-2.5 text-xs font-semibold text-[#FAF7F2] disabled:opacity-50"
                >
                  {savingHighlight && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingHighlight ? "Update Highlight" : "Save Highlight"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE STORAGE FOLDER */}
      {/* =================================================================== */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-6 shadow-2xl text-[#141210]">
            <h3 className="text-base font-bold text-[#141210] mb-4 flex items-center gap-2 border-b border-[#E5DEC9] pb-3">
              <FolderPlus className="h-5 w-5 text-[#A66D35]" />
              <span>Create {folderTabType === "event-highlight" ? "Highlight" : "Event"} Folder</span>
            </h3>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. NSU 25th Convocation Main Gallery"
                  required
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2.5 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Notes about which camera bodies or photographers are stored here..."
                  rows={2}
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div className="rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] p-3 text-[11px] font-mono text-[#5C5449]">
                Storage Prefix:{" "}
                <span className="text-[#3A2008] font-bold">
                  {folderTabType === "event-highlight"
                    ? "event-archive-highlights/"
                    : "event-archives/"}
                  &lt;folder-slug&gt;/
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-4 py-2 text-xs font-semibold text-[#141210] hover:bg-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-4 py-2 text-xs font-semibold text-[#FAF7F2] disabled:opacity-50"
                >
                  {creatingFolder && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{creatingFolder ? "Creating..." : "Create Folder"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
