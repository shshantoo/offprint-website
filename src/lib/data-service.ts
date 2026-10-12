import { supabase, isSupabaseConfigured } from "./supabase/client";
import { PortfolioProject, PrintProduct, Lead, LeadStatus, PortfolioCategory, PrintCategory } from "@/types/database";

export const INITIAL_PORTFOLIO: PortfolioProject[] = [
  {
    id: "port-1",
    title: "Bangladesh Tech Leaders Summit 2025",
    client_name: "Dhaka Chamber of IT Leaders",
    category: "corporate_summit",
    is_flagship: true,
    thumbnail_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80"
    ],
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    completed_date: "2025-11-15",
    created_at: "2025-11-16T10:00:00Z",
    description: "Multi-camera 4K live broadcast, stage spotlight coverage, and instant photo distribution for 500+ tech executives and diplomats at Radisson Blu Dhaka."
  },
  {
    id: "port-2",
    title: "Heritage Weaves: The Jamdani Documentary",
    client_name: "Aarong Craft Archive",
    category: "documentary",
    is_flagship: true,
    thumbnail_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=1200&q=80"
    ],
    video_url: null,
    completed_date: "2025-10-20",
    created_at: "2025-10-21T10:00:00Z",
    description: "A 15-minute cinematic brand documentary capturing the vanishing legacy of artisanal weavers along the Shitalakshya River."
  },
  {
    id: "port-3",
    title: "C-Suite Executive Portraits",
    client_name: "Apex Fintech Advisory",
    category: "headshot",
    is_flagship: true,
    thumbnail_url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80"
    ],
    video_url: null,
    completed_date: "2026-01-10",
    created_at: "2026-01-11T10:00:00Z",
    description: "On-site studio lighting setup at Gulshan 2 corporate headquarters, delivering high-definition annual report and board member portraits."
  },
  {
    id: "port-4",
    title: "Sustainable Textiles Innovation Forum",
    client_name: "BGMEA Sustainability Wing",
    category: "workshop",
    is_flagship: false,
    thumbnail_url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"
    ],
    video_url: null,
    completed_date: "2025-12-04",
    created_at: "2025-12-05T10:00:00Z",
    description: "Comprehensive multi-day workshop coverage including panel discussions, interactive Q&A captures, and highlight reels."
  },
  {
    id: "port-5",
    title: "The Royal Crimson Wedding Story",
    client_name: "The Chowdhury & Rahman Family",
    category: "wedding",
    is_flagship: true,
    thumbnail_url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80"
    ],
    video_url: null,
    completed_date: "2026-02-14",
    created_at: "2026-02-15T10:00:00Z",
    description: "3-day bespoke destination celebration coverage with cinematic anamorphic color grading and handcrafted memory albums."
  },
  {
    id: "port-6",
    title: "Modern Gastronomy: Chef Table Series",
    client_name: "Ouzo Fine Dining Gulshan",
    category: "documentary",
    is_flagship: false,
    thumbnail_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80"
    ],
    video_url: null,
    completed_date: "2025-09-28",
    created_at: "2025-09-29T10:00:00Z",
    description: "Culinary brand storytelling detailing ingredient sourcing, kitchen choreography, and interior ambiance for Gulshan flagship launch."
  }
];

