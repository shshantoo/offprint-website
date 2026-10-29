"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building,
  GraduationCap,
  X,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { formatDhakaDateTime } from "@/lib/booking/timezone";

interface RegisteredUser {
  id: string;
  email: string;
  username?: string | null;
  full_name: string;
  phone: string;
  company_or_institution?: string | null;
  student_id?: string | null;
  role: "client" | "admin";
  created_at?: string;
  bookings_count: number;
  total_spent: number;
  last_booking_at: string | null;
}

interface UserDetailDocket {
  user: RegisteredUser;
  bookings: any[];
}

function formatSpendingBDT(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "BDT 0";
  const num = Number(amount);
  if (isNaN(num)) return "BDT 0";
  return `BDT ${num.toLocaleString()}`;
}

export default function RegisteredUsersAdminClient() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUserDocket, setSelectedUserDocket] = useState<UserDetailDocket | null>(null);
  const [_loadingDocket, setLoadingDocket] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
      }
    } catch (err) {
      console.error("Failed to load registered users:", err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleInspectUser = async (userId: string) => {
    try {
      setLoadingDocket(true);
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedUserDocket(json.data);
      }
    } catch (err) {
      console.error("Failed to load user booking history:", err);
    } finally {
      setLoadingDocket(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35]">
            Client Accounts &amp; Identity Management
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#141210]">
            Registered Users ({users.length})
          </h2>
          <p className="text-xs text-[#5C5449]">
            Authenticated clients and studio administrators registered in the OFFPRINT system.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F4EFE6] text-xs font-semibold text-[#141210] border border-[#E5DEC9]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#A66D35] ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#877D70]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, ID..."
            className="w-full rounded-xl border border-[#E5DEC9] bg-[#FFFFFF] pl-9 pr-3.5 py-2.5 text-xs text-[#141210] placeholder-[#877D70] focus:border-[#3A2008] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-[#E5DEC9] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#141210] focus:border-[#3A2008] focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="client">Clients Only</option>
            <option value="admin">Administrators Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#141210]">
            <thead className="bg-[#FAF7F2] border-b border-[#E5DEC9] font-semibold text-[#5C5449] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User &amp; Contact</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Academic / Company</th>
                <th className="py-3.5 px-4">Bookings</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DEC9]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#5C5449]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A66D35]" />
                    Loading registered user profiles...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#5C5449]">
                    No registered users match the search filter.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF7F2]/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#141210]">
                        {u.full_name || "Client"}
                        {u.username && (
                          <span className="ml-1.5 font-mono text-[11px] text-[#A66D35]">
                            @{u.username}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#5C5449] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-[#877D70]" />
                        <span>{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="text-[11px] font-mono text-[#877D70] flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#877D70]" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          u.role === "admin"
                            ? "bg-[#EEF7F2] text-[#2E6B4E] border border-[#2E6B4E]/30"
                            : "bg-[#F4EFE6] text-[#3A2008] border border-[#D5CCB4]"
                        }`}
                      >
                        {u.role === "admin" && <ShieldCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.company_or_institution ? (
                        <div className="flex items-center gap-1.5 text-[#141210] font-medium">
                          <Building className="w-3 h-3 text-[#A66D35] shrink-0" />
                          <span>{u.company_or_institution}</span>
                        </div>
                      ) : (
                        <span className="text-[#877D70]">—</span>
                      )}
                      {u.student_id && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#5C5449] mt-0.5">
                          <GraduationCap className="w-3 h-3 text-[#A66D35] shrink-0" />
                          <span>ID: {u.student_id}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9] font-bold text-[#3A2008]">
                        {u.bookings_count ?? 0} booking{(u.bookings_count ?? 0) === 1 ? "" : "s"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#141210]">
                      {formatSpendingBDT(u.total_spent)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#5C5449]">
                      {u.last_booking_at ? formatDhakaDateTime(u.last_booking_at) : "No bookings"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectUser(u.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs font-semibold text-[#3A2008] hover:bg-[#FFFFFF]"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details & Booking History Modal */}
      {selectedUserDocket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141210]/70 backdrop-blur-xs"
          onClick={() => setSelectedUserDocket(null)}
        >
          <div
            className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A66D35]">
                  Client Dossier &amp; Booking History
                </span>
                <h3 className="text-xl font-bold text-[#141210]">
                  {selectedUserDocket.user?.full_name || selectedUserDocket.user?.email || "Registered Client"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDocket(null)}
                className="p-2 rounded-full bg-[#FAF7F2] border border-[#E5DEC9] text-[#5C5449] hover:text-[#141210]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DEC9] text-xs">
              <div>
                <span className="text-[#877D70] block">Email Address</span>
                <strong className="text-[#141210] font-mono">{selectedUserDocket.user?.email || "—"}</strong>
              </div>
              <div>
                <span className="text-[#877D70] block">Mobile Phone</span>
                <strong className="text-[#141210] font-mono">{selectedUserDocket.user?.phone || "Not Set"}</strong>
              </div>
              <div>
                <span className="text-[#877D70] block">Institution / Student ID</span>
                <strong className="text-[#141210]">
                  {selectedUserDocket.user?.company_or_institution || "—"}{" "}
                  {selectedUserDocket.user?.student_id ? `(${selectedUserDocket.user.student_id})` : ""}
                </strong>
              </div>
            </div>

            {/* Bookings Docket */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#141210] flex items-center justify-between">
                <span>Reservation History ({(selectedUserDocket.bookings || []).length})</span>
                <span className="font-mono text-xs text-[#A66D35]">
                  Total Spent: {formatSpendingBDT(selectedUserDocket.user?.total_spent)}
                </span>
              </h4>

              {(selectedUserDocket.bookings || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5C5449] rounded-2xl border border-dashed border-[#E5DEC9] bg-[#FAF7F2]">
                  This client has not created any bookings yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(selectedUserDocket.bookings || []).map((b: any) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl border border-[#E5DEC9] bg-[#FFFFFF] hover:border-[#A66D35] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#3A2008]">{b.booking_ref}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#FAF7F2] border border-[#E5DEC9]">
                            {b.booking_type}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                              b.status === "confirmed"
                                ? "bg-[#EEF7F2] text-[#2E6B4E]"
                                : b.status === "completed"
                                ? "bg-[#F4EFE6] text-[#3A2008]"
                                : "bg-[#FFFBEB] text-[#B86B19]"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <p className="font-bold text-[#141210]">{b.service_or_event_title}</p>
                        <p className="text-[#5C5449] text-[11px] font-mono">
                          {b.start_at ? formatDhakaDateTime(b.start_at) : "Date unassigned"} • {b.duration_mins || 30} mins
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div className="font-mono font-bold text-sm text-[#141210]">
                          {formatSpendingBDT(b.total_price)}
                        </div>
                        {b.delivery_status && (
                          <div className="mt-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                                b.delivery_status === "delivered"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              Delivery: {b.delivery_status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

