import type { Profile, TechStackItem, PortfolioSection } from '../types';
import { getTelegramWebApp } from './telegram';

function resolveApiUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (import.meta.env.PROD) {
    return '/api/portfolio';
  }
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-api`;
}

const API_URL = resolveApiUrl();
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_PROXY = API_URL.startsWith('/');
const DEFAULT_TIMEOUT = 12000;
const SAVE_TIMEOUT = 45000;

export function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function getInitData(): string {
  return getTelegramWebApp()?.initData || '';
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: Record<string, unknown> = {};

  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
    }
  }

  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const initData = getInitData();

  if (!initData && method !== 'GET') {
    throw new Error('Open the app from Telegram to save changes');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData,
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!USE_PROXY && ANON_KEY) {
    headers.Authorization = `Bearer ${ANON_KEY}`;
  }

  const doFetch = async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      return parseResponse<T>(res);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out. Try again.');
      }
      if (err instanceof TypeError) {
        throw new Error(`Connection error: ${err.message}`);
      }
      throw err;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  if (method === 'GET') {
    return doFetch();
  }

  try {
    return await doFetch();
  } catch (first) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return doFetch();
  }
}

export async function getMyProfile(): Promise<{
  profile: Profile | null;
  techStack: TechStackItem[];
  sections: PortfolioSection[];
}> {
  return apiFetch('/me');
}

export async function createProfile(input: {
  username: string;
  display_name: string;
  avatar_url?: string | null;
}): Promise<Profile> {
  const data = await apiFetch<{ profile: Profile }>('/profile', {
    method: 'POST',
    body: JSON.stringify(input),
  }, SAVE_TIMEOUT);
  return data.profile;
}

export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  const data = await apiFetch<{ profile: Profile }>('/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, SAVE_TIMEOUT);
  return data.profile;
}

export async function saveTechStack(items: Omit<TechStackItem, 'id' | 'profile_id'>[]): Promise<void> {
  await apiFetch('/tech-stack', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  }, SAVE_TIMEOUT);
}

export async function saveSections(sections: Omit<PortfolioSection, 'id' | 'profile_id'>[]): Promise<void> {
  await apiFetch('/sections', {
    method: 'PUT',
    body: JSON.stringify({ sections }),
  }, SAVE_TIMEOUT);
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const data = await apiFetch<{ url: string }>('/upload', {
    method: 'POST',
    body: JSON.stringify({ file: base64, filename: file.name, folder }),
  }, SAVE_TIMEOUT);
  return data.url;
}

export async function sendPortfolioCard(imageUrl: string): Promise<void> {
  await apiFetch('/send-card', {
    method: 'POST',
    body: JSON.stringify({ image_url: imageUrl }),
  }, SAVE_TIMEOUT);
}