export const INITIAL_PRODUCTS: PrintProduct[] = [
  {
    id: "prod-1",
    title: "Luxury Blind Debossed Matte Cards",
    category: "cards",
    material_specs: "650 GSM Cotton Uncoated Stock • Deep Espresso Blind Deboss • Warm Bronze Foil Edge Gilding",
    image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80"
    ],
    min_order_qty: 100,
    is_trending: true,
    sample_finish: "Velvet Soft-Touch + Deep Tactile Deboss"
  },
  {
    id: "prod-2",
    title: "Executive Floating Acrylic Frame",
    category: "frames",
    material_specs: "12mm Optical Clear Cast Acrylic • Brushed Brass Standoffs • Archival UV Backing",
    image_url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80"
    ],
    min_order_qty: 10,
    is_trending: true,
    sample_finish: "Diamond Polished Edges"
  },
  {
    id: "prod-3",
    title: "Bespoke Corporate Swag Gift Suite",
    category: "corporate_swag",
    material_specs: "Hardcover PU Leather Foil Journal • Thermal Matte Vacuum Flask • Linen Gift Box with Custom Foam",
    image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80"
    ],
    min_order_qty: 25,
    is_trending: true,
    sample_finish: "Corporate Crest Bronze Foil Stamping"
  },
  {
    id: "prod-4",
    title: "Laser Engraved Executive Brass Pen",
    category: "pens",
    material_specs: "Solid Anodized Heavy Metal Body • German Rollerball 0.7mm Ink • Precision Fiber Laser Monogram",
    image_url: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=1000&q=80"
    ],
    min_order_qty: 50,
    is_trending: false,
    sample_finish: "Gunmetal & Deep Bronze Engraving"
  },
  {
    id: "prod-5",
    title: "Retractable Matte Black Summit Banner",
    category: "banners",
    material_specs: "Heavyweight Aluminum Base • Anti-Curl Blockout Canvas • High Density Eco-Solvent 1440 DPI Print",
    image_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80",
    gallery_urls: [
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80"
    ],
    min_order_qty: 2,
    is_trending: false,
    sample_finish: "Scratch-Resistant Matte Lamination"
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: "lead-1",
    client_name: "Tanvir Ahmed",
    company_name: "Beximco Innovations",
    email: "tanvir.a@bexinnovations.com",
    phone: "+8801711223344",
    inquiry_type: "event_coverage",
    details: "Annual Global Partner Summit at Radisson Blu Dhaka. Need 3 multicam videographers, 4K executive keynote highlights, and same-day PR photo delivery.",
    estimated_qty: "2 Days (Approx 400 attendees)",
    event_date: "2026-11-20",
    status: "new",
    admin_notes: "Initial inquiry received via web portal. High priority corporate client.",
    created_at: "2026-10-12T16:00:00Z"
  },
  {
    id: "lead-2",
    client_name: "Sabrina Khan",
    company_name: "Loom & Weave Bangladesh",
    email: "sabrina@loomandweave.com.bd",
    phone: "+8801819556677",
    inquiry_type: "physical_merch",
    details: "Looking for 250 bespoke executive swag kits including custom embossed leather planners and laser engraved pens for European apparel buyers.",
    estimated_qty: "250 kits",
    event_date: null,
    status: "quote_sent",
    admin_notes: "Quotation draft #OFP-2026-88 sent to Sabrina. Follow up scheduled on Thursday.",
    created_at: "2026-10-11T10:00:00Z"
  },
  {
    id: "lead-3",
    client_name: "Farhan Chowdhury",
    company_name: "Chowdhury Holdings",
    email: "farhan@chowdhury.com",
    phone: "+8801912345678",
    inquiry_type: "event_coverage",
    details: "Executive wedding media coverage in Dhaka Army Golf Club. 3-day festivities requiring high frame rate cinematic crew.",
    estimated_qty: "3 Days",
    event_date: "2026-12-15",
    status: "contacted",
    admin_notes: "Called Farhan. Requested formal quotation breakdown for cinematic crew + drone license.",
    created_at: "2026-10-10T12:00:00Z"
  }
];

