import { supabase, isSupabaseConfigured } from "./supabase/client";
import type {
  PortfolioProject,
  PortfolioGalleryItem,
  PrintProduct,
  Lead,
  LeadStatus,
  PortfolioCategory,
  PrintCategory,
  HeroSlide,
  Testimonial,
  HomepageConfig,
  MediaFolder,
  MediaFolderType,
  MediaFolderWithMeta,
  MediaFolderPhoto,
  EventArchive,
  EventHighlight,
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

export const INITIAL_LEADS: Lead[] = [];

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
      if (!error && Array.isArray(data)) {
        return (data as PortfolioProject[]).map(normalizePortfolioProject);
      }
      if (error) {
        console.warn("Supabase portfolio fetch error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase fetch failed:", err);
    }
  }

  // Never invent dummy data when database is empty
  return [];
}

export async function fetchFlagshipProjects(): Promise<PortfolioProject[]> {
  const all = await fetchPortfolioProjects();
  return all.filter((p) => p.is_flagship);
}

export async function savePortfolioProject(
  project: Omit<PortfolioProject, "id" | "created_at"> & { id?: string },
  customClient?: any
): Promise<PortfolioProject> {
  const normalized = normalizePortfolioProject({
    ...project,
    id: ensureUuid(project.id),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const client = customClient || supabase;
  if (isSupabaseConfigured() && client) {
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
      const { data, error } = await client
        .from("portfolio_projects")
        .upsert(dbPayload)
        .select()
        .single();
      if (error) {
        console.error("Supabase portfolio upsert error:", error);
        throw new Error(`Failed to save portfolio project to database: ${error.message}`);
      }
      if (data) {
        return normalizePortfolioProject(data as PortfolioProject);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("Failed to save")) {
        throw err;
      }
      console.warn("Supabase upsert warning:", err);
      throw err;
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

export async function deletePortfolioProject(id: string, customClient?: any): Promise<boolean> {
  const allProjects = await fetchPortfolioProjects("all");
  const target = allProjects.find((p) => p.id === id);

  const client = customClient || supabase;
  if (isSupabaseConfigured() && client) {
    const { error } = await client.from("portfolio_projects").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete failed:", error);
      throw new Error(`Failed to delete portfolio project from database: ${error.message}`);
    }

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
        try {
          await client.storage.from("portfolio-media").remove(safeToRemove);
        } catch {}
      }
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
// WORK ARCHIVE, SUPABASE MEDIA FOLDERS & EVENT HIGHLIGHTS SERVICES
// -----------------------------------------------------------------------------

export async function fetchMediaFolders(
  type?: MediaFolderType,
  customClient?: any
): Promise<MediaFolderWithMeta[]> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) return [];

  try {
    const { data, error } = await client.rpc("get_media_folders_with_meta", {
      p_folder_type: type || null,
    });
    if (!error && Array.isArray(data)) {
      return (data as any[]).map((f) => ({
        ...f,
        photo_count: Number(f.photo_count || 0),
        assigned_events_count: Number(f.assigned_events_count || 0),
        assigned_highlights_count: Number(f.assigned_highlights_count || 0),
        storage_status:
          f.storage_status ||
          (Number(f.photo_count) > 0 ? "available" : "empty"),
      })) as MediaFolderWithMeta[];
    }
  } catch (err) {
    console.warn("Failed to fetch folders via RPC:", err);
  }

  // Fallback direct query
  let query = client.from("media_folders").select("*").order("name", { ascending: true });
  if (type) {
    query = query.eq("folder_type", type);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as any[]).map((f) => ({
    ...f,
    photo_count: 0,
    assigned_events_count: 0,
    assigned_highlights_count: 0,
    storage_status: "empty" as const,
  }));
}

export async function saveMediaFolder(
  folder: {
    id?: string;
    name: string;
    slug: string;
    folder_type: MediaFolderType;
    description?: string | null;
  },
  customClient?: any
): Promise<MediaFolder> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const cleanSlug = folder.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  const prefix = folder.folder_type === "event-highlight"
    ? `event-archive-highlights/${cleanSlug}/`
    : `event-archives/${cleanSlug}/`;

  const payload = {
    id: ensureUuid(folder.id),
    name: folder.name.trim(),
    slug: cleanSlug,
    folder_type: folder.folder_type,
    storage_prefix: prefix,
    description: folder.description?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("media_folders")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Supabase saveMediaFolder error:", error);
    throw new Error(`Database error saving folder: ${error.message}`);
  }

  return data as MediaFolder;
}

export async function deleteMediaFolder(id: string, customClient?: any): Promise<boolean> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await client.from("media_folders").delete().eq("id", id);
  if (error) {
    console.error("Supabase deleteMediaFolder error:", error);
    throw new Error(`Database error deleting folder: ${error.message}`);
  }

  return true;
}

