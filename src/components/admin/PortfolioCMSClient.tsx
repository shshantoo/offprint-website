"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
  PortfolioProject,
  PortfolioCategory,
  PortfolioGalleryItem,
} from "@/types/database";
import {
  fetchPortfolioProjects,
  savePortfolioProject,
  deletePortfolioProject,
  normalizePortfolioProject,
} from "@/lib/data-service";
import { formatDate } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  User,
  Star,
  Upload,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export default function PortfolioCMSClient() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [category, setCategory] = useState<PortfolioCategory>("corporate_summit");
  const [isFlagship, setIsFlagship] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);
  const [coverAltText, setCoverAltText] = useState("");
  const [coverCaption, setCoverCaption] = useState("");
  const [galleryItems, setGalleryItems] = useState<PortfolioGalleryItem[]>([]);
  const [manualGalleryUrl, setManualGalleryUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [completedDate, setCompletedDate] = useState("");
  const [description, setDescription] = useState("");

  // Upload & feedback state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await fetchPortfolioProjects();
    setProjects(data);
    setIsLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setTitle("");
    setClientName("");
    setCategory("corporate_summit");
    setIsFlagship(false);
    setThumbnailUrl("");
    setCoverStoragePath(null);
    setCoverAltText("");
    setCoverCaption("");
    setGalleryItems([]);
    setManualGalleryUrl("");
    setVideoUrl("");
    setCompletedDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proj: PortfolioProject) => {
    const norm = normalizePortfolioProject(proj);
    setEditingProject(norm);
    setTitle(norm.title);
    setClientName(norm.client_name);
    setCategory(norm.category);
    setIsFlagship(norm.is_flagship);
    setThumbnailUrl(norm.thumbnail_url);
    setCoverStoragePath(norm.cover_storage_path || null);
    setCoverAltText(norm.cover_alt_text || `${norm.title} — ${norm.client_name}`);
    setCoverCaption(norm.cover_caption || "");
    setGalleryItems(norm.gallery_items || []);
    setManualGalleryUrl("");
    setVideoUrl(norm.video_url || "");
    setCompletedDate(norm.completed_date || "");
    setDescription(norm.description || "");
    setFeedback(null);
    setIsModalOpen(true);
  };

  const validateFilesClientSide = (files: File[]): string | null => {
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return `File "${file.name}" has unsupported type (${file.type}). Allowed: JPEG, PNG, WebP, AVIF, GIF.`;
      }
      if (file.size > MAX_SIZE_BYTES) {
        return `File "${file.name}" exceeds the 15 MB size limit.`;
      }
    }
    return null;
  };

  const uploadFilesToStorage = async (
    files: File[],
    folderLabel: string
  ): Promise<
    Array<{
      storage_path: string;
      public_url: string;
      file_name: string;
      size_bytes: number;
      mime_type: string;
    }>
  > => {
    const validationErr = validateFilesClientSide(files);
    if (validationErr) {
      throw new Error(validationErr);
    }

    const cleanFolder =
      (folderLabel || "portfolio")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 64) || "item";

    // Direct browser upload to Supabase Storage (bypasses Vercel 4.5 MB request payload limit)
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        const results: Array<{
          storage_path: string;
          public_url: string;
          file_name: string;
          size_bytes: number;
          mime_type: string;
        }> = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
          const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
          const baseName =
            file.name
              .replace(/\.[a-zA-Z0-9]+$/, "")
              .toLowerCase()
              .replace(/[^a-z0-9._-]+/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 64) || "item";

          const storagePath = `projects/${cleanFolder}/${Date.now()}-${i + 1}-${baseName}${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("portfolio-media")
            .upload(storagePath, file, {
              contentType: file.type,
              cacheControl: "31536000",
              upsert: true,
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: pubData } = supabase.storage
            .from("portfolio-media")
            .getPublicUrl(storagePath);

          results.push({
            storage_path: storagePath,
            public_url: pubData.publicUrl,
            file_name: file.name,
            size_bytes: file.size,
            mime_type: file.type,
          });
        }

        return results;
      } catch (directErr) {
        console.warn(
          "Direct browser Supabase Storage upload fallback to server route:",
          directErr
        );
      }
    }

    const formData = new FormData();
    formData.append("folder", cleanFolder);
    for (const file of files) {
      formData.append("files", file);
    }

    const res = await fetch("/api/admin/storage/portfolio", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Storage upload failed.");
    }
    return json.uploaded || [];
  };

  const safeRemoveStoragePath = async (
    storagePath: string | null | undefined,
    excludeProjectId?: string
  ) => {
    if (!storagePath) return;
    try {
      await fetch("/api/admin/storage/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: storagePath,
          exclude_project_id: excludeProjectId,
        }),
      });
    } catch {
      // Non-fatal cleanup
    }
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFeedback(null);
    try {
      setUploadingCover(true);
      const previousCoverPath = coverStoragePath;
      const uploaded = await uploadFilesToStorage(
        [file],
        title || editingProject?.id || "cover"
      );
      if (uploaded.length > 0) {
        const first = uploaded[0];
        setThumbnailUrl(first.public_url);
        setCoverStoragePath(first.storage_path);
        if (!coverAltText) {
          setCoverAltText(
            title
              ? `${title} — Cover Photograph`
              : file.name.replace(/\.[a-zA-Z0-9]+$/, "")
          );
        }
        // If replacing a previous uploaded cover that is not in galleryItems, clean up safely
        if (
          previousCoverPath &&
          previousCoverPath !== first.storage_path &&
          !galleryItems.some((g) => g.storage_path === previousCoverPath)
        ) {
          await safeRemoveStoragePath(previousCoverPath, editingProject?.id);
        }
        setFeedback({
          type: "success",
          text: `Uploaded cover photograph "${file.name}" to Supabase Storage (portfolio-media).`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to upload cover image.",
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGalleryFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setFeedback(null);
    try {
      setUploadingGallery(true);
      const uploaded = await uploadFilesToStorage(
        files,
        title || editingProject?.id || "gallery"
      );

      setGalleryItems((prev) => {
        const baseOrder = prev.length;
        const added: PortfolioGalleryItem[] = uploaded.map((u, idx) => {
          const cleanName = u.file_name.replace(/\.[a-zA-Z0-9]+$/, "");
          return {
            id: `img-${Date.now()}-${idx + 1}`,
            url: u.public_url,
            storage_path: u.storage_path,
            caption: title ? `${title} — ${cleanName}` : cleanName,
            alt_text: title
              ? `${title} — Gallery photograph ${baseOrder + idx + 1}`
              : cleanName,
            sort_order: baseOrder + idx + 1,
            size_bytes: u.size_bytes,
            mime_type: u.mime_type,
          };
        });

        const next = [...prev, ...added];
        // Auto-populate cover image if none is set yet
        if (!thumbnailUrl && added.length > 0) {
          setThumbnailUrl(added[0].url);
          setCoverStoragePath(added[0].storage_path || null);
          if (!coverAltText) {
            setCoverAltText(added[0].alt_text);
          }
        }
        return next;
      });

      setFeedback({
        type: "success",
        text: `Uploaded ${uploaded.length} photograph(s) to Supabase Storage. Review previews & metadata below before saving.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to upload gallery photographs.",
      });
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleReplaceGalleryItemFile = async (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFeedback(null);
    try {
      setReplacingItemId(itemId);
      const targetItem = galleryItems.find((g) => g.id === itemId);
      const uploaded = await uploadFilesToStorage(
        [file],
        title || editingProject?.id || "gallery"
      );
      if (uploaded.length > 0) {
        const u = uploaded[0];
        setGalleryItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  url: u.public_url,
                  storage_path: u.storage_path,
                  size_bytes: u.size_bytes,
                  mime_type: u.mime_type,
                }
              : item
          )
        );
        if (targetItem && thumbnailUrl === targetItem.url) {
          setThumbnailUrl(u.public_url);
          setCoverStoragePath(u.storage_path);
        }
        if (
          targetItem?.storage_path &&
          targetItem.storage_path !== coverStoragePath
        ) {
          await safeRemoveStoragePath(targetItem.storage_path, editingProject?.id);
        }
        setFeedback({
          type: "success",
          text: `Replaced gallery image with "${file.name}".`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to replace gallery image.",
      });
    } finally {
      setReplacingItemId(null);
    }
  };

  const handleAddManualGalleryUrl = () => {
    const trimmed = manualGalleryUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setFeedback({
        type: "error",
        text: "Please enter a valid http/https image URL.",
      });
      return;
    }

    setGalleryItems((prev) => [
      ...prev,
      {
        id: `img-${Date.now()}-${prev.length + 1}`,
        url: trimmed,
        storage_path: null,
        caption: title ? `${title} (Frame ${prev.length + 1})` : "",
        alt_text: title
          ? `${title} — Gallery photograph ${prev.length + 1}`
          : "Portfolio photograph",
        sort_order: prev.length + 1,
      },
    ]);
    if (!thumbnailUrl) {
      setThumbnailUrl(trimmed);
    }
    setManualGalleryUrl("");
  };

  const handleMoveGalleryItem = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= galleryItems.length) return;
    setGalleryItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    });
  };

  const handleUpdateGalleryItemMeta = (
    id: string,
    field: "caption" | "alt_text",
    value: string
  ) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSetGalleryItemAsCover = (item: PortfolioGalleryItem) => {
    setThumbnailUrl(item.url);
    setCoverStoragePath(item.storage_path || null);
    if (item.alt_text) setCoverAltText(item.alt_text);
    if (item.caption) setCoverCaption(item.caption);
    setFeedback({
      type: "success",
      text: "Selected photograph as the project cover / thumbnail image.",
    });
  };

  const handleRemoveGalleryItem = async (item: PortfolioGalleryItem) => {
    const nextItems = galleryItems
      .filter((g) => g.id !== item.id)
      .map((g, idx) => ({ ...g, sort_order: idx + 1 }));
    setGalleryItems(nextItems);

    if (thumbnailUrl === item.url) {
      if (nextItems.length > 0) {
        setThumbnailUrl(nextItems[0].url);
        setCoverStoragePath(nextItems[0].storage_path || null);
      }
    }

    if (item.storage_path && item.storage_path !== coverStoragePath) {
      await safeRemoveStoragePath(item.storage_path, editingProject?.id);
    }
  };

  const handleToggleFlagship = async (proj: PortfolioProject) => {
    const updated = { ...proj, is_flagship: !proj.is_flagship };
    const saved = await savePortfolioProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === proj.id ? saved : p)));
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Permanently delete this project from the portfolio? Unreferenced Supabase Storage images for this entry will also be cleaned up."
      )
    ) {
      await deletePortfolioProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!title.trim() || !clientName.trim() || !thumbnailUrl.trim()) {
      setFeedback({
        type: "error",
        text: "Project Title, Client Name, and a Cover/Thumbnail Image are required.",
      });
      return;
    }

    try {
      setSaving(true);
      const orderedGallery = galleryItems.map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
        alt_text:
          item.alt_text?.trim() || `${title.trim()} — Gallery photograph ${idx + 1}`,
        caption: item.caption?.trim() || "",
      }));

      const projectPayload = {
        ...(editingProject ? { id: editingProject.id } : {}),
        title: title.trim(),
        client_name: clientName.trim(),
        category,
        is_flagship: isFlagship,
        thumbnail_url: thumbnailUrl.trim(),
        cover_storage_path: coverStoragePath || null,
        cover_alt_text:
          coverAltText.trim() || `${title.trim()} — ${clientName.trim()}`,
        cover_caption: coverCaption.trim(),
        gallery_urls: orderedGallery.map((g) => g.url),
        gallery_items: orderedGallery,
        video_url: videoUrl.trim() || null,
        completed_date: completedDate || null,
        description: description.trim(),
      };

      // Also persist via server API so server-side Supabase session writes directly
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload),
      });

      let saved: PortfolioProject;
      if (res.ok) {
        const json = await res.json();
        saved = normalizePortfolioProject(json.data);
      } else {
        saved = await savePortfolioProject(projectPayload);
      }

      if (editingProject) {
        setProjects((prev) =>
          prev.map((p) => (p.id === saved.id || p.id === editingProject.id ? saved : p))
        );
      } else {
        setProjects((prev) => [saved, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to save portfolio project.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#141210] tracking-tight">
            Portfolio &amp; Supabase Image Storage CMS
          </h2>
          <p className="text-xs text-[#5C5449] mt-0.5">
            Upload high-resolution photographs to Supabase Storage (
            <code className="font-mono text-[#3A2008]">portfolio-media</code>), manage
            cover images, reorder galleries, and edit alt text &amp; captions.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold text-xs uppercase tracking-wider transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Project</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-xs text-[#5C5449]">
          Loading portfolio works from Supabase...
        </div>
      ) : (
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#E5DEC9] text-[#5C5449] uppercase font-mono tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cover</th>
                  <th className="py-3.5 px-4">Project Title &amp; Client</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Gallery Photos</th>
                  <th className="py-3.5 px-4">Completed Date</th>
                  <th className="py-3.5 px-4 text-center">Flagship</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DEC9]">
                {projects.map((proj) => {
                  const galleryCount =
                    proj.gallery_items?.length || proj.gallery_urls?.length || 0;
                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-[#FAF7F2]/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-[#F4EFE6] border border-[#E5DEC9]">
                          <img
                            src={proj.thumbnail_url}
                            alt={proj.cover_alt_text || proj.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-[#141210] truncate">
                          {proj.title}
                        </div>
                        <div className="text-[#5C5449] text-[11px] truncate flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-[#A66D35]" />
                          <span>{proj.client_name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FAF7F2] text-[#3A2008] border border-[#E5DEC9] capitalize">
                          {proj.category.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF7F2] border border-[#E5DEC9] text-[11px] font-mono text-[#3A2008]">
                          <ImageIcon className="w-3 h-3 text-[#A66D35]" />
                          <span>{galleryCount} frames</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[#5C5449]">
                        {formatDate(proj.completed_date || undefined)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleFlagship(proj)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            proj.is_flagship
                              ? "bg-[#3A2008] text-[#D9A673] border-[#3A2008]"
                              : "bg-[#FAF7F2] text-[#877D70] border-[#E5DEC9]"
                          }`}
                          title="Toggle Flagship Showcase"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(proj)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-[#3A2008] hover:bg-[#F4EFE6] font-semibold text-[11px]"
                          title="Edit Project & Manage Gallery Images"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Manage Photos &amp; Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(proj.id)}
                          className="p-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] hover:text-red-700"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF7F2] text-[#141210] border border-[#E5DEC9]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                Portfolio CMS • Supabase Storage (portfolio-media)
              </span>
              <h3 className="text-2xl font-bold text-[#141210]">
                {editingProject
                  ? `Manage Project & Gallery: ${editingProject.title}`
                  : "Publish New Portfolio Project"}
              </h3>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                  feedback.type === "success"
                    ? "bg-[#EFF7F3] border-[#2E6B4E]/30 text-[#1F5139]"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2E6B4E] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 text-xs">
              {/* Basic Project Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-[#141210] block mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Bangladesh Tech Leaders Summit 2026"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#141210] block mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PortfolioCategory)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
                  >
                    <option value="corporate_summit">Corporate Summit</option>
                    <option value="documentary">Brand Documentary</option>
                    <option value="headshot">Executive Headshot</option>
                    <option value="workshop">Workshop</option>
                    <option value="wedding">Seasonal Wedding</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#141210] block mb-1">
                    Client / Institution Name *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Dhaka Chamber of IT Leaders"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#141210] block mb-1">
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#141210] block mb-1">
                    Optional Video Reel URL
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-mono text-[#141210]"
                  />
                </div>
              </div>

              {/* Cover / Thumbnail Photograph Upload & Preview */}
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-[#141210]">
                      1. Cover / Thumbnail Photograph *
                    </div>
                    <p className="text-[11px] text-[#5C5449]">
                      Upload directly from your computer to Supabase Storage or paste an
                      image URL.
                    </p>
                  </div>

                  <div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      onChange={handleCoverFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold text-xs transition-all disabled:opacity-50"
                    >
                      {uploadingCover ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {uploadingCover
                          ? "Uploading Cover..."
                          : thumbnailUrl
                          ? "Replace Cover Photo from Computer"
                          : "Upload Cover Photo from Computer"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-5">
                    {thumbnailUrl ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-[#D5CCB4] bg-[#141210]">
                        <img
                          src={thumbnailUrl}
                          alt={coverAltText || title || "Cover preview"}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#3A2008]/90 text-[#FAF7F2] text-[10px] font-mono uppercase">
                          Cover Preview
                        </span>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl border-2 border-dashed border-[#D5CCB4] flex flex-col items-center justify-center text-[#877D70] p-4 text-center">
                        <ImageIcon className="w-6 h-6 mb-1 text-[#A66D35]" />
                        <span>No cover photograph selected yet</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-7 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#141210] block mb-1">
                        Cover Image URL *
                      </label>
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => {
                          setThumbnailUrl(e.target.value);
                          setCoverStoragePath(null);
                        }}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#141210]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#141210] block mb-1">
                          Cover Alt Text (Accessibility)
                        </label>
                        <input
                          type="text"
                          value={coverAltText}
                          onChange={(e) => setCoverAltText(e.target.value)}
                          placeholder="Describe cover photograph..."
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs text-[#141210]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#141210] block mb-1">
                          Cover Caption
                        </label>
                        <input
                          type="text"
                          value={coverCaption}
                          onChange={(e) => setCoverCaption(e.target.value)}
                          placeholder="Optional editorial caption..."
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs text-[#141210]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Image Gallery Manager */}
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-[#141210]">
                      2. Project Gallery Photographs ({galleryItems.length} frames)
                    </div>
                    <p className="text-[11px] text-[#5C5449]">
                      Select multiple photographs to upload at once, reorder frames, edit
                      captions/alt text, or promote any frame to Cover.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={galleryInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      onChange={handleGalleryFilesSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingGallery}
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold text-xs transition-all disabled:opacity-50"
                    >
                      {uploadingGallery ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {uploadingGallery
                          ? "Uploading Photos..."
                          : "Upload Gallery Photos (Multi-Select)"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Add by URL input */}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={manualGalleryUrl}
                    onChange={(e) => setManualGalleryUrl(e.target.value)}
                    placeholder="Or paste an external image URL to append to gallery..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#141210]"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualGalleryUrl}
                    className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] border border-[#D5CCB4] text-xs font-semibold text-[#3A2008]"
                  >
                    + Add URL
                  </button>
                </div>

                {/* Gallery Items List */}
                {galleryItems.length === 0 ? (
                  <div className="py-8 text-center text-[#877D70] border border-dashed border-[#D5CCB4] rounded-xl">
                    No gallery frames added yet. Click &ldquo;Upload Gallery Photos
                    (Multi-Select)&rdquo; above to upload photographs from your computer.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {galleryItems.map((item, idx) => {
                      const isCurrentCover = thumbnailUrl === item.url;
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                        >
                          <div className="md:col-span-3 relative aspect-video rounded-lg overflow-hidden bg-[#F4EFE6] border border-[#E5DEC9]">
                            <img
                              src={item.url}
                              alt={item.alt_text || `Frame ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#141210]/80 text-[#FAF7F2] text-[10px] font-mono">
                              #{idx + 1}
                            </span>
                            {isCurrentCover && (
                              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-[#2E6B4E] text-[#FAF7F2] text-[10px] font-mono">
                                Active Cover
                              </span>
                            )}
                          </div>

                          <div className="md:col-span-6 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-mono uppercase text-[#5C5449] block mb-0.5">
                                  Caption
                                </label>
                                <input
                                  type="text"
                                  value={item.caption}
                                  onChange={(e) =>
                                    handleUpdateGalleryItemMeta(
                                      item.id,
                                      "caption",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Frame caption..."
                                  className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210]"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-mono uppercase text-[#5C5449] block mb-0.5">
                                  Alt Text
                                </label>
                                <input
                                  type="text"
                                  value={item.alt_text}
                                  onChange={(e) =>
                                    handleUpdateGalleryItemMeta(
                                      item.id,
                                      "alt_text",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Accessibility alt text..."
                                  className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210]"
                                />
                              </div>
                            </div>

                            <div className="text-[10px] font-mono text-[#877D70] truncate">
                              {item.storage_path
                                ? `Storage: portfolio-media/${item.storage_path}`
                                : `External URL: ${item.url}`}
                            </div>
                          </div>

                          <div className="md:col-span-3 flex flex-wrap md:flex-col items-stretch justify-end gap-1.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveGalleryItem(idx, -1)}
                                className="p-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] hover:text-[#141210] disabled:opacity-40"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === galleryItems.length - 1}
                                onClick={() => handleMoveGalleryItem(idx, 1)}
                                className="p-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] hover:text-[#141210] disabled:opacity-40"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetGalleryItemAsCover(item)}
                                className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#D5CCB4] text-[11px] font-semibold text-[#3A2008]"
                              >
                                Set as Cover
                              </button>
                            </div>

                            <div className="flex items-center gap-1 justify-end">
                              <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#F4EFE6] border border-[#E5DEC9] text-[11px] font-medium text-[#5C5449] hover:text-[#141210]">
                                <span>
                                  {replacingItemId === item.id
                                    ? "Replacing..."
                                    : "Replace Photo"}
                                </span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                                  onChange={(e) =>
                                    handleReplaceGalleryItemFile(item.id, e)
                                  }
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryItem(item)}
                                className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-red-50 border border-[#E5DEC9] hover:border-red-200 text-[11px] font-medium text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141210] block mb-1">
                  Editorial Project Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="flagship-check"
                  checked={isFlagship}
                  onChange={(e) => setIsFlagship(e.target.checked)}
                />
                <label
                  htmlFor="flagship-check"
                  className="text-xs font-medium text-[#141210]"
                >
                  Feature as Flagship on Homepage Showcase Grid
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E5DEC9]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] text-[#5C5449]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingCover || uploadingGallery}
                  className="px-6 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold uppercase tracking-wider text-xs disabled:opacity-50"
                >
                  {saving
                    ? "Saving to Supabase..."
                    : editingProject
                    ? "Save Project & Gallery"
                    : "Publish Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
