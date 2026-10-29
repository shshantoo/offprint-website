import React from "react";
import HeroSection from "@/components/home/HeroSection";
import HorizontalTicker from "@/components/home/HorizontalTicker";
import FlagshipShowcase from "@/components/home/FlagshipShowcase";
import EditorialTestimonials from "@/components/home/EditorialTestimonials";
import ServicesBento from "@/components/home/ServicesBento";
import PrintSolutionsBridge from "@/components/home/PrintSolutionsBridge";
import InteractiveQuoteBuilder from "@/components/home/InteractiveQuoteBuilder";
import CinematicCta from "@/components/home/CinematicCta";
import {
  fetchFlagshipProjects,
  fetchHeroSlides,
  fetchHomepageConfig,
  fetchTestimonials,
  fetchSiteSettings,
} from "@/lib/data-service";

export const revalidate = 0; // Ensure fresh CMS content is immediately visible

export default async function HomePage() {
  const [heroSlides, homepageConfig, flagshipProjects, testimonials, siteSettings] =
    await Promise.all([
      fetchHeroSlides(false),
      fetchHomepageConfig(),
      fetchFlagshipProjects(),
      fetchTestimonials(false),
      fetchSiteSettings(),
    ]);

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection slides={heroSlides} config={homepageConfig} />
      <HorizontalTicker items={homepageConfig.ticker_items} show={homepageConfig.show_ticker} />
      <FlagshipShowcase
        initialProjects={flagshipProjects}
        heading={homepageConfig.flagship_heading}
        subheading={homepageConfig.flagship_subheading}
        show={homepageConfig.show_flagship}
      />
      <EditorialTestimonials
        testimonials={testimonials}
        show={homepageConfig.show_testimonials}
      />
      <ServicesBento
        heading={homepageConfig.services_heading}
        subheading={homepageConfig.services_subheading}
        show={homepageConfig.show_services}
      />
      <PrintSolutionsBridge show={homepageConfig.show_print_bridge} />
      <InteractiveQuoteBuilder show={homepageConfig.show_quote_builder} />
      <CinematicCta
        config={homepageConfig}
        general={siteSettings.general}
        show={homepageConfig.show_closing_cta}
      />
    </div>
  );
}
