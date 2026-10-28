-- ==============================================================================
-- MIGRATION 01: INITIAL CORE SCHEMA (PORTFOLIO, PRINT PRODUCTS, LEADS)
-- Preserves existing OFFPRINT tables and non-destructively upgrades policies
-- ==============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- 1. Core Enums
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

-- 2. Table: portfolio_projects
create table if not exists public.portfolio_projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  client_name text not null,
  category portfolio_category_enum not null,
  is_flagship boolean default false,
  thumbnail_url text not null,
  gallery_urls text[] default array[]::text[],
  video_url text,
  completed_date date,
  description text,
  created_at timestamptz default now() not null
);

alter table public.portfolio_projects add column if not exists description text;

-- 3. Table: print_products
create table if not exists public.print_products (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category print_category_enum not null,
  material_specs text not null,
  image_url text not null,
  gallery_urls text[] default array[]::text[],
  min_order_qty integer not null default 50,
  is_trending boolean default false,
  sample_finish text,
  created_at timestamptz default now() not null
);

alter table public.print_products add column if not exists sample_finish text;

-- 4. Table: leads
create table if not exists public.leads (
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

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

