import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
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

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OFFPRINT (অফপ্রিন্ট) • Photography Studio, Convocation Portraits & Print Agency",
  description:
    "Editorial photography studio and print atelier in Dhaka, Bangladesh. Book IUB 27th Convocation photography, executive portraits, corporate summits, documentaries, and bespoke print collateral.",
  keywords: [
    "OFFPRINT",
    "অফপ্রিন্ট",
    "IUB 27th Convocation Photography",
    "Photography Booking Dhaka",
    "Corporate Summit Coverage Dhaka",
    "Executive Headshots Dhaka",
    "Documentary Production Bangladesh",
    "Bespoke Business Cards Dhaka",
  ],
  authors: [{ name: "OFFPRINT Agency" }],
  openGraph: {
    title: "OFFPRINT (অফপ্রিন্ট) • Photography Studio & Bespoke Print Solutions",
    description:
      "Editorial photography studio and fine-art print atelier in Dhaka, Bangladesh.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-[#141210] selection:bg-[#3A2008] selection:text-[#FAF7F2]">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
