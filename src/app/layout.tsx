import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OFFPRINT (অফপ্রিন্ট) • Corporate Media & Bespoke Print Agency",
  description:
    "Govt. Registered corporate agency in Bangladesh (Est. Sep 2025). Specializing in corporate summits, brand documentaries, executive headshots, and luxury bespoke merchandise & physical print solutions.",
  keywords: [
    "OFFPRINT",
    "অফপ্রিন্ট",
    "Corporate Summit Coverage Dhaka",
    "Documentary Production Bangladesh",
    "Executive Headshots Dhaka",
    "Corporate Swag Merchandise Bangladesh",
    "Bespoke Business Cards Dhaka",
    "Media Production Agency",
  ],
  authors: [{ name: "OFFPRINT Agency" }],
  openGraph: {
    title: "OFFPRINT (অফপ্রিন্ট) • Media & Physical Print Solutions",
    description:
      "Govt. Registered corporate production & luxury print merchandise agency in Bangladesh.",
    url: "https://offprint.agency",
    siteName: "OFFPRINT",
    locale: "en_BD",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#f5f0eb] selection:bg-[#c98a4b] selection:text-black">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
