export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: Uint8Array): Promise<ArrayBuffer> {
  const keyBuffer = key instanceof Uint8Array ? key.buffer : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, data);
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 7200,
): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  const authDate = params.get("auth_date");
  if (!authDate) return false;
  const age = Math.floor(Date.now() / 1000) - Number(authDate);
  if (!Number.isFinite(age) || age < 0 || age > maxAgeSec) return false;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretKey = await hmacSha256(encoder.encode("WebAppData"), encoder.encode(botToken));
  const calculatedHash = toHex(await hmacSha256(secretKey, encoder.encode(dataCheckString)));

  return secureEqual(calculatedHash, hash);
}

export function getTelegramUser(initData: string): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const userStr = params.get("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as TelegramUser;
  } catch {
    return null;
  }
}
