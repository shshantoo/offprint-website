import React from "react";
import type { Metadata } from "next";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import LeadsCRMClient from "@/components/admin/LeadsCRMClient";

export const metadata: Metadata = {
  title: "CRM Leads Pipeline • OFFPRINT Admin",
};

export default function AdminLeadsPage() {
  return (
    <AdminAuthGuard>
      <LeadsCRMClient />
    </AdminAuthGuard>
  );
}
