"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Quote,
  Sliders,
  Globe,
  Settings,
} from "lucide-react";
import type { HeroSlide, Testimonial, HomepageConfig, PortfolioProject } from "@/types/database";

interface WebsiteCMSManagerProps {
  onNotify?: (message: string, type?: "success" | "error") => void;
}

export default function WebsiteCMSManager({ onNotify }: WebsiteCMSManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "hero" | "sections" | "ticker" | "testimonials" | "global"
  >("hero");

  // State for Hero Slides
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [editingSlide, setEditingSlide] = useState<Partial<HeroSlide> | null>(null);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [savingSlide, setSavingSlide] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Homepage Config & Sections
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig | null>(null);
  const [_loadingConfig, setLoadingConfig] = useState(true);
  const [_savingConfig, setSavingConfig] = useState(false);

  // State for Ticker Items
  const [tickerItems, setTickerItems] = useState<string[]>([]);
  const [newTickerText, setNewTickerText] = useState("");

  // State for Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [editingTestimonial, setEditingTestimonial] = useState<Partial<Testimonial> | null>(null);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [savingTestimonial, setSavingTestimonial] = useState(false);

  // State for Global Settings
  const [globalSettings, setGlobalSettings] = useState<Record<string, any>>({});
  const [_loadingGlobal, setLoadingGlobal] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);

  // State for available portfolio covers (for selecting existing images)
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      if (onNotify) {
        onNotify(msg, type);
      } else {
        alert(msg);
      }
    },
    [onNotify]
  );

  // Load All Data
  const loadHeroSlides = useCallback(async () => {
    try {
      setLoadingSlides(true);
      const res = await fetch("/api/admin/cms/hero");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSlides(json.data);
      }
    } catch {
      notify("Failed to load hero slides.", "error");
    } finally {
      setLoadingSlides(false);
    }
  }, [notify]);

  const loadHomepageConfigAndGlobal = useCallback(async () => {
    try {
      setLoadingConfig(true);
      setLoadingGlobal(true);
      const res = await fetch("/api/admin/cms");
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.homepage_config) {
          setHomepageConfig(json.data.homepage_config);
          if (Array.isArray(json.data.homepage_config.ticker_items)) {
            setTickerItems(json.data.homepage_config.ticker_items);
          }
        }
        if (json.data.general) {
          setGlobalSettings(json.data.general);
        }
      }
    } catch {
      notify("Failed to load homepage configuration.", "error");
    } finally {
      setLoadingConfig(false);
      setLoadingGlobal(false);
    }
  }, [notify]);

  const loadTestimonials = useCallback(async () => {
    try {
      setLoadingTestimonials(true);
      const res = await fetch("/api/admin/cms/testimonials");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTestimonials(json.data);
      }
    } catch {
      notify("Failed to load client testimonials.", "error");
    } finally {
      setLoadingTestimonials(false);
    }
  }, [notify]);

  const loadPortfolioProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/storage/portfolio");
      if (res.ok) {
        const json = await res.json();
        if (json.projects && Array.isArray(json.projects)) {
          setPortfolioProjects(json.projects);
        }
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    loadHeroSlides();
    loadHomepageConfigAndGlobal();
    loadTestimonials();
    loadPortfolioProjects();
  }, [loadHeroSlides, loadHomepageConfigAndGlobal, loadTestimonials, loadPortfolioProjects]);

  // Handle Image Upload for Hero Slide
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("folder", "hero-slides");
      formData.append("file", file);

      const res = await fetch("/api/admin/storage/portfolio", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.uploaded && json.uploaded.length > 0) {
        const uploadedFile = json.uploaded[0];
        setEditingSlide((prev) => ({
          ...(prev || {}),
          image_url: uploadedFile.public_url,
          storage_path: uploadedFile.storage_path,
        }));
        notify("Photograph uploaded successfully to Supabase Storage!");
      } else {
        notify(json.error || "Failed to upload image.", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Failed to upload image.", "error");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save / Upsert Hero Slide
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlide?.title?.trim()) {
      notify("Slide headline is required.", "error");
      return;
    }
    if (!editingSlide?.image_url?.trim()) {
      notify("A photograph image is required for this slide.", "error");
      return;
    }

    try {
      setSavingSlide(true);
      const res = await fetch("/api/admin/cms/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSlide),
      });

      const json = await res.json();
      if (json.success) {
        notify("Hero slide saved successfully!");
        setIsSlideModalOpen(false);
        setEditingSlide(null);
        await loadHeroSlides();
      } else {
        notify(json.error || "Failed to save slide.", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Failed to save slide.", "error");
    } finally {
      setSavingSlide(false);
    }
  };

  // Delete Hero Slide
  const handleDeleteSlide = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hero slide?")) return;

    try {
      const res = await fetch(`/api/admin/cms/hero?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        notify("Hero slide deleted.");
        await loadHeroSlides();
      } else {
        notify(json.error || "Failed to delete slide.", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Failed to delete slide.", "error");
    }
  };

  // Toggle Slide Published State
  const handleToggleSlidePublished = async (slide: HeroSlide) => {
    try {
      const res = await fetch("/api/admin/cms/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...slide,
          is_published: !slide.is_published,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(
          !slide.is_published ? "Slide published to live homepage!" : "Slide unpublished (draft)."
        );
        await loadHeroSlides();
      }
    } catch {
      notify("Failed to update slide visibility.", "error");
    }
  };

  // Reorder Slides (Move Up / Down)
  const handleMoveSlide = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    setSlides(newSlides);

    try {
      const order = newSlides.map((s) => s.id);
      const res = await fetch("/api/admin/cms/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) {
        await loadHeroSlides();
      } else {
        notify("Slide display order updated.");
      }
    } catch {
      await loadHeroSlides();
    }
  };

  // Save Homepage Config (Sections, CTA, Autoplay)
  const handleSaveHomepageConfig = async (partialConfig: Partial<HomepageConfig>) => {
    try {
      setSavingConfig(true);
      const updated = { ...(homepageConfig || {}), ...partialConfig };
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "homepage_config",
          value: updated,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setHomepageConfig(updated as HomepageConfig);
        notify("Homepage configuration saved!");
      } else {
        notify(json.error || "Failed to save configuration.", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Failed to save configuration.", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  // Ticker Management
  const handleAddTickerItem = () => {
    const text = newTickerText.trim();
    if (!text) return;
    const updated = [...tickerItems, text];
    setTickerItems(updated);
    setNewTickerText("");
    handleSaveHomepageConfig({ ticker_items: updated });
  };

  const handleDeleteTickerItem = (idx: number) => {
    const updated = tickerItems.filter((_, i) => i !== idx);
    setTickerItems(updated);
    handleSaveHomepageConfig({ ticker_items: updated });
  };

  // Save / Upsert Testimonial
  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestimonial?.quote?.trim()) {
      notify("Testimonial quote text is required.", "error");
      return;
    }
    if (!editingTestimonial?.author?.trim()) {
      notify("Author name is required.", "error");
      return;
    }

    try {
      setSavingTestimonial(true);
      const res = await fetch("/api/admin/cms/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTestimonial),
      });

      const json = await res.json();
      if (json.success) {
        notify("Client testimonial saved successfully!");
        setIsTestimonialModalOpen(false);
        setEditingTestimonial(null);
        await loadTestimonials();
      } else {
        notify(json.error || "Failed to save testimonial.", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Failed to save testimonial.", "error");
    } finally {
      setSavingTestimonial(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;

    try {
      const res = await fetch(`/api/admin/cms/testimonials?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        notify("Testimonial deleted.");
        await loadTestimonials();
      } else {
        notify(json.error || "Failed to delete testimonial.", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Failed to delete testimonial.", "error");
    }
  };

  const handleToggleTestimonialPublished = async (t: Testimonial) => {
    try {
      const res = await fetch("/api/admin/cms/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...t,
          is_published: !t.is_published,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(!t.is_published ? "Testimonial published!" : "Testimonial hidden.");
        await loadTestimonials();
      }
    } catch {
      notify("Failed to update testimonial status.", "error");
    }
  };

  // Save Global Settings
  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGlobal(true);
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "general",
          value: globalSettings,
        }),
      });

      const json = await res.json();
      if (json.success) {
        notify("Global studio details saved successfully!");
      } else {
        notify(json.error || "Failed to save global details.", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Failed to save global details.", "error");
    } finally {
      setSavingGlobal(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* CMS Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DEC9] pb-4">
        {[
          { id: "hero", label: "Full-Screen Hero Slider", icon: Layers },
          { id: "sections", label: "Homepage Sections & CTA", icon: Sliders },
          { id: "ticker", label: "Ticker Disciplines", icon: Globe },
          { id: "testimonials", label: "Client Testimonials", icon: Quote },
          { id: "global", label: "Studio Info & Metadata", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? "bg-[#3A2008] text-[#FAF7F2] shadow-xs"
                  : "bg-[#FFFFFF] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9] hover:bg-[#FAF7F2]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#D9A673]" : "text-[#A66D35]"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          SUB-TAB 1: FULL-SCREEN HERO SLIDER CMS
      ========================================================================= */}
      {activeSubTab === "hero" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                Edge-to-Edge Photographic Experience
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#141210]">
                Hero Slider Management
              </h2>
              <p className="text-xs text-[#5C5449]">
                Add, reorder, and configure full-viewport photograph slides. Each slide contains one dominant photograph, a refined headline, supporting sentence, and an optional booking CTA.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingSlide({
                    title: "",
                    subtitle: "",
                    eyebrow: "",
                    cta_label: "Book Convocation Session",
                    cta_href: "/book/convocation",
                    image_url: "",
                    focal_point: "center",
                    text_align: "left",
                    sort_order: slides.length + 1,
                    is_published: true,
                  });
                  setIsSlideModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9A673]" />
                <span>Add Hero Slide</span>
              </button>
            </div>
          </div>

          {/* Autoplay & Transition Settings Card */}
          <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-[#141210]">Autoplay &amp; Slider Transition</div>
              <div className="text-[#5C5449]">
                Automatically cycle through slides when multiple slides are active. Pauses on hover or touch.
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#141210]">
                <input
                  type="checkbox"
                  checked={homepageConfig?.hero_autoplay !== false}
                  onChange={(e) => handleSaveHomepageConfig({ hero_autoplay: e.target.checked })}
                  className="rounded text-[#3A2008] focus:ring-[#3A2008]"
                />
                <span>Enable Autoplay</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[#5C5449]">Interval:</span>
                <select
                  value={homepageConfig?.hero_interval_sec || 6}
                  onChange={(e) =>
                    handleSaveHomepageConfig({ hero_interval_sec: Number(e.target.value) })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono font-medium"
                >
                  <option value={4}>4 seconds</option>
                  <option value={5}>5 seconds</option>
                  <option value={6}>6 seconds (Default)</option>
                  <option value={8}>8 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Slides List */}
          {loadingSlides ? (
            <div className="p-12 text-center text-xs text-[#5C5449] bg-white rounded-3xl border border-[#E5DEC9]">
              Loading hero slides...
            </div>
          ) : slides.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-[#E5DEC9] space-y-3">
              <ImageIcon className="w-8 h-8 text-[#A66D35]/40 mx-auto" />
              <div className="text-sm font-semibold text-[#141210]">No Hero Slides Configured</div>
              <p className="text-xs text-[#5C5449] max-w-md mx-auto">
                When 0 slides are published, the homepage renders a quiet neutral fallback studio screen without dummy content. Add your first photograph slide above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                    slide.is_published
                      ? "bg-white border-[#E5DEC9] shadow-xs"
                      : "bg-[#FAF7F2]/60 border-dashed border-[#D5CCB4] opacity-75"
                  }`}
                >
                  {/* Left: Thumbnail & Content Details */}
                  <div className="flex items-start gap-4">
                    <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden bg-[#161311] shrink-0 border border-[#E5DEC9]">
                      <Image
                        src={slide.image_url}
                        alt={slide.alt_text || slide.title}
                        fill
                        className={`object-cover ${
                          slide.focal_point === "top"
                            ? "object-top"
                            : slide.focal_point === "bottom"
                            ? "object-bottom"
                            : "object-center"
                        }`}
                      />
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                        #{idx + 1}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {slide.eyebrow && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#A66D35] bg-[#F4EFE6] px-2 py-0.5 rounded border border-[#E5DEC9]">
                            {slide.eyebrow}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                            slide.is_published
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {slide.is_published ? "Published" : "Draft / Hidden"}
                        </span>
                        <span className="text-[10px] font-mono text-[#8A8175]">
                          Focal: {slide.focal_point || "center"} • Align: {slide.text_align || "left"}
                        </span>
                      </div>

                      <h3 className="font-editorial text-lg text-[#141210] font-normal leading-snug">
                        {slide.title}
                      </h3>

                      {slide.subtitle && (
                        <p className="text-xs text-[#5C5449] line-clamp-1 max-w-xl">
                          {slide.subtitle}
                        </p>
                      )}

                      {slide.cta_label && (
                        <div className="flex items-center gap-1.5 text-xs text-[#3A2008] font-medium pt-1">
                          <span className="text-[10px] font-mono text-[#8A8175]">CTA:</span>
                          <span>{slide.cta_label}</span>
                          <span className="text-[#8A8175]">({slide.cta_href || "/book"})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions & Reordering */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Reorder Buttons */}
                    <div className="flex items-center border border-[#E5DEC9] rounded-xl overflow-hidden bg-[#FAF7F2]">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSlide(idx, "up")}
                        className="p-2 text-[#5C5449] hover:text-[#141210] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-px h-4 bg-[#E5DEC9]" />
                      <button
                        type="button"
                        disabled={idx === slides.length - 1}
                        onClick={() => handleMoveSlide(idx, "down")}
                        className="p-2 text-[#5C5449] hover:text-[#141210] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Publish Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleSlidePublished(slide)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        slide.is_published
                          ? "bg-white hover:bg-amber-50 text-[#5C5449] hover:text-amber-800 border-[#E5DEC9]"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}
                      title={slide.is_published ? "Unpublish slide" : "Publish slide"}
                    >
                      {slide.is_published ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlide({ ...slide });
                        setIsSlideModalOpen(true);
                      }}
                      className="p-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210] transition-colors cursor-pointer"
                      title="Edit slide"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#3A2008]" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-2.5 rounded-xl bg-white hover:bg-red-50 border border-[#E5DEC9] hover:border-red-200 text-red-600 transition-colors cursor-pointer"
                      title="Delete slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slide Edit / Create Modal */}
          {isSlideModalOpen && editingSlide && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E5DEC9] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#141210]">
                      {editingSlide.id ? "Edit Hero Slide" : "Create New Hero Slide"}
                    </h3>
                    <p className="text-xs text-[#5C5449]">
                      Set the high-resolution photograph, editorial typography, and call to action.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSlideModalOpen(false);
                      setEditingSlide(null);
                    }}
                    className="p-2 text-[#8A8175] hover:text-[#141210] rounded-xl hover:bg-[#FAF7F2]"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveSlide} className="space-y-4 text-xs">
                  {/* Slide Photograph Preview & Upload */}
                  <div className="space-y-2">
                    <label className="font-semibold block text-[#141210]">
                      Slide Photograph <span className="text-red-500">*</span>
                    </label>

                    {editingSlide.image_url ? (
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-[#161311] border border-[#E5DEC9]">
                        <Image
                          src={editingSlide.image_url}
                          alt="Slide preview"
                          fill
                          className={`object-cover ${
                            editingSlide.focal_point === "top"
                              ? "object-top"
                              : editingSlide.focal_point === "bottom"
                              ? "object-bottom"
                              : "object-center"
                          }`}
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-2 rounded-xl bg-white text-[#141210] font-semibold text-xs shadow-md"
                          >
                            Replace Photograph
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-40 rounded-2xl border-2 border-dashed border-[#D5CCB4] bg-[#FAF7F2] hover:bg-[#F4EFE6] transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-[#5C5449]"
                      >
                        <Upload className="w-6 h-6 text-[#A66D35]" />
                        <span className="font-semibold text-xs">Click to Upload Photograph</span>
                        <span className="text-[10px] text-[#8A8175]">
                          JPEG, PNG, WebP up to 15 MB (Stored in portfolio-media bucket)
                        </span>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {uploadingImage && (
                      <div className="text-xs text-[#A66D35] flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading photograph to Supabase Storage...</span>
                      </div>
                    )}

                    {/* Or choose from existing portfolio project covers */}
                    {portfolioProjects.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] text-[#8A8175] block mb-1.5">
                          Or select from existing portfolio project covers:
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {portfolioProjects.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                setEditingSlide((prev) => ({
                                  ...(prev || {}),
                                  image_url: p.thumbnail_url,
                                  alt_text: p.title,
                                }))
                              }
                              className="relative w-14 h-10 rounded-lg overflow-hidden border border-[#E5DEC9] shrink-0 hover:scale-105 transition-transform"
                              title={p.title}
                            >
                              <Image src={p.thumbnail_url} alt={p.title} fill className="object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Headline & Eyebrow */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-semibold block mb-1 text-[#141210]">
                        Headline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingSlide.title || ""}
                        onChange={(e) =>
                          setEditingSlide((prev) => ({ ...(prev || {}), title: e.target.value }))
                        }
                        placeholder="e.g. Every Frame Holds a Story."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        Optional Eyebrow
                      </label>
                      <input
                        type="text"
                        value={editingSlide.eyebrow || ""}
                        onChange={(e) =>
                          setEditingSlide((prev) => ({ ...(prev || {}), eyebrow: e.target.value }))
                        }
                        placeholder="e.g. IUB 27TH CONVOCATION"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                  </div>

                  {/* Supporting Sentence */}
                  <div>
                    <label className="font-semibold block mb-1 text-[#141210]">
                      Supporting Sentence (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={editingSlide.subtitle || ""}
                      onChange={(e) =>
                        setEditingSlide((prev) => ({ ...(prev || {}), subtitle: e.target.value }))
                      }
                      placeholder="One concise, elegant sentence describing this collection or milestone booking."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>

                  {/* CTA Label & Destination */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        CTA Button Label
                      </label>
                      <input
                        type="text"
                        value={editingSlide.cta_label || ""}
                        onChange={(e) =>
                          setEditingSlide((prev) => ({ ...(prev || {}), cta_label: e.target.value }))
                        }
                        placeholder="e.g. Book Convocation Session"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        CTA Destination URL
                      </label>
                      <input
                        type="text"
                        value={editingSlide.cta_href || ""}
                        onChange={(e) =>
                          setEditingSlide((prev) => ({ ...(prev || {}), cta_href: e.target.value }))
                        }
                        placeholder="/book/convocation or /works"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                  </div>

                  {/* Layout & Composition Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">Focal Point</label>
                      <select
                        value={editingSlide.focal_point || "center"}
                        onChange={(e) =>
                          setEditingSlide((prev) => ({
                            ...(prev || {}),
                            focal_point: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      >
                        <option value="center">Center</option>
                        <option value="top">Top (Headroom)</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        Text Alignment
                      </label>
                      <select
                        value={editingSlide.text_align || "left"}
                        onChange={(e) =>
                          setEditingSlide((prev) => ({
                            ...(prev || {}),
                            text_align: e.target.value as any,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      >
                        <option value="left">Left Aligned (Standard)</option>
                        <option value="center">Center Aligned</option>
                        <option value="right">Right Aligned</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-[#141210]">
                        <input
                          type="checkbox"
                          checked={editingSlide.is_published !== false}
                          onChange={(e) =>
                            setEditingSlide((prev) => ({
                              ...(prev || {}),
                              is_published: e.target.checked,
                            }))
                          }
                          className="rounded text-[#3A2008] focus:ring-[#3A2008]"
                        />
                        <span>Publish Live</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5DEC9] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSlideModalOpen(false);
                        setEditingSlide(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-[#E5DEC9] text-[#5C5449] hover:bg-[#FAF7F2] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingSlide || uploadingImage}
                      className="px-6 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold shadow-xs disabled:opacity-50"
                    >
                      {savingSlide ? "Saving..." : "Save Hero Slide"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: HOMEPAGE SECTIONS & CLOSING CTA CMS
      ========================================================================= */}
      {activeSubTab === "sections" && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
              Modular Architecture
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141210]">
              Homepage Sections &amp; Closing CTA
            </h2>
            <p className="text-xs text-[#5C5449]">
              Toggle section visibility on the live homepage and manage section titles, descriptions, and the closing call-to-action.
            </p>
          </div>

          {/* Section Visibility Switches */}
          <div className="rounded-3xl bg-white border border-[#E5DEC9] p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3">
              Section Visibility Toggles
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: "show_ticker", label: "Horizontal Ticker", desc: "Studio disciplines strip" },
                {
                  key: "show_flagship",
                  label: "Portfolio Showcase",
                  desc: "Flagship editorial productions",
                },
                {
                  key: "show_testimonials",
                  label: "Client Testimonials",
                  desc: "Quotations from partners (auto-hidden if 0 published)",
                },
                {
                  key: "show_services",
                  label: "Specialized Services",
                  desc: "Portraiture & summit coverage bento",
                },
                {
                  key: "show_print_bridge",
                  label: "Print & Merch Bridge",
                  desc: "Debossed cards & frames preview",
                },
                {
                  key: "show_quote_builder",
                  label: "Interactive Quote Builder",
                  desc: "Lead generation inquiry form",
                },
                {
                  key: "show_closing_cta",
                  label: "Closing Cinematic CTA",
                  desc: "Final appointment booking section",
                },
              ].map((item) => {
                const isChecked = (homepageConfig as any)?.[item.key] !== false;
                return (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] cursor-pointer hover:border-[#D5CCB4] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleSaveHomepageConfig({ [item.key]: e.target.checked })}
                      className="mt-0.5 rounded text-[#3A2008] focus:ring-[#3A2008]"
                    />
                    <div>
                      <div className="font-semibold text-[#141210]">{item.label}</div>
                      <div className="text-[11px] text-[#5C5449]">{item.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section Copy Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* Flagship Portfolio Showcase Copy */}
            <div className="rounded-3xl bg-white border border-[#E5DEC9] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3">
                Portfolio Showcase Section Copy
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold block mb-1 text-[#141210]">Section Heading</label>
                  <input
                    type="text"
                    value={homepageConfig?.flagship_heading || ""}
                    onChange={(e) =>
                      setHomepageConfig((prev: any) => ({
                        ...prev,
                        flagship_heading: e.target.value,
                      }))
                    }
                    placeholder="Selected Productions & Editorial Archives"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-[#141210]">
                    Section Subheading
                  </label>
                  <textarea
                    rows={3}
                    value={homepageConfig?.flagship_subheading || ""}
                    onChange={(e) =>
                      setHomepageConfig((prev: any) => ({
                        ...prev,
                        flagship_subheading: e.target.value,
                      }))
                    }
                    placeholder="Photographic commissions across institutional summits..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleSaveHomepageConfig({
                      flagship_heading: homepageConfig?.flagship_heading,
                      flagship_subheading: homepageConfig?.flagship_subheading,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold cursor-pointer"
                >
                  Save Showcase Copy
                </button>
              </div>
            </div>

            {/* Specialized Services Section Copy */}
            <div className="rounded-3xl bg-white border border-[#E5DEC9] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3">
                Services Section Copy
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold block mb-1 text-[#141210]">Section Heading</label>
                  <input
                    type="text"
                    value={homepageConfig?.services_heading || ""}
                    onChange={(e) =>
                      setHomepageConfig((prev: any) => ({
                        ...prev,
                        services_heading: e.target.value,
                      }))
                    }
                    placeholder="Studio Disciplines & Commissions"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-[#141210]">
                    Section Subheading
                  </label>
                  <textarea
                    rows={3}
                    value={homepageConfig?.services_subheading || ""}
                    onChange={(e) =>
                      setHomepageConfig((prev: any) => ({
                        ...prev,
                        services_subheading: e.target.value,
                      }))
                    }
                    placeholder="Structured appointment bookings with live calendar availability..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleSaveHomepageConfig({
                      services_heading: homepageConfig?.services_heading,
                      services_subheading: homepageConfig?.services_subheading,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold cursor-pointer"
                >
                  Save Services Copy
                </button>
              </div>
            </div>
          </div>

          {/* Closing Cinematic CTA Editor */}
          <div className="rounded-3xl bg-white border border-[#E5DEC9] p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-[#141210] border-b border-[#E5DEC9] pb-3">
              Closing Cinematic Call-to-Action (CTA)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <div>
                  <label className="font-semibold block mb-1 text-[#141210]">CTA Heading</label>
                  <input
                    type="text"
                    value={homepageConfig?.closing_cta_heading || ""}
                    onChange={(e) =>
                      setHomepageConfig((prev: any) => ({
                        ...prev,
                        closing_cta_heading: e.target.value,
                      }))
                    }
                    placeholder="Every Milestone Deserves Permanent Record."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-[#141210]">CTA Subheading</label>
                  <textarea
                    rows={3}
                    value={homepageConfig?.closing_cta_subheading || ""}
                    onChange={(e) =>
                      setHomepageConfig((prev: any) => ({
                        ...prev,
                        closing_cta_subheading: e.target.value,
                      }))
                    }
                    placeholder="Commission our studio for university convocations..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 text-[#141210]">Button Label</label>
                    <input
                      type="text"
                      value={homepageConfig?.closing_cta_button_label || ""}
                      onChange={(e) =>
                        setHomepageConfig((prev: any) => ({
                          ...prev,
                          closing_cta_button_label: e.target.value,
                        }))
                      }
                      placeholder="Book a Photography Session"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-[#141210]">
                      Button Destination Link
                    </label>
                    <input
                      type="text"
                      value={homepageConfig?.closing_cta_button_href || ""}
                      onChange={(e) =>
                        setHomepageConfig((prev: any) => ({
                          ...prev,
                          closing_cta_button_href: e.target.value,
                        }))
                      }
                      placeholder="/book or /book/convocation"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleSaveHomepageConfig({
                      closing_cta_heading: homepageConfig?.closing_cta_heading,
                      closing_cta_subheading: homepageConfig?.closing_cta_subheading,
                      closing_cta_button_label: homepageConfig?.closing_cta_button_label,
                      closing_cta_button_href: homepageConfig?.closing_cta_button_href,
                      closing_cta_image_url: homepageConfig?.closing_cta_image_url,
                    })
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold cursor-pointer shadow-xs"
                >
                  Save Closing CTA
                </button>
              </div>

              {/* Background Image Preview */}
              <div className="space-y-3">
                <label className="font-semibold block text-[#141210]">
                  CTA Background Photograph
                </label>
                <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-[#161311] border border-[#E5DEC9]">
                  {homepageConfig?.closing_cta_image_url && (
                    <Image
                      src={homepageConfig.closing_cta_image_url}
                      alt="CTA backdrop"
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-4">
                    <span className="text-white text-xs font-mono">
                      {homepageConfig?.closing_cta_heading}
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={homepageConfig?.closing_cta_image_url || ""}
                  onChange={(e) =>
                    setHomepageConfig((prev: any) => ({
                      ...prev,
                      closing_cta_image_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: TICKER ITEMS CMS
      ========================================================================= */}
      {activeSubTab === "ticker" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                Continuous Loop Banner
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#141210]">
                Horizontal Ticker Items
              </h2>
              <p className="text-xs text-[#5C5449]">
                Manage the continuous horizontal ticker loop items displayed directly underneath the hero slider.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-[#141210] bg-white px-3.5 py-2 rounded-xl border border-[#E5DEC9]">
                <input
                  type="checkbox"
                  checked={homepageConfig?.show_ticker !== false}
                  onChange={(e) => handleSaveHomepageConfig({ show_ticker: e.target.checked })}
                  className="rounded text-[#3A2008] focus:ring-[#3A2008]"
                />
                <span>Ticker Visible</span>
              </label>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[#E5DEC9] p-6 space-y-6 text-xs">
            {/* Add New Ticker Item Input */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newTickerText}
                onChange={(e) => setNewTickerText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTickerItem()}
                placeholder="Enter new ticker phrase (e.g. SAME-DAY PR PHOTO DISTRIBUTION)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono uppercase text-xs"
              />
              <button
                type="button"
                onClick={handleAddTickerItem}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9A673]" />
                <span>Add Item</span>
              </button>
            </div>

            {/* List of Ticker Items */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8175] block">
                Active Ticker Phrases ({tickerItems.length})
              </span>

              {tickerItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5C5449] border border-dashed rounded-2xl">
                  No ticker items defined.
                </div>
              ) : (
                <div className="divide-y divide-[#E5DEC9] border border-[#E5DEC9] rounded-2xl overflow-hidden bg-[#FAF7F2]/50">
                  {tickerItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 flex items-center justify-between gap-4 bg-white hover:bg-[#FAF7F2] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-[#8A8175] w-6">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#141210]">
                          {item}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTickerItem(idx)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: CLIENT TESTIMONIALS CMS
      ========================================================================= */}
      {activeSubTab === "testimonials" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
                Verified Endorsements
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#141210]">
                Client Testimonials CMS
              </h2>
              <p className="text-xs text-[#5C5449]">
                Only genuine, administrator-approved reviews appear on the live website. If 0 testimonials are published, the section is completely omitted from the homepage.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingTestimonial({
                  quote: "",
                  author: "",
                  role_or_title: "",
                  organization: "",
                  project_tag: "",
                  sort_order: testimonials.length + 1,
                  is_published: true,
                });
                setIsTestimonialModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#D9A673]" />
              <span>Add Testimonial</span>
            </button>
          </div>

          {/* Testimonials List */}
          {loadingTestimonials ? (
            <div className="p-12 text-center text-xs text-[#5C5449] bg-white rounded-3xl border border-[#E5DEC9]">
              Loading testimonials...
            </div>
          ) : testimonials.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-[#E5DEC9] space-y-3">
              <Quote className="w-8 h-8 text-[#A66D35]/40 mx-auto" />
              <div className="text-sm font-semibold text-[#141210]">
                No Testimonials Published
              </div>
              <p className="text-xs text-[#5C5449] max-w-md mx-auto">
                All fabricated/dummy testimonials have been purged. Because there are 0 published testimonials, the Testimonials section is currently hidden from public visitors. Add genuine client praise above to display it.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    t.is_published
                      ? "bg-white border-[#E5DEC9] shadow-xs"
                      : "bg-[#FAF7F2]/60 border-dashed border-[#D5CCB4] opacity-75"
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                          t.is_published
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {t.is_published ? "Published" : "Draft"}
                      </span>
                      {t.project_tag && (
                        <span className="text-[10px] font-mono text-[#A66D35] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E5DEC9]">
                          {t.project_tag}
                        </span>
                      )}
                    </div>

                    <blockquote className="font-editorial text-sm sm:text-base text-[#141210] italic">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>

                    <div className="text-xs text-[#5C5449]">
                      <span className="font-semibold text-[#141210]">{t.author}</span>
                      {t.role_or_title && ` — ${t.role_or_title}`}
                      {t.organization && ` (${t.organization})`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleTestimonialPublished(t)}
                      className="p-2 rounded-xl border border-[#E5DEC9] bg-white hover:bg-[#FAF7F2] text-[#5C5449]"
                      title={t.is_published ? "Unpublish" : "Publish"}
                    >
                      {t.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTestimonial({ ...t });
                        setIsTestimonialModalOpen(true);
                      }}
                      className="p-2 rounded-xl border border-[#E5DEC9] bg-white hover:bg-[#FAF7F2] text-[#3A2008]"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTestimonial(t.id)}
                      className="p-2 rounded-xl border border-[#E5DEC9] bg-white hover:bg-red-50 text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Testimonial Edit/Create Modal */}
          {isTestimonialModalOpen && editingTestimonial && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E5DEC9] shadow-2xl p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
                  <h3 className="text-base font-bold text-[#141210]">
                    {editingTestimonial.id ? "Edit Testimonial" : "Add Real Testimonial"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTestimonialModalOpen(false);
                      setEditingTestimonial(null);
                    }}
                    className="p-1.5 text-[#8A8175] hover:text-[#141210]"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveTestimonial} className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1 text-[#141210]">
                      Quote Quotation <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={editingTestimonial.quote || ""}
                      onChange={(e) =>
                        setEditingTestimonial((prev) => ({ ...(prev || {}), quote: e.target.value }))
                      }
                      placeholder="Client's actual reflection on your studio's work..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        Author Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTestimonial.author || ""}
                        onChange={(e) =>
                          setEditingTestimonial((prev) => ({ ...(prev || {}), author: e.target.value }))
                        }
                        placeholder="e.g. Tanvir Rahman"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        Role or Title
                      </label>
                      <input
                        type="text"
                        value={editingTestimonial.role_or_title || ""}
                        onChange={(e) =>
                          setEditingTestimonial((prev) => ({
                            ...(prev || {}),
                            role_or_title: e.target.value,
                          }))
                        }
                        placeholder="e.g. Managing Director"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        Organization
                      </label>
                      <input
                        type="text"
                        value={editingTestimonial.organization || ""}
                        onChange={(e) =>
                          setEditingTestimonial((prev) => ({
                            ...(prev || {}),
                            organization: e.target.value,
                          }))
                        }
                        placeholder="e.g. Apex Fintech"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-[#141210]">
                        Project Tag
                      </label>
                      <input
                        type="text"
                        value={editingTestimonial.project_tag || ""}
                        onChange={(e) =>
                          setEditingTestimonial((prev) => ({
                            ...(prev || {}),
                            project_tag: e.target.value,
                          }))
                        }
                        placeholder="e.g. IUB Convocation 2026"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-[#141210]">
                      <input
                        type="checkbox"
                        checked={editingTestimonial.is_published !== false}
                        onChange={(e) =>
                          setEditingTestimonial((prev) => ({
                            ...(prev || {}),
                            is_published: e.target.checked,
                          }))
                        }
                        className="rounded text-[#3A2008] focus:ring-[#3A2008]"
                      />
                      <span>Publish Live on Website</span>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-[#E5DEC9] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsTestimonialModalOpen(false);
                        setEditingTestimonial(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-[#E5DEC9] text-[#5C5449] hover:bg-[#FAF7F2] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingTestimonial}
                      className="px-5 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold shadow-xs disabled:opacity-50"
                    >
                      {savingTestimonial ? "Saving..." : "Save Testimonial"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 5: GLOBAL STUDIO INFO & METADATA CMS
      ========================================================================= */}
      {activeSubTab === "global" && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#A66D35]">
              Public Studio Profile
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141210]">
              Global Studio Info &amp; Metadata
            </h2>
            <p className="text-xs text-[#5C5449]">
              Configure contact information, studio physical address, and social media channels.
            </p>
          </div>

          <form
            onSubmit={handleSaveGlobalSettings}
            className="rounded-3xl bg-white border border-[#E5DEC9] p-6 sm:p-8 space-y-5 text-xs max-w-3xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1 text-[#141210]">Agency Brand Name</label>
                <input
                  type="text"
                  value={globalSettings.agency_name || "OFFPRINT (অফপ্রিন্ট)"}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, agency_name: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-[#141210]">Studio Tagline</label>
                <input
                  type="text"
                  value={globalSettings.tagline || ""}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  placeholder="Editorial Photography & Fine-Art Print Studio"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1 text-[#141210]">Inquiry Email</label>
                <input
                  type="email"
                  value={globalSettings.email || "inquiry@offprint.agency"}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-[#141210]">
                  Studio Phone (Optional)
                </label>
                <input
                  type="text"
                  value={globalSettings.phone || ""}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Leave blank if no public hotline"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-[#141210]">Studio Location</label>
              <input
                type="text"
                value={globalSettings.address || ""}
                onChange={(e) =>
                  setGlobalSettings((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Gulshan & Banani, Dhaka, Bangladesh"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="font-semibold block mb-1 text-[#141210]">Instagram URL</label>
                <input
                  type="text"
                  value={globalSettings.instagram_url || ""}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, instagram_url: e.target.value }))
                  }
                  placeholder="https://instagram.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-[#141210]">Facebook URL</label>
                <input
                  type="text"
                  value={globalSettings.facebook_url || ""}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, facebook_url: e.target.value }))
                  }
                  placeholder="https://facebook.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-[#141210]">LinkedIn URL</label>
                <input
                  type="text"
                  value={globalSettings.linkedin_url || ""}
                  onChange={(e) =>
                    setGlobalSettings((prev) => ({ ...prev, linkedin_url: e.target.value }))
                  }
                  placeholder="https://linkedin.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DEC9] flex justify-end">
              <button
                type="submit"
                disabled={savingGlobal}
                className="px-6 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingGlobal ? "Saving..." : "Save Global Information"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
