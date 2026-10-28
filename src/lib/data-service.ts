import { supabase, isSupabaseConfigured } from "./supabase/client";
import type {
  PortfolioProject,
  PortfolioGalleryItem,
  PrintProduct,
  Lead,
  LeadStatus,
  PortfolioCategory,
  PrintCategory,
} from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureUuid(candidate?: string): string {
  if (candidate && UUID_REGEX.test(candidate.trim())) {
    return candidate.trim();
  }
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizePortfolioProject(raw: PortfolioProject): PortfolioProject {
  const galleryUrls = Array.isArray(raw.gallery_urls) ? raw.gallery_urls.filter(Boolean) : [];
  let galleryItems: PortfolioGalleryItem[] = Array.isArray(raw.gallery_items)
    ? raw.gallery_items
        .filter((item) => item && typeof item.url === "string" && item.url.trim().length > 0)
        .map((item, idx) => ({
          id: item.id || `img-${raw.id}-${idx + 1}`,
          url: item.url.trim(),
          storage_path: item.storage_path || null,
          caption: item.caption ?? "",
          alt_text: item.alt_text || `${raw.title} — Photograph ${idx + 1}`,
          sort_order: typeof item.sort_order === "number" ? item.sort_order : idx + 1,
          width: item.width ?? null,
          height: item.height ?? null,
          size_bytes: item.size_bytes ?? null,
          mime_type: item.mime_type ?? null,
        }))
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  if (galleryItems.length === 0 && galleryUrls.length > 0) {
    galleryItems = galleryUrls.map((url, idx) => ({
      id: `img-${raw.id}-${idx + 1}`,
      url,
      storage_path: null,
      caption: `${raw.title} (Frame ${idx + 1})`,
      alt_text: `${raw.title} — Gallery photograph ${idx + 1}`,
      sort_order: idx + 1,
    }));
  }

  const syncedUrls =
    galleryItems.length > 0 ? galleryItems.map((item) => item.url) : galleryUrls;

  return {
    ...raw,
    cover_storage_path: raw.cover_storage_path || null,
    cover_alt_text: raw.cover_alt_text || `${raw.title} — ${raw.client_name}`,
    cover_caption: raw.cover_caption || "",
    gallery_urls: syncedUrls,
    gallery_items: galleryItems,
  };
}

export function isPortfolioStoragePathReferenced(
  storagePathOrUrl: string,
  projects: PortfolioProject[],
  excludeProjectId?: string
): boolean {
  const target = storagePathOrUrl.trim();
  if (!target) return false;

  for (const proj of projects) {
    if (excludeProjectId && proj.id === excludeProjectId) continue;
    if (proj.cover_storage_path === target || proj.thumbnail_url === target) {
      return true;
    }
    if (Array.isArray(proj.gallery_urls) && proj.gallery_urls.includes(target)) {
      return true;
    }
    if (
      Array.isArray(proj.gallery_items) &&
      proj.gallery_items.some(
        (item) => item.storage_path === target || item.url === target
      )
    ) {
      return true;
    }
  }
  return false;
}

export const INITIAL_PORTFOLIO: PortfolioProject[] = [
  {
    id: "port-1",
    title: "Bangladesh Tech Leaders Summit 2025",
    client_name: "Dhaka Chamber of IT Leaders",
    category: "corporate_summit",
    is_flagship: true,
    thumbnail_url:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
    ],
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    completed_date: "2025-11-15",
    created_at: "2025-11-16T10:00:00Z",
    description:
      "Multi-camera 4K live broadcast, stage spotlight coverage, and instant photo distribution for 500+ tech executives and diplomats at Radisson Blu Dhaka.",
  },
  {
    id: "port-2",
    title: "Heritage Weaves: The Jamdani Documentary",
    client_name: "Aarong Craft Archive",
    category: "documentary",
    is_flagship: true,
    thumbnail_url:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=1200&q=80",
    ],
    video_url: null,
    completed_date: "2025-10-20",
    created_at: "2025-10-21T10:00:00Z",
    description:
      "A 15-minute cinematic brand documentary capturing the vanishing legacy of artisanal weavers along the Shitalakshya River.",
  },
  {
    id: "port-3",
    title: "C-Suite Executive Portraits",
    client_name: "Apex Fintech Advisory",
    category: "headshot",
    is_flagship: true,
    thumbnail_url:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80",
    ],
    video_url: null,
    completed_date: "2026-01-10",
    created_at: "2026-01-11T10:00:00Z",
    description:
      "On-site studio lighting setup at Gulshan 2 corporate headquarters, delivering high-definition annual report and board member portraits.",
  },
  {
    id: "port-4",
    title: "Sustainable Textiles Innovation Forum",
    client_name: "BGMEA Sustainability Wing",
    category: "workshop",
    is_flagship: false,
    thumbnail_url:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    ],
    video_url: null,
    completed_date: "2025-12-04",
    created_at: "2025-12-05T10:00:00Z",
    description:
      "Comprehensive multi-day workshop coverage including panel discussions, interactive Q&A captures, and highlight reels.",
  },
  {
    id: "port-5",
    title: "The Royal Crimson Wedding Story",
    client_name: "The Chowdhury & Rahman Family",
    category: "wedding",
    is_flagship: true,
    thumbnail_url:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
    ],
    video_url: null,
    completed_date: "2026-02-14",
    created_at: "2026-02-15T10:00:00Z",
    description:
      "3-day bespoke destination celebration coverage with cinematic anamorphic color grading and handcrafted memory albums.",
  },
  {
    id: "port-6",
    title: "Modern Gastronomy: Chef Table Series",
    client_name: "Ouzo Fine Dining Gulshan",
    category: "documentary",
    is_flagship: false,
    thumbnail_url:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    ],
    video_url: null,
    completed_date: "2025-09-28",
    created_at: "2025-09-29T10:00:00Z",
    description:
      "Culinary brand storytelling detailing ingredient sourcing, kitchen choreography, and interior ambiance for Gulshan flagship launch.",
  },
];

