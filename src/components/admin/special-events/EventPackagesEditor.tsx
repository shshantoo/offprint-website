"use client";

import React, { useState } from "react";
import { PhotographyPackage } from "@/types/database";
import {
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Save,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface EventPackagesEditorProps {
  eventId?: string;
  packages: PhotographyPackage[];
  onRefresh: () => Promise<void>;
  onFeedback: (feedback: { type: "success" | "error"; text: string }) => void;
}

export default function EventPackagesEditor({
  eventId,
  packages,
  onRefresh,
  onFeedback,
}: EventPackagesEditorProps) {
  const eventPackages = (packages || [])
    .filter((p) => p.event_id === eventId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const [editingModal, setEditingModal] = useState<Partial<PhotographyPackage> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingPkg, setDeletingPkg] = useState<PhotographyPackage | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // In-line quick edits state
  const [inlinePrice, setInlinePrice] = useState<Record<string, number>>({});
  const [inlineDesc, setInlineDesc] = useState<Record<string, string>>({});
  const [savingInlineId, setSavingInlineId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    if (!eventId) {
      alert("Please save the event first before adding packages.");
      return;
    }
    setEditingModal({
      id: undefined,
      event_id: eventId,
      name: "",
      subtitle: "",
      description: "Dedicated portrait session capturing academic regalia and campus portraits.",
      price_numeric: 2500,
      price_label: "৳2,500",
      currency: "BDT",
      duration_mins: 30,
      is_active: true,
      is_featured: false,
      frame_printing_enabled: true,
      deliverables: [],
      inclusions: [],
      sort_order: eventPackages.length + 1,
    });
  };

  const handleOpenEdit = (pkg: PhotographyPackage) => {
    setEditingModal({ ...pkg });
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModal) return;
    if (!editingModal.name?.trim()) {
      alert("Package name is required.");
      return;
    }

    try {
      setSaving(true);
      const numPrice = Number(editingModal.price_numeric) || 0;
      const formattedPrice = editingModal.price_label?.trim()
        ? editingModal.price_label.trim()
        : `৳${numPrice.toLocaleString()}`;

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "package",
          data: {
            ...editingModal,
            id: editingModal.id || undefined,
            description: editingModal.description?.trim() || "Event Portrait Package",
            price_numeric: numPrice,
            price_label: formattedPrice,
            deliverables: [],
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save photography package.");
      }

      onFeedback({
        type: "success",
        text: `Package "${editingModal.name}" saved successfully.`,
      });
      setEditingModal(null);
      await onRefresh();
    } catch (err: any) {
      onFeedback({
        type: "error",
        text: err.message || "Failed to save package.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInline = async (pkg: PhotographyPackage) => {
    const updatedPrice = inlinePrice[pkg.id] !== undefined ? inlinePrice[pkg.id] : pkg.price_numeric;
    const updatedDesc = inlineDesc[pkg.id] !== undefined ? inlineDesc[pkg.id] : pkg.description;

    try {
      setSavingInlineId(pkg.id);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "package",
          data: {
            ...pkg,
            price_numeric: updatedPrice,
            price_label: `৳${Number(updatedPrice).toLocaleString()}`,
            description: updatedDesc,
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update package.");
      }

      onFeedback({
        type: "success",
        text: `Updated price and description for "${pkg.name}".`,
      });
      setInlinePrice((prev) => {
        const next = { ...prev };
        delete next[pkg.id];
        return next;
      });
      setInlineDesc((prev) => {
        const next = { ...prev };
        delete next[pkg.id];
        return next;
      });
      await onRefresh();
    } catch (err: any) {
      onFeedback({
        type: "error",
        text: err.message || "Failed to update package.",
      });
    } finally {
      setSavingInlineId(null);
    }
  };

  const handleToggleActive = async (pkg: PhotographyPackage) => {
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "package",
          data: {
            ...pkg,
            is_active: !pkg.is_active,
          },
        }),
      });
      if (res.ok) {
        onFeedback({
          type: "success",
          text: `Package "${pkg.name}" is now ${!pkg.is_active ? "Active" : "Disabled"}.`,
        });
        await onRefresh();
      }
    } catch {
      // error handled
    }
  };

  const handleMove = async (pkg: PhotographyPackage, direction: "up" | "down") => {
    const idx = eventPackages.findIndex((p) => p.id === pkg.id);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === eventPackages.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...eventPackages];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const items = reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 }));

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "reorder_packages",
          items,
        }),
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch {
      // non fatal
    }
  };

  const handleDelete = (pkg: PhotographyPackage) => {
    setDeletingPkg(pkg);
  };

  const confirmDeletePackage = async () => {
    if (!deletingPkg) return;
    try {
      setDeletingLoading(true);
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(deletingPkg.id)}&entity=package`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete package.");
      }

      onFeedback({
        type: "success",
        text: json.message || "Package processed successfully.",
      });
      setDeletingPkg(null);
      await onRefresh();
    } catch (err: any) {
      onFeedback({
        type: "error",
        text: err.message || "Failed to delete package.",
      });
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Guidance Card */}
      <div className="rounded-3xl bg-[#FAF7F2] border border-[#E5DEC9] p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#A66D35]" />
            <div>
              <h3 className="text-base font-bold text-[#141210]">
                Photography Packages &amp; Client Pricing
              </h3>
              <p className="text-xs text-[#5C5449]">
                Configure package pricing, session durations, deliverables, and display rules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Package</span>
          </button>
        </div>

        {/* Dynamic Display Behavior Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-1">
            <span className="font-bold text-[#3A2008] block">When 1 Package Active:</span>
            <p className="text-[#5C5449]">
              The public booking page incorporates the package directly into the event overview. No redundant package selection step is shown.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-1">
            <span className="font-bold text-[#3A2008] block">When 2+ Packages Active:</span>
            <p className="text-[#5C5449]">
              The public booking page displays prominent package comparison cards for clients to choose from before picking a slot.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-1">
            <span className="font-bold text-[#3A2008] block">When 0 Packages Active:</span>
            <p className="text-[#5C5449]">
              The public booking page shows only configured event details without placeholder or mock packages.
            </p>
          </div>
        </div>
      </div>

      {/* Packages List */}
      {eventPackages.length === 0 ? (
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center mx-auto text-[#A66D35]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#141210]">No Packages Configured Yet</h4>
          <p className="text-xs text-[#5C5449] max-w-md mx-auto">
            Click &quot;Add New Package&quot; to define portrait session pricing, duration, and inclusions for this event.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Package</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {eventPackages.map((pkg, idx) => {
            const hasInlinePrice = inlinePrice[pkg.id] !== undefined;
            const hasInlineDesc = inlineDesc[pkg.id] !== undefined;
            const isDirtyInline = hasInlinePrice || hasInlineDesc;
            const currentPrice = hasInlinePrice ? inlinePrice[pkg.id] : pkg.price_numeric;
            const currentDesc = hasInlineDesc ? inlineDesc[pkg.id] : pkg.description;

            return (
              <div
                key={pkg.id}
                className={`rounded-3xl border transition-all p-6 space-y-4 shadow-2xs ${
                  pkg.is_active
                    ? "bg-[#FFFFFF] border-[#E5DEC9]"
                    : "bg-[#FAF7F2]/60 border-[#E5DEC9] opacity-75"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center font-mono text-xs font-bold text-[#3A2008]">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-[#141210]">
                          {pkg.name}
                        </h4>
                        {pkg.is_featured && (
                          <span className="px-2 py-0.5 rounded-full bg-[#3A2008] text-[#FAF7F2] text-[10px] font-mono uppercase">
                            Featured
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                            pkg.is_active
                              ? "bg-[#EEF7F2] text-[#2E6B4E]"
                              : "bg-[#F4EFE6] text-[#877D70]"
                          }`}
                        >
                          {pkg.is_active ? "Active & Bookable" : "Disabled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#5C5449] mt-0.5">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#A66D35]" />
                          <span>{pkg.duration_mins} mins</span>
                        </span>
                        {pkg.price_label && (
                          <span className="font-mono text-[#3A2008] font-bold">
                            {pkg.price_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Reordering */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(pkg, "up")}
                      className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#5C5449] disabled:opacity-30 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === eventPackages.length - 1}
                      onClick={() => handleMove(pkg, "down")}
                      className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#5C5449] disabled:opacity-30 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(pkg)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        pkg.is_active
                          ? "bg-[#FAF7F2] hover:bg-amber-50 text-[#877D70] hover:text-amber-800 border border-[#E5DEC9]"
                          : "bg-[#EEF7F2] hover:bg-emerald-100 text-[#2E6B4E] border border-emerald-200"
                      }`}
                    >
                      {pkg.is_active ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Disable</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enable</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(pkg)}
                      className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#3A2008] transition-colors"
                      title="Edit Full Package Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pkg)}
                      className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-red-50 text-[#877D70] hover:text-red-700 transition-colors"
                      title="Safely Delete or Archive Package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* In-Place Quick Edit Grid for Price & Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-[#141210] block mb-1">
                      Quick Price Edit (BDT)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[#877D70]">
                          ৳
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={currentPrice ?? 0}
                          onChange={(e) => {
                            setInlinePrice({
                              ...inlinePrice,
                              [pkg.id]: Number(e.target.value) || 0,
                            });
                          }}
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono font-bold text-[#141210]"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-[#877D70] mt-0.5 block">
                      Saved to bookings snapshot upon checkout
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-semibold text-[#141210] block mb-1">
                      Quick Description Edit
                    </label>
                    <textarea
                      rows={2}
                      value={currentDesc || ""}
                      onChange={(e) => {
                        setInlineDesc({
                          ...inlineDesc,
                          [pkg.id]: e.target.value,
                        });
                      }}
                      placeholder="Enter package summary visible to clients..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                    />
                  </div>
                </div>

                {/* In-Line Save Trigger Banner */}
                {isDirtyInline && (
                  <div className="pt-2 border-t border-[#E5DEC9] flex items-center justify-between gap-3 bg-[#F4EFE6]/70 -mx-6 -mb-6 p-4 rounded-b-3xl">
                    <span className="text-xs text-[#3A2008] font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#A66D35]" />
                      Unsaved in-line changes for this package
                    </span>
                    <button
                      type="button"
                      disabled={savingInlineId === pkg.id}
                      onClick={() => handleSaveInline(pkg)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingInlineId === pkg.id ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Package Add / Edit Modal */}
      {editingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-7 shadow-xl space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
              <h4 className="text-base font-bold text-[#141210]">
                {editingModal.id ? "Edit Photography Package" : "Create New Package"}
              </h4>
              <button
                type="button"
                onClick={() => setEditingModal(null)}
                className="p-1.5 rounded-full hover:bg-[#FAF7F2] text-[#877D70]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  value={editingModal.name || ""}
                  onChange={(e) => setEditingModal({ ...editingModal, name: e.target.value })}
                  placeholder="e.g. Graduation Portraiture Standard"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Numeric Price (BDT) *</label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    required
                    value={editingModal.price_numeric ?? 2500}
                    onChange={(e) => {
                      const num = Number(e.target.value) || 0;
                      setEditingModal({
                        ...editingModal,
                        price_numeric: num,
                        price_label: `৳${num.toLocaleString()}`,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Display Price Label *</label>
                  <input
                    type="text"
                    required
                    value={editingModal.price_label || ""}
                    onChange={(e) => setEditingModal({ ...editingModal, price_label: e.target.value })}
                    placeholder="e.g. ৳2,500"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Session Duration (Minutes) *</label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    required
                    value={editingModal.duration_mins || 30}
                    onChange={(e) =>
                      setEditingModal({ ...editingModal, duration_mins: Number(e.target.value) || 30 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingModal.is_active ?? true}
                      onChange={(e) => setEditingModal({ ...editingModal, is_active: e.target.checked })}
                      className="rounded text-[#3A2008]"
                    />
                    <span className="font-semibold text-[#141210]">Is Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingModal.is_featured)}
                      onChange={(e) => setEditingModal({ ...editingModal, is_featured: e.target.checked })}
                      className="rounded text-[#3A2008]"
                    />
                    <span className="font-semibold text-[#141210]">Featured Badge</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Package Description</label>
                <textarea
                  rows={4}
                  value={editingModal.description || ""}
                  onChange={(e) => setEditingModal({ ...editingModal, description: e.target.value })}
                  placeholder="Enter full package description visible to clients (e.g. details, styling, what clients should expect)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                />
                <p className="text-xs text-[#5C5449] mt-1">
                  This description is displayed cleanly under the package name and price on the client booking page.
                </p>
              </div>

              <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#5C5449] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A673]" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{saving ? "Saving..." : "Save Package"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Deletion Confirmation Dialog */}
      {deletingPkg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-7 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-red-600 border-b border-[#E5DEC9] pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#141210]">Delete Photography Package</h4>
                <p className="text-xs text-[#5C5449]">Confirm package deletion or archival</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-1 text-xs">
              <div className="font-bold text-[#141210] text-sm">{deletingPkg.name}</div>
              <div className="text-[#5C5449] flex items-center gap-2 font-mono">
                <span>{deletingPkg.duration_mins} mins</span>
                <span>•</span>
                <span className="font-bold text-[#3A2008]">{deletingPkg.price_label || `৳${deletingPkg.price_numeric}`}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#5C5449]">
              <p>
                <strong>Case A (Unused):</strong> If no client bookings reference this package, it will be permanently deleted and removed from schedules.
              </p>
              <p>
                <strong>Case C (Has Bookings):</strong> If historical or active bookings exist, the package will be safely archived (disabled for future bookings) while preserving all client booking records and receipts.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingLoading}
                onClick={() => setDeletingPkg(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#5C5449] font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={confirmDeletePackage}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold uppercase tracking-wider text-xs shadow-xs disabled:opacity-50"
              >
                {deletingLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deletingLoading ? "Deleting..." : "Confirm Delete / Archive"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

