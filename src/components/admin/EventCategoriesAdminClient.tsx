"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  FolderOpen,
} from "lucide-react";
import type { EventArchiveCategory } from "@/types/database";

export default function EventCategoriesAdminClient() {
  const [categories, setCategories] = useState<EventArchiveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [editingCategory, setEditingCategory] = useState<Partial<EventArchiveCategory> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/event-categories", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data);
        }
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to connect to event categories service." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpenAdd = () => {
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order || 0)) + 1 : 1;
    setEditingCategory({
      name: "",
      slug: "",
      description: "",
      sort_order: nextOrder,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: EventArchiveCategory) => {
    setEditingCategory({ ...category });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name?.trim()) {
      setFeedback({ type: "error", message: "Category name is required." });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const res = await fetch("/api/admin/event-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save category.");
      }

      setFeedback({
        type: "success",
        message: `Category "${editingCategory.name}" saved successfully.`,
      });
      setIsModalOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save category." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: EventArchiveCategory) => {
    try {
      setFeedback(null);
      const res = await fetch("/api/admin/event-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cat.id,
          is_active: !cat.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed.");
      await loadCategories();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to toggle status." });
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === categories.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...categories];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const payload = reordered.map((c, i) => ({
      id: c.id,
      sort_order: i + 1,
    }));

    try {
      setFeedback(null);
      const res = await fetch("/api/admin/event-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", categories: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Reorder failed.");
      await loadCategories();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update order." });
    }
  };

  const handleDelete = async (cat: EventArchiveCategory) => {
    const archiveCount = cat.archive_count || 0;
    const confirmPrompt =
      archiveCount > 0
        ? `Category "${cat.name}" is currently associated with ${archiveCount} event archive(s).\n\nTo preserve historical event data and links, it will be safely deactivated/archived rather than deleted. Proceed?`
        : `Are you sure you want to permanently delete the category "${cat.name}"?`;

    const ok = window.confirm(confirmPrompt);
    if (!ok) return;

    try {
      setFeedback(null);
      const res = await fetch(`/api/admin/event-categories?id=${encodeURIComponent(cat.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed.");

      if (json.archived) {
        setFeedback({ type: "success", message: json.message });
      } else {
        setFeedback({ type: "success", message: `Category "${cat.name}" was permanently removed.` });
      }
      await loadCategories();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to remove category." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#141210]">
              Event Archive Categories
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#3A2008] border border-[#E5DEC9]">
              {categories.length} Categories
            </span>
          </div>
          <p className="text-xs text-[#5C5449] mt-0.5">
            Manage dynamic classifications for production archives. Categories populate the live Works Archive and Dashboard overview automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCategories}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-semibold text-[#141210] hover:bg-[#FAF7F2] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#D9A673]" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-[#EAF3EB] border-[#BCD9C0] text-[#1B4D20]"
              : "bg-[#FBEBEB] border-[#F0BEBE] text-[#7F1D1D]"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#E5DEC9] text-[#5C5449] font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 w-14 text-center">Order</th>
                <th className="py-3 px-4">Category Name &amp; Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Event Archives</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DEC9]">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#8C827A]">
                    {loading ? "Loading categories..." : "No event categories configured yet."}
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr
                    key={cat.id}
                    className={`hover:bg-[#FAF7F2]/60 transition-colors ${
                      !cat.is_active ? "opacity-60 bg-gray-50/50" : ""
                    }`}
                  >
                    {/* Order Controls */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono font-bold text-[#3A2008] w-5 text-center">
                          {cat.sort_order}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, "up")}
                            className="p-0.5 rounded text-[#8C827A] hover:text-[#141210] disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleMoveOrder(idx, "down")}
                            className="p-0.5 rounded text-[#8C827A] hover:text-[#141210] disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Category Name & Slug */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-[#A66D35] shrink-0" />
                        <div>
                          <span className="font-bold text-[#141210] block text-sm">
                            {cat.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#8C827A]">
                            slug: {cat.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-[#5C5449] max-w-sm">
                        {cat.description || "—"}
                      </p>
                    </td>

                    {/* Event Archives Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FAF7F2] text-[#3A2008] border border-[#E5DEC9]">
                        <FolderOpen className="w-3 h-3 text-[#A66D35]" />
                        <span>{cat.archive_count ?? 0}</span>
                      </span>
                    </td>

                    {/* Active Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          cat.is_active
                            ? "bg-[#EAF3EB] text-[#16A34A] border border-[#BCD9C0]"
                            : "bg-[#FBEBEB] text-[#DC2626] border border-[#F0BEBE]"
                        }`}
                      >
                        {cat.is_active ? "Active" : "Archived"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-[#5C5449] hover:text-[#141210] hover:bg-[#FAF7F2] transition-colors"
                          title="Edit Category Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FBEBEB] transition-colors"
                          title="Archive or Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-2xl max-w-lg w-full shadow-2xl">
            <form onSubmit={handleSaveModal}>
              <div className="p-5 border-b border-[#E5DEC9] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#141210]">
                    {editingCategory.id ? "Edit Event Category" : "New Event Category"}
                  </h3>
                  <p className="text-xs text-[#5C5449]">
                    Define category name, slug, and display ordering for production archives.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-[#8C827A] hover:text-[#141210]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Category Name & Slug */}
                <div className="space-y-1">
                  <label className="font-semibold text-[#141210] block">
                    Category Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name || ""}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        name: e.target.value,
                        slug:
                          editingCategory.slug ||
                          e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                      })
                    }
                    placeholder="e.g. Convocation, Corporate Summit, Brand Documentary"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#141210] block">
                    URL Slug / Identifier
                  </label>
                  <input
                    type="text"
                    value={editingCategory.slug || ""}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
                      })
                    }
                    placeholder="e.g. convocation"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="font-semibold text-[#141210] block">
                    Category Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={editingCategory.description || ""}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, description: e.target.value })
                    }
                    placeholder="e.g. Academic convocations, university commencement, and formal cap & gown portraiture."
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs resize-none"
                  />
                </div>

                {/* Sort Order & Active */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#141210] block">
                      Display Sort Order
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingCategory.sort_order || 1}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          sort_order: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#141210]">
                      <input
                        type="checkbox"
                        checked={editingCategory.is_active !== false}
                        onChange={(e) =>
                          setEditingCategory({
                            ...editingCategory,
                            is_active: e.target.checked,
                          })
                        }
                        className="rounded border-[#D5CCB4]"
                      />
                      <span>Active on Website</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[#E5DEC9] bg-[#FAF7F2] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-semibold text-[#5C5449] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#D9A673]" />
                      <span>Save Category</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
