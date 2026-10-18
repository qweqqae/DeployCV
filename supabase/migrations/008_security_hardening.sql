-- Safe public read without telegram_id (view runs with owner privileges, not invoker RLS).
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  id,
  username,
  display_name,
  bio,
  avatar_url,
  header_image_url,
  activity_status,
  activity_message,
  github_username,
  github_readme,
  theme,
  social_links,
  share_card_url,
  is_public,
  created_at,
  updated_at
FROM public.profiles
WHERE is_public = true;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;

-- Simple rate-limit buckets (service role only; no client policies).
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
