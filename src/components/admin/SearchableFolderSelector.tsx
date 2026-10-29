"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Folder,
  Search,
  Check,
  ChevronDown,
  X,
  Plus,
  RefreshCw,
  FolderPlus,
  Image as ImageIcon,
  AlertCircle,
  Upload,
} from "lucide-react";
import type { MediaFolderWithMeta, MediaFolderPhoto, MediaFolderType } from "@/types/database";

interface SearchableFolderSelectorProps {
  folderType: MediaFolderType;
  selectedFolderId?: string | null;
  onSelectFolder: (folder: MediaFolderWithMeta | null) => void;
  label?: string;
  hint?: string;
}

export default function SearchableFolderSelector({
  folderType,
  selectedFolderId,
  onSelectFolder,
  label = "Select Photo Folder",
  hint,
}: SearchableFolderSelectorProps) {
  const [folders, setFolders] = useState<MediaFolderWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Preview photos state
  const [previewPhotos, setPreviewPhotos] = useState<MediaFolderPhoto[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // New folder creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Quick photo upload state
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expectedPrefix =
    folderType === "event-highlight"
      ? "event-archive-highlights/"
      : "event-archives/";

  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/media-folders?type=${folderType}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFolders(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    } finally {
      setLoading(false);
    }
  }, [folderType]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedFolder = useMemo(() => {
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Load preview photos when selected folder changes (with timeout safeguard against stuck loading)
  useEffect(() => {
    let isCancelled = false;
    if (!selectedFolderId) {
      setPreviewPhotos([]);
      setLoadingPreview(false);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setLoadingPreview(false);
      }
    }, 6000);

    const loadPreview = async () => {
      try {
        setLoadingPreview(true);
        const res = await fetch(
          `/api/admin/media-folders/${selectedFolderId}/photos`,
          { signal: abortController.signal }
        );
        const json = await res.json();
        if (!isCancelled && json.success && Array.isArray(json.data)) {
          setPreviewPhotos(json.data);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to load folder preview:", err);
        }
      } finally {
        clearTimeout(timeoutId);
        if (!isCancelled) setLoadingPreview(false);
      }
    };

    loadPreview();
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [selectedFolderId]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const q = searchQuery.toLowerCase().trim();
    return folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }, [folders, searchQuery]);

  const handleSelect = (folder: MediaFolderWithMeta) => {
    onSelectFolder(folder);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectFolder(null);
    setPreviewPhotos([]);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setCreateError("Folder name cannot be empty.");
      return;
    }

    try {
      setCreatingFolder(true);
      setCreateError(null);

      const res = await fetch("/api/admin/media-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          folder_type: folderType,
          description: newFolderDesc.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create folder.");
      }

      await loadFolders();
      onSelectFolder(json.data);
      setShowCreateModal(false);
      setNewFolderName("");
      setNewFolderDesc("");
      setIsOpen(false);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create folder.");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedFolderId) return;

    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch(`/api/admin/media-folders/${selectedFolderId}/photos`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to upload photos to folder.");
        return;
      }

      // Refresh preview and folder counts
      await loadFolders();
      const photosRes = await fetch(`/api/admin/media-folders/${selectedFolderId}/photos`);
      const photosJson = await photosRes.json();
      if (photosJson.success) {
        setPreviewPhotos(photosJson.data);
      }
    } catch (err: any) {
      alert(err.message || "Network error uploading photos.");
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#141210]">
          {label}
        </label>
        <span className="text-[11px] font-mono text-[#877D70]">
          Root: {expectedPrefix}
        </span>
      </div>

      {hint && <p className="text-xs text-[#5C5449]">{hint}</p>}

      {/* Combobox Trigger */}
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`flex min-h-[46px] w-full cursor-pointer items-center justify-between rounded-xl border bg-[#FAF7F2] px-3.5 py-2 text-xs transition-colors ${
            isOpen
              ? "border-[#3A2008] bg-[#FFFFFF] ring-2 ring-[#3A2008]/15"
              : "border-[#E5DEC9] hover:bg-[#FFFFFF] hover:border-[#A66D35]"
          }`}
        >
          {selectedFolder ? (
            <div className="flex items-center gap-2.5 truncate">
              <Folder className="h-4 w-4 shrink-0 text-[#A66D35]" />
              <div className="truncate text-left">
                <span className="font-bold text-[#141210]">
                  {selectedFolder.name}
                </span>
                <span className="ml-2 font-mono text-[11px] text-[#877D70]">
                  {selectedFolder.storage_prefix || `${expectedPrefix}${selectedFolder.slug}/`}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#877D70]">
              <Folder className="h-4 w-4 text-[#877D70]" />
              <span>Choose from {expectedPrefix}...</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedFolder && (
              (selectedFolder.photo_count ?? previewPhotos.length) > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-mono text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  {selectedFolder.photo_count ?? previewPhotos.length} photos
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-mono text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  0 photos (empty)
                </span>
              )
            )}
            {selectedFolder && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg p-1 text-[#877D70] hover:bg-[#FAF7F2] hover:text-[#141210]"
                title="Clear folder selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown
              className={`h-4 w-4 text-[#877D70] transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-[#E5DEC9] bg-[#FFFFFF] p-2.5 shadow-2xl text-[#141210]">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#877D70]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search folders in ${expectedPrefix}...`}
                className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] py-2 pl-8 pr-8 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#877D70] hover:text-[#141210]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Folder List */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {loading ? (
                <div className="py-6 text-center text-xs text-[#877D70]">
                  <RefreshCw className="mx-auto h-4 w-4 animate-spin text-[#A66D35] mb-1" />
                  Loading folders...
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#877D70]">
                  <p>No {folderType === "event-highlight" ? "highlight" : "event"} folders found.</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateModal(true);
                      setIsOpen(false);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] px-3 py-1.5 text-xs font-semibold text-[#3A2008] hover:bg-[#FFFFFF]"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Create First Folder
                  </button>
                </div>
              ) : (
                filteredFolders.map((folder) => {
                  const isSelected = folder.id === selectedFolderId;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleSelect(folder)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                        isSelected
                          ? "bg-[#FAF7F2] text-[#3A2008] font-bold border-l-3 border-[#3A2008]"
                          : "text-[#141210] hover:bg-[#FAF7F2]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isSelected ? "text-[#3A2008]" : "text-[#A66D35]"
                          }`}
                        />
                        <div className="truncate">
                          <p className="truncate">{folder.name}</p>
                          <p className="font-mono text-[10px] text-[#877D70] truncate">
                            {folder.storage_prefix || `${expectedPrefix}${folder.slug}/`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {folder.photo_count > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            {folder.photo_count} photos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-[10px] text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            0 photos
                          </span>
                        )}
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-[#3A2008]" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-[#E5DEC9] pt-2 px-1 text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 text-[#3A2008] hover:text-[#5C4028] font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Folder
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadFolders();
                }}
                className="inline-flex items-center gap-1 text-[#877D70] hover:text-[#141210]"
                title="Refresh folders"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Photograph Preview from Selected Folder — All Photographs Displayed */}
      {selectedFolder && (
        <div className="rounded-2xl border border-[#E5DEC9] bg-[#FAF7F2] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#141210] flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-[#A66D35]" />
              Folder Photographs ({previewPhotos.length})
            </span>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] px-3 py-1.5 text-xs font-semibold text-[#FAF7F2] transition-colors">
                <Upload className="h-3.5 w-3.5" />
                <span>{uploadingPhotos ? "Uploading..." : "Upload Photos"}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleUploadPhotos}
                  disabled={uploadingPhotos}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {loadingPreview ? (
            <div className="py-8 text-center text-xs text-[#877D70]">
              <RefreshCw className="mx-auto h-4 w-4 animate-spin mb-1 text-[#A66D35]" />
              Loading photographs from folder...
            </div>
          ) : previewPhotos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5DEC9] bg-[#FFFFFF] py-6 text-center text-xs text-[#877D70]">
              <p className="font-medium text-[#141210]">No photographs in this folder yet.</p>
              <p className="text-[11px] text-[#5C5449] mt-0.5">
                Upload files using the &quot;Upload Photos&quot; button above, or place files in {selectedFolder.storage_prefix} on Supabase Storage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {previewPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-[#E5DEC9] bg-[#FFFFFF] shadow-2xs"
                  title={photo.caption || photo.file_name}
                >
                  <Image
                    src={photo.public_url}
                    alt={photo.alt_text || photo.file_name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="140px"
                  />
                  {photo.is_cover && (
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-[#3A2008] px-1.5 py-0.5 text-[9px] font-bold text-[#FAF7F2] uppercase tracking-wider">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create New Folder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141210]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E5DEC9] bg-[#FFFFFF] p-6 shadow-2xl text-[#141210]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-[#A66D35]" />
                <h3 className="text-base font-bold text-[#141210]">
                  Create {folderType === "event-highlight" ? "Highlight" : "Event"} Folder
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-[#877D70] hover:bg-[#FAF7F2] hover:text-[#141210]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              {createError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#141210] mb-1">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. IUB 27th Convocation Stage"
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
                  placeholder="Notes about the photographs inside this folder..."
                  rows={2}
                  className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:bg-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div className="rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] p-3 text-[11px] text-[#5C5449] font-mono">
                Storage Destination: <strong className="text-[#3A2008]">{expectedPrefix}&lt;folder-slug&gt;/</strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
