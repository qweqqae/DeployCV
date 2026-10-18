export function getMiniAppShortName(): string {
  return import.meta.env.VITE_MINI_APP_SHORT_NAME || 'cvapp';
}

export function portfolioStartAppLink(username: string, botUsername?: string): string {
  const bot = botUsername || import.meta.env.VITE_BOT_USERNAME || 'your_bot_username';
  const short = getMiniAppShortName();
  const nick = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `https://t.me/${bot}/${short}?startapp=${nick}`;
}