export async function fetchFolderPhotos(
  folderId: string,
  customClient?: any
): Promise<MediaFolderPhoto[]> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) return [];

  const { data, error } = await client
    .from("media_folder_photos")
    .select("*")
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase fetchFolderPhotos error:", error);
    return [];
  }

  return (data || []) as MediaFolderPhoto[];
}

export async function saveFolderPhoto(
  photo: Partial<MediaFolderPhoto> & { folder_id: string; storage_path: string; public_url: string; file_name: string },
  customClient?: any
): Promise<MediaFolderPhoto> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const payload = {
    id: ensureUuid(photo.id),
    folder_id: photo.folder_id,
    storage_path: photo.storage_path,
    public_url: photo.public_url,
    file_name: photo.file_name,
    size_bytes: photo.size_bytes || 0,
    mime_type: photo.mime_type || "image/jpeg",
    width: photo.width || null,
    height: photo.height || null,
    aspect_ratio: photo.aspect_ratio || "portrait",
    focal_point: photo.focal_point || "center",
    caption: photo.caption?.trim() || null,
    alt_text: photo.alt_text?.trim() || photo.file_name,
    sort_order: typeof photo.sort_order === "number" ? photo.sort_order : 0,
    is_cover: Boolean(photo.is_cover),
  };

  const { data, error } = await client
    .from("media_folder_photos")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Supabase saveFolderPhoto error:", error);
    throw new Error(`Database error saving folder photo: ${error.message}`);
  }

  return data as MediaFolderPhoto;
}

export async function deleteFolderPhoto(id: string, customClient?: any): Promise<boolean> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await client.from("media_folder_photos").delete().eq("id", id);
  if (error) {
    console.error("Supabase deleteFolderPhoto error:", error);
    throw new Error(`Database error deleting folder photo: ${error.message}`);
  }

  return true;
}

export async function fetchEventArchives(
  options?: { includeUnpublished?: boolean; category?: string; client?: any }
): Promise<EventArchive[]> {
  const client = options?.client || supabase;
  if (!isSupabaseConfigured() || !client) return [];

  let query = client
    .from("event_archives")
    .select(`
      *,
      folder:media_folders(*)
    `)
    .order("sort_order", { ascending: true })
    .order("event_date", { ascending: false });

  if (!options?.includeUnpublished) {
    query = query.eq("is_published", true);
  }
  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase fetchEventArchives error:", error);
    return [];
  }

  return (data || []) as EventArchive[];
}

export async function fetchEventArchiveBySlug(
  slug: string,
  options?: { includeUnpublished?: boolean; client?: any }
): Promise<EventArchive | null> {
  const client = options?.client || supabase;
  if (!isSupabaseConfigured() || !client) return null;

  let query = client
    .from("event_archives")
    .select(`
      *,
      folder:media_folders(*)
    `)
    .eq("slug", slug);

  if (!options?.includeUnpublished) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const event = data as EventArchive;

  // Resolve folder photos if folder_id is set
  if (event.folder_id) {
    event.photos = await fetchFolderPhotos(event.folder_id, client);
  } else {
    event.photos = [];
  }

  // Resolve highlights strictly belonging to this event
  event.highlights = await fetchEventHighlights(event.id, {
    includeUnpublished: options?.includeUnpublished,
    client,
  });

  return event;
}

