-- ============================================================================
-- Migration: 20261103000003_portfolio_discovery_and_payment_system.sql
-- Release: 1.9.0
-- Purpose:
-- 1. Expand media_folders folder_type constraint to support 'portfolio' and 'product'.
-- 2. Add payment and partial advance accounting columns to public.bookings.
-- 3. Upgrade sync_media_folders_and_photos() RPC to dynamically discover
--    all physical storage folders in 'portfolio-media' without hardcoding.
-- ============================================================================

-- 1. Expand folder_type CHECK constraint on media_folders
ALTER TABLE public.media_folders
  DROP CONSTRAINT IF EXISTS media_folders_folder_type_check;

ALTER TABLE public.media_folders
  ADD CONSTRAINT media_folders_folder_type_check
  CHECK (folder_type = ANY (ARRAY['event-archive'::text, 'event-highlight'::text, 'portfolio'::text, 'product'::text]));

-- Deduplicate any existing duplicate storage_path rows in media_folder_photos
DELETE FROM public.media_folder_photos
WHERE id NOT IN (
  SELECT DISTINCT ON (storage_path) id
  FROM public.media_folder_photos
  ORDER BY storage_path, created_at DESC
);

-- Ensure unique index on media_folder_photos(storage_path)
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_folder_photos_storage_path
  ON public.media_folder_photos (storage_path);

-- 2. Add Payment & Partial Advance columns to public.bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS is_partial_advance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_amount numeric,
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_verified_by text,
  ADD COLUMN IF NOT EXISTS payment_rejection_reason text;

-- Index payment status and method for efficient admin query and reporting
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings (payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON public.bookings (payment_method);

-- 3. Upgrade sync_media_folders_and_photos() to dynamically discover ALL physical storage folders
CREATE OR REPLACE FUNCTION public.sync_media_folders_and_photos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_synced_photos int := 0;
  v_discovered_folders int := 0;
  r_folder RECORD;
BEGIN
  -- Discover all distinct 2-level folder paths in 'portfolio-media'
  -- Pattern: 'event-archives/Folder Name/...', 'event-archive-highlights/Folder Name/...', 'projects/Folder Name/...'
  FOR r_folder IN
    SELECT DISTINCT
      split_part(name, '/', 1) AS root_prefix,
      split_part(name, '/', 2) AS sub_folder,
      substring(name from '^([^/]+/[^/]+)/') AS full_prefix
    FROM storage.objects
    WHERE bucket_id = 'portfolio-media'
      AND name LIKE '%/%'
      AND split_part(name, '/', 2) != ''
      AND split_part(name, '/', 2) NOT LIKE '.%'
  LOOP
    DECLARE
      v_folder_type text := 'event-archive';
      v_clean_slug text;
    BEGIN
      IF r_folder.root_prefix = 'event-archive-highlights' THEN
        v_folder_type := 'event-highlight';
      ELSIF r_folder.root_prefix = 'projects' THEN
        v_folder_type := 'portfolio';
      ELSIF r_folder.root_prefix = 'product-media' OR r_folder.root_prefix = 'products' THEN
        v_folder_type := 'product';
      ELSE
        v_folder_type := 'event-archive';
      END IF;

      v_clean_slug := lower(regexp_replace(regexp_replace(r_folder.sub_folder, '[^a-zA-Z0-9_-]', '-', 'g'), '-+', '-', 'g'));

      INSERT INTO public.media_folders (
        name,
        slug,
        folder_type,
        storage_prefix,
        description
      )
      VALUES (
        r_folder.sub_folder,
        v_clean_slug,
        v_folder_type,
        r_folder.full_prefix,
        'Storage folder: ' || r_folder.sub_folder
      )
      ON CONFLICT (slug) DO UPDATE SET
        storage_prefix = EXCLUDED.storage_prefix,
        updated_at = timezone('utc'::text, now());

      v_discovered_folders := v_discovered_folders + 1;
    END;
  END LOOP;

  -- Reconcile genuine photos for all media_folders with matching storage.objects
  INSERT INTO public.media_folder_photos (
    folder_id,
    storage_path,
    public_url,
    file_name,
    size_bytes,
    mime_type,
    alt_text,
    sort_order,
    is_cover,
    created_at
  )
  SELECT 
    f.id AS folder_id,
    o.name AS storage_path,
    'https://qqklsbbysybzivifnykd.supabase.co/storage/v1/object/public/portfolio-media/' || replace(o.name, ' ', '%20') AS public_url,
    split_part(o.name, '/', array_length(string_to_array(o.name, '/'), 1)) AS file_name,
    COALESCE((o.metadata->>'size')::bigint, (o.metadata->>'contentLength')::bigint, 0) AS size_bytes,
    COALESCE(o.metadata->>'mimetype', 'image/jpeg') AS mime_type,
    f.name || ' - ' || split_part(o.name, '/', array_length(string_to_array(o.name, '/'), 1)) AS alt_text,
    ROW_NUMBER() OVER (PARTITION BY f.id ORDER BY o.name ASC) AS sort_order,
    (ROW_NUMBER() OVER (PARTITION BY f.id ORDER BY o.name ASC) = 1) AS is_cover,
    o.created_at
  FROM public.media_folders f
  JOIN storage.objects o 
    ON o.bucket_id = 'portfolio-media'
    AND o.name LIKE (f.storage_prefix || '%')
    AND o.name NOT LIKE '%.emptyFolderPlaceholder%'
    AND split_part(o.name, '/', array_length(string_to_array(o.name, '/'), 1)) NOT LIKE '.%'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.media_folder_photos mfp WHERE mfp.storage_path = o.name
  );

  GET DIAGNOSTICS v_synced_photos = ROW_COUNT;

  RETURN jsonb_build_object(
    'status', 'success',
    'discovered_folders', v_discovered_folders,
    'synced_photos', v_synced_photos
  );
END;
$function$;
