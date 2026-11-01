"use client";

import React, { useState } from "react";
import { FramePrintingConfig, FrameTypeOption } from "@/types/database";
import {
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Save,
  X,
  Sparkles,
  Info,
  Image as ImageIcon,
} from "lucide-react";

function createFrameOptionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `frame_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `frame_${Math.random().toString(36).substring(2, 9)}`;
}

interface EventFrameAddonsEditorProps {
  eventId?: string;
  config?: FramePrintingConfig;
  onChange: (updated: FramePrintingConfig) => void;
  onFeedback: (feedback: { type: "success" | "error"; text: string }) => void;
}

const DEFAULT_FRAME_SUGGESTIONS: FrameTypeOption[] = [
  {
    id: "frame_a4_black",
    name: 'Archival Matte Black Wood Frame (10x12")',
    dimensions: '10" x 12" Outer Profile',
    price: 1800,
    description: "Solid New Zealand pine wood frame with 2mm ultra-clear archival glass and 2-inch acid-free passe-partout matting.",
    is_active: true,
    sort_order: 1,
    allow_quantity: true,
  },
  {
    id: "frame_a3_walnut",
    name: 'Executive Dark Walnut Hardwood Frame (12x18")',
    dimensions: '12" x 18" Outer Profile',
    price: 2800,
    description: "Deep natural dark walnut with hand-rubbed Danish oil finish, anti-reflective museum glass, and reinforced backing.",
    is_active: true,
    sort_order: 2,
    allow_quantity: true,
  },
  {
    id: "frame_desk_metallic",
    name: 'Minimalist Brushed Metallic Desk Stand (8x10")',
    dimensions: '8" x 10" Tabletop Stand',
    price: 1200,
    description: "Modern champagne gold aluminum border with freestanding easel back, ideal for executive desktops and family credenzas.",
    is_active: true,
    sort_order: 3,
    allow_quantity: true,
  },
];

export default function EventFrameAddonsEditor({
  eventId,
  config,
  onChange,
  onFeedback,
}: EventFrameAddonsEditorProps) {
  const currentConfig: FramePrintingConfig = config || {
    enabled: false,
    title: "Archival Frame Printing",
    description: "Professional wooden & metallic framing for your portraits",
    max_quantity: 5,
    frame_types: [],
  };

  const frameTypes = [...(currentConfig.frame_types || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const activeOptionsCount = frameTypes.filter((f) => f.is_active !== false).length;
  const isSectionEffectivelyVisible = currentConfig.enabled && activeOptionsCount > 0;

  const [editingModal, setEditingModal] = useState<Partial<FrameTypeOption> | null>(null);
  const [savingDirectly, setSavingDirectly] = useState(false);

  const updateConfig = (next: FramePrintingConfig) => {
    onChange(next);
  };

  const handleOpenAdd = () => {
    setEditingModal({
      id: createFrameOptionId(),
      name: "",
      dimensions: "",
      price: 1500,
      description: "",
      is_active: true,
      sort_order: frameTypes.length + 1,
      allow_quantity: true,
    });
  };

  const handleOpenEdit = (opt: FrameTypeOption) => {
    setEditingModal({ ...opt });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModal) return;
    if (!editingModal.name?.trim()) {
      alert("Option name is required.");
      return;
    }

    const priceNum = Math.max(0, Number(editingModal.price) || 0);
    const newOption: FrameTypeOption = {
      id: editingModal.id || createFrameOptionId(),
      name: editingModal.name.trim(),
      dimensions: editingModal.dimensions?.trim() || null,
      price: priceNum,
      description: editingModal.description?.trim() || null,
      is_active: editingModal.is_active !== false,
      sort_order: editingModal.sort_order || frameTypes.length + 1,
      allow_quantity: Boolean(editingModal.allow_quantity),
    };

    const existsIndex = frameTypes.findIndex((f) => f.id === newOption.id);
    let updatedTypes: FrameTypeOption[];
    if (existsIndex >= 0) {
      updatedTypes = [...frameTypes];
      updatedTypes[existsIndex] = newOption;
    } else {
      updatedTypes = [...frameTypes, newOption];
    }

    updateConfig({
      ...currentConfig,
      frame_types: updatedTypes,
    });
    setEditingModal(null);
    onFeedback({
      type: "success",
      text: `Saved frame option "${newOption.name}".`,
    });
  };

  const handleToggleOptionActive = (id: string) => {
    const updatedTypes = frameTypes.map((f) => {
      if (f.id === id) {
        return { ...f, is_active: f.is_active === false ? true : false };
      }
      return f;
    });
    updateConfig({
      ...currentConfig,
      frame_types: updatedTypes,
    });
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const idx = frameTypes.findIndex((f) => f.id === id);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === frameTypes.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...frameTypes];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const updatedTypes = reordered.map((f, i) => ({ ...f, sort_order: i + 1 }));
    updateConfig({
      ...currentConfig,
      frame_types: updatedTypes,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove frame option "${name}"?`)) {
      return;
    }
    const updatedTypes = frameTypes.filter((f) => f.id !== id);
    updateConfig({
      ...currentConfig,
      frame_types: updatedTypes,
    });
    onFeedback({
      type: "success",
      text: `Removed frame option "${name}".`,
    });
  };

  const handleSeedDefaults = () => {
    if (
      frameTypes.length > 0 &&
      !confirm("This will replace current frame options with recommended standard archival framing options. Continue?")
    ) {
      return;
    }
    updateConfig({
      ...currentConfig,
      enabled: true,
      title: "Archival Frame Printing",
      description: "Professional wooden & metallic framing for your portraits",
      frame_types: DEFAULT_FRAME_SUGGESTIONS,
    });
    onFeedback({
      type: "success",
      text: "Loaded 3 recommended archival frame options.",
    });
  };

  const handleDirectSave = async () => {
    if (!eventId) {
      alert("Please save the event first before persisting framing configuration.");
      return;
    }
    try {
      setSavingDirectly(true);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "event_frame_config",
          event_id: eventId,
          frame_printing_config: currentConfig,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save framing configuration.");
      }
      onFeedback({
        type: "success",
        text: "Framing add-on configuration persisted successfully to Supabase.",
      });
    } catch (err: any) {
      onFeedback({
        type: "error",
        text: err.message || "Failed to save framing configuration.",
      });
    } finally {
      setSavingDirectly(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Indicator */}
      <div className="rounded-3xl bg-[#FAF7F2] border border-[#E5DEC9] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-[#A66D35]" />
            <div>
              <h3 className="text-base font-bold text-[#141210]">
                Frame &amp; Print Add-on Management
              </h3>
              <p className="text-xs text-[#5C5449]">
                Configure physical archival framing add-ons, pricing in BDT, and client choices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSeedDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF7F2] text-[#3A2008] border border-[#D5CCB4] text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Load Presets</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Frame Option</span>
            </button>
            {eventId && (
              <button
                type="button"
                disabled={savingDirectly}
                onClick={handleDirectSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A66D35] hover:bg-[#8C5825] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingDirectly ? "Saving..." : "Save Framing"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Public Visibility Live Status Notice */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isSectionEffectivelyVisible
              ? "bg-[#FAF7F2] border-[#A66D35]/30 text-[#141210]"
              : "bg-[#F4EFE6] border-[#D5CCB4] text-[#5C5449]"
          }`}
        >
          <Info
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isSectionEffectivelyVisible ? "text-[#A66D35]" : "text-[#5C5449]"
            }`}
          />
          <div className="text-xs space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>Public Booking Page Visibility:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                  isSectionEffectivelyVisible
                    ? "bg-[#3A2008] text-[#FAF7F2]"
                    : "bg-[#E5DEC9] text-[#5C5449]"
                }`}
              >
                {isSectionEffectivelyVisible ? "Active & Displayed" : "Completely Hidden"}
              </span>
            </div>
            <p>
              {isSectionEffectivelyVisible ? (
                <>
                  Framing add-ons are enabled and {activeOptionsCount} active option(s) are visible to clients. Selecting an option immediately updates the booking summary and grand total.
                </>
              ) : (
                <>
                  Framing is completely hidden from the public booking page. No headers, placeholders, or empty cards will appear to clients.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Section Master Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="sm:col-span-1">
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(currentConfig.enabled)}
                onChange={(e) =>
                  updateConfig({
                    ...currentConfig,
                    enabled: e.target.checked,
                  })
                }
                className="rounded text-[#3A2008] w-4 h-4"
              />
              <div>
                <span className="font-bold text-xs text-[#141210] block">
                  Enable Framing Section
                </span>
                <span className="text-[11px] text-[#5C5449]">
                  Show framing options to clients
                </span>
              </div>
            </label>
          </div>

          <div className="sm:col-span-1">
            <label className="text-xs font-semibold block mb-1">
              Section Heading Title
            </label>
            <input
              type="text"
              value={currentConfig.title || ""}
              onChange={(e) =>
                updateConfig({
                  ...currentConfig,
                  title: e.target.value,
                })
              }
              placeholder="e.g. Archival Frame Printing"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="text-xs font-semibold block mb-1">
              Section Description / Subtitle
            </label>
            <input
              type="text"
              value={currentConfig.description || ""}
              onChange={(e) =>
                updateConfig({
                  ...currentConfig,
                  description: e.target.value,
                })
              }
              placeholder="e.g. Professional wooden & metallic framing"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
            />
          </div>
        </div>
      </div>

      {/* Frame Options Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[#5C5449] px-2">
          <span>Configured Framing Options ({frameTypes.length})</span>
          <span>Order &amp; Pricing Controls</span>
        </div>

        {frameTypes.length === 0 ? (
          <div className="rounded-3xl bg-[#FFFFFF] border border-dashed border-[#D5CCB4] p-10 text-center space-y-3">
            <ImageIcon className="w-8 h-8 text-[#A66D35] mx-auto opacity-70" />
            <h4 className="text-sm font-bold text-[#141210]">
              No Framing Options Configured
            </h4>
            <p className="text-xs text-[#5C5449] max-w-md mx-auto">
              When no framing options are configured, the framing section is completely omitted from the public booking page. Click below to add your first framing add-on.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Add Frame Option</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {frameTypes.map((opt, idx) => {
              const isActive = opt.is_active !== false;
              return (
                <div
                  key={opt.id}
                  className={`rounded-2xl border p-4.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? "bg-[#FFFFFF] border-[#E5DEC9] shadow-2xs"
                      : "bg-[#FAF7F2]/60 border-[#E5DEC9] opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F4EFE6] border border-[#E5DEC9] flex items-center justify-center shrink-0 text-[#A66D35]">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#141210]">
                          {opt.name}
                        </span>
                        {opt.dimensions && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449]">
                            {opt.dimensions}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-[#3A2008] text-[#FAF7F2]"
                              : "bg-[#E5DEC9] text-[#5C5449]"
                          }`}
                        >
                          {isActive ? "Active" : "Disabled"}
                        </span>
                        {opt.allow_quantity && (
                          <span className="text-[10px] font-mono text-[#A66D35] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E5DEC9]">
                            Allows Quantity
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-xs text-[#5C5449] line-clamp-2">
                          {opt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5DEC9]">
                    <div className="text-right">
                      <span className="text-xs text-[#5C5449] block font-mono">
                        Add-on Price
                      </span>
                      <span className="text-base font-extrabold text-[#3A2008] font-mono">
                        ৳{Number(opt.price).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleOptionActive(opt.id)}
                        className={`p-1.5 rounded-lg border ${
                          isActive
                            ? "bg-[#FAF7F2] border-[#E5DEC9] text-[#3A2008] hover:bg-[#E5DEC9]"
                            : "bg-[#E5DEC9] border-[#D5CCB4] text-[#5C5449] hover:bg-[#FAF7F2]"
                        }`}
                        title={isActive ? "Disable option" : "Enable option"}
                      >
                        {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(opt.id, "up")}
                        className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#5C5449] disabled:opacity-30 border border-[#E5DEC9]"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === frameTypes.length - 1}
                        onClick={() => handleMove(opt.id, "down")}
                        className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#5C5449] disabled:opacity-30 border border-[#E5DEC9]"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(opt)}
                        className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#E5DEC9] text-[#3A2008] border border-[#E5DEC9]"
                        title="Edit option"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(opt.id, opt.name)}
                        className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#FBEAE9] text-[#C53030] border border-[#E5DEC9]"
                        title="Delete option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {editingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[#FAF7F2] border border-[#E5DEC9] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
              <h4 className="text-base font-bold text-[#141210]">
                {editingModal.id && frameTypes.some((f) => f.id === editingModal.id)
                  ? "Edit Framing Option"
                  : "Add Framing Option"}
              </h4>
              <button
                type="button"
                onClick={() => setEditingModal(null)}
                className="p-1.5 rounded-lg text-[#5C5449] hover:bg-[#E5DEC9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Option Name *</label>
                <input
                  type="text"
                  required
                  value={editingModal.name || ""}
                  onChange={(e) => setEditingModal({ ...editingModal, name: e.target.value })}
                  placeholder="e.g. Archival Matte Black Wood Frame (10x12&quot;)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Additional Price (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingModal.price !== undefined ? editingModal.price : 1500}
                    onChange={(e) =>
                      setEditingModal({ ...editingModal, price: Number(e.target.value) || 0 })
                    }
                    placeholder="1500"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Dimensions / Profile</label>
                  <input
                    type="text"
                    value={editingModal.dimensions || ""}
                    onChange={(e) =>
                      setEditingModal({ ...editingModal, dimensions: e.target.value })
                    }
                    placeholder="e.g. 10&quot; x 12&quot;"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Description / Materials</label>
                <textarea
                  rows={3}
                  value={editingModal.description || ""}
                  onChange={(e) =>
                    setEditingModal({ ...editingModal, description: e.target.value })
                  }
                  placeholder="Describe framing materials, glass type, matte border, and hardware..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingModal.is_active !== false}
                    onChange={(e) =>
                      setEditingModal({ ...editingModal, is_active: e.target.checked })
                    }
                    className="rounded text-[#3A2008]"
                  />
                  <span className="font-semibold text-[#141210]">Option is Active</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingModal.allow_quantity)}
                    onChange={(e) =>
                      setEditingModal({ ...editingModal, allow_quantity: e.target.checked })
                    }
                    className="rounded text-[#3A2008]"
                  />
                  <span className="font-semibold text-[#141210]">Allow Multiple Copies</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#E5DEC9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingModal(null)}
                  className="px-4 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#E5DEC9] text-[#5C5449] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] font-semibold uppercase tracking-wider"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Option</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
