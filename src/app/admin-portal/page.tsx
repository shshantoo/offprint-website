import React, { Suspense } from "react";
import type { Metadata } from "next";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import AdminPortalClient from "@/components/admin/AdminPortalClient";

export const metadata: Metadata = {
  title: "Admin Operations & CMS • OFFPRINT (অফপ্রিন্ট)",
  description:
    "Authorized administrative portal for OFFPRINT bookings, schedules, Google integrations, and content management.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPortalPage() {
  return (
    <AdminAuthGuard>
      <Suspense
        fallback={
          <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center text-xs text-[#5C5449]">
            Loading OFFPRINT Admin Operations Hub...
          </div>
        }
      >
        <AdminPortalClient />
      </Suspense>
    </AdminAuthGuard>
  );
}