export const INITIAL_PRODUCTS: PrintProduct[] = [
  {
    id: "prod-1",
    title: "Luxury Blind Debossed Matte Cards",
    category: "cards",
    material_specs:
      "650 GSM Cotton Uncoated Stock • Deep Espresso Blind Deboss • Warm Bronze Foil Edge Gilding",
    image_url:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80",
    ],
    min_order_qty: 100,
    is_trending: true,
    sample_finish: "Velvet Soft-Touch + Deep Tactile Deboss",
  },
  {
    id: "prod-2",
    title: "Executive Floating Acrylic Frame",
    category: "frames",
    material_specs:
      "12mm Optical Clear Cast Acrylic • Brushed Brass Standoffs • Archival UV Backing",
    image_url:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80",
    ],
    min_order_qty: 10,
    is_trending: true,
    sample_finish: "Diamond Polished Edges",
  },
  {
    id: "prod-3",
    title: "Bespoke Corporate Swag Gift Suite",
    category: "corporate_swag",
    material_specs:
      "Hardcover PU Leather Foil Journal • Thermal Matte Vacuum Flask • Linen Gift Box with Custom Foam",
    image_url:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80",
    ],
    min_order_qty: 25,
    is_trending: true,
    sample_finish: "Corporate Crest Bronze Foil Stamping",
  },
  {
    id: "prod-4",
    title: "Laser Engraved Executive Brass Pen",
    category: "pens",
    material_specs:
      "Solid Anodized Heavy Metal Body • German Rollerball 0.7mm Ink • Precision Fiber Laser Monogram",
    image_url:
      "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1000&q=80",
    ],
    min_order_qty: 50,
    is_trending: false,
    sample_finish: "Gunmetal & Deep Bronze Engraving",
  },
  {
    id: "prod-5",
    title: "Retractable Matte Black Summit Banner",
    category: "banners",
    material_specs:
      "Heavyweight Aluminum Base • Anti-Curl Blockout Canvas • High Density Eco-Solvent 1440 DPI Print",
    image_url:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80",
    ],
    min_order_qty: 2,
    is_trending: false,
    sample_finish: "Scratch-Resistant Matte Lamination",
  },
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: "lead-1",
    client_name: "Tanvir Ahmed",
    company_name: "Beximco Innovations",
    email: "tanvir.a@bexinnovations.com",
    phone: "+8801711223344",
    inquiry_type: "event_coverage",
    details:
      "Annual Global Partner Summit at Radisson Blu Dhaka. Need 3 multicam videographers, 4K executive keynote highlights, and same-day PR photo delivery.",
    estimated_qty: "2 Days (Approx 400 attendees)",
    event_date: "2026-11-20",
    status: "new",
    admin_notes: "Initial inquiry received via web portal. High priority corporate client.",
    created_at: "2026-10-12T16:00:00Z",
  },
  {
    id: "lead-2",
    client_name: "Sabrina Khan",
    company_name: "Loom & Weave Bangladesh",
    email: "sabrina@loomandweave.com.bd",
    phone: "+8801819556677",
    inquiry_type: "physical_merch",
    details:
      "Looking for 250 bespoke executive swag kits including custom embossed leather planners and laser engraved pens for European apparel buyers.",
    estimated_qty: "250 kits",
    event_date: null,
    status: "quote_sent",
    admin_notes:
      "Quotation draft #OFP-2026-88 sent to Sabrina. Follow up scheduled on Thursday.",
    created_at: "2026-10-11T10:00:00Z",
  },
  {
    id: "lead-3",
    client_name: "Farhan Chowdhury",
    company_name: "Chowdhury Holdings",
    email: "farhan@chowdhury.com",
    phone: "+8801912345678",
    inquiry_type: "event_coverage",
    details:
      "Executive wedding media coverage in Dhaka Army Golf Club. 3-day festivities requiring high frame rate cinematic crew.",
    estimated_qty: "3 Days",
    event_date: "2026-12-15",
    status: "contacted",
    admin_notes:
      "Called Farhan. Requested formal quotation breakdown for cinematic crew + drone license.",
    created_at: "2026-10-10T12:00:00Z",
  },
];

