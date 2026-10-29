-- Migration: Event Archive & Booking Event Associations, Configurable Workflow Stages Link Delivery
-- Created: 2026-10-30

-- 1. Create junction table for Event Archives <-> Booking Events
CREATE TABLE IF NOT EXISTS public.event_archive_booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_archive_id UUID NOT NULL REFERENCES public.event_archives(id) ON DELETE CASCADE,
  booking_event_id UUID NOT NULL REFERENCES public.booking_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_archive_id, booking_event_id)
);

CREATE INDEX IF NOT EXISTS idx_eabe_archive ON public.event_archive_booking_events(event_archive_id);
CREATE INDEX IF NOT EXISTS idx_eabe_booking ON public.event_archive_booking_events(booking_event_id);

ALTER TABLE public.event_archive_booking_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_archive_booking_events' AND policyname = 'Public read event_archive_booking_events'
  ) THEN
    CREATE POLICY "Public read event_archive_booking_events"
      ON public.event_archive_booking_events FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_archive_booking_events' AND policyname = 'Admin all event_archive_booking_events'
  ) THEN
    CREATE POLICY "Admin all event_archive_booking_events"
      ON public.event_archive_booking_events FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- 2. Add columns to workflow_stages for configurable link delivery and notifications
ALTER TABLE public.workflow_stages
  ADD COLUMN IF NOT EXISTS allow_link_delivery BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_link_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS send_email_on_delivery BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_send_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_validity_days INTEGER NOT NULL DEFAULT 14;

-- Update the final delivery stage to allow and require links with notifications
UPDATE public.workflow_stages
SET 
  allow_link_delivery = true,
  is_link_required = true,
  send_email_on_delivery = true,
  auto_send_email = true,
  default_validity_days = 14
WHERE is_final_delivery = true OR slug = 'delivered';
