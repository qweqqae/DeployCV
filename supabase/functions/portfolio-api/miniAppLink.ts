export function getMiniAppShortName(): string {
  return Deno.env.get("MINI_APP_SHORT_NAME") || "cvapp";
}

export function portfolioStartAppLink(botUsername: string, username: string): string {
  const short = getMiniAppShortName();
  const nick = String(username || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  return `https://t.me/${botUsername}/${short}?startapp=${nick}`;
}
