ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_supporter BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supporter_since TIMESTAMPTZ;

DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public.public_profiles
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
  is_supporter,
  supporter_since,
  created_at,
  updated_at
FROM public.profiles
WHERE is_public = true;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
