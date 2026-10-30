-- =============================================================================
-- Migration: 20261030000004_print_merch_visibility.sql
-- Description: Sets default visibility of Physical Print & Merchandise sections
--              and promotional links on public frontend to false (OFF) within
--              public.site_settings ('homepage_config' and 'general').
-- =============================================================================

-- Ensure homepage_config has show_print_bridge set to false by default
UPDATE public.site_settings
SET value = jsonb_set(value, '{show_print_bridge}', 'false'::jsonb, true)
WHERE key = 'homepage_config';

-- Ensure general site settings has show_print_links and show_print_merch_frontend set to false by default
UPDATE public.site_settings
SET value = jsonb_set(
  jsonb_set(value, '{show_print_links}', 'false'::jsonb, true),
  '{show_print_merch_frontend}',
  'false'::jsonb,
  true
)
WHERE key = 'general';
