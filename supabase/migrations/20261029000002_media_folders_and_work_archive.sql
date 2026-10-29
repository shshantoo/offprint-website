-- ==============================================================================
-- MIGRATION: WORK ARCHIVE, SUPABASE MEDIA FOLDERS & EVENT HIGHLIGHTS
-- ==============================================================================

-- 1. Media Folders Table for Supabase Storage Folder Organization
create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  folder_type text not null default 'event-archive' check (folder_type in ('event-archive', 'event-highlight')),
  storage_prefix text not null default 'event-archives/',
  description text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_media_folders_slug on public.media_folders (slug);
create index if not exists idx_media_folders_type on public.media_folders (folder_type);

alter table public.media_folders enable row level security;

drop policy if exists "Public can view media folders" on public.media_folders;
drop policy if exists "Admins have full access to media folders" on public.media_folders;

create policy "Public can view media folders"
  on public.media_folders for select
  using (true);

create policy "Admins have full access to media folders"
  on public.media_folders for all
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Media Folder Photos Table (Tracks individual files inside folders)
create table if not exists public.media_folder_photos (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.media_folders(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text not null,
  size_bytes bigint default 0,
  mime_type text default 'image/jpeg',
  width integer,
  height integer,
  aspect_ratio text default 'portrait',
  focal_point text default 'center',
  caption text,
  alt_text text,
  sort_order integer default 0 not null,
  is_cover boolean default false not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_media_folder_photos_folder_sort
  on public.media_folder_photos (folder_id, sort_order asc);

alter table public.media_folder_photos enable row level security;

drop policy if exists "Public can view folder photos" on public.media_folder_photos;
drop policy if exists "Admins have full access to folder photos" on public.media_folder_photos;

create policy "Public can view folder photos"
  on public.media_folder_photos for select
  using (true);

create policy "Admins have full access to folder photos"
  on public.media_folder_photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Event Archives Table (Primary Organizational Unit for Work Archive)
create table if not exists public.event_archives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  event_date date not null default current_date,
  short_description text not null,
  full_description text,
  cover_image_url text,
  cover_storage_path text,
  cover_alt_text text,
  folder_id uuid references public.media_folders(id) on delete set null,
  category text default 'general',
  location text,
  client_or_institution text,
  sort_order integer default 0 not null,
  is_published boolean default true not null,
  is_featured boolean default false not null,
  hero_slides jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_event_archives_published_sort
  on public.event_archives (is_published, sort_order asc);

create index if not exists idx_event_archives_slug
  on public.event_archives (slug);

alter table public.event_archives enable row level security;

drop policy if exists "Public can view published event archives" on public.event_archives;
drop policy if exists "Admins have full access to event archives" on public.event_archives;

create policy "Public can view published event archives"
  on public.event_archives for select
  using (is_published = true or public.is_admin());

create policy "Admins have full access to event archives"
  on public.event_archives for all
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Event Highlights Table (Optional Curated Features Strictly Belonging to Specific Event)
create table if not exists public.event_highlights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_archives(id) on delete cascade,
  title text not null,
  slug text not null,
  short_description text not null,
  cover_image_url text not null,
  cover_storage_path text,
  folder_id uuid references public.media_folders(id) on delete set null,
  sort_order integer default 0 not null,
  is_published boolean default true not null,
  hero_slides jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  constraint uq_event_highlight_slug unique (event_id, slug)
);

create index if not exists idx_event_highlights_event_sort
  on public.event_highlights (event_id, is_published, sort_order asc);

alter table public.event_highlights enable row level security;

drop policy if exists "Public can view published event highlights" on public.event_highlights;
drop policy if exists "Admins have full access to event highlights" on public.event_highlights;

create policy "Public can view published event highlights"
  on public.event_highlights for select
  using (is_published = true or public.is_admin());

create policy "Admins have full access to event highlights"
  on public.event_highlights for all
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Helper Function to Get Photo Counts & Folder Assignments
create or replace function public.get_media_folders_with_meta(p_folder_type text default null)
returns table (
  id uuid,
  name text,
  slug text,
  folder_type text,
  storage_prefix text,
  description text,
  created_at timestamptz,
  updated_at timestamptz,
  photo_count bigint,
  assigned_events_count bigint,
  assigned_highlights_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    f.id,
    f.name,
    f.slug,
    f.folder_type,
    f.storage_prefix,
    f.description,
    f.created_at,
    f.updated_at,
    (select count(*) from public.media_folder_photos p where p.folder_id = f.id) as photo_count,
    (select count(*) from public.event_archives e where e.folder_id = f.id) as assigned_events_count,
    (select count(*) from public.event_highlights h where h.folder_id = f.id) as assigned_highlights_count
  from public.media_folders f
  where (p_folder_type is null or f.folder_type = p_folder_type)
  order by f.name asc;
$$;

grant execute on function public.get_media_folders_with_meta(text) to authenticated, anon, service_role;
