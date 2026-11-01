"use client";

import React, { useState } from "react";
import { BookingEventInfoBlock } from "@/types/database";
import { DEFAULT_EVENT_INFO_BLOCKS } from "@/lib/booking/default-event-fields";
import {
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  Info,
  Save,
  X,
  Layers,
} from "lucide-react";

interface EventInfoBlocksEditorProps {
  infoBlocks?: BookingEventInfoBlock[];
  venue?: string | null;
  sessionsCount: number;
  rescheduleCutoffHours: number;
  cancellationCutoffHours: number;
  timezone?: string;
  slotHoldMins?: number;
  onChange: (updated: BookingEventInfoBlock[]) => void;
  onFeedback: (feedback: { type: "success" | "error"; text: string }) => void;
}

export default function EventInfoBlocksEditor({
  infoBlocks = [],
  venue = "OFFPRINT Studio & Campus Grounds, Dhaka",
  sessionsCount = 0,
  rescheduleCutoffHours = 24,
  cancellationCutoffHours = 24,
  timezone = "Asia/Dhaka",
  slotHoldMins = 5,
  onChange,
  onFeedback,
}: EventInfoBlocksEditorProps) {
  // Initialize with defaults if empty
  const blocks = (infoBlocks && infoBlocks.length > 0 ? infoBlocks : DEFAULT_EVENT_INFO_BLOCKS)
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const [editingModal, setEditingModal] = useState<Partial<BookingEventInfoBlock> | null>(null);

  const getSystemDynamicValue = (type: string, fallback?: string | null) => {
    switch (type) {
      case "venue":
        return venue || fallback || "OFFPRINT Studio & Campus Grounds, Dhaka";
      case "sessions":
        return sessionsCount > 0
          ? `${sessionsCount} Active Session Date${sessionsCount > 1 ? "s" : ""}`
          : "Dates Announced Soon";
      case "cutoff":
        return `${rescheduleCutoffHours}h Reschedule / ${cancellationCutoffHours}h Cancel`;
      case "lock":
        return `${timezone} (BST) · ${slotHoldMins}m Hold Lock`;
      default:
        return fallback || "";
    }
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "venue":
        return MapPin;
      case "sessions":
        return Calendar;
      case "cutoff":
        return Clock;
      case "lock":
        return ShieldCheck;
      default:
        return Sparkles;
    }
  };

  const handleOpenAddCustom = () => {
    setEditingModal({
      id: `block_custom_${blocks.length + 1}`,
      type: "custom",
      heading: "",
      description: "",
      value: "",
      is_visible: true,
      sort_order: blocks.length + 1,
    });
  };

  const handleOpenEdit = (b: BookingEventInfoBlock) => {
    setEditingModal({ ...b });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModal) return;
    if (!editingModal.heading?.trim()) {
      alert("Block heading is required.");
      return;
    }

    const newBlock: BookingEventInfoBlock = {
      id: editingModal.id || `block_custom_${blocks.length + 1}`,
      type: editingModal.type || "custom",
      heading: editingModal.heading.trim(),
      description: editingModal.description?.trim() || null,
      value: editingModal.value?.trim() || null,
      is_visible: editingModal.is_visible !== false,
      sort_order: editingModal.sort_order || blocks.length + 1,
    };

    const existsIndex = blocks.findIndex((b) => b.id === newBlock.id);
    let updated: BookingEventInfoBlock[];
    if (existsIndex >= 0) {
      updated = [...blocks];
      updated[existsIndex] = newBlock;
    } else {
      updated = [...blocks, newBlock];
    }

    onChange(updated);
    onFeedback({
      type: "success",
      text: `Saved info block "${newBlock.heading}".`,
    });
    setEditingModal(null);
  };

  const handleToggleVisible = (id: string) => {
    const updated = blocks.map((b) => {
      if (b.id === id) {
        return { ...b, is_visible: !b.is_visible };
      }
      return b;
    });
    onChange(updated);
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === blocks.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...blocks];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const updated = reordered.map((b, i) => ({ ...b, sort_order: i + 1 }));
    onChange(updated);
  };

  const handleDelete = (id: string, heading: string) => {
    if (!confirm(`Are you sure you want to remove info block "${heading}"?`)) return;
    const updated = blocks.filter((b) => b.id !== id);
    onChange(updated);
    onFeedback({
      type: "success",
      text: `Removed info block "${heading}".`,
    });
  };

  const handleResetDefaults = () => {
    if (
      !confirm(
        "Reset structured info blocks to default 4 primary operational cards (Venue, Configured Sessions, Cutoffs, Timezone & Hold Lock)?"
      )
    ) {
      return;
    }
    onChange(DEFAULT_EVENT_INFO_BLOCKS);
    onFeedback({
      type: "success",
      text: "Reset info blocks to operational defaults.",
    });
  };

  return (
    <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-[#A66D35]" />
          <div>
            <h3 className="text-base font-bold text-[#141210]">
              Structured Event Information Blocks
            </h3>
            <p className="text-xs text-[#5C5449]">
              Configure the highlight cards displayed beneath the event cover on the public booking page.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#5C5449] text-xs font-semibold"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleOpenAddCustom}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Block</span>
          </button>
        </div>
      </div>

      {/* Advisory Notice */}
      <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-start gap-2.5 text-xs text-[#5C5449]">
        <Info className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#141210]">Presentation Separation:</strong> Modifying or hiding public info blocks alters only client presentation on the website. Real database scheduling, actual configured session slots, and strict cancellation policies remain authoritatively enforced.
        </p>
      </div>

      {/* Blocks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {blocks.map((b, idx) => {
          const IconComp = getBlockIcon(b.type);
          const isSystem = ["venue", "sessions", "cutoff", "lock"].includes(b.type);
          const liveValue = getSystemDynamicValue(b.type, b.value);

          return (
            <div
              key={b.id || idx}
              className={`rounded-2xl border p-4 space-y-2.5 transition-all shadow-2xs flex flex-col justify-between ${
                b.is_visible
                  ? "bg-[#FAF7F2] border-[#E5DEC9]"
                  : "bg-[#FAF7F2]/40 border-[#E5DEC9] opacity-60"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#E5DEC9] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#877D70]">
                    <IconComp className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span className="font-semibold">{b.heading}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(b.id, "up")}
                      className="p-1 rounded hover:bg-[#E5DEC9] text-[#5C5449] disabled:opacity-20"
                      title="Move Left/Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === blocks.length - 1}
                      onClick={() => handleMove(b.id, "down")}
                      className="p-1 rounded hover:bg-[#E5DEC9] text-[#5C5449] disabled:opacity-20"
                      title="Move Right/Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(b.id)}
                      className={`p-1 rounded ${
                        b.is_visible ? "text-[#2E6B4E]" : "text-stone-400"
                      }`}
                      title={b.is_visible ? "Visible on page" : "Hidden from page"}
                    >
                      {b.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      className="p-1 rounded hover:bg-[#E5DEC9] text-[#3A2008]"
                      title="Edit Block"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id, b.heading)}
                        className="p-1 rounded hover:bg-red-50 text-red-600"
                        title="Remove Block"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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

              <div className="text-[10px] font-mono text-[#877D70] flex items-center justify-between pt-1 border-t border-[#E5DEC9]/60">
                <span>Type: {b.type}</span>
                <span>{b.is_visible ? "Visible" : "Hidden"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Block Modal */}
      {editingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
              <h4 className="text-base font-bold text-[#141210]">
                {editingModal.heading ? `Edit: ${editingModal.heading}` : "Add Information Block"}
              </h4>
              <button
                type="button"
                onClick={() => setEditingModal(null)}
                className="p-1.5 rounded-full hover:bg-[#FAF7F2] text-[#877D70]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">Block Heading *</label>
                <input
                  type="text"
                  required
                  value={editingModal.heading || ""}
                  onChange={(e) => setEditingModal({ ...editingModal, heading: e.target.value })}
                  placeholder="e.g. Venue & Location"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Custom Display Value (Overrides system value if provided)
                </label>
                <input
                  type="text"
                  value={editingModal.value || ""}
                  onChange={(e) => setEditingModal({ ...editingModal, value: e.target.value })}
                  placeholder="Leave empty to use automatic live value"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Supporting Description</label>
                <textarea
                  rows={2}
                  value={editingModal.description || ""}
                  onChange={(e) => setEditingModal({ ...editingModal, description: e.target.value })}
                  placeholder="Optional supporting details..."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E5DEC9]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingModal.is_visible !== false}
                    onChange={(e) => setEditingModal({ ...editingModal, is_visible: e.target.checked })}
                    className="rounded text-[#3A2008]"
                  />
                  <span className="font-semibold text-[#141210]">Visible on Booking Overview</span>
                </label>
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
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold uppercase tracking-wider"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Block</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

