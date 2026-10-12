"use client";

import React, { useState, useEffect } from "react";
import { Lead, LeadStatus, InquiryType } from "@/types/database";
import { fetchLeads, updateLeadStatus, deleteLead } from "@/lib/data-service";
import { formatDate } from "@/lib/utils";
import {
  Phone,
  Mail,
  Building,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Send,
  Archive,
  Sparkles,
  MessageSquare,
  X,
  FileText,
  UserCheck,
} from "lucide-react";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; badge: string }
> = {
  new: {
    label: "New Inquiry",
    color: "text-amber-400",
    badge: "bg-amber-950/60 text-amber-300 border-amber-800/80",
  },
  contacted: {
    label: "Contacted",
    color: "text-blue-400",
    badge: "bg-blue-950/60 text-blue-300 border-blue-800/80",
  },
  quote_sent: {
    label: "Quote Sent",
    color: "text-purple-400",
    badge: "bg-purple-950/60 text-purple-300 border-purple-800/80",
  },
  confirmed: {
    label: "Confirmed Deal",
    color: "text-emerald-400",
    badge: "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
  },
  archived: {
    label: "Archived",
    color: "text-neutral-400",
    badge: "bg-neutral-900 text-neutral-400 border-neutral-800",
  },
};

export default function LeadsCRMClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadModal, setSelectedLeadModal] = useState<Lead | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setIsLoading(true);
    const data = await fetchLeads();
    setLeads(data);
    setIsLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    await updateLeadStatus(id, newStatus);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    if (selectedLeadModal && selectedLeadModal.id === id) {
      setSelectedLeadModal({ ...selectedLeadModal, status: newStatus });
    }
  };

  const handleSaveNotes = async (id: string) => {
    await updateLeadStatus(id, leads.find((l) => l.id === id)?.status || "new", tempNotes);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, admin_notes: tempNotes } : l))
    );
    setEditingNotesId(null);
    setSaveSuccessId(id);
    setTimeout(() => setSaveSuccessId(null), 2500);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this client inquiry?")) {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (selectedLeadModal && selectedLeadModal.id === id) {
        setSelectedLeadModal(null);
      }
    }
  };

  const exportCSV = () => {
    if (leads.length === 0) return alert("No leads to export.");
    const headers = [
      "ID",
      "Client Name",
      "Company Name",
      "Email",
      "Phone",
      "Inquiry Type",
      "Status",
      "Event Date",
      "Estimated Scale/Qty",
      "Details",
      "Admin Notes",
      "Created At",
    ];
    const rows = leads.map((l) => [
      l.id,
      `"${l.client_name.replace(/"/g, '""')}"`,
      `"${(l.company_name || "").replace(/"/g, '""')}"`,
      l.email,
      l.phone,
      l.inquiry_type,
      l.status,
      l.event_date || "",
      `"${(l.estimated_qty || "").replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${(l.admin_notes || "").replace(/"/g, '""')}"`,
      l.created_at || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `offprint_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      lead.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.phone.includes(searchQuery) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Metrics
  const metrics = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    quote_sent: leads.filter((l) => l.status === "quote_sent").length,
    confirmed: leads.filter((l) => l.status === "confirmed").length,
  };

  return (
    <div className="space-y-8">
      {/* Title & Pipeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f5f0eb] tracking-tight">
            Client Inquiries & CRM Pipeline
          </h1>
          <p className="text-xs text-[#a89f91] mt-1">
            Bespoke quotation workflow. Call clients directly to finalize production briefs and dispatch official quotes.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141210] hover:bg-[#1c1815] border border-[#26201b] hover:border-[#c98a4b]/50 text-xs text-[#f5f0eb] transition-all self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#c98a4b]" />
          <span>Export Pipeline CSV</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#141210] border border-[#26201b]">
          <span className="text-xs text-[#a89f91]">Total Inquiries</span>
          <div className="text-2xl font-extrabold text-[#f5f0eb] font-mono mt-1">
            {metrics.total}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-amber-900/40">
          <span className="text-xs text-amber-400 font-medium">New / Uncontacted</span>
          <div className="text-2xl font-extrabold text-amber-300 font-mono mt-1">
            {metrics.new}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-blue-900/40">
          <span className="text-xs text-blue-400 font-medium">In Discussion</span>
          <div className="text-2xl font-extrabold text-blue-300 font-mono mt-1">
            {metrics.contacted}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-purple-900/40">
          <span className="text-xs text-purple-400 font-medium">Quotes Dispatched</span>
          <div className="text-2xl font-extrabold text-purple-300 font-mono mt-1">
            {metrics.quote_sent}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141210] border border-emerald-900/40 col-span-2 sm:col-span-1">
          <span className="text-xs text-emerald-400 font-medium">Confirmed Deals</span>
          <div className="text-2xl font-extrabold text-emerald-300 font-mono mt-1">
            {metrics.confirmed}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#141210] border border-[#26201b]">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(["all", "new", "contacted", "quote_sent", "confirmed", "archived"] as const).map(
            (st) => {
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    isSelected
                      ? "bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b]"
                      : "bg-[#0a0a0a] text-[#a89f91] hover:text-[#f5f0eb] border border-[#26201b]"
                  }`}
                >
                  {st === "all" ? "All Leads" : STATUS_CONFIG[st].label}
                </button>
              );
            }
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#a89f91] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, email, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#26201b] text-xs text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b]"
          />
        </div>
      </div>

      {/* Leads Table / Cards */}
      {isLoading ? (
        <div className="text-center py-16 text-xs text-[#a89f91]">
          Loading CRM database records...
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16 text-xs text-[#a89f91] space-y-2">
          <p>No leads match the selected criteria.</p>
          <button
            onClick={() => {
              setStatusFilter("all");
              setSearchQuery("");
            }}
            className="text-[#c98a4b] underline text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const isEditingNote = editingNotesId === lead.id;
            const currentStatus = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;

            return (
              <div
                key={lead.id}
                className="rounded-2xl bg-[#141210] border border-[#26201b] hover:border-[#3d3126] p-5 sm:p-6 transition-all space-y-4"
              >
                {/* Lead Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-[#f5f0eb]">
                        {lead.client_name}
                      </span>
                      {lead.company_name && (
                        <span className="text-xs text-[#a89f91] flex items-center gap-1 bg-[#0a0a0a] px-2 py-0.5 rounded border border-[#26201b]">
                          <Building className="w-3 h-3 text-[#c98a4b]" />
                          <span>{lead.company_name}</span>
                        </span>
                      )}
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#4a2805]/40 text-[#c98a4b] border border-[#6e3c08]/50">
                        {lead.inquiry_type === "event_coverage"
                          ? "Media Coverage"
                          : "Print & Merch"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#696257]">
                      <span>Ref: <strong className="font-mono text-[#a89f91]">{lead.id}</strong></span>
                      <span>•</span>
                      <span>Received: {formatDate(lead.created_at)}</span>
                      {lead.event_date && (
                        <>
                          <span>•</span>
                          <span className="text-[#a89f91] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#c98a4b]" />
                            <span>Target Date: {formatDate(lead.event_date)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex items-center gap-3">
                    {/* Status Dropdown */}
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        handleStatusChange(lead.id, e.target.value as LeadStatus)
                      }
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${currentStatus.badge}`}
                    >
                      <option value="new">New Inquiry</option>
                      <option value="contacted">Contacted</option>
                      <option value="quote_sent">Quote Sent</option>
                      <option value="confirmed">Confirmed Deal</option>
                      <option value="archived">Archived</option>
                    </select>

                    <button
                      onClick={() => setSelectedLeadModal(lead)}
                      className="p-2 rounded-lg bg-[#0a0a0a] border border-[#26201b] hover:border-[#c98a4b]/50 text-[#a89f91] hover:text-[#f5f0eb]"
                      title="Inspect Full Lead"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="p-2 rounded-lg bg-[#0a0a0a] border border-[#26201b] hover:border-red-900 text-[#a89f91] hover:text-red-400"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Direct Action Bar: One-Click Call and Email Triggers */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#26201b]">
                  <a
                    href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1714] hover:bg-[#4a2805] text-[#f5f0eb] border border-[#3d3126] hover:border-[#c98a4b] text-xs font-mono transition-all group"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#c98a4b] group-hover:text-white" />
                    <span>Call: {lead.phone}</span>
                  </a>

                  <a
                    href={`mailto:${lead.email}?subject=OFFPRINT Quotation Brief - ${encodeURIComponent(lead.client_name)}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1714] hover:bg-[#4a2805] text-[#f5f0eb] border border-[#3d3126] hover:border-[#c98a4b] text-xs transition-all group"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#c98a4b] group-hover:text-white" />
                    <span>Email: {lead.email}</span>
                  </a>

                  {lead.estimated_qty && (
                    <span className="text-xs text-[#a89f91] flex items-center gap-1.5 bg-[#0a0a0a] px-2.5 py-1 rounded-lg border border-[#26201b]">
                      <Layers className="w-3 h-3 text-[#c98a4b]" />
                      <span>Scale / Qty: <strong className="text-[#f5f0eb]">{lead.estimated_qty}</strong></span>
                    </span>
                  )}
                </div>

                {/* Details snippet */}
                <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-xs text-[#d4cbbf] leading-relaxed">
                  <span className="font-semibold text-[#a89f91] block mb-1">
                    Requirements Brief:
                  </span>
                  {lead.details}
                </div>

                {/* Inline Admin Notes Editor */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  {isEditingNote ? (
                    <div className="w-full flex items-center gap-2">
                      <input
                        type="text"
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Internal deal notes (e.g. quote number, requested callback time)..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#c98a4b] text-xs text-[#f5f0eb] focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveNotes(lead.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#c98a4b] text-black font-semibold text-xs hover:bg-[#e5a96b]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNotesId(null)}
                        className="px-2 py-1.5 rounded-lg bg-[#0a0a0a] text-[#a89f91] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#a89f91]">
                      <MessageSquare className="w-3.5 h-3.5 text-[#c98a4b]" />
                      <span>
                        Internal Notes:{" "}
                        <strong className="text-[#f5f0eb] font-normal">
                          {lead.admin_notes || "No notes logged yet."}
                        </strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingNotesId(lead.id);
                          setTempNotes(lead.admin_notes || "");
                        }}
                        className="text-[11px] text-[#c98a4b] underline ml-1 hover:text-white"
                      >
                        Edit
                      </button>
                      {saveSuccessId === lead.id && (
                        <span className="text-[11px] text-emerald-400 font-mono">
                          ✓ Saved!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Lead Detail Modal */}
      {selectedLeadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedLeadModal(null)}
        >
          <div
            className="bg-[#141210] border border-[#3d3126] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedLeadModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#0a0a0a] text-[#a89f91] hover:text-white border border-[#26201b]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-[#c98a4b]">
                Lead Inspection Docket
              </span>
              <h3 className="text-2xl font-bold text-[#f5f0eb]">
                {selectedLeadModal.client_name}
              </h3>
              {selectedLeadModal.company_name && (
                <p className="text-sm text-[#a89f91]">
                  Organization: {selectedLeadModal.company_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-[#0a0a0a] p-4 rounded-xl border border-[#26201b]">
              <div>
                <span className="text-[#696257]">Direct Phone:</span>
                <p className="font-mono text-[#f5f0eb] mt-0.5">{selectedLeadModal.phone}</p>
              </div>
              <div>
                <span className="text-[#696257]">Official Email:</span>
                <p className="font-mono text-[#f5f0eb] mt-0.5">{selectedLeadModal.email}</p>
              </div>
              <div>
                <span className="text-[#696257]">Inquiry Wing:</span>
                <p className="text-[#c98a4b] mt-0.5 capitalize">
                  {selectedLeadModal.inquiry_type.replace("_", " ")}
                </p>
              </div>
              <div>
                <span className="text-[#696257]">Target Milestone / Date:</span>
                <p className="text-[#f5f0eb] mt-0.5">
                  {formatDate(selectedLeadModal.event_date || undefined)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-[#a89f91]">
                Full Project Requirements Draft
              </h4>
              <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#d4cbbf] leading-relaxed whitespace-pre-wrap">
                {selectedLeadModal.details}
              </div>
            </div>

            <div className="pt-4 border-t border-[#26201b] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedLeadModal.phone}`}
                  className="px-4 py-2 rounded-xl bg-[#c98a4b] text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-[#e5a96b]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Directly</span>
                </a>
                <a
                  href={`mailto:${selectedLeadModal.email}`}
                  className="px-4 py-2 rounded-xl bg-[#0a0a0a] text-[#f5f0eb] border border-[#26201b] hover:border-[#c98a4b] text-xs flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Quotation</span>
                </a>
              </div>

              <select
                value={selectedLeadModal.status}
                onChange={(e) =>
                  handleStatusChange(
                    selectedLeadModal.id,
                    e.target.value as LeadStatus
                  )
                }
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-[#0a0a0a] border border-[#3d3126] text-[#f5f0eb]"
              >
                <option value="new">Status: New</option>
                <option value="contacted">Status: Contacted</option>
                <option value="quote_sent">Status: Quote Sent</option>
                <option value="confirmed">Status: Confirmed Deal</option>
                <option value="archived">Status: Archived</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
