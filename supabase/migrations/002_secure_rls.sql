-- Tighten RLS: public read only, all writes via Edge Functions (service role)

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own tech stack" ON tech_stack;
DROP POLICY IF EXISTS "Users can manage own sections" ON portfolio_sections;
DROP POLICY IF EXISTS "Anyone can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete portfolio images" ON storage.objects;

DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Tech stack viewable for public profiles" ON tech_stack;
CREATE POLICY "Tech stack viewable for public profiles" ON tech_stack
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.is_public = true)
  );

DROP POLICY IF EXISTS "Sections viewable for public profiles" ON portfolio_sections;
CREATE POLICY "Sections viewable for public profiles" ON portfolio_sections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.is_public = true)
  );

DROP POLICY IF EXISTS "Public read portfolio images" ON storage.objects;
CREATE POLICY "Public read portfolio images" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio-images');

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
