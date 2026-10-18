import { preparePortfolioShare } from './shareApi';
import { captureShareCardImage } from './shareCard';
import { portfolioStartAppLink } from './miniAppLink';
import type { Locale } from './i18n';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export type ShareProgress = 'generating' | 'preparing' | 'opening';

interface ShareMessageFailedEvent {
  error?: string;
}

interface TelegramWebApp {
  initData: string;
  version?: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  onEvent?: (eventType: string, handler: (...args: unknown[]) => void) => void;
  offEvent?: (eventType: string, handler: (...args: unknown[]) => void) => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setText: (text: string) => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  themeParams: Record<string, string>;
  colorScheme: 'light' | 'dark';
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor: (color: string) => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  shareMessage: (msgId: string, callback?: (success: boolean) => void) => void;
  showAlert?: (message: string, callback?: () => void) => void;
  shareToStory?: (mediaUrl: string, params?: { text?: string }) => void;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user ?? null;
}

export function getStartParam(): string | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.start_param ?? null;
}

export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#000000');
    tg.setBackgroundColor('#000000');
    tg.setBottomBarColor('#000000');
  }
}

export function getShareLink(username: string): string {
  return portfolioStartAppLink(username);
}

function openClassicShare(username: string, displayName: string): void {
  const tg = getTelegramWebApp();
  const link = getShareLink(username);
  const text = `Check out ${displayName}'s portfolio!`;

  if (tg) {
    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    return;
  }

  navigator.clipboard.writeText(link);
}

function shareMessageWithEvents(tg: TelegramWebApp, preparedId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finishOk = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      tg.offEvent?.('shareMessageSent', onSent);
      tg.offEvent?.('shareMessageFailed', onFailed);
      resolve();
    };

    const finishErr = (message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      tg.offEvent?.('shareMessageSent', onSent);
      tg.offEvent?.('shareMessageFailed', onFailed);
      reject(new Error(message));
    };

    const onSent = () => finishOk();
    const onFailed = (event: unknown) => {
      const err = (event as ShareMessageFailedEvent)?.error || 'MESSAGE_SEND_FAILED';
      finishErr(err);
    };

    const watchdog = window.setTimeout(() => {
      finishErr('Share dialog did not open. Update Telegram and try again.');
    }, 20000);

    tg.onEvent?.('shareMessageSent', onSent);
    tg.onEvent?.('shareMessageFailed', onFailed);

    try {
      tg.shareMessage(preparedId, (success) => {
        if (success) finishOk();
      });
    } catch (e) {
      finishErr(e instanceof Error ? e.message : 'shareMessage failed');
    }
  });
}

export async function shareProfile(
  username: string,
  displayName: string,
  options?: {
    onProgress?: (phase: ShareProgress) => void;
    shareMessage?: string | null;
    locale?: Locale;
    shareIncludeDirectLink?: boolean;
  },
): Promise<void> {
  const report = (phase: ShareProgress) => options?.onProgress?.(phase);
  const tg = getTelegramWebApp();

  if (!tg?.initData) {
    openClassicShare(username, displayName);
    return;
  }

  if (typeof tg.shareMessage !== 'function') {
    throw new Error('Обнови Telegram: нужна поддержка shareMessage (Bot API 8.0+)');
  }

  report('generating');
  tg.MainButton?.showProgress?.(true);

  let capture: Awaited<ReturnType<typeof captureShareCardImage>> = null;
  try {
    capture = await captureShareCardImage();
  } finally {
    tg.MainButton?.hideProgress?.();
  }

  if (!capture?.url) {
    throw new Error('Could not generate visit card. Open editor or home and try again.');
  }

  report('preparing');
  const preparedId = await preparePortfolioShare(username, capture, {
    shareMessage: options?.shareMessage,
    locale: options?.locale,
    shareIncludeDirectLink: options?.shareIncludeDirectLink,
  });

  report('opening');
  await shareMessageWithEvents(tg, preparedId);
}

export function haptic(type: 'success' | 'error' | 'light' = 'light'): void {
  const tg = getTelegramWebApp();
  if (!tg) return;
  if (type === 'success' || type === 'error') {
    tg.HapticFeedback.notificationOccurred(type);
  } else {
    tg.HapticFeedback.impactOccurred('light');
  }
}
