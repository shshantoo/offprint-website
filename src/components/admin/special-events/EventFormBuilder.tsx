"use client";

import React, { useState } from "react";
import { CustomBookingQuestion, CustomQuestionFieldType } from "@/types/database";
import { IUB_CONVOCATION_DEFAULT_QUESTIONS } from "@/lib/booking/default-event-fields";
import {
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  HelpCircle,
  Sparkles,
  Save,
  X,
  ListFilter,
  Heading,
  CheckSquare,
  Radio,
  ChevronDown,
  Calendar,
  Hash,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
  Check,
} from "lucide-react";

function createQuestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `q_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `q_${Math.random().toString(36).substring(2, 9)}`;
}

interface EventFormBuilderProps {
  eventId?: string;
  questions: CustomBookingQuestion[];
  onChange: (updated: CustomBookingQuestion[]) => void;
  onFeedback: (feedback: { type: "success" | "error"; text: string }) => void;
}

const FIELD_TYPES: Array<{
  type: CustomQuestionFieldType;
  label: string;
  icon: any;
  description: string;
}> = [
  { type: "short_text", label: "Short Answer", icon: FileText, description: "Single-line text input (Student ID, Degree, Nickname)" },
  { type: "long_text", label: "Long Answer", icon: FileText, description: "Multi-line text area (Special Requests, Notes, Vision)" },
  { type: "dropdown", label: "Dropdown Box", icon: ChevronDown, description: "Collapsible select menu for single choice" },
  { type: "select_box", label: "Select Box", icon: CheckSquare, description: "Visual selectable cards/boxes (single or multi-select)" },
  { type: "radio", label: "Radio Button", icon: Radio, description: "Round radio buttons (horizontal or vertical layout)" },
  { type: "email", label: "Email Address", icon: Mail, description: "Email format validation" },
  { type: "phone", label: "Phone Number", icon: Phone, description: "Telephone number format" },
  { type: "number", label: "Numeric Value", icon: Hash, description: "Number with optional min/max" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Multiple choice checkboxes" },
  { type: "date", label: "Date Picker", icon: Calendar, description: "YYYY-MM-DD date calendar" },
  { type: "heading", label: "Section Heading", icon: Heading, description: "Visual divider and section title" },
];

const SECTIONS = [
  { value: "contact", label: "Client & Contact Information" },
  { value: "academic", label: "Event-Specific / Academic Details" },
  { value: "preferences", label: "Preferences & Framing" },
  { value: "notes", label: "Notes & Special Requests" },
  { value: "general", label: "General Questions" },
];

export default function EventFormBuilder({
  eventId,
  questions = [],
  onChange,
  onFeedback,
}: EventFormBuilderProps) {
  const sortedQuestions = [...questions].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const [editingModal, setEditingModal] = useState<Partial<CustomBookingQuestion> | null>(null);
  const [modalOptions, setModalOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [showBulkOptions, setShowBulkOptions] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [savingDirectly, setSavingDirectly] = useState(false);

  // Check if contact fields (email or phone) are visible
  const visibleEmail = sortedQuestions.some(
    (q) => (q.field_type === "email" || q.type === "email" || q.key === "client_email") && q.is_visible !== false
  );
  const visiblePhone = sortedQuestions.some(
    (q) => (q.field_type === "phone" || q.type === "phone" || q.key === "client_phone") && q.is_visible !== false
  );
  const hasNoContactMethod = !visibleEmail && !visiblePhone;

  const handleOpenAdd = () => {
    setModalOptions([]);
    setOptionsText("");
    setNewOptionInput("");
    setShowBulkOptions(false);
    setEditingModal({
      id: `q_${Date.now()}`,
      key: `question_${questions.length + 1}`,
      label: "",
      help_text: "",
      placeholder: "",
      field_type: "short_text",
      type: "short_text",
      required: false,
      is_visible: true,
      section: "general",
      options: [],
      layout: "vertical",
      select_mode: "single",
      sort_order: questions.length + 1,
    });
  };

  const handleOpenEdit = (q: CustomBookingQuestion) => {
    const opts = q.options || [];
    setModalOptions(opts);
    setOptionsText(opts.join("\n"));
    setNewOptionInput("");
    setShowBulkOptions(false);
    setEditingModal({ ...q });
  };

  const handleAddOptionToModal = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (modalOptions.includes(trimmed)) {
      alert("Option already exists.");
      return;
    }
    const updated = [...modalOptions, trimmed];
    setModalOptions(updated);
    setOptionsText(updated.join("\n"));
    setNewOptionInput("");
  };

  const handleRemoveOptionFromModal = (idx: number) => {
    const updated = modalOptions.filter((_, i) => i !== idx);
    setModalOptions(updated);
    setOptionsText(updated.join("\n"));
  };

  const handleMoveOptionModal = (idx: number, dir: "up" | "down") => {
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === modalOptions.length - 1) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    const updated = [...modalOptions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setModalOptions(updated);
    setOptionsText(updated.join("\n"));
  };

  const handleBulkOptionsChange = (val: string) => {
    setOptionsText(val);
    const lines = val
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setModalOptions(lines);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModal) return;
    if (!editingModal.label?.trim()) {
      alert("Field label is required.");
      return;
    }

    const fieldType = editingModal.field_type || editingModal.type || "short_text";
    const needsOptions = ["dropdown", "select_box", "radio", "checkbox", "single_choice", "multiple_choice"].includes(fieldType);

    let finalOptions = modalOptions;
    if (showBulkOptions) {
      finalOptions = optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (needsOptions && finalOptions.length === 0) {
      alert("Choice and dropdown questions require at least one option.");
      return;
    }

    const resolvedKey = (editingModal.key || editingModal.id || editingModal.label)
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/(^_|_$)/g, "");

    const newQuestion: CustomBookingQuestion = {
      ...editingModal,
      id: editingModal.id || createQuestionId(),
      key: resolvedKey || "custom_field",
      label: editingModal.label.trim(),
      field_type: fieldType,
      type: fieldType,
      required: fieldType === "heading" ? false : Boolean(editingModal.required),
      is_visible: editingModal.is_visible !== false,
      options: needsOptions ? finalOptions : [],
      layout: editingModal.layout || "vertical",
      select_mode: editingModal.select_mode || (fieldType === "checkbox" ? "multiple" : "single"),
      sort_order: editingModal.sort_order || questions.length + 1,
    };

    const existsIndex = questions.findIndex(
      (q) => q.id === newQuestion.id || (q.key && q.key === newQuestion.key)
    );

    let updated: CustomBookingQuestion[];
    if (existsIndex >= 0) {
      updated = [...questions];
      updated[existsIndex] = newQuestion;
    } else {
      updated = [...questions, newQuestion];
    }

    onChange(updated);
    onFeedback({
      type: "success",
      text: `Saved form field "${newQuestion.label}".`,
    });
    setEditingModal(null);
  };

  const handleToggleVisible = (id: string) => {
    const updated = questions.map((q) => {
      if (q.id === id) {
        return { ...q, is_visible: q.is_visible === false ? true : false };
      }
      return q;
    });
    onChange(updated);
  };

  const handleToggleRequired = (id: string) => {
    const updated = questions.map((q) => {
      if (q.id === id) {
        return { ...q, required: !q.required };
      }
      return q;
    });
    onChange(updated);
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const idx = sortedQuestions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sortedQuestions.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...sortedQuestions];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const updated = reordered.map((q, i) => ({ ...q, sort_order: i + 1 }));
    onChange(updated);
  };

  const handleDelete = (id: string, label: string) => {
    if (
      !confirm(
        `Are you sure you want to remove field "${label}"?\n\nNote: Any historical bookings that already stored answers for this field will retain their data in custom_fields.`
      )
    ) {
      return;
    }
    const updated = questions.filter((q) => q.id !== id);
    onChange(updated);
    onFeedback({
      type: "success",
      text: `Removed field "${label}".`,
    });
  };

  const handleSeedIUBFields = () => {
    if (
      questions.length > 0 &&
      !confirm(
        "This will append/reset standard IUB 27th Convocation fields (Contact, Student ID 7-digit validation, School Dropdown, Regalia Size, Framing preferences, and Notes). Continue?"
      )
    ) {
      return;
    }
    onChange(IUB_CONVOCATION_DEFAULT_QUESTIONS);
    onFeedback({
      type: "success",
      text: "Seeded 12 standard IUB 27th Convocation form fields successfully.",
    });
  };

  const handleDirectSave = async () => {
    if (!eventId) {
      alert("Please save the event first before persisting form questions.");
      return;
    }
    try {
      setSavingDirectly(true);
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "event_custom_questions",
          event_id: eventId,
          custom_questions: questions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save form questions.");
      }
      onFeedback({
        type: "success",
        text: `Successfully persisted ${questions.length} form questions to Supabase.`,
      });
    } catch (err: any) {
      onFeedback({
        type: "error",
        text: err.message || "Failed to save form configuration.",
      });
    } finally {
      setSavingDirectly(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tool Bar */}
      <div className="rounded-3xl bg-[#FAF7F2] border border-[#E5DEC9] p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DEC9] pb-3">
          <div className="flex items-center gap-2.5">
            <ListFilter className="w-5 h-5 text-[#A66D35]" />
            <div>
              <h3 className="text-base font-bold text-[#141210]">
                Dynamic Booking Form Builder
              </h3>
              <p className="text-xs text-[#5C5449]">
                Configure all client form fields: Short Answer, Long Answer, Dropdown Box, Select Box, Radio Buttons, and Contact inputs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSeedIUBFields}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF7F2] text-[#3A2008] border border-[#D5CCB4] text-xs font-semibold transition-colors"
              title="Auto-fill recommended IUB 27th Convocation fields"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A66D35]" />
              <span>Seed IUB Convocation Fields</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Form Field</span>
            </button>
            {eventId && (
              <button
                type="button"
                disabled={savingDirectly}
                onClick={handleDirectSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A66D35] hover:bg-[#8C5825] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingDirectly ? "Saving..." : "Save Form"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Advisory Notice when no contact method is visible */}
        {hasNoContactMethod && (
          <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3 text-xs text-[#92400E]">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Advisory Notice: No Contact Method Visible</span>
              <span>
                Neither an Email Address nor Contact Phone field is currently visible in this form. At least one contact method (email or phone) is recommended for booking confirmations and client communication.
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#5C5449] pt-1">
          <span>
            Configured Fields: <strong>{questions.length}</strong> (
            {questions.filter((q) => q.is_visible !== false).length} visible to client,{" "}
            {questions.filter((q) => q.required).length} required)
          </span>
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="inline-flex items-center gap-1 font-semibold text-[#3A2008] hover:underline"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLivePreview ? "Hide Live Preview" : "Show Live Preview"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields List */}
        <div className={showLivePreview ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          {sortedQuestions.length === 0 ? (
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center mx-auto text-[#A66D35]">
                <ListFilter className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#141210]">No Custom Questions Configured</h4>
              <p className="text-xs text-[#5C5449] max-w-md mx-auto">
                Click &quot;Add Form Field&quot; or &quot;Seed IUB Convocation Fields&quot; to configure custom questions.
              </p>
            </div>
          ) : (
            sortedQuestions.map((q, idx) => {
              const fieldTypeObj = FIELD_TYPES.find((f) => f.type === (q.field_type || q.type)) || FIELD_TYPES[0];
              const IconComp = fieldTypeObj.icon;
              const isHeading = q.field_type === "heading" || q.type === "heading";

              return (
                <div
                  key={q.id || idx}
                  className={`rounded-2xl border p-4 transition-all shadow-2xs space-y-3 ${
                    q.is_visible === false
                      ? "bg-[#FAF7F2]/60 border-[#E5DEC9] opacity-70"
                      : isHeading
                      ? "bg-[#F4EFE6] border-[#D5CCB4]"
                      : "bg-[#FFFFFF] border-[#E5DEC9]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center font-mono text-[11px] font-bold text-[#3A2008]">
                        #{idx + 1}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] flex items-center justify-center text-[#A66D35]">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-[#141210]">
                            {q.label}
                          </h5>
                          {q.required && (
                            <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-mono text-[10px] font-bold">
                              REQUIRED
                            </span>
                          )}
                          {q.is_visible === false && (
                            <span className="px-1.5 py-0.2 rounded bg-stone-200 text-stone-700 font-mono text-[10px]">
                              HIDDEN
                            </span>
                          )}
                          {q.layout && (
                            <span className="px-1.5 py-0.2 rounded bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] font-mono text-[10px]">
                              {q.layout}
                            </span>
                          )}
                          {q.select_mode && (
                            <span className="px-1.5 py-0.2 rounded bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] font-mono text-[10px]">
                              {q.select_mode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#5C5449] font-mono">
                          <span>{fieldTypeObj.label}</span>
                          <span>•</span>
                          <span>key: {q.key || q.id}</span>
                          {q.section && (
                            <>
                              <span>•</span>
                              <span className="uppercase text-[#A66D35]">{q.section}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 self-start sm:self-auto">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(q.id, "up")}
                        className="p-1.5 rounded-lg hover:bg-[#FAF7F2] text-[#5C5449] disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortedQuestions.length - 1}
                        onClick={() => handleMove(q.id, "down")}
                        className="p-1.5 rounded-lg hover:bg-[#FAF7F2] text-[#5C5449] disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisible(q.id)}
                        className={`p-1.5 rounded-lg ${
                          q.is_visible === false
                            ? "bg-stone-200 text-stone-700"
                            : "hover:bg-[#FAF7F2] text-[#5C5449]"
                        }`}
                        title={q.is_visible === false ? "Show Field" : "Hide Field"}
                      >
                        {q.is_visible === false ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {!isHeading && (
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(q.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold ${
                            q.required
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-[#FAF7F2] text-[#877D70] hover:text-[#141210] border border-[#E5DEC9]"
                          }`}
                          title="Toggle Required"
                        >
                          {q.required ? "Req" : "Opt"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(q)}
                        className="p-1.5 rounded-lg hover:bg-[#FAF7F2] text-[#3A2008]"
                        title="Edit Question"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id, q.label)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#877D70] hover:text-red-700"
                        title="Remove Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Metadata details */}
                  {(q.description || q.help_text || q.validation_regex || (q.options && q.options.length > 0)) && (
                    <div className="pt-2 border-t border-[#E5DEC9] text-xs space-y-1 text-[#5C5449]">
                      {q.description && <p className="italic">{q.description}</p>}
                      {q.help_text && (
                        <p className="flex items-center gap-1 text-[11px] text-[#A66D35]">
                          <HelpCircle className="w-3 h-3 shrink-0" />
                          <span>{q.help_text}</span>
                        </p>
                      )}
                      {q.validation_regex && (
                        <p className="font-mono text-[10px] text-[#3A2008]">
                          Validation: /{q.validation_regex}/
                        </p>
                      )}
                      {q.options && q.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {q.options.map((opt, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E5DEC9] text-[10px] font-mono text-[#141210]"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Interactive Live Preview */}
        {showLivePreview && (
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6 rounded-3xl bg-[#FAF7F2] border border-[#E5DEC9] p-6 space-y-4 shadow-sm">
              <div className="border-b border-[#E5DEC9] pb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A66D35] font-semibold">
                  Client-Facing View
                </span>
                <h4 className="text-base font-bold text-[#141210]">
                  Live Booking Form Preview
                </h4>
                <p className="text-[11px] text-[#5C5449]">
                  Only visible fields appear to the client. Responses below are interactive test values.
                </p>
              </div>

              <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
                {sortedQuestions
                  .filter((q) => q.is_visible !== false)
                  .map((q) => {
                    const qType = q.field_type || q.type || "short_text";
                    const qKey = q.key || q.id;
                    const val = previewValues[qKey] || "";

                    if (qType === "heading") {
                      return (
                        <div key={q.id} className="pt-2 border-t border-[#E5DEC9]">
                          <h4 className="font-bold text-sm text-[#141210]">
                            {q.label}
                          </h4>
                          {q.help_text && (
                            <p className="text-[11px] text-[#5C5449]">{q.help_text}</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={q.id} className="space-y-1.5">
                        <label className="font-semibold text-[#141210] flex items-center justify-between">
                          <span>
                            {q.label} {q.required && <span className="text-red-600">*</span>}
                          </span>
                          {q.help_text && (
                            <span className="text-[10px] text-[#A66D35] font-normal">
                              {q.help_text}
                            </span>
                          )}
                        </label>

                        {qType === "short_text" && (
                          <input
                            type="text"
                            placeholder={q.placeholder || "Enter text..."}
                            value={val}
                            onChange={(e) => setPreviewValues({ ...previewValues, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs text-[#141210]"
                          />
                        )}

                        {qType === "long_text" && (
                          <textarea
                            rows={3}
                            placeholder={q.placeholder || "Enter details..."}
                            value={val}
                            onChange={(e) => setPreviewValues({ ...previewValues, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs text-[#141210]"
                          />
                        )}

                        {qType === "email" && (
                          <input
                            type="email"
                            placeholder={q.placeholder || "name@domain.edu"}
                            value={val}
                            onChange={(e) => setPreviewValues({ ...previewValues, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs"
                          />
                        )}

                        {qType === "phone" && (
                          <input
                            type="tel"
                            placeholder={q.placeholder || "+880 1711-000000"}
                            value={val}
                            onChange={(e) => setPreviewValues({ ...previewValues, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                          />
                        )}

                        {qType === "number" && (
                          <input
                            type="number"
                            min={q.min_value ?? undefined}
                            max={q.max_value ?? undefined}
                            placeholder={q.placeholder || "0"}
                            value={val}
                            onChange={(e) => setPreviewValues({ ...previewValues, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                          />
                        )}

                        {qType === "date" && (
                          <input
                            type="date"
                            value={val}
                            onChange={(e) => setPreviewValues({ ...previewValues, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono"
                          />
                        )}

                        {qType === "dropdown" && (
                          <select
                            value={val}
                            onChange={(e) => setPreviewValues({ ...previewValues, [qKey]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs"
                          >
                            <option value="">-- Choose an option --</option>
                            {(q.options || []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Select Box (Visual Cards) */}
                        {qType === "select_box" && (
                          <div
                            className={
                              q.layout === "horizontal"
                                ? "flex flex-wrap gap-2 pt-0.5"
                                : "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5"
                            }
                          >
                            {(q.options || []).map((opt) => {
                              const isMulti = q.select_mode === "multiple";
                              const curArr: string[] = Array.isArray(val) ? val : val ? [val] : [];
                              const isSelected = isMulti ? curArr.includes(opt) : val === opt;

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    if (isMulti) {
                                      const next = isSelected
                                        ? curArr.filter((x) => x !== opt)
                                        : [...curArr, opt];
                                      setPreviewValues({ ...previewValues, [qKey]: next });
                                    } else {
                                      setPreviewValues({ ...previewValues, [qKey]: opt });
                                    }
                                  }}
                                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                    isSelected
                                      ? "bg-[#3A2008] text-[#FAF7F2] border-[#3A2008] shadow-xs"
                                      : "bg-[#FFFFFF] text-[#141210] border-[#E5DEC9] hover:border-[#A66D35]"
                                  }`}
                                >
                                  <span className="font-semibold text-xs">{opt}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#FAF7F2]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Radio Button */}
                        {(qType === "radio" || qType === "single_choice") && (
                          <div
                            className={
                              q.layout === "horizontal"
                                ? "flex flex-wrap gap-3 pt-0.5"
                                : "space-y-1.5 pt-0.5"
                            }
                          >
                            {(q.options || []).map((opt) => {
                              const sel = val === opt;
                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 cursor-pointer text-xs text-[#141210]"
                                >
                                  <input
                                    type="radio"
                                    name={`preview_${qKey}`}
                                    checked={sel}
                                    onChange={() => setPreviewValues({ ...previewValues, [qKey]: opt })}
                                    className="w-3.5 h-3.5 text-[#3A2008] border-[#E5DEC9] focus:ring-[#A66D35]"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* Checkbox */}
                        {(qType === "checkbox" || qType === "multiple_choice") && (
                          <div className="space-y-1.5 pt-0.5">
                            {(q.options || []).map((opt) => {
                              const currentArr: string[] = Array.isArray(val) ? val : [];
                              const checked = currentArr.includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 text-xs text-[#141210] cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...currentArr, opt]
                                        : currentArr.filter((x) => x !== opt);
                                      setPreviewValues({ ...previewValues, [qKey]: next });
                                    }}
                                    className="rounded text-[#3A2008] w-3.5 h-3.5"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {editingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 sm:p-7 shadow-xl space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
              <h4 className="text-base font-bold text-[#141210]">
                {editingModal.label ? `Edit: ${editingModal.label}` : "Add Booking Form Field"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Field Label *</label>
                  <input
                    type="text"
                    required
                    value={editingModal.label || ""}
                    onChange={(e) => setEditingModal({ ...editingModal, label: e.target.value })}
                    placeholder="e.g. Student ID or Department"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Field Key (DB Variable)</label>
                  <input
                    type="text"
                    value={editingModal.key || ""}
                    onChange={(e) => setEditingModal({ ...editingModal, key: e.target.value })}
                    placeholder="e.g. student_id"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] font-mono text-[#141210]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Field Type *</label>
                  <select
                    value={editingModal.field_type || editingModal.type || "short_text"}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setEditingModal({
                        ...editingModal,
                        field_type: newType,
                        type: newType,
                        select_mode: newType === "checkbox" ? "multiple" : editingModal.select_mode || "single",
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  >
                    {FIELD_TYPES.map((f) => (
                      <option key={f.type} value={f.type}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Form Section Group</label>
                  <select
                    value={editingModal.section || "general"}
                    onChange={(e) => setEditingModal({ ...editingModal, section: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  >
                    {SECTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Layout and Select Mode settings for radio and select_box */}
              {(editingModal.field_type === "radio" ||
                editingModal.type === "radio" ||
                editingModal.field_type === "select_box" ||
                editingModal.type === "select_box") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9]">
                  <div>
                    <label className="font-semibold block mb-1">Display Layout</label>
                    <select
                      value={editingModal.layout || "vertical"}
                      onChange={(e) =>
                        setEditingModal({ ...editingModal, layout: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
                    >
                      <option value="vertical">Vertical (Stacked)</option>
                      <option value="horizontal">Horizontal (Inline)</option>
                    </select>
                  </div>

                  {(editingModal.field_type === "select_box" || editingModal.type === "select_box") && (
                    <div>
                      <label className="font-semibold block mb-1">Selection Mode</label>
                      <select
                        value={editingModal.select_mode || "single"}
                        onChange={(e) =>
                          setEditingModal({ ...editingModal, select_mode: e.target.value as any })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-[#141210]"
                      >
                        <option value="single">Single Select (One Choice)</option>
                        <option value="multiple">Multi Select (Multiple Choices)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Placeholder Text</label>
                  <input
                    type="text"
                    value={editingModal.placeholder || ""}
                    onChange={(e) => setEditingModal({ ...editingModal, placeholder: e.target.value })}
                    placeholder="e.g. 2021456"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Helper Subtext</label>
                  <input
                    type="text"
                    value={editingModal.help_text || ""}
                    onChange={(e) => setEditingModal({ ...editingModal, help_text: e.target.value })}
                    placeholder="e.g. Exact student identification"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#141210]"
                  />
                </div>
              </div>

              {/* Options Management for Dropdown Box, Select Box, Radio, Checkbox */}
              {["dropdown", "select_box", "radio", "checkbox", "single_choice", "multiple_choice"].includes(
                editingModal.field_type || editingModal.type || ""
              ) && (
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-xs text-[#141210]">
                      Choice Options ({modalOptions.length}) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBulkOptions(!showBulkOptions)}
                      className="text-[11px] font-semibold text-[#A66D35] hover:underline"
                    >
                      {showBulkOptions ? "Switch to List View" : "Bulk Edit as Text"}
                    </button>
                  </div>

                  {showBulkOptions ? (
                    <div>
                      <textarea
                        rows={4}
                        value={optionsText}
                        onChange={(e) => handleBulkOptionsChange(e.target.value)}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] font-mono text-[#141210]"
                      />
                      <span className="text-[10px] text-[#5C5449]">
                        Enter one option per line. Empty lines will be removed.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newOptionInput}
                          onChange={(e) => setNewOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddOptionToModal();
                            }
                          }}
                          placeholder="Type an option and click Add..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddOptionToModal}
                          className="px-3 py-1.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold text-xs"
                        >
                          Add Option
                        </button>
                      </div>

                      {modalOptions.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {modalOptions.map((opt, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-xl bg-[#FFFFFF] border border-[#E5DEC9] text-xs"
                            >
                              <span className="font-medium text-[#141210] truncate max-w-[200px]">
                                {opt}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={i === 0}
                                  onClick={() => handleMoveOptionModal(i, "up")}
                                  className="p-1 rounded hover:bg-[#FAF7F2] text-[#5C5449] disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={i === modalOptions.length - 1}
                                  onClick={() => handleMoveOptionModal(i, "down")}
                                  className="p-1 rounded hover:bg-[#FAF7F2] text-[#5C5449] disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromModal(i)}
                                  className="p-1 rounded hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#5C5449] italic">
                          No options added yet. Type an option above to get started.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Number Min/Max */}
              {(editingModal.field_type === "number" || editingModal.type === "number") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Min Value</label>
                    <input
                      type="number"
                      value={editingModal.min_value ?? ""}
                      onChange={(e) =>
                        setEditingModal({ ...editingModal, min_value: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Max Value</label>
                    <input
                      type="number"
                      value={editingModal.max_value ?? ""}
                      onChange={(e) =>
                        setEditingModal({ ...editingModal, max_value: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9]"
                    />
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingModal.is_visible !== false}
                    onChange={(e) =>
                      setEditingModal({ ...editingModal, is_visible: e.target.checked })
                    }
                    className="rounded text-[#3A2008]"
                  />
                  <span className="font-semibold text-[#141210]">Visible in Form</span>
                </label>

                {editingModal.field_type !== "heading" && editingModal.type !== "heading" && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingModal.required)}
                      onChange={(e) =>
                        setEditingModal({ ...editingModal, required: e.target.checked })
                      }
                      className="rounded text-[#3A2008]"
                    />
                    <span className="font-semibold text-[#141210]">Required Input</span>
                  </label>
                )}
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
                  <span>Save Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
