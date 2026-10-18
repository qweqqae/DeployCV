import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SHARE_TEMP_TTL_MS = 10 * 60 * 1000;

export async function purgeExpiredShareTemp(
  supabase: SupabaseClient,
  profileId: string,
): Promise<void> {
  const prefix = `share-temp/${profileId}`;
  const { data: files, error } = await supabase.storage.from("portfolio-images").list(prefix, {
    limit: 100,
  });

  if (error || !files?.length) return;

  const cutoff = Date.now() - SHARE_TEMP_TTL_MS;
  const toRemove: string[] = [];

  for (const file of files) {
    if (!file.name) continue;
    const created = file.created_at ? new Date(file.created_at).getTime() : NaN;
    const ts = Number.isFinite(created) ? created : Number.parseInt(file.name.split(".")[0] ?? "", 10);
    if (Number.isFinite(ts) && ts < cutoff) {
      toRemove.push(`${prefix}/${file.name}`);
    }
  }

  if (toRemove.length > 0) {
    await supabase.storage.from("portfolio-images").remove(toRemove);
  }
}

export function shareTempStoragePath(profileId: string, ext = "jpg"): string {
  const token = crypto.randomUUID();
  return `share-temp/${profileId}/${token}.${ext}`;
}
