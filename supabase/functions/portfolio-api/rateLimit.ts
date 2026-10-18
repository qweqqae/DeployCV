import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const LIMITS: Record<string, { max: number; windowSec: number }> = {
  upload: { max: 40, windowSec: 3600 },
  "prepare-share": { max: 45, windowSec: 3600 },
  "send-card": { max: 20, windowSec: 3600 },
};

export async function consumeRateLimit(
  supabase: SupabaseClient,
  action: keyof typeof LIMITS,
  subject: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const rule = LIMITS[action];
  if (!rule) return { ok: true };

  const bucketKey = `${action}:${subject}`;
  const now = Date.now();
  const windowMs = rule.windowSec * 1000;

  const { data: row } = await supabase
    .from("api_rate_limits")
    .select("count, window_start")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (!row) {
    const { error } = await supabase.from("api_rate_limits").insert({
      bucket_key: bucketKey,
      count: 1,
      window_start: new Date(now).toISOString(),
    });
    if (error) {
      console.error("rate_limit insert:", error.message);
      return { ok: true };
    }
    return { ok: true };
  }

  const windowStart = new Date(row.window_start as string).getTime();
  if (!Number.isFinite(windowStart) || now - windowStart >= windowMs) {
    const { error } = await supabase.from("api_rate_limits").update({
      count: 1,
      window_start: new Date(now).toISOString(),
    }).eq("bucket_key", bucketKey);
    if (error) console.error("rate_limit reset:", error.message);
    return { ok: true };
  }

  const count = Number(row.count) || 0;
  if (count >= rule.max) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - windowStart)) / 1000));
    return { ok: false, retryAfterSec };
  }

  const { error } = await supabase.from("api_rate_limits").update({
    count: count + 1,
  }).eq("bucket_key", bucketKey);
  if (error) console.error("rate_limit bump:", error.message);
  return { ok: true };
}