export async function saveEventArchive(
  event: Partial<EventArchive> & { title: string; short_description: string },
  customClient?: any
): Promise<EventArchive> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const cleanSlug = (event.slug || event.title)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-");

  const payload = {
    id: ensureUuid(event.id),
    title: event.title.trim(),
    slug: cleanSlug,
    event_date: event.event_date || new Date().toISOString().split("T")[0],
    short_description: event.short_description.trim(),
    full_description: event.full_description?.trim() || null,
    cover_image_url: event.cover_image_url || null,
    cover_storage_path: event.cover_storage_path || null,
    cover_alt_text: event.cover_alt_text?.trim() || `${event.title.trim()} — Cover`,
    folder_id: event.folder_id || null,
    category: event.category || "general",
    location: event.location?.trim() || null,
    client_or_institution: event.client_or_institution?.trim() || null,
    sort_order: typeof event.sort_order === "number" ? event.sort_order : 0,
    is_published: event.is_published !== undefined ? Boolean(event.is_published) : true,
    is_featured: Boolean(event.is_featured),
    hero_slides: Array.isArray(event.hero_slides) ? event.hero_slides : [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("event_archives")
    .upsert(payload)
    .select(`
      *,
      folder:media_folders(*)
    `)
    .single();

  if (error) {
    console.error("Supabase saveEventArchive error:", error);
    throw new Error(`Database error saving event archive: ${error.message}`);
  }

  return data as EventArchive;
}

export async function deleteEventArchive(id: string, customClient?: any): Promise<boolean> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await client.from("event_archives").delete().eq("id", id);
  if (error) {
    console.error("Supabase deleteEventArchive error:", error);
    throw new Error(`Database error deleting event archive: ${error.message}`);
  }

  return true;
}

export async function fetchEventHighlights(
  eventId: string,
  options?: { includeUnpublished?: boolean; client?: any }
): Promise<EventHighlight[]> {
  const client = options?.client || supabase;
  if (!isSupabaseConfigured() || !client) return [];

  let query = client
    .from("event_highlights")
    .select(`
      *,
      folder:media_folders(*)
    `)
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!options?.includeUnpublished) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase fetchEventHighlights error:", error);
    return [];
  }

  const highlights = (data || []) as EventHighlight[];

  // Resolve photos for each highlight from its dedicated folder
  for (const h of highlights) {
    if (h.folder_id) {
      h.photos = await fetchFolderPhotos(h.folder_id, client);
    } else {
      h.photos = [];
    }
  }

  return highlights;
}

export async function fetchEventHighlightBySlug(
  eventSlug: string,
  highlightSlug: string,
  options?: { includeUnpublished?: boolean; client?: any }
): Promise<{ event: EventArchive; highlight: EventHighlight } | null> {
  const client = options?.client || supabase;
  if (!isSupabaseConfigured() || !client) return null;

  const event = await fetchEventArchiveBySlug(eventSlug, options);
  if (!event) return null;

  let query = client
    .from("event_highlights")
    .select(`
      *,
      folder:media_folders(*)
    `)
    .eq("event_id", event.id)
    .eq("slug", highlightSlug);

  if (!options?.includeUnpublished) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const highlight = data as EventHighlight;
  if (highlight.folder_id) {
    highlight.photos = await fetchFolderPhotos(highlight.folder_id, client);
  } else {
    highlight.photos = [];
  }

  return { event, highlight };
}

