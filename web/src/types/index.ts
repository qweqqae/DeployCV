export interface ProfileFonts {
  displayName?: string;
  username?: string;
  status?: string;
  bio?: string;
  heading?: string;
}

export interface ProfileTheme {
  primaryColor: string;
  cardStyle: 'horizontal' | 'vertical';
  darkMode: boolean;
  displayMode?: 'card' | 'readme';
  techBadgeSize?: 'sm' | 'md' | 'lg';
  customStatusEmoji?: string;
  borderRadius?: 'sm' | 'md' | 'lg';
  avatarSize?: 'sm' | 'md' | 'lg';
  coverHeight?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showBio?: boolean;
  showTechStack?: boolean;
  showTechStackLabel?: boolean;
  showGithub?: boolean;
  blockBackground?: boolean;
  githubBlockPadding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  accentColor?: string;
  fontFamily?: string;
  fonts?: ProfileFonts;
  headerGrayscale?: boolean;
  readmeSource?: {
    owner: string;
    repo: string;
    branch?: string;
  };
  shareCardUrl?: string;
  /** Full Telegram share text (link appended automatically on send). */
  shareMessage?: string;
  /** UI language for default share text when shareMessage is empty. */
  uiLocale?: 'en' | 'ru';
  /** Append t.me direct link to share message caption (button still shown). */
  shareIncludeDirectLink?: boolean;
  /** Show Community Partner badge (only if profile.is_supporter). */
  showSupporterBadge?: boolean;
  /** Where to show the patron badge on the card. */
  supporterBadgePlacement?: 'username' | 'status';
}

export const DEFAULT_THEME: ProfileTheme = {
  primaryColor: '#ffffff',
  cardStyle: 'horizontal',
  darkMode: true,
  displayMode: 'card',
  techBadgeSize: 'md',
  borderRadius: 'md',
  avatarSize: 'md',
  coverHeight: 'md',
  showStatus: true,
  showBio: true,
  showTechStack: true,
  showTechStackLabel: true,
  showGithub: true,
  blockBackground: true,
  githubBlockPadding: 'md',
  fontFamily: 'space-grotesk',
  fonts: {},
  headerGrayscale: false,
  customStatusEmoji: '',
};

export interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  telegram?: string;
}

export interface Profile {
  id: string;
  telegram_id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  header_image_url: string | null;
  activity_status: string;
  activity_message: string | null;
  github_username: string | null;
  github_readme: string | null;
  theme: ProfileTheme;
  social_links: SocialLinks;
  is_public: boolean;
  is_supporter?: boolean;
  supporter_since?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechStackItem {
  id: string;
  profile_id: string;
  label: string;
  color: string;
  logo: string | null;
  badge_url?: string | null;
  style: 'flat' | 'for-the-badge' | 'social';
  badge_size?: 'sm' | 'md' | 'lg';
  sort_order: number;
}

export interface PortfolioSection {
  id: string;
  profile_id: string;
  title: string;
  content: string | null;
  section_type: 'text' | 'projects' | 'experience' | 'education';
  sort_order: number;
  is_visible: boolean;
}

export const ACTIVITY_STATUSES = [
  { value: 'online', label: 'Online', emoji: '🟢' },
  { value: 'coding', label: 'Coding', emoji: '💻' },
  { value: 'designing', label: 'Designing', emoji: '🎨' },
  { value: 'learning', label: 'Learning', emoji: '📚' },
  { value: 'custom', label: 'Custom', emoji: '' },
] as const;

export const POPULAR_TECH = [
  { label: 'React', color: '#61DAFB', logo: 'react' },
  { label: 'TypeScript', color: '#3178C6', logo: 'typescript' },
  { label: 'Node.js', color: '#339933', logo: 'nodejs' },
  { label: 'Python', color: '#3776AB', logo: 'python' },
  { label: 'Go', color: '#00ADD8', logo: 'go' },
  { label: 'Rust', color: '#000000', logo: 'rust' },
  { label: 'Vue', color: '#4FC08D', logo: 'vuejs' },
  { label: 'Next.js', color: '#000000', logo: 'nextdotjs' },
  { label: 'Docker', color: '#2496ED', logo: 'docker' },
  { label: 'PostgreSQL', color: '#4169E1', logo: 'postgresql' },
  { label: 'MongoDB', color: '#47A248', logo: 'mongodb' },
  { label: 'AWS', color: '#FF9900', logo: 'amazonaws' },
  { label: 'Figma', color: '#F24E1E', logo: 'figma' },
  { label: 'Tailwind', color: '#06B6D4', logo: 'tailwindcss' },
  { label: 'Supabase', color: '#3ECF8E', logo: 'supabase' },
  { label: 'Vercel', color: '#000000', logo: 'vercel' },
];
