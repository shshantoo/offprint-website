-- ==============================================================================
-- OFFPRINT (অফপ্রিন্ট) - SUPABASE POSTGRESQL SCHEMA WITH RLS & ENUMS
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Enums
do $$ begin
  create type portfolio_category_enum as enum ('corporate_summit', 'documentary', 'headshot', 'workshop', 'wedding');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type print_category_enum as enum ('cards', 'frames', 'corporate_swag', 'pens', 'banners');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type inquiry_type_enum as enum ('event_coverage', 'physical_merch');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type lead_status_enum as enum ('new', 'contacted', 'quote_sent', 'confirmed', 'archived');
exception
  when duplicate_object then null;
end $$;

-- 2. Create Table: portfolio_projects
create table if not exists portfolio_projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  client_name text not null,
  category portfolio_category_enum not null,
  is_flagship boolean default false,
  thumbnail_url text not null,
  gallery_urls text[] default array[]::text[],
  video_url text,
  completed_date date,
  created_at timestamptz default now() not null
);

-- 3. Create Table: print_products
create table if not exists print_products (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category print_category_enum not null,
  material_specs text not null,
  image_url text not null,
  gallery_urls text[] default array[]::text[],
  min_order_qty integer not null default 50,
  is_trending boolean default false,
  created_at timestamptz default now() not null
);

-- 4. Create Table: leads
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null,
  company_name text,
  email text not null,
  phone text not null,
  inquiry_type inquiry_type_enum not null,
  details text not null,
  estimated_qty text,
  event_date date,
  status lead_status_enum default 'new' not null,
  admin_notes text,
  created_at timestamptz default now() not null
);

-- 5. Row Level Security (RLS)
alter table portfolio_projects enable row level security;
alter table print_products enable row level security;
alter table leads enable row level security;

-- Policies for portfolio_projects (Public read, Authenticated write)
create policy "Public can view portfolio projects"
  on portfolio_projects for select
  using (true);

create policy "Authenticated users can manage portfolio projects"
  on portfolio_projects for all
  using (auth.role() = 'authenticated');

-- Policies for print_products (Public read, Authenticated write)
create policy "Public can view print products"
  on print_products for select
  using (true);

create policy "Authenticated users can manage print products"
  on print_products for all
  using (auth.role() = 'authenticated');

-- Policies for leads (Public can insert inquiries, Authenticated users can view and update)
create policy "Public can insert leads"
  on leads for insert
  with check (true);

create policy "Authenticated users can view and manage leads"
  on leads for all
  using (auth.role() = 'authenticated');

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;