export async function saveEventHighlight(
  highlight: Partial<EventHighlight> & { event_id: string; title: string; short_description: string; cover_image_url: string },
  customClient?: any
): Promise<EventHighlight> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const cleanSlug = (highlight.slug || highlight.title)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-");

  const payload = {
    id: ensureUuid(highlight.id),
    event_id: highlight.event_id,
    title: highlight.title.trim(),
    slug: cleanSlug,
    short_description: highlight.short_description.trim(),
    cover_image_url: highlight.cover_image_url.trim(),
    cover_storage_path: highlight.cover_storage_path || null,
    folder_id: highlight.folder_id || null,
    sort_order: typeof highlight.sort_order === "number" ? highlight.sort_order : 0,
    is_published: highlight.is_published !== undefined ? Boolean(highlight.is_published) : true,
    hero_slides: Array.isArray(highlight.hero_slides) ? highlight.hero_slides : [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("event_highlights")
    .upsert(payload)
    .select(`
      *,
      folder:media_folders(*)
    `)
    .single();

  if (error) {
    console.error("Supabase saveEventHighlight error:", error);
    throw new Error(`Database error saving highlight: ${error.message}`);
  }

  return data as EventHighlight;
}

export async function deleteEventHighlight(id: string, customClient?: any): Promise<boolean> {
  const client = customClient || supabase;
  if (!isSupabaseConfigured() || !client) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await client.from("event_highlights").delete().eq("id", id);
  if (error) {
    console.error("Supabase deleteEventHighlight error:", error);
    throw new Error(`Database error deleting highlight: ${error.message}`);
  }

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
      if (!error && Array.isArray(data)) return data as Lead[];
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
  homepage_config?: HomepageConfig;
}

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  hero_autoplay: true,
  hero_interval_sec: 6,
  show_ticker: true,
  show_flagship: true,
  show_testimonials: true,
  show_services: true,
  show_print_bridge: true,
  show_quote_builder: false,
  show_closing_cta: true,
  flagship_heading: "Selected Productions & Editorial Archives",
  flagship_subheading:
    "Photographic commissions across institutional summits, cultural documentaries, and executive portraiture.",
  services_heading: "Studio Disciplines & Commissions",
  services_subheading:
    "Structured appointment bookings with dedicated capacity management and verified live calendar availability.",
  closing_cta_heading: "Every Milestone Deserves Permanent Record.",
  closing_cta_subheading:
    "Commission our studio for university convocations, executive leadership portraits, or cultural documentation in Dhaka and beyond.",
  closing_cta_button_label: "Book a Photography Session",
  closing_cta_button_href: "/book",
  closing_cta_image_url:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80",
  ticker_items: [
    "IUB 27TH CONVOCATION APPOINTMENTS",
    "EXECUTIVE & C-SUITE PORTRAITURE",
    "CULTURAL & BRAND DOCUMENTARIES",
    "CORPORATE SUMMITS & PR STILLS",
    "FINE-ART ARCHIVAL PRINTS & FRAMES",
    "STUDIO & ON-LOCATION IN DHAKA",
  ],
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsMap = {
  general: {
    agency_name: "OFFPRINT (অফপ্রিন্ট)",
    tagline: "Editorial Photography & Fine-Art Print Studio",
    established: "September 2025",
    registration_badge: "",
    phone: "",
    email: "inquiry@offprint.agency",
    address: "Gulshan & Banani, Dhaka, Bangladesh",
    operating_hours_label:
      "Sunday – Thursday (9:00 AM – 7:00 PM BST) • Saturday (10:00 AM – 6:00 PM BST)",
    instagram_url: "https://instagram.com/offprint.agency",
    facebook_url: "https://facebook.com/offprint.agency",
    linkedin_url: "https://linkedin.com/company/offprint-agency",
  },
  homepage: {
    hero_eyebrow: "",
    hero_title: "Enduring Visual Legacies.",
    hero_subtitle:
      "Curated milestone portraiture, institutional summit coverage, and bespoke archival print editions in Dhaka.",
    primary_cta_label: "Book a Session",
    secondary_cta_label: "Explore Works Archive",
  },
  homepage_config: DEFAULT_HOMEPAGE_CONFIG,
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
      "Established in Dhaka, Bangladesh, OFFPRINT (অফপ্রিন্ট) was founded with a singular conviction: institutions and individuals deserve photography and tangible print editions that match the stature of their milestones.",
  },
};

