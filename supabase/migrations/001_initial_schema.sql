-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  header_image_url TEXT,
  activity_status TEXT DEFAULT 'online',
  activity_message TEXT,
  github_username TEXT,
  github_readme TEXT,
  theme JSONB DEFAULT '{"primaryColor":"#6366f1","cardStyle":"horizontal","darkMode":true}'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tech_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  logo TEXT,
  style TEXT DEFAULT 'flat',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  section_type TEXT DEFAULT 'text',
  sort_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_tech_stack_profile ON tech_stack(profile_id);
CREATE INDEX IF NOT EXISTS idx_sections_profile ON portfolio_sections(profile_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_stack ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Tech stack viewable for public profiles" ON tech_stack
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.is_public = true)
  );

CREATE POLICY "Users can manage own tech stack" ON tech_stack
  FOR ALL USING (true);

CREATE POLICY "Sections viewable for public profiles" ON portfolio_sections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id AND p.is_public = true)
  );

CREATE POLICY "Users can manage own sections" ON portfolio_sections
  FOR ALL USING (true);
