import React from "react";
import type { Metadata } from "next";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import PortfolioCMSClient from "@/components/admin/PortfolioCMSClient";

export const metadata: Metadata = {
  title: "Portfolio CMS • OFFPRINT Admin",
};

export default function AdminPortfolioPage() {
  return (
    <AdminAuthGuard>
      <PortfolioCMSClient />
    </AdminAuthGuard>
  );
}