export async function fetchHomepageConfig(): Promise<HomepageConfig> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "homepage_config")
        .maybeSingle();
      if (!error && data?.value) {
        return { ...DEFAULT_HOMEPAGE_CONFIG, ...data.value };
      }
    } catch (err) {
      console.warn("Failed to fetch homepage config:", err);
    }
  }
  return DEFAULT_HOMEPAGE_CONFIG;
}

export async function saveHomepageConfig(
  config: Partial<HomepageConfig>
): Promise<HomepageConfig> {
  const current = await fetchHomepageConfig();
  const updated: HomepageConfig = { ...current, ...config };
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from("site_settings").upsert({
      key: "homepage_config",
      value: updated,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw new Error(`Failed to save homepage config: ${error.message}`);
    }
  }
  return updated;
}

export async function fetchHeroSlides(
  includeUnpublished = false
): Promise<HeroSlide[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      if (!includeUnpublished) {
        query = query.eq("is_published", true);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as HeroSlide[];
      }
      if (error) {
        console.warn("Error fetching hero slides:", error.message);
      }
    } catch (err) {
      console.warn("Failed to fetch hero slides:", err);
    }
  }
  return [];
}

export async function saveHeroSlide(
  slide: Partial<HeroSlide> & { title: string; image_url: string }
): Promise<HeroSlide> {
  const payload = {
    ...slide,
    id: ensureUuid(slide.id),
    sort_order: typeof slide.sort_order === "number" ? slide.sort_order : 1,
    is_published: slide.is_published !== false,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from("hero_slides")
      .upsert(payload)
      .select()
      .single();
    if (error) {
      throw new Error(`Failed to save hero slide: ${error.message}`);
    }
    return data as HeroSlide;
  }
  throw new Error("Supabase is not configured to save hero slides.");
}

export async function deleteHeroSlide(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete hero slide: ${error.message}`);
    }
    return true;
  }
  return false;
}

export async function reorderHeroSlides(orderedIds: string[]): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const client = supabase;
    const promises = orderedIds.map((id, index) =>
      client
        .from("hero_slides")
        .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    await Promise.all(promises);
    return true;
  }
  return false;
}

export async function fetchTestimonials(
  includeUnpublished = false
): Promise<Testimonial[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from("testimonials")
        .select("*")
        .order("sort_order", { ascending: true });
      if (!includeUnpublished) {
        query = query.eq("is_published", true);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as Testimonial[];
      }
      if (error) {
        console.warn("Error fetching testimonials:", error.message);
      }
    } catch (err) {
      console.warn("Failed to fetch testimonials:", err);
    }
  }
  return [];
}

export async function saveTestimonial(
  testimonial: Partial<Testimonial> & { quote: string; author: string }
): Promise<Testimonial> {
  const payload = {
    ...testimonial,
    id: ensureUuid(testimonial.id),
    sort_order: typeof testimonial.sort_order === "number" ? testimonial.sort_order : 1,
    is_published: testimonial.is_published !== false,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from("testimonials")
      .upsert(payload)
      .select()
      .single();
    if (error) {
      throw new Error(`Failed to save testimonial: ${error.message}`);
    }
    return data as Testimonial;
  }
  throw new Error("Supabase is not configured to save testimonials.");
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete testimonial: ${error.message}`);
    }
    return true;
  }
  return false;
}

export async function reorderTestimonials(orderedIds: string[]): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const client = supabase;
    const promises = orderedIds.map((id, index) =>
      client
        .from("testimonials")
        .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    await Promise.all(promises);
    return true;
  }
  return false;
}

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
