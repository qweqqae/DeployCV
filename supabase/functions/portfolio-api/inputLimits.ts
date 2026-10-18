const LIMITS = {
  displayName: 120,
  bio: 12_000,
  activityMessage: 200,
  githubUsername: 80,
  githubReadme: 100_000,
  sectionTitle: 200,
  sectionContent: 50_000,
  themeJson: 32_000,
  shareMessage: 900,
} as const;

export function clampText(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function clampRequiredText(value: unknown, max: number, fallback = ""): string {
  const out = clampText(value, max);
  return out ?? fallback;
}

export function clampTheme(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    return {};
  }
  if (serialized.length > LIMITS.themeJson) {
    return {};
  }
  const theme = value as Record<string, unknown>;
  if (typeof theme.shareMessage === "string") {
    theme.shareMessage = theme.shareMessage.trim().slice(0, LIMITS.shareMessage);
  }
  return theme;
}

export function sanitizeProfileUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  if ("display_name" in body) {
    updates.display_name = clampText(body.display_name, LIMITS.displayName);
  }
  if ("bio" in body) {
    updates.bio = clampText(body.bio, LIMITS.bio);
  }
  if ("activity_message" in body) {
    updates.activity_message = clampText(body.activity_message, LIMITS.activityMessage);
  }
  if ("github_username" in body) {
    updates.github_username = clampText(body.github_username, LIMITS.githubUsername);
  }
  if ("github_readme" in body) {
    updates.github_readme = clampText(body.github_readme, LIMITS.githubReadme);
  }
  if ("activity_status" in body) {
    const status = clampText(body.activity_status, 32);
    if (status) updates.activity_status = status;
  }
  if ("is_public" in body && typeof body.is_public === "boolean") {
    updates.is_public = body.is_public;
  }

  return updates;
}

export function sanitizeTechStackItem(item: Record<string, unknown>, sortOrder: number) {
  const style = clampRequiredText(item.style, 32, "flat");
  const badgeSize = clampRequiredText(item.badge_size, 8, "md");
  const color = clampRequiredText(item.color, 16, "#6366f1");
  return {
    label: clampRequiredText(item.label, 80, "Tech"),
    color: color.startsWith("#") ? color : "#6366f1",
    logo: clampText(item.logo, 64),
    badge_url: null as string | null,
    style,
    badge_size: badgeSize,
    sort_order: sortOrder,
  };
}

export function sanitizeSectionInput(section: Record<string, unknown>, sortOrder: number) {
  return {
    title: clampRequiredText(section.title, LIMITS.sectionTitle, "Section"),
    content: clampText(section.content, LIMITS.sectionContent),
    section_type: clampRequiredText(section.section_type, 32, "text"),
    sort_order: sortOrder,
    is_visible: section.is_visible ?? true,
  };
}
