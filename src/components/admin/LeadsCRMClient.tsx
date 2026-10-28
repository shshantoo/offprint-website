"use client";

import React, { useState, useEffect } from "react";
import { Lead, LeadStatus } from "@/types/database";
import { fetchLeads, updateLeadStatus, deleteLead } from "@/lib/data-service";
import { formatDate } from "@/lib/utils";
import {
  Phone,
  Mail,
  Building,
  Calendar,
  Layers,
  Search,
  Download,
  Trash2,
  Eye,
  MessageSquare,
  X,
} from "lucide-react";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; badge: string }
> = {
  new: {
    label: "New Inquiry",
    badge: "bg-[#FFFBEB] text-[#B86B19] border-[#F59E0B]/40",
  },
  contacted: {
    label: "Contacted",
    badge: "bg-[#F4EFE6] text-[#3A2008] border-[#D5CCB4]",
  },
  quote_sent: {
    label: "Quote Sent",
    badge: "bg-[#FAF7F2] text-[#A66D35] border-[#A66D35]/40",
  },
  confirmed: {
    label: "Confirmed Deal",
    badge: "bg-[#EEF7F2] text-[#2E6B4E] border-[#2E6B4E]/30",
  },
  archived: {
    label: "Archived",
    badge: "bg-[#FAF7F2] text-[#877D70] border-[#E5DEC9]",
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
    await updateLeadStatus(
      id,
      leads.find((l) => l.id === id)?.status || "new",
      tempNotes
    );
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
    link.setAttribute(
      "download",
      `offprint_leads_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      lead.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company_name &&
        lead.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.phone.includes(searchQuery) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const metrics = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    quote_sent: leads.filter((l) => l.status === "quote_sent").length,
    confirmed: leads.filter((l) => l.status === "confirmed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#141210] tracking-tight">
            Custom Project Inquiries & Print Leads CRM
          </h2>
          <p className="text-xs text-[#5C5449] mt-0.5">
            Bespoke multi-day production and physical print collateral inquiries.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F4EFE6] border border-[#D5CCB4] text-xs font-semibold text-[#141210] transition-all self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#A66D35]" />
          <span>Export Leads CSV</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
          <span className="text-xs text-[#5C5449]">Total Inquiries</span>
          <div className="text-2xl font-extrabold text-[#141210] font-mono mt-1">
            {metrics.total}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
          <span className="text-xs text-[#B86B19] font-medium">New</span>
          <div className="text-2xl font-extrabold text-[#B86B19] font-mono mt-1">
            {metrics.new}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
          <span className="text-xs text-[#3A2008] font-medium">Contacted</span>
          <div className="text-2xl font-extrabold text-[#3A2008] font-mono mt-1">
            {metrics.contacted}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
          <span className="text-xs text-[#A66D35] font-medium">Quote Sent</span>
          <div className="text-2xl font-extrabold text-[#A66D35] font-mono mt-1">
            {metrics.quote_sent}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] col-span-2 sm:col-span-1">
          <span className="text-xs text-[#2E6B4E] font-medium">Confirmed</span>
          <div className="text-2xl font-extrabold text-[#2E6B4E] font-mono mt-1">
            {metrics.confirmed}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(["all", "new", "contacted", "quote_sent", "confirmed", "archived"] as const).map(
            (st) => {
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                    isSelected
                      ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008]"
                      : "bg-[#FAF7F2] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
                  }`}
                >
                  {st === "all" ? "All Leads" : STATUS_CONFIG[st].label}
                </button>
              );
            }
          )}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#877D70] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, email, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210] focus:outline-none focus:border-[#3A2008]"
          />
        </div>
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="text-center py-12 text-xs text-[#5C5449]">
          Loading CRM database records...
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12 text-xs text-[#5C5449] rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9]">
          No leads match the selected criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const isEditingNote = editingNotesId === lead.id;
            const currentStatus = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;

            return (
              <div
                key={lead.id}
                className="rounded-2xl bg-[#FFFFFF] border border-[#E5DEC9] p-5 space-y-4 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-[#141210]">
                        {lead.client_name}
                      </span>
                      {lead.company_name && (
                        <span className="text-xs text-[#5C5449] flex items-center gap-1 bg-[#FAF7F2] px-2.5 py-0.5 rounded-lg border border-[#E5DEC9]">
                          <Building className="w-3 h-3 text-[#A66D35]" />
                          <span>{lead.company_name}</span>
                        </span>
                      )}
                      <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-lg bg-[#F4EFE6] text-[#3A2008] border border-[#D5CCB4]">
                        {lead.inquiry_type === "event_coverage"
                          ? "Media Coverage"
                          : "Print & Merch"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#877D70]">
                      <span>
                        Ref: <strong className="font-mono text-[#5C5449]">{lead.id}</strong>
                      </span>
                      <span>•</span>
                      <span>Received: {formatDate(lead.created_at)}</span>
                      {lead.event_date && (
                        <>
                          <span>•</span>
                          <span className="text-[#5C5449] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#A66D35]" />
                            <span>Target Date: {formatDate(lead.event_date)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                      className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] hover:text-[#141210]"
                      title="Inspect Full Lead"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] hover:text-red-700"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E5DEC9]">
                  <a
                    href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border border-[#E5DEC9] text-xs font-mono"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>{lead.phone}</span>
                  </a>

                  <a
                    href={`mailto:${lead.email}?subject=OFFPRINT Quotation Brief - ${encodeURIComponent(lead.client_name)}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border border-[#E5DEC9] text-xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>{lead.email}</span>
                  </a>

                  {lead.estimated_qty && (
                    <span className="text-xs text-[#5C5449] flex items-center gap-1.5 bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#E5DEC9]">
                      <Layers className="w-3 h-3 text-[#A66D35]" />
                      <span>
                        Scale / Qty: <strong className="text-[#141210]">{lead.estimated_qty}</strong>
                      </span>
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs text-[#141210] leading-relaxed">
                  <span className="font-semibold text-[#5C5449] block mb-1">
                    Requirements Brief:
                  </span>
                  {lead.details}
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  {isEditingNote ? (
                    <div className="w-full flex items-center gap-2">
                      <input
                        type="text"
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Internal deal notes..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#3A2008] text-xs text-[#141210]"
                      />
                      <button
                        onClick={() => handleSaveNotes(lead.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#3A2008] text-[#FAF7F2] font-semibold text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNotesId(null)}
                        className="px-2 py-1.5 rounded-xl bg-[#FAF7F2] text-[#5C5449] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#5C5449]">
                      <MessageSquare className="w-3.5 h-3.5 text-[#A66D35]" />
                      <span>
                        Internal Notes:{" "}
                        <strong className="text-[#141210] font-normal">
                          {lead.admin_notes || "No notes logged yet."}
                        </strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingNotesId(lead.id);
                          setTempNotes(lead.admin_notes || "");
                        }}
                        className="text-[11px] text-[#3A2008] font-semibold underline ml-1"
                      >
                        Edit
                      </button>
                      {saveSuccessId === lead.id && (
                        <span className="text-[11px] text-[#2E6B4E] font-mono">✓ Saved</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedLeadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setSelectedLeadModal(null)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedLeadModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF7F2] text-[#141210] border border-[#E5DEC9]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                Lead Inspection Docket
              </span>
              <h3 className="text-2xl font-bold text-[#141210]">
                {selectedLeadModal.client_name}
              </h3>
              {selectedLeadModal.company_name && (
                <p className="text-sm text-[#5C5449]">
                  Organization: {selectedLeadModal.company_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-[#FAF7F2] p-4 rounded-xl border border-[#E5DEC9]">
              <div>
                <span className="text-[#877D70]">Direct Phone:</span>
                <p className="font-mono font-semibold text-[#141210] mt-0.5">
                  {selectedLeadModal.phone}
                </p>
              </div>
              <div>
                <span className="text-[#877D70]">Official Email:</span>
                <p className="font-mono font-semibold text-[#141210] mt-0.5">
                  {selectedLeadModal.email}
                </p>
              </div>
              <div>
                <span className="text-[#877D70]">Inquiry Wing:</span>
                <p className="text-[#3A2008] font-semibold mt-0.5 capitalize">
                  {selectedLeadModal.inquiry_type.replace("_", " ")}
                </p>
              </div>
              <div>
                <span className="text-[#877D70]">Target Date:</span>
                <p className="text-[#141210] mt-0.5">
                  {formatDate(selectedLeadModal.event_date || undefined)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-[#5C5449]">
                Full Project Requirements Brief
              </h4>
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] leading-relaxed whitespace-pre-wrap">
                {selectedLeadModal.details}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
