"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Link2,
  Mail,
  Check,
  X,
} from "lucide-react";
import type { WorkflowStage } from "@/types/database";

const PALETTE_COLORS = [
  "#3A2008",
  "#5C4028",
  "#A66D35",
  "#2563EB",
  "#16A34A",
  "#D97706",
  "#9333EA",
  "#4B5563",
];

export default function WorkflowStagesAdminClient() {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [editingStage, setEditingStage] = useState<Partial<WorkflowStage> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadStages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/workflow-stages", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setStages(json.data);
        }
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to connect to workflow stages service." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const handleOpenAdd = () => {
    const nextOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.sort_order || 0)) + 1 : 1;
    setEditingStage({
      name: "",
      slug: "",
      description: "",
      client_facing_description: "",
      sort_order: nextOrder,
      is_active: true,
      is_visible_to_client: true,
      is_final_delivery: false,
      color: "#3A2008",
      allow_link_delivery: false,
      is_link_required: false,
      send_email_on_delivery: true,
      auto_send_email: false,
      default_validity_days: 14,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stage: WorkflowStage) => {
    setEditingStage({ ...stage });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage || !editingStage.name?.trim()) {
      setFeedback({ type: "error", message: "Stage name is required." });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const res = await fetch("/api/admin/workflow-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStage),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save workflow stage.");
      }

      setFeedback({ type: "success", message: `Workflow stage "${editingStage.name}" saved successfully.` });
      setIsModalOpen(false);
      setEditingStage(null);
      await loadStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save workflow stage." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (stage: WorkflowStage) => {
    try {
      setFeedback(null);
      const res = await fetch("/api/admin/workflow-stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: stage.id,
          is_active: !stage.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed.");
      await loadStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to toggle status." });
    }
  };

  const handleToggleVisibility = async (stage: WorkflowStage) => {
    try {
      setFeedback(null);
      const res = await fetch("/api/admin/workflow-stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: stage.id,
          is_visible_to_client: !stage.is_visible_to_client,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed.");
      await loadStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to toggle client visibility." });
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stages.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...stages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Recalculate 1-based sort orders
    const payload = reordered.map((stg, i) => ({
      id: stg.id,
      sort_order: i + 1,
    }));

    try {
      setFeedback(null);
      const res = await fetch("/api/admin/workflow-stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", stages: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Reorder failed.");
      await loadStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update order." });
    }
  };

  const handleDelete = async (stage: WorkflowStage) => {
    const ok = window.confirm(
      `Are you sure you want to remove the stage "${stage.name}"?\nIf client bookings currently use this stage, it will be safely disabled/archived to preserve historical records.`
    );
    if (!ok) return;

    try {
      setFeedback(null);
      const res = await fetch(`/api/admin/workflow-stages?id=${encodeURIComponent(stage.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed.");

      if (json.archived) {
        setFeedback({ type: "success", message: json.message });
      } else {
        setFeedback({ type: "success", message: `Stage "${stage.name}" was permanently removed.` });
      }
      await loadStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to delete stage." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#141210]">
              Production Workflow &amp; Delivery Stages
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#3A2008] border border-[#E5DEC9]">
              {stages.length} Stages Configured
            </span>
          </div>
          <p className="text-xs text-[#5C5449] mt-0.5">
            Configure the sequential stages client sessions progress through, client portal visibility, and photo-bank delivery rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStages}
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
            <span>Add Workflow Stage</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
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

      {/* Stage Flow Preview */}
      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#141210]">
            Client Portal Pipeline Flow
          </h3>
          <span className="text-[11px] text-[#5C5449]">
            Active stages visible to clients in their booking tracker
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
          {stages
            .filter((s) => s.is_active && s.is_visible_to_client)
            .map((stage, idx, arr) => (
              <React.Fragment key={stage.id}>
                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color || "#3A2008" }}
                  />
                  <span className="text-xs font-bold text-[#141210]">
                    {idx + 1}. {stage.name}
                  </span>
                  {stage.allow_link_delivery && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-[#FFFFFF] border border-[#E5DEC9] text-[#A66D35]">
                      <Link2 className="w-2.5 h-2.5 inline mr-0.5" />
                      Link
                    </span>
                  )}
                  {stage.is_final_delivery && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-[#3A2008] text-[#FAF7F2]">
                      Final
                    </span>
                  )}
                </div>
                {idx < arr.length - 1 && (
                  <span className="text-xs text-[#8C827A] font-bold">→</span>
                )}
              </React.Fragment>
            ))}
        </div>
      </div>

      {/* Stages Table / Cards */}
      <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#E5DEC9] text-[#5C5449] font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Order</th>
                <th className="py-3 px-4">Stage Name &amp; Key</th>
                <th className="py-3 px-4">Client Portal Label</th>
                <th className="py-3 px-4">Photo-Bank Delivery Rules</th>
                <th className="py-3 px-4 text-center">Client Visible</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DEC9]">
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#8C827A]">
                    {loading ? "Loading workflow stages..." : "No workflow stages configured yet."}
                  </td>
                </tr>
              ) : (
                stages.map((stage, idx) => (
                  <tr
                    key={stage.id}
                    className={`hover:bg-[#FAF7F2]/60 transition-colors ${
                      !stage.is_active ? "opacity-60 bg-gray-50/50" : ""
                    }`}
                  >
                    {/* Order & Reordering buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono font-bold text-[#3A2008] w-5 text-center">
                          {stage.sort_order}
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
                            disabled={idx === stages.length - 1}
                            onClick={() => handleMoveOrder(idx, "down")}
                            className="p-0.5 rounded text-[#8C827A] hover:text-[#141210] disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Stage Name & Slug */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: stage.color || "#3A2008" }}
                        />
                        <div>
                          <div className="font-bold text-[#141210] flex items-center gap-1.5">
                            <span>{stage.name}</span>
                            {stage.is_final_delivery && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#3A2008] text-[#FAF7F2]">
                                ★ Final Delivery
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#8C827A]">
                            slug: {stage.slug}
                          </div>
                          {stage.description && (
                            <p className="text-[11px] text-[#5C5449] max-w-xs line-clamp-1 mt-0.5">
                              {stage.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Client Facing Description */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-[#141210] max-w-sm">
                        {stage.client_facing_description || "—"}
                      </p>
                    </td>

                    {/* Link Delivery Rules */}
                    <td className="py-3.5 px-4">
                      {stage.allow_link_delivery ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] bg-[#EAF3EB] px-2 py-0.5 rounded">
                              <Link2 className="w-3 h-3" />
                              Link Delivery Enabled
                            </span>
                            {stage.is_link_required ? (
                              <span className="text-[10px] font-bold text-[#DC2626] bg-[#FBEBEB] px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#5C5449] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E5DEC9]">
                                Optional
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#5C5449] flex items-center gap-2">
                            <span>Validity: {stage.default_validity_days || 14} days</span>
                            {stage.send_email_on_delivery && (
                              <span className="text-[#3A2008] flex items-center gap-0.5">
                                <Mail className="w-2.5 h-2.5" />
                                {stage.auto_send_email ? "Auto-Email" : "Email Alert"}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#8C827A] italic">
                          No photo delivery at this stage
                        </span>
                      )}
                    </td>

                    {/* Client Visibility Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(stage)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          stage.is_visible_to_client
                            ? "bg-[#FAF7F2] text-[#3A2008] border border-[#D5CCB4]"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                        title="Toggle visibility in client booking portal"
                      >
                        {stage.is_visible_to_client ? (
                          <>
                            <Eye className="w-3 h-3 text-[#A66D35]" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(stage)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          stage.is_active
                            ? "bg-[#EAF3EB] text-[#16A34A] border border-[#BCD9C0]"
                            : "bg-[#FBEBEB] text-[#DC2626] border border-[#F0BEBE]"
                        }`}
                      >
                        {stage.is_active ? "Active" : "Archived"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(stage)}
                          className="p-1.5 rounded-lg text-[#5C5449] hover:text-[#141210] hover:bg-[#FAF7F2] transition-colors"
                          title="Edit Stage Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(stage)}
                          className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FBEBEB] transition-colors"
                          title="Archive or Delete Stage"
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

      {/* Modal for Add / Edit Stage */}
      {isModalOpen && editingStage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <form onSubmit={handleSaveModal}>
              <div className="p-5 border-b border-[#E5DEC9] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#141210]">
                    {editingStage.id ? "Edit Workflow Stage" : "New Workflow Stage"}
                  </h3>
                  <p className="text-xs text-[#5C5449]">
                    Configure stage attributes, client-facing messaging, and delivery controls.
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
                {/* Stage Name & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#141210] block">
                      Stage Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingStage.name || ""}
                      onChange={(e) =>
                        setEditingStage({
                          ...editingStage,
                          name: e.target.value,
                          slug: editingStage.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                        })
                      }
                      placeholder="e.g. Color Grading & Retouching"
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-[#141210] block">
                      URL Slug / Identifier
                    </label>
                    <input
                      type="text"
                      value={editingStage.slug || ""}
                      onChange={(e) => setEditingStage({ ...editingStage, slug: e.target.value })}
                      placeholder="e.g. retouching"
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Color and Sort Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#141210] block">
                      Badge Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingStage.color || "#3A2008"}
                        onChange={(e) => setEditingStage({ ...editingStage, color: e.target.value })}
                        className="w-8 h-8 rounded border border-[#E5DEC9] cursor-pointer shrink-0"
                      />
                      <div className="flex items-center gap-1 flex-wrap">
                        {PALETTE_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditingStage({ ...editingStage, color: c })}
                            className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#141210] block">
                      Sort Order Position
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingStage.sort_order || 1}
                      onChange={(e) => setEditingStage({ ...editingStage, sort_order: Number(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Internal Description */}
                <div className="space-y-1">
                  <label className="font-semibold text-[#141210] block">
                    Internal Operations Note (Admin Only)
                  </label>
                  <input
                    type="text"
                    value={editingStage.description || ""}
                    onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                    placeholder="e.g. RAW files transferred to local studio RAID for selection"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs"
                  />
                </div>

                {/* Client Facing Description */}
                <div className="space-y-1">
                  <label className="font-semibold text-[#141210] block">
                    Client-Facing Status Message (Visible in Client Portal)
                  </label>
                  <textarea
                    rows={2}
                    value={editingStage.client_facing_description || ""}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, client_facing_description: e.target.value })
                    }
                    placeholder="e.g. Your session photos are currently in our fine-art digital darkroom for color calibration and contrast refinement."
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs resize-none"
                  />
                </div>

                {/* Stage Flow Checkboxes */}
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStage.is_visible_to_client !== false}
                      onChange={(e) =>
                        setEditingStage({ ...editingStage, is_visible_to_client: e.target.checked })
                      }
                      className="rounded border-[#D5CCB4]"
                    />
                    <span className="font-semibold text-[#141210]">
                      Visible on Client Progress Bar
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStage.is_final_delivery)}
                      onChange={(e) =>
                        setEditingStage({
                          ...editingStage,
                          is_final_delivery: e.target.checked,
                          allow_link_delivery: e.target.checked ? true : editingStage.allow_link_delivery,
                          is_link_required: e.target.checked ? true : editingStage.is_link_required,
                        })
                      }
                      className="rounded border-[#D5CCB4]"
                    />
                    <span className="font-semibold text-[#141210]">
                      Is Final Delivery Stage (Unlocks final client download)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStage.is_active !== false}
                      onChange={(e) => setEditingStage({ ...editingStage, is_active: e.target.checked })}
                      className="rounded border-[#D5CCB4]"
                    />
                    <span className="font-semibold text-[#141210]">
                      Active Stage (Available for bookings)
                    </span>
                  </label>
                </div>

                {/* Photo-Bank Link Delivery Section */}
                <div className="p-4 rounded-xl border border-[#D5CCB4] bg-[#FAF7F2]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#141210] flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-[#A66D35]" />
                      <span>Photo-Bank Link Delivery Configuration</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingStage.allow_link_delivery)}
                      onChange={(e) =>
                        setEditingStage({
                          ...editingStage,
                          allow_link_delivery: e.target.checked,
                          is_link_required: e.target.checked ? editingStage.is_link_required : false,
                        })
                      }
                      className="rounded border-[#D5CCB4]"
                    />
                    <span className="font-semibold text-[#141210]">
                      Allow Photo-Bank Link Delivery at this stage
                    </span>
                  </label>

                  {editingStage.allow_link_delivery && (
                    <div className="pl-6 pt-2 space-y-3 border-l-2 border-[#D5CCB4]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingStage.is_link_required)}
                          onChange={(e) =>
                            setEditingStage({ ...editingStage, is_link_required: e.target.checked })
                          }
                          className="rounded border-[#D5CCB4]"
                        />
                        <span>
                          <strong>Require Photo Link:</strong> Booking cannot transition to this stage without a valid gallery URL.
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingStage.send_email_on_delivery !== false}
                          onChange={(e) =>
                            setEditingStage({ ...editingStage, send_email_on_delivery: e.target.checked })
                          }
                          className="rounded border-[#D5CCB4]"
                        />
                        <span>
                          <strong>Email Notification Permitted:</strong> Enable delivery alert email to client.
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingStage.auto_send_email)}
                          onChange={(e) =>
                            setEditingStage({ ...editingStage, auto_send_email: e.target.checked })
                          }
                          className="rounded border-[#D5CCB4]"
                        />
                        <span>
                          <strong>Auto-Send Email:</strong> Automatically dispatch email when transitioning without requiring manual checkbox.
                        </span>
                      </label>

                      <div className="space-y-1 pt-1">
                        <label className="font-semibold text-[#141210] block">
                          Default Gallery Validity Duration (Days)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={editingStage.default_validity_days || 14}
                            onChange={(e) =>
                              setEditingStage({
                                ...editingStage,
                                default_validity_days: Number(e.target.value) || 14,
                              })
                            }
                            className="w-24 px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                          />
                          <span className="text-[#5C5449] text-xs">
                            days before client link expires (e.g. 14 days)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
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
                      <span>Save Workflow Stage</span>
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