// In-browser local storage keys
const STORAGE_KEYS = {
  PORTFOLIO: "offprint_portfolio_v1",
  PRODUCTS: "offprint_products_v1",
  LEADS: "offprint_leads_v1"
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
export async function fetchPortfolioProjects(category?: PortfolioCategory | 'all'): Promise<PortfolioProject[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from("portfolio_projects").select("*").order("completed_date", { ascending: false });
      if (category && category !== 'all') {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as PortfolioProject[];
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local cache:", err);
    }
  }

  const items = getLocalData<PortfolioProject>(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
  if (category && category !== 'all') {
    return items.filter(item => item.category === category);
  }
  return items;
}

export async function fetchFlagshipProjects(): Promise<PortfolioProject[]> {
  const all = await fetchPortfolioProjects();
  return all.filter(p => p.is_flagship);
}

export async function savePortfolioProject(project: Omit<PortfolioProject, 'id' | 'created_at'> & { id?: string }): Promise<PortfolioProject> {
  const newProject: PortfolioProject = {
    ...project,
    id: project.id || `port-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("portfolio_projects").upsert(newProject).select().single();
      if (!error && data) return data as PortfolioProject;
    } catch (err) {
      console.warn("Supabase upsert failed:", err);
    }
  }

  const current = getLocalData<PortfolioProject>(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
  const existingIdx = current.findIndex(p => p.id === newProject.id);
  if (existingIdx >= 0) {
    current[existingIdx] = newProject;
  } else {
    current.unshift(newProject);
  }
  setLocalData(STORAGE_KEYS.PORTFOLIO, current);
  return newProject;
}

export async function deletePortfolioProject(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("portfolio_projects").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete failed:", err);
    }
  }

  const current = getLocalData<PortfolioProject>(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
  const updated = current.filter(p => p.id !== id);
  setLocalData(STORAGE_KEYS.PORTFOLIO, updated);
  return true;
}

// -----------------------------------------------------------------------------
// PRINT PRODUCTS SERVICE
// -----------------------------------------------------------------------------
export async function fetchPrintProducts(category?: PrintCategory | 'all'): Promise<PrintProduct[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from("print_products").select("*").order("created_at", { ascending: false });
      if (category && category !== 'all') {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as PrintProduct[];
    } catch (err) {
      console.warn("Supabase fetch products failed:", err);
    }
  }

  const items = getLocalData<PrintProduct>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  if (category && category !== 'all') {
    return items.filter(item => item.category === category);
  }
  return items;
}

export async function savePrintProduct(product: Omit<PrintProduct, 'id' | 'created_at'> & { id?: string }): Promise<PrintProduct> {
  const newProduct: PrintProduct = {
    ...product,
    id: product.id || `prod-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("print_products").upsert(newProduct).select().single();
      if (!error && data) return data as PrintProduct;
    } catch (err) {
      console.warn("Supabase product upsert failed:", err);
    }
  }

  const current = getLocalData<PrintProduct>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const existingIdx = current.findIndex(p => p.id === newProduct.id);
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
  const updated = current.filter(p => p.id !== id);
  setLocalData(STORAGE_KEYS.PRODUCTS, updated);
  return true;
}

// -----------------------------------------------------------------------------
// LEADS / CRM SERVICE
// -----------------------------------------------------------------------------
export async function fetchLeads(statusFilter?: LeadStatus | 'all'): Promise<Lead[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as Lead[];
    } catch (err) {
      console.warn("Supabase fetch leads failed:", err);
    }
  }

  const items = getLocalData<Lead>(STORAGE_KEYS.LEADS, INITIAL_LEADS);
  if (statusFilter && statusFilter !== 'all') {
    return items.filter(lead => lead.status === statusFilter);
  }
  return items;
}

export async function submitLead(lead: Omit<Lead, 'id' | 'status' | 'created_at' | 'admin_notes'>): Promise<Lead> {
  const newLead: Lead = {
    ...lead,
    id: `lead-${Date.now()}`,
    status: "new",
    admin_notes: "Captured via website quote builder",
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("leads").insert(newLead).select().single();
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

export async function updateLeadStatus(id: string, status: LeadStatus, admin_notes?: string): Promise<Lead | null> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const updates: Partial<Lead> = { status };
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;
      const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
      if (!error && data) return data as Lead;
    } catch (err) {
      console.warn("Supabase update lead failed:", err);
    }
  }

  const current = getLocalData<Lead>(STORAGE_KEYS.LEADS, INITIAL_LEADS);
  const target = current.find(l => l.id === id);
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
  const updated = current.filter(l => l.id !== id);
  setLocalData(STORAGE_KEYS.LEADS, updated);
  return true;
}
