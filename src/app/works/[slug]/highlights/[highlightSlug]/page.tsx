import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, MapPin } from "lucide-react";
import { fetchEventHighlightBySlug, fetchSliderSettings } from "@/lib/data-service";
import EventHeroSlideshow from "@/components/works/EventHeroSlideshow";
import MinimalistPhotoGallery from "@/components/works/MinimalistPhotoGallery";

interface HighlightPageProps {
  params: Promise<{ slug: string; highlightSlug: string }>;
}

export async function generateMetadata({ params }: HighlightPageProps): Promise<Metadata> {
  const { slug, highlightSlug } = await params;
  const result = await fetchEventHighlightBySlug(slug, highlightSlug);
  if (!result) {
    return { title: "Highlight Not Found • OFFPRINT" };
  }
  return {
    title: `${result.highlight.title} • ${result.event.title} • OFFPRINT`,
    description: result.highlight.short_description,
  };
}

export default async function EventHighlightPage({ params }: HighlightPageProps) {
  const { slug, highlightSlug } = await params;
  const [result, sliderSettings] = await Promise.all([
    fetchEventHighlightBySlug(slug, highlightSlug),
    fetchSliderSettings(),
  ]);

  if (!result) {
    notFound();
  }

  const { event, highlight } = result;

  return (
    <div className="min-h-screen bg-[#141210] text-[#FAF7F2] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-16">
        {/* Navigation & Header */}
        <div className="space-y-6">
          <Link
            href={`/works/${event.slug}`}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#D9A673] hover:text-[#FAF7F2] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {event.title}</span>
          </Link>

          <div className="border-b border-[#2E2822] pb-8 space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#877D70]">
              <span className="flex items-center gap-1.5 text-[#D9A673] font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Event Highlight
              </span>
              <span>•</span>
              <span className="text-[#FAF7F2]/80 font-medium">{event.title}</span>
              {event.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#877D70]">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#FAF7F2]">
              {highlight.title}
            </h1>

            <p className="text-base sm:text-lg text-[#FAF7F2]/80 leading-relaxed">
              {highlight.short_description}
            </p>
          </div>
        </div>

        {/* Hero Slideshow for Highlight */}
        <EventHeroSlideshow
          slides={highlight.hero_slides}
          fallbackPhotos={highlight.photos || []}
          coverUrl={highlight.cover_image_url}
          title={highlight.title}
          category="Event Highlight"
          sliderConfig={sliderSettings.event_hero_slider}
        />

        {/* Minimalist Animated Photography Gallery for Highlight */}
        <div>
          <MinimalistPhotoGallery
            photos={highlight.photos || []}
            title={`${highlight.title} — Highlight Series`}
            subtitle="Curated Photography"
          />
        </div>
      </div>
    </div>
  );
}