// In-browser local storage keys
const STORAGE_KEYS = {
  PORTFOLIO: "offprint_portfolio_v1",
  PRODUCTS: "offprint_products_v1",
  LEADS: "offprint_leads_v1",
};

function getLocalData<T>(key: string, initial: T[]): T[] {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return initial;
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Storage error:", err);
  }
}

// -----------------------------------------------------------------------------
// PORTFOLIO SERVICE
// -----------------------------------------------------------------------------
export async function fetchPortfolioProjects(
  category?: PortfolioCategory | "all"
): Promise<PortfolioProject[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from("portfolio_projects")
        .select("*")
        .order("completed_date", { ascending: false });
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return (data as PortfolioProject[]).map(normalizePortfolioProject);
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local cache:", err);
    }
  }

  const items = getLocalData<PortfolioProject>(
    STORAGE_KEYS.PORTFOLIO,
    INITIAL_PORTFOLIO
  ).map(normalizePortfolioProject);
  if (category && category !== "all") {
    return items.filter((item) => item.category === category);
  }
  return items;
}

export async function fetchFlagshipProjects(): Promise<PortfolioProject[]> {
  const all = await fetchPortfolioProjects();
  return all.filter((p) => p.is_flagship);
}

export async function savePortfolioProject(
  project: Omit<PortfolioProject, "id" | "created_at"> & { id?: string }
): Promise<PortfolioProject> {
  const normalized = normalizePortfolioProject({
    ...project,
    id: ensureUuid(project.id),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (isSupabaseConfigured() && supabase) {
    try {
      const dbPayload = {
        id: normalized.id,
        title: normalized.title,
        client_name: normalized.client_name,
        category: normalized.category,
        is_flagship: normalized.is_flagship,
        thumbnail_url: normalized.thumbnail_url,
        cover_storage_path: normalized.cover_storage_path || null,
        cover_alt_text:
          normalized.cover_alt_text || `${normalized.title} — ${normalized.client_name}`,
        cover_caption: normalized.cover_caption || "",
        gallery_urls: normalized.gallery_urls,
        gallery_items: normalized.gallery_items || [],
        video_url: normalized.video_url || null,
        completed_date: normalized.completed_date || null,
        description: normalized.description || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("portfolio_projects")
        .upsert(dbPayload)
        .select()
        .single();
      if (!error && data) {
        return normalizePortfolioProject(data as PortfolioProject);
      }
      if (error) {
        console.warn("Supabase portfolio upsert warning:", error.message);
      }
    } catch (err) {
      console.warn("Supabase upsert failed:", err);
    }
  }

  const current = getLocalData<PortfolioProject>(
    STORAGE_KEYS.PORTFOLIO,
    INITIAL_PORTFOLIO
  );
  const existingIdx = current.findIndex(
    (p) => p.id === normalized.id || (project.id && p.id === project.id)
  );
  if (existingIdx >= 0) {
    current[existingIdx] = normalized;
  } else {
    current.unshift(normalized);
  }
  setLocalData(STORAGE_KEYS.PORTFOLIO, current);
  return normalized;
}

export async function deletePortfolioProject(id: string): Promise<boolean> {
  const allProjects = await fetchPortfolioProjects("all");
  const target = allProjects.find((p) => p.id === id);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("portfolio_projects").delete().eq("id", id);

      if (target) {
        const candidatePaths = new Set<string>();
        if (target.cover_storage_path) candidatePaths.add(target.cover_storage_path);
        for (const item of target.gallery_items || []) {
          if (item.storage_path) candidatePaths.add(item.storage_path);
        }
        const safeToRemove = Array.from(candidatePaths).filter(
          (path) => !isPortfolioStoragePathReferenced(path, allProjects, id)
        );
        if (safeToRemove.length > 0) {
          await supabase.storage.from("portfolio-media").remove(safeToRemove);
        }
      }
    } catch (err) {
      console.warn("Supabase delete failed:", err);
    }
  }

  const current = getLocalData<PortfolioProject>(
    STORAGE_KEYS.PORTFOLIO,
    INITIAL_PORTFOLIO
  );
  const updated = current.filter((p) => p.id !== id);
  setLocalData(STORAGE_KEYS.PORTFOLIO, updated);
  return true;
}

// -----------------------------------------------------------------------------
// PRINT PRODUCTS SERVICE
// -----------------------------------------------------------------------------
export async function fetchPrintProducts(
  category?: PrintCategory | "all"
): Promise<PrintProduct[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from("print_products")
        .select("*")
        .order("created_at", { ascending: false });
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as PrintProduct[];
    } catch (err) {
      console.warn("Supabase fetch products failed:", err);
    }
  }

  const items = getLocalData<PrintProduct>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  if (category && category !== "all") {
    return items.filter((item) => item.category === category);
  }
  return items;
}

