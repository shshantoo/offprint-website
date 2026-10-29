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
  Clock,
  ShieldCheck,
} from "lucide-react";

interface InteractiveQuoteBuilderProps {
  defaultType?: InquiryType;
  defaultScope?: string;
  show?: boolean;
}

export default function InteractiveQuoteBuilder({
  defaultType = "event_coverage",
  defaultScope = "",
  show = true,
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

  if (show === false) return null;

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

      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        colors: ["#3A2008", "#A66D35", "#D9A673", "#5C4028"],
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
    <section className="py-24 bg-[#F4EFE6]/50 relative border-t border-[#E5DEC9]" id="quote">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DEC9] text-xs font-mono text-[#A66D35]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Project & Merch Desk</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl font-normal text-[#141210] tracking-tight">
            Draft Your Custom Project Inquiry
          </h2>
          <p className="text-sm text-[#5C5449]">
            Need a multi-day production proposal or bulk corporate print collateral? Submit your specifications below and our Dhaka production team will respond within 2 to 4 business hours.
          </p>
        </div>

        {/* Success Modal / State */}
        {submittedLeadId ? (
          <div className="rounded-3xl bg-[#FFFFFF] border border-[#D5CCB4] p-8 sm:p-12 text-center space-y-6 shadow-md animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-[#FAF7F2] border border-[#A66D35] text-[#3A2008] flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-[#A66D35]" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#A66D35]">
                Inquiry Logged Successfully
              </span>
              <h3 className="text-2xl font-bold text-[#141210]">
                Your Brief is with Our Senior Producer
              </h3>
              <p className="text-xs sm:text-sm text-[#5C5449] leading-relaxed">
                Reference ID:{" "}
                <span className="font-mono text-[#141210] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E5DEC9]">
                  {submittedLeadId}
                </span>
              </p>
              <p className="text-xs text-[#5C5449] pt-2">
                Our representative will verify availability and contact your provided telephone number within{" "}
                <strong className="text-[#141210]">2 to 4 business hours</strong> with a detailed proposal.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#FAF7F2] hover:bg-[#F4EFE6] text-[#141210] border border-[#D5CCB4] transition-all"
              >
                Submit Another Inquiry
              </button>
              <a
                href="tel:+8801700000000"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#3A2008] text-[#FAF7F2] hover:bg-[#5C4028] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Urgent? Call Desk Directly</span>
              </a>
            </div>
          </div>
        ) : (
          /* Main Interactive Form Card */
          <div className="rounded-3xl bg-[#FFFFFF] border border-[#E5DEC9] shadow-sm p-6 sm:p-10 relative overflow-hidden">
            {/* Top Dual Wing Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <button
                type="button"
                onClick={() => setInquiryType("event_coverage")}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  inquiryType === "event_coverage"
                    ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                    : "bg-[#FAF7F2] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
                }`}
              >
                <Video className="w-4 h-4 text-[#D9A673]" />
                <span>Media & Event Coverage Wing</span>
              </button>

              <button
                type="button"
                onClick={() => setInquiryType("physical_merch")}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  inquiryType === "physical_merch"
                    ? "bg-[#3A2008] text-[#FAF7F2] border border-[#3A2008] shadow-xs"
                    : "bg-[#FAF7F2] text-[#5C5449] hover:text-[#141210] border border-[#E5DEC9]"
                }`}
              >
                <Printer className="w-4 h-4 text-[#D9A673]" />
                <span>Physical Print & Merch Wing</span>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <input type="hidden" {...register("inquiry_type")} value={inquiryType} />

              {/* Dynamic Context Notice */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#A66D35] shrink-0 mt-0.5" />
                <div className="text-xs text-[#5C5449] space-y-1">
                  <span className="font-semibold text-[#141210]">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Your Full Name *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tanvir Ahmed"
                    {...register("client_name")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] transition-colors"
                  />
                  {errors.client_name && (
                    <span className="text-[11px] text-red-600">{errors.client_name.message}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Company / Organization</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Beximco Innovations Ltd."
                    {...register("company_name")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Direct Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+880 1711-223344"
                    {...register("phone")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] transition-colors font-mono"
                  />
                  {errors.phone && (
                    <span className="text-[11px] text-red-600">{errors.phone.message}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>Official Email *</span>
                  </label>
                  <input
                    type="email"
                    placeholder="tanvir@company.com"
                    {...register("email")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] transition-colors"
                  />
                  {errors.email && (
                    <span className="text-[11px] text-red-600">{errors.email.message}</span>
                  )}
                </div>
              </div>

              {/* Dynamic Scope Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>{inquiryType === "event_coverage" ? "Event Date (if fixed)" : "Required Delivery Date"}</span>
                  </label>
                  <input
                    type="date"
                    {...register("event_date")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#141210] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#A66D35]" />
                    <span>{inquiryType === "event_coverage" ? "Estimated Scale (Attendees / Days)" : "Estimated Quantity / Sets"}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={inquiryType === "event_coverage" ? "e.g. 2 Days, 500 Attendees" : "e.g. 250 Swag kits, 500 Cards"}
                    {...register("estimated_qty")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] transition-colors"
                  />
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#141210]">
                  Project Requirements & Detailed Notes *
                </label>
                <textarea
                  rows={4}
                  placeholder={
                    inquiryType === "event_coverage"
                      ? "Tell us about the venue, filming deliverables (e.g. 4K full keynote, 90-sec highlight reel, drone permits), and special instructions..."
                      : "Describe your paper preferences, debossing depth, foam cutouts, laser engraving texts, or brand guidelines..."
                  }
                  {...register("details")}
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E5DEC9] text-sm text-[#141210] focus:outline-none focus:border-[#3A2008] transition-colors resize-none leading-relaxed"
                />
                {errors.details && (
                  <span className="text-[11px] text-red-600">{errors.details.message}</span>
                )}
              </div>

              {/* Submit CTA & Offline Assurance */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E5DEC9]">
                <div className="flex items-center gap-2 text-xs text-[#5C5449]">
                  <Clock className="w-3.5 h-3.5 text-[#A66D35]" />
                  <span>Prompt response within 2-4 business hours</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#3A2008] hover:bg-[#5C4028] text-[#FAF7F2] shadow-sm transition-all duration-200 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Transmitting Scope..." : "Submit Project Brief"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
