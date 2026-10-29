-- ==============================================================================
-- MIGRATION: MINIMALIST FULL-SCREEN HERO SLIDER & DYNAMIC HOMEPAGE CMS
-- ==============================================================================

-- 1. Hero Slides Table for Full-Viewport Cinematic Slider
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  eyebrow text,
  cta_label text,
  cta_href text,
  image_url text not null,
  storage_path text,
  alt_text text,
  focal_point text default 'center',
  text_align text default 'left',
  sort_order integer default 0 not null,
  is_published boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_hero_slides_published_sort
  on public.hero_slides (is_published, sort_order asc);

alter table public.hero_slides enable row level security;

-- Drop previous policies if re-running
drop policy if exists "Public can view published hero slides" on public.hero_slides;
drop policy if exists "Admins have full access to hero slides" on public.hero_slides;

create policy "Public can view published hero slides"
  on public.hero_slides for select
  using (is_published = true or public.is_admin());

create policy "Admins have full access to hero slides"
  on public.hero_slides for all
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Real Client Testimonials Table (Empty by default, CMS-driven)
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text not null,
  role_or_title text,
  organization text,
  project_tag text,
  avatar_url text,
  sort_order integer default 0 not null,
  is_published boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_testimonials_published_sort
  on public.testimonials (is_published, sort_order asc);

alter table public.testimonials enable row level security;

drop policy if exists "Public can view published testimonials" on public.testimonials;
drop policy if exists "Admins have full access to testimonials" on public.testimonials;

create policy "Public can view published testimonials"
  on public.testimonials for select
  using (is_published = true or public.is_admin());

create policy "Admins have full access to testimonials"
  on public.testimonials for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Cleanse Dummy Claims & Update Settings
update public.site_settings
set value = jsonb_set(
  jsonb_set(
    jsonb_set(value, '{phone}', '""'::jsonb),
    '{registration_badge}', '""'::jsonb
  ),
  '{tagline}', '"Editorial Photography & Fine-Art Print Studio"'::jsonb
)
where key = 'general';

insert into public.site_settings (key, value, updated_at)
values (
  'homepage_config',
  jsonb_build_object(
    'hero_autoplay', true,
    'hero_interval_sec', 6,
    'show_ticker', true,
    'show_flagship', true,
    'show_testimonials', true,
    'show_services', true,
    'show_print_bridge', true,
    'show_quote_builder', false,
    'show_closing_cta', true,
    'flagship_heading', 'Selected Productions & Editorial Archives',
    'flagship_subheading', 'Photographic commissions across institutional summits, cultural documentaries, and executive portraiture.',
    'services_heading', 'Studio Disciplines & Commissions',
    'services_subheading', 'Structured appointment bookings with dedicated capacity management and verified live calendar availability.',
    'closing_cta_heading', 'Every Milestone Deserves Permanent Record.',
    'closing_cta_subheading', 'Commission our studio for university convocations, executive leadership portraits, or cultural documentation in Dhaka and beyond.',
    'closing_cta_button_label', 'Book a Photography Session',
    'closing_cta_button_href', '/book',
    'closing_cta_image_url', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80',
    'ticker_items', jsonb_build_array(
      'IUB 27TH CONVOCATION APPOINTMENTS',
      'EXECUTIVE & C-SUITE PORTRAITURE',
      'CULTURAL & BRAND DOCUMENTARIES',
      'CORPORATE SUMMITS & PR STILLS',
      'FINE-ART ARCHIVAL PRINTS & FRAMES',
      'STUDIO & ON-LOCATION IN DHAKA'
    )
  ),
  timezone('utc'::text, now())
)
on conflict (key) do update set
  value = excluded.value,
  updated_at = excluded.updated_at;

-- 4. Insert Verified Initial Hero Slides
insert into public.hero_slides (
  id, title, subtitle, eyebrow, cta_label, cta_href, image_url, alt_text, focal_point, text_align, sort_order, is_published
) values
(
  'e0000000-0000-0000-0000-000000000001',
  'Every Frame Holds a Story.',
  'Dedicated portrait sessions and family coverage for the upcoming graduation ceremony with live slot reservations.',
  'IUB 27TH CONVOCATION',
  'Book Convocation Session',
  '/book/convocation',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=2000&q=85',
  'Academic graduation portraiture archive',
  'center',
  'left',
  1,
  true
),
(
  'e0000000-0000-0000-0000-000000000002',
  'Enduring Visual Legacies.',
  'Editorial photography, cultural documentary archives, and bespoke archival print editions crafted in Dhaka.',
  'OFFPRINT STUDIO',
  'Explore Works Archive',
  '/works',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=2000&q=85',
  'Heritage documentary photography',
  'center',
  'left',
  2,
  true
),
(
  'e0000000-0000-0000-0000-000000000003',
  'Precision & Permanence.',
  'Studio and on-location leadership portraiture for boardrooms, institutions, and annual publications.',
  'EXECUTIVE COMMISSIONS',
  'Schedule a Session',
  '/book/traditional',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=2000&q=85',
  'Executive leadership portraits',
  'center',
  'left',
  3,
  true
)
on conflict (id) do nothing;