export async function savePrintProduct(
  product: Omit<PrintProduct, "id" | "created_at"> & { id?: string }
): Promise<PrintProduct> {
  const newProduct: PrintProduct = {
    ...product,
    id: ensureUuid(product.id),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("print_products")
        .upsert(newProduct)
        .select()
        .single();
      if (!error && data) return data as PrintProduct;
    } catch (err) {
      console.warn("Supabase product upsert failed:", err);
    }
  }

  const current = getLocalData<PrintProduct>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const existingIdx = current.findIndex(
    (p) => p.id === newProduct.id || (product.id && p.id === product.id)
  );
  if (existingIdx >= 0) {
    current[existingIdx] = newProduct;
  } else {
    current.unshift(newProduct);
  }
  setLocalData(STORAGE_KEYS.PRODUCTS, current);
  return newProduct;
}

export async function deletePrintProduct(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("print_products").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase product delete failed:", err);
    }
  }

  const current = getLocalData<PrintProduct>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const updated = current.filter((p) => p.id !== id);
  setLocalData(STORAGE_KEYS.PRODUCTS, updated);
  return true;
}

// -----------------------------------------------------------------------------
// LEADS / CRM SERVICE
// -----------------------------------------------------------------------------
export async function fetchLeads(statusFilter?: LeadStatus | "all"): Promise<Lead[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as Lead[];
    } catch (err) {
      console.warn("Supabase fetch leads failed:", err);
    }
  }

  const items = getLocalData<Lead>(STORAGE_KEYS.LEADS, INITIAL_LEADS);
  if (statusFilter && statusFilter !== "all") {
    return items.filter((lead) => lead.status === statusFilter);
  }
  return items;
}

export async function submitLead(
  lead: Omit<Lead, "id" | "status" | "created_at" | "admin_notes">
): Promise<Lead> {
  const newLead: Lead = {
    ...lead,
    id: ensureUuid(),
    status: "new",
    admin_notes: "Captured via website quote builder",
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert(newLead)
        .select()
        .single();
      if (!error && data) return data as Lead;
    } catch (err) {
      console.warn("Supabase insert lead failed:", err);
    }
  }

  const current = getLocalData<Lead>(STORAGE_KEYS.LEADS, INITIAL_LEADS);
  current.unshift(newLead);
  setLocalData(STORAGE_KEYS.LEADS, current);
  return newLead;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  admin_notes?: string
): Promise<Lead | null> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const updates: Partial<Lead> = { status };
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;
      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (!error && data) return data as Lead;
    } catch (err) {
      console.warn("Supabase update lead failed:", err);
    }
  }

  const current = getLocalData<Lead>(STORAGE_KEYS.LEADS, INITIAL_LEADS);
  const target = current.find((l) => l.id === id);
  if (target) {
    target.status = status;
    if (admin_notes !== undefined) {
      target.admin_notes = admin_notes;
    }
    setLocalData(STORAGE_KEYS.LEADS, current);
    return target;
  }
  return null;
}

