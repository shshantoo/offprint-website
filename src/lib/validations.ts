import { z } from "zod";

export const leadFormSchema = z.object({
  client_name: z.string().min(2, "Please enter your full name or representative name"),
  company_name: z.string().optional(),
  email: z.string().email("Please enter a valid business email address"),
  phone: z.string().min(8, "Please enter a valid contact phone number (e.g. +880 17...)"),
  inquiry_type: z.enum(["event_coverage", "physical_merch"]),
  details: z.string().min(10, "Please outline your project scope, vision or custom specifications"),
  estimated_qty: z.string().optional(),
  event_date: z.string().optional(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

export const portfolioFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  client_name: z.string().min(2, "Client name is required"),
  category: z.enum([
    "corporate_summit",
    "documentary",
    "headshot",
    "workshop",
    "wedding",
  ]),
  is_flagship: z.boolean().default(false),
  thumbnail_url: z.string().url("Valid thumbnail image URL required"),
  gallery_urls: z.string().optional(),
  video_url: z.string().optional(),
  completed_date: z.string().optional(),
  description: z.string().optional(),
});

export type PortfolioFormData = z.infer<typeof portfolioFormSchema>;

export const productFormSchema = z.object({
  title: z.string().min(3, "Product title is required"),
  category: z.enum(["cards", "frames", "corporate_swag", "pens", "banners"]),
  material_specs: z.string().min(5, "Material and print specifications are required"),
  image_url: z.string().url("Valid product image URL is required"),
  gallery_urls: z.string().optional(),
  min_order_qty: z.coerce.number().min(1, "Minimum order quantity must be at least 1"),
  is_trending: z.boolean().default(false),
  sample_finish: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;
