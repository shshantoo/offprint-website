export type PortfolioCategory =
  | 'corporate_summit'
  | 'documentary'
  | 'headshot'
  | 'workshop'
  | 'wedding';

export type PrintCategory =
  | 'cards'
  | 'frames'
  | 'corporate_swag'
  | 'pens'
  | 'banners';

export type InquiryType = 'event_coverage' | 'physical_merch';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'quote_sent'
  | 'confirmed'
  | 'archived';

export interface PortfolioProject {
  id: string;
  title: string;
  client_name: string;
  category: PortfolioCategory;
  is_flagship: boolean;
  thumbnail_url: string;
  gallery_urls: string[];
  video_url?: string | null;
  completed_date?: string | null;
  created_at?: string;
  description?: string;
}

export interface PrintProduct {
  id: string;
  title: string;
  category: PrintCategory;
  material_specs: string;
  image_url: string;
  gallery_urls: string[];
  min_order_qty: number;
  is_trending: boolean;
  created_at?: string;
  sample_finish?: string;
}

export interface Lead {
  id: string;
  client_name: string;
  company_name?: string | null;
  email: string;
  phone: string;
  inquiry_type: InquiryType;
  details: string;
  estimated_qty?: string | null;
  event_date?: string | null;
  status: LeadStatus;
  admin_notes?: string | null;
  created_at?: string;
}