export async function deleteLead(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("leads").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete lead failed:", err);
    }
  }

  const current = getLocalData<Lead>(STORAGE_KEYS.LEADS, INITIAL_LEADS);
  const updated = current.filter((l) => l.id !== id);
  setLocalData(STORAGE_KEYS.LEADS, updated);
  return true;
}

// -----------------------------------------------------------------------------
// SITE CMS SETTINGS SERVICE
// -----------------------------------------------------------------------------
export interface SiteSettingsMap {
  general: {
    agency_name: string;
    tagline: string;
    established: string;
    registration_badge: string;
    phone: string;
    email: string;
    address: string;
    operating_hours_label: string;
    instagram_url: string;
    facebook_url: string;
    linkedin_url: string;
  };
  homepage: {
    hero_eyebrow: string;
    hero_title: string;
    hero_subtitle: string;
    primary_cta_label: string;
    secondary_cta_label: string;
  };
  booking_page: {
    heading: string;
    subheading: string;
    convocation_card_badge: string;
    traditional_card_badge: string;
  };
  about_page: {
    heading: string;
    subheading: string;
    mission_title: string;
    mission_body: string;
  };
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsMap = {
  general: {
    agency_name: "OFFPRINT (অফপ্রিন্ট)",
    tagline: "Editorial Photography, Convocation Portraits & Bespoke Print Craftsmanship",
    established: "September 2025",
    registration_badge: "Govt. Registered Agency in Bangladesh",
    phone: "+880 1700-000000",
    email: "inquiry@offprint.agency",
    address: "Gulshan & Banani Corporate Corridor, Dhaka, Bangladesh",
    operating_hours_label:
      "Sunday – Thursday (9:00 AM – 7:00 PM BST) • Saturday (10:00 AM – 6:00 PM BST)",
    instagram_url: "https://instagram.com/offprint.agency",
    facebook_url: "https://facebook.com/offprint.agency",
    linkedin_url: "https://linkedin.com/company/offprint-agency",
  },
  homepage: {
    hero_eyebrow: "Govt. Registered Studio & Agency • Est. Sep 2025",
    hero_title: "Enduring Visual Legacies & Bespoke Portrait Commissions.",
    hero_subtitle:
      "From IUB 27th Convocation portrait sessions and executive headshots to multi-camera corporate summits and tactile 650 GSM print collateral.",
    primary_cta_label: "Book a Session",
    secondary_cta_label: "Explore Works Archive",
  },
  booking_page: {
    heading: "Reserve Your Photography Session",
    subheading:
      "Select between our dedicated IUB 27th Convocation portrait sessions, special campaign bookings, or bespoke traditional photography commissions with live calendar availability.",
    convocation_card_badge: "Dedicated Event Portal",
    traditional_card_badge: "Studio & On-Location",
  },
  about_page: {
    heading: "The OFFPRINT Story",
    subheading:
      "Bridging editorial photography and tactile physical print craftsmanship for Bangladesh’s leading institutions, graduates, and executives.",
    mission_title: "Founded on Precision & Permanence",
    mission_body:
      "Established in September 2025 in Dhaka, Bangladesh, OFFPRINT (অফপ্রিন্ট) was founded with a singular conviction: institutions and individuals deserve photography and tangible print editions that match the stature of their milestones.",
  },
};

export async function fetchSiteSettings(): Promise<SiteSettingsMap> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (!error && data && data.length > 0) {
        const merged: any = { ...DEFAULT_SITE_SETTINGS };
        for (const row of data) {
          if (row.key && row.value) {
            merged[row.key] = { ...(merged[row.key] || {}), ...row.value };
          }
        }
        return merged as SiteSettingsMap;
      }
    } catch {
      // Fallback to defaults
    }
  }
  return DEFAULT_SITE_SETTINGS;
}

export async function saveSiteSettingKey<K extends keyof SiteSettingsMap>(
  key: K,
  value: SiteSettingsMap[K]
): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }
  return false;
}
