import React from "react";
import type { Metadata } from "next";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import ProductsCMSClient from "@/components/admin/ProductsCMSClient";

export const metadata: Metadata = {
  title: "Products CMS • OFFPRINT Admin",
};

export default function AdminProductsPage() {
  return (
    <AdminAuthGuard>
      <ProductsCMSClient />
    </AdminAuthGuard>
  );
}
