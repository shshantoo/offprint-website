-- =============================================================================
-- Migration: 20261030000003_slider_settings.sql
-- Description: Centralized Slider & Carousel Timing Settings
-- =============================================================================

INSERT INTO public.site_settings (key, value, updated_at)
VALUES (
  'slider_settings',
  '{
    "hero_slider": {
      "autoplay_enabled": true,
      "interval_seconds": 6,
      "transition_duration_ms": 800,
      "pause_on_hover": true
    },
    "archives_carousel": {
      "autoplay_enabled": true,
      "interval_seconds": 5,
      "transition_duration_ms": 600,
      "pause_on_hover": true
    },
    "highlighted_events": {
      "autoplay_enabled": true,
      "interval_seconds": 6,
      "transition_duration_ms": 700,
      "pause_on_hover": true
    },
    "event_hero_slider": {
      "autoplay_enabled": true,
      "interval_seconds": 4,
      "transition_duration_ms": 600,
      "pause_on_hover": true
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

