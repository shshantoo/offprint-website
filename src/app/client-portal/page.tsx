import React, { Suspense } from "react";
import type { Metadata } from "next";
import ClientPortalClient from "@/components/client-portal/ClientPortalClient";

export const metadata: Metadata = {
  title: "Client Portal • OFFPRINT (অফপ্রিন্ট)",
  description:
    "View, reschedule, or cancel your OFFPRINT photography appointments and manage your client profile.",
};

export default function ClientPortalPage() {
  return (
    <div className="py-12 md:py-20 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] p-12 text-center text-sm text-[#5C5449]">
              Loading OFFPRINT Client Portal...
            </div>
          }
        >
          <ClientPortalClient />
        </Suspense>
      </div>
    </div>
  );
}

