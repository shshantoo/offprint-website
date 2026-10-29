import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building,
  Sparkles,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { fetchEventArchiveBySlug } from "@/lib/data-service";
import EventHeroSlideshow from "@/components/works/EventHeroSlideshow";
import MinimalistPhotoGallery from "@/components/works/MinimalistPhotoGallery";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventArchiveBySlug(slug);
  if (!event) {
    return { title: "Event Archive Not Found • OFFPRINT" };
  }
  return {
    title: `${event.title} • OFFPRINT Work Archive`,
    description: event.short_description,
  };
}

export default async function EventArchivePage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await fetchEventArchiveBySlug(slug);

  if (!event) {
    notFound();
  }

  const publishedHighlights = event.highlights?.filter((h) => h.is_published) || [];

  return (
    <div className="min-h-screen bg-[#141210] text-[#FAF7F2] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 md:space-y-18">
        {/* ================================================================= */}
        {/* SECTION 1: EVENT INTRODUCTION & HERO SLIDESHOW */}
        {/* ================================================================= */}
        <div className="space-y-8">
          {/* Navigation & Header */}
          <div className="space-y-6">
            <Link
              href="/works"
              className="inline-flex items-center gap-2 text-xs font-mono text-[#D9A673] hover:text-[#FAF7F2] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Works Archive</span>
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#2E2822] pb-8">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#877D70]">
                  <span className="flex items-center gap-1.5 text-[#D9A673]">
                    <Calendar className="h-3.5 w-3.5" />
                    {event.event_date}
                  </span>
                  {event.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#877D70]" />
                        {event.location}
                      </span>
                    </>
                  )}
                  {event.client_or_institution && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-[#877D70]" />
                        {event.client_or_institution}
                      </span>
                    </>
                  )}
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#FAF7F2]">
                  {event.title}
                </h1>

                <p className="text-base sm:text-lg text-[#FAF7F2]/80 leading-relaxed max-w-2xl">
                  {event.short_description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start lg:self-auto">
                {(() => {
                  const visibleBookings = (event.related_booking_events || []).filter(
                    (b) => b.is_visible_on_booking_page !== false && b.status === "published"
                  );

                  if (visibleBookings.length > 0) {
                    return visibleBookings.map((b) => {
                      if (b.is_booking_enabled) {
                        return (
                          <Link
                            key={b.id}
                            href={`/book/special/${b.slug}`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#3A2008] hover:bg-[#5C4028] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#FAF7F2] transition-colors border border-[#D9A673]/30 shadow-lg"
                          >
                            <BookOpen className="h-4 w-4 text-[#D9A673]" />
                            <span>Reserve Session: {b.title}</span>
                          </Link>
                        );
                      }
                      return (
                        <div
                          key={b.id}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#1F1B17] px-5 py-3 text-xs font-mono text-[#D9A673] border border-[#2E2822]"
                        >
                          <BookOpen className="h-4 w-4 text-[#877D70]" />
                          <span>Booking Paused: {b.title}</span>
                        </div>
                      );
                    });
                  }

                  return (
                    <Link
                      href="/book"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#3A2008] hover:bg-[#5C4028] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#FAF7F2] transition-colors border border-[#D9A673]/30 shadow-lg"
                    >
                      <BookOpen className="h-4 w-4 text-[#D9A673]" />
                      <span>Book Studio Coverage</span>
                    </Link>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Cinematic Hero Slideshow */}
          <EventHeroSlideshow
            slides={event.hero_slides}
            fallbackPhotos={event.photos || []}
            coverUrl={event.cover_image_url}
            title={event.title}
            category={event.category}
            eventDate={event.event_date}
          />
        </div>

        {/* ================================================================= */}
        {/* SECTION 2: EVENT HIGHLIGHTS (EXCLUSIVELY FOR THIS EVENT) */}
        {/* If 0 published highlights, this section is completely omitted */}
        {/* ================================================================= */}
        {publishedHighlights.length > 0 && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#2E2822] pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#D9A673] flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Curated Sub-Collections
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF7F2]">
                  Event Highlights
                </h2>
              </div>
              <span className="text-xs font-mono text-[#877D70]">
                {publishedHighlights.length} {publishedHighlights.length === 1 ? "Highlight" : "Highlights"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedHighlights.map((hl) => (
                <Link
                  key={hl.id}
                  href={`/works/${event.slug}/highlights/${hl.slug}`}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#2E2822] bg-[#1F1B17] p-5 transition-all duration-300 hover:border-[#D9A673]/60 hover:shadow-xl hover:shadow-[#D9A673]/5"
                >
                  <div className="space-y-3.5">
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#141210]">
                      <Image
                        src={hl.cover_image_url}
                        alt={hl.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-[#FAF7F2] group-hover:text-[#D9A673] transition-colors">
                        {hl.title}
                      </h3>
                      <p className="text-xs text-[#FAF7F2]/70 line-clamp-2 leading-relaxed">
                        {hl.short_description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#D9A673] border-t border-[#2E2822] pt-3">
                    <span>View Highlight Gallery</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 3: MAIN EVENT PHOTOGRAPH GALLERY */}
        {/* ================================================================= */}
        <section className="space-y-4 pt-2">
          <MinimalistPhotoGallery
            photos={event.photos || []}
            title={`${event.title} — Photographic Gallery`}
            subtitle="Complete Event Collection"
          />
        </section>

        {/* ================================================================= */}
        {/* SECTION 4: EDITORIAL STATEMENT & CONTEXT (IF PROVIDED) */}
        {/* ================================================================= */}
        {event.full_description && (
          <div className="rounded-3xl border border-[#2E2822] bg-[#1F1B17] p-8 md:p-10 max-w-4xl space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#D9A673] block">
              Editorial Note &amp; Context
            </span>
            <p className="text-sm md:text-base text-[#FAF7F2]/80 leading-relaxed whitespace-pre-line">
              {event.full_description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
