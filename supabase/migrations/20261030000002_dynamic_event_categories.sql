-- Migration: Dynamic Event Archive Categories & Associations
-- Date: 2026-10-30

CREATE TABLE IF NOT EXISTS public.event_archive_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_archive_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_archive_categories' AND policyname = 'Public categories are viewable by everyone'
  ) THEN
    CREATE POLICY "Public categories are viewable by everyone"
      ON public.event_archive_categories
      FOR SELECT
      USING (is_active = true OR auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_archive_categories' AND policyname = 'Admins can insert categories'
  ) THEN
    CREATE POLICY "Admins can insert categories"
      ON public.event_archive_categories
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_archive_categories' AND policyname = 'Admins can update categories'
  ) THEN
    CREATE POLICY "Admins can update categories"
      ON public.event_archive_categories
      FOR UPDATE
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_archive_categories' AND policyname = 'Admins can delete categories'
  ) THEN
    CREATE POLICY "Admins can delete categories"
      ON public.event_archive_categories
      FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

ALTER TABLE public.event_archives
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_archive_categories(id) ON DELETE SET NULL;

INSERT INTO public.event_archive_categories (name, slug, description, sort_order, is_active)
VALUES ('Convocation', 'convocation', 'University Convocations and Academic Graduation Ceremonies', 1, true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

UPDATE public.event_archives
SET
  category = 'Convocation',
  category_id = (SELECT id FROM public.event_archive_categories WHERE name = 'Convocation' LIMIT 1),
  updated_at = now();

