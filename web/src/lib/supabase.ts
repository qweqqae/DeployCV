import { createClient } from '@supabase/supabase-js';
import type { Profile, TechStackItem, PortfolioSection } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PUBLIC_PROFILE_COLUMNS = [
  'id',
  'username',
  'display_name',
  'bio',
  'avatar_url',
  'header_image_url',
  'activity_status',
  'activity_message',
  'github_username',
  'github_readme',
  'theme',
  'social_links',
  'share_card_url',
  'is_public',
  'is_supporter',
  'supporter_since',
  'created_at',
  'updated_at',
].join(', ');

/** Public read-only queries (protected by RLS) */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('username', username.toLowerCase())
    .eq('is_public', true)
    .single();

  if (error || !data) return null;
  const row = data as unknown as Omit<Profile, 'telegram_id'>;
  return { ...row, telegram_id: 0 };
}

export async function getTechStack(profileId: string): Promise<TechStackItem[]> {
  const { data, error } = await supabase
    .from('tech_stack')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order');

  if (error) return [];
  return data as TechStackItem[];
}

export async function getSections(profileId: string): Promise<PortfolioSection[]> {
  const { data, error } = await supabase
    .from('portfolio_sections')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order');

  if (error) return [];
  return data as PortfolioSection[];
}
