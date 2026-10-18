-- Public portfolio pages should not expose telegram_id via PostgREST.
CREATE OR REPLACE VIEW public_profiles
WITH (security_invoker = true) AS
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
FROM profiles
WHERE is_public = true;

GRANT SELECT ON public_profiles TO anon, authenticated;
