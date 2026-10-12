"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import { leadFormSchema, LeadFormData } from "@/lib/validations";
import { submitLead } from "@/lib/data-service";
import { InquiryType } from "@/types/database";
import {
  Video,
  Printer,
  Sparkles,
  Phone,
  Mail,
  Building,
  User,
  Calendar,
  Layers,
  Send,
  CheckCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface InteractiveQuoteBuilderProps {
  defaultType?: InquiryType;
  defaultScope?: string;
}

export default function InteractiveQuoteBuilder({
  defaultType = "event_coverage",
  defaultScope = "",
}: InteractiveQuoteBuilderProps) {
  const [inquiryType, setInquiryType] = useState<InquiryType>(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema) as any,
    defaultValues: {
      inquiry_type: defaultType,
      details: defaultScope ? `Interested in scope: ${defaultScope}` : "",
      estimated_qty: "",
      client_name: "",
      company_name: "",
      email: "",
      phone: "+880 ",
    },
  });

  useEffect(() => {
    setValue("inquiry_type", inquiryType);
  }, [inquiryType, setValue]);

  const onSubmit = async (data: LeadFormData) => {
    try {
      setIsSubmitting(true);
      const newLead = await submitLead({
        client_name: data.client_name,
        company_name: data.company_name || null,
        email: data.email,
        phone: data.phone,
        inquiry_type: data.inquiry_type,
        details: data.details,
        estimated_qty: data.estimated_qty || null,
        event_date: data.event_date || null,
      });

      // Fire celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#c98a4b", "#4a2805", "#e5a96b", "#f5f0eb"],
      });

      setSubmittedLeadId(newLead.id);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Submission failed. Please reach out to our desk directly at +880 1700-000000.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedLeadId(null);
    reset({
      inquiry_type: inquiryType,
      details: "",
      estimated_qty: "",
      client_name: "",
      company_name: "",
      email: "",
      phone: "+880 ",
    });
  };

  return (
    <section className="py-24 bg-[#0a0a0a] relative border-t border-[#26201b]" id="quote">
      {/* Background Ambience */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#4a2805]/20 blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141210] border border-[#3d3126] text-xs font-mono text-[#c98a4b]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Project Desk</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#f5f0eb] tracking-tight">
            Draft Your Project Inquiry
          </h2>
          <p className="text-sm text-[#a89f91]">
            We operate on a strictly bespoke, offline quotation model. Submit your specifications below—our Dhaka corporate team will inspect the scope and reach out via direct call.
          </p>
        </div>

        {/* Success Modal / State */}
        {submittedLeadId ? (
          <div className="rounded-3xl bg-[#141210] border border-[#c98a4b]/60 p-8 sm:p-12 text-center space-y-6 shadow-2xl shadow-[#4a2805]/30 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-[#4a2805]/40 border border-[#c98a4b] text-[#c98a4b] flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#c98a4b]">
                Inquiry Logged Successfully
              </span>
              <h3 className="text-2xl font-bold text-[#f5f0eb]">
                Your Draft is with Our Senior Producer
              </h3>
              <p className="text-xs sm:text-sm text-[#a89f91] leading-relaxed">
                Reference ID: <span className="font-mono text-[#f5f0eb] bg-[#0a0a0a] px-2 py-0.5 rounded border border-[#26201b]">{submittedLeadId}</span>
              </p>
              <p className="text-xs text-[#a89f91] pt-2">
                Our representative will verify availability and contact your provided telephone number within <strong className="text-[#f5f0eb]">2 to 4 business hours</strong> with a detailed proposal.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#1c1815] hover:bg-[#26201b] text-[#f5f0eb] border border-[#26201b] transition-all"
              >
                Submit Another Inquiry
              </button>
              <a
                href="tel:+8801700000000"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#c98a4b] text-black hover:bg-[#e5a96b] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Urgent? Call Desk Directly</span>
              </a>
            </div>
          </div>
        ) : (
          /* Main Interactive Form Card */
          <div className="rounded-3xl bg-[#141210] border border-[#26201b] shadow-2xl p-6 sm:p-10 relative overflow-hidden">
            
            {/* Top Dual Wing Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <button
                type="button"
                onClick={() => setInquiryType("event_coverage")}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  inquiryType === "event_coverage"
                    ? "bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b] shadow-lg shadow-[#4a2805]/40"
                    : "bg-[#0a0a0a] text-[#a89f91] hover:text-[#f5f0eb] border border-[#26201b]"
                }`}
              >
                <Video className="w-4 h-4 text-[#c98a4b]" />
                <span>Media & Event Coverage Wing</span>
              </button>

              <button
                type="button"
                onClick={() => setInquiryType("physical_merch")}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  inquiryType === "physical_merch"
                    ? "bg-[#4a2805] text-[#f5f0eb] border border-[#c98a4b] shadow-lg shadow-[#4a2805]/40"
                    : "bg-[#0a0a0a] text-[#a89f91] hover:text-[#f5f0eb] border border-[#26201b]"
                }`}
              >
                <Printer className="w-4 h-4 text-[#c98a4b]" />
                <span>Physical Print & Merch Wing</span>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <input type="hidden" {...register("inquiry_type")} value={inquiryType} />

              {/* Dynamic Context Notice */}
              <div className="p-4 rounded-xl bg-[#0a0a0a]/80 border border-[#26201b] flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#c98a4b] shrink-0 mt-0.5" />
                <div className="text-xs text-[#a89f91] space-y-1">
                  <span className="font-semibold text-[#f5f0eb]">
                    {inquiryType === "event_coverage"
                      ? "Media Production Specification Protocol"
                      : "Physical Merchandise Material Specification"}
                  </span>
                  <p>
                    {inquiryType === "event_coverage"
                      ? "Please outline event dates, multi-camera needs (e.g. 4K stage recording, drone, instant photo delivery), and approximate attendance."
                      : "Please specify required items (e.g. 650 GSM Debossed Cards, Swag Kits, Laser Pens), estimated quantities, and delivery milestones."}
                  </p>
                </div>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#f5f0eb] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>Your Full Name *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tanvir Ahmed"
                    {...register("client_name")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] transition-colors"
                  />
                  {errors.client_name && (
                    <span className="text-[11px] text-red-400">{errors.client_name.message}</span>
                  )}
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#f5f0eb] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>Company / Organization</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Beximco Innovations Ltd."
                    {...register("company_name")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] transition-colors"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#f5f0eb] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>Direct Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+880 1711-223344"
                    {...register("phone")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] transition-colors font-mono"
                  />
                  {errors.phone && (
                    <span className="text-[11px] text-red-400">{errors.phone.message}</span>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#f5f0eb] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>Official Email *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="tanvir@company.com"
                    {...register("email")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] transition-colors"
                  />
                  {errors.email && (
                    <span className="text-[11px] text-red-400">{errors.email.message}</span>
                  )}
                </div>
              </div>

              {/* Dynamic Scope Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Event Date or Milestone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#f5f0eb] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>{inquiryType === "event_coverage" ? "Event Date (if fixed)" : "Required Delivery Date"}</span>
                  </label>
                  <input
                    type="date"
                    {...register("event_date")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] transition-colors"
                  />
                </div>

                {/* Estimated Scale / Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#f5f0eb] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#c98a4b]" />
                    <span>{inquiryType === "event_coverage" ? "Estimated Scale (Attendees / Days)" : "Estimated Quantity / Sets"}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={inquiryType === "event_coverage" ? "e.g. 2 Days, 500 Attendees" : "e.g. 250 Swag kits, 500 Cards"}
                    {...register("estimated_qty")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] transition-colors"
                  />
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#f5f0eb]">
                  Project Requirements & Detailed Notes *
                </label>
                <textarea
                  rows={4}
                  placeholder={
                    inquiryType === "event_coverage"
                      ? "Tell us about the venue, filming deliverables (e.g. 4K full keynote, 90-sec highlight reel, drone permits), and special instructions..."
                      : "Describe your paper preferences, debossing depth, foam cutouts, laser engraving texts, or brand branding guidelines..."
                  }
                  {...register("details")}
                  className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#26201b] text-sm text-[#f5f0eb] focus:outline-none focus:border-[#c98a4b] transition-colors resize-none leading-relaxed"
                />
                {errors.details && (
                  <span className="text-[11px] text-red-400">{errors.details.message}</span>
                )}
              </div>

              {/* Submit CTA & Offline Assurance */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#26201b]">
                <div className="flex items-center gap-2 text-xs text-[#696257]">
                  <Clock className="w-3.5 h-3.5 text-[#c98a4b]" />
                  <span>Prompt response within 2-4 business hours</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-[#4a2805] to-[#6e3c08] hover:from-[#6e3c08] hover:to-[#c98a4b] text-[#f5f0eb] hover:text-black border border-[#c98a4b]/50 shadow-xl shadow-[#4a2805]/40 transition-all duration-300 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Transmitting Scope..." : "Submit Project Draft"}</span>
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </section>
  );
}
