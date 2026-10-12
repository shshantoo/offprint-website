import React from "react";
import HeroSection from "@/components/home/HeroSection";
import FlagshipShowcase from "@/components/home/FlagshipShowcase";
import ServicesBento from "@/components/home/ServicesBento";
import PrintSolutionsBridge from "@/components/home/PrintSolutionsBridge";
import InteractiveQuoteBuilder from "@/components/home/InteractiveQuoteBuilder";
import { fetchFlagshipProjects } from "@/lib/data-service";

export default async function HomePage() {
  const flagshipProjects = await fetchFlagshipProjects();

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <FlagshipShowcase initialProjects={flagshipProjects} />
      <ServicesBento />
      <PrintSolutionsBridge />
      <InteractiveQuoteBuilder />
    </div>
  );
}
