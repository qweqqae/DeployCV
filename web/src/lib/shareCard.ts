import html2canvas from 'html2canvas';
import { uploadImage, sendPortfolioCard } from './api';
import { fetchCoverAsDataUrl, fetchImageAsDataUrl } from './prepareCoverImage';
import { SHARE_CARD_WIDTH } from '../components/ShareCard';

const CAPTURE_SCALE = 4;
const CAPTURE_TIMEOUT_MS = 20000;
const IMAGE_WAIT_MS = 4000;
const COVER_READY_MS = 8000;

export interface ShareCardCapture {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
}

const SHARE_MAX_WIDTH = 1280;
/** Telegram often shows thumb_url in the chat bubble; 320px looked blurry on phones. */
const SHARE_THUMB_WIDTH = 720;

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Failed to create image'));
      else resolve(blob);
    }, 'image/jpeg', quality);
  });
}

function resizeCanvas(source: HTMLCanvasElement, targetWidth: number): HTMLCanvasElement {
  const scale = targetWidth / source.width;
  const targetHeight = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitForPaint() {
  await document.fonts?.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function showCaptureHost(host: HTMLElement) {
  host.classList.add('card-capture-host--active');
  host.style.left = '0';
  host.style.top = '0';
  host.style.opacity = '0';
  host.style.visibility = 'visible';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
}

function hideCaptureHost(host: HTMLElement) {
  host.classList.remove('card-capture-host--active');
  host.style.left = '';
  host.style.top = '';
  host.style.opacity = '';
  host.style.visibility = '';
  host.style.pointerEvents = '';
  host.style.zIndex = '';
}

async function waitForShareCardReady(host: HTMLElement) {
  const start = Date.now();

  while (Date.now() - start < COVER_READY_MS) {
    const card = host.querySelector('.share-card-export');
    if (!card) {
      await sleep(50);
      continue;
    }

    const cover = host.querySelector('[data-share-cover]') as HTMLImageElement | null;
    const coverReady = cover?.complete && cover.naturalWidth > 0;
    const coverOptional = !cover && Date.now() - start > 1500;

    const badges = Array.from(
      host.querySelectorAll('[data-share-stack-badge]'),
    ) as HTMLImageElement[];
    const badgesReady = badges.length === 0 || badges.every(
      (badge) => badge.dataset.badgeReady === 'true',
    );

    if ((coverReady || coverOptional) && badgesReady) {
      return;
    }

    await sleep(100);
  }
}

async function inlineShareImages(host: HTMLElement) {
  const avatar = host.querySelector('[data-share-avatar]') as HTMLImageElement | null;
  const cover = host.querySelector('[data-share-cover]') as HTMLImageElement | null;

  const tasks: Promise<void>[] = [];

  if (avatar?.src && !avatar.src.startsWith('data:')) {
    tasks.push(
      fetchImageAsDataUrl(avatar.src).then((dataUrl) => {
        if (dataUrl) avatar.src = dataUrl;
      }),
    );
  }

  if (cover?.src && !cover.src.startsWith('data:')) {
    const width = cover.offsetWidth || SHARE_CARD_WIDTH;
    const height = cover.offsetHeight || 200;
    tasks.push(
      fetchCoverAsDataUrl(cover.src, width, height).then((dataUrl) => {
        if (!dataUrl) return;
        cover.src = dataUrl;
        cover.style.objectFit = 'fill';
        cover.style.width = '100%';
        cover.style.height = '100%';
      }),
    );
  }

  await Promise.all(tasks);
}

async function waitForImages(host: HTMLElement, selector: string, timeoutMs = IMAGE_WAIT_MS) {
  const images = Array.from(host.querySelectorAll(selector)) as HTMLImageElement[];

  await Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, timeoutMs);
      img.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve();
      };
    });
  }));
}

async function captureShareCard(host: HTMLElement): Promise<{
  fullBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
}> {
  const element = host.querySelector('.share-card-export') as HTMLElement | null;
  if (!element) throw new Error('Share card not found');

  const width = element.offsetWidth || SHARE_CARD_WIDTH;
  const height = element.offsetHeight || element.scrollHeight;

  const canvas = await html2canvas(element, {
    backgroundColor: '#111111',
    scale: CAPTURE_SCALE,
    width,
    height,
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: IMAGE_WAIT_MS,
    scrollX: 0,
    scrollY: 0,
    onclone: (_doc, clonedElement) => {
      const el = clonedElement as HTMLElement;
      el.style.transform = 'none';
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.width = `${width}px`;
      el.style.maxWidth = `${SHARE_CARD_WIDTH}px`;
      el.style.overflow = 'hidden';
      el.style.boxSizing = 'border-box';

      clonedElement.querySelectorAll('img').forEach((node) => {
        const image = node as HTMLImageElement;
        image.style.maxWidth = 'none';
      });
    },
  });

  let fullCanvas = canvas;
  if (canvas.width > SHARE_MAX_WIDTH) {
    fullCanvas = resizeCanvas(canvas, SHARE_MAX_WIDTH);
  }

  const thumbCanvas = resizeCanvas(fullCanvas, SHARE_THUMB_WIDTH);
  const fullBlob = await canvasToJpeg(fullCanvas, 0.93);
  const thumbBlob = await canvasToJpeg(thumbCanvas, 0.9);

  return {
    fullBlob,
    thumbBlob,
    width: fullCanvas.width,
    height: fullCanvas.height,
    thumbWidth: thumbCanvas.width,
    thumbHeight: thumbCanvas.height,
  };
}

async function captureShareCardFromHost(host: HTMLElement) {
  await waitForPaint();
  await waitForShareCardReady(host);
  await inlineShareImages(host);
  await waitForImages(host, '[data-share-avatar], [data-share-cover], [data-share-stack-badge]');
  await sleep(250);
  return captureShareCard(host);
}

/** JPEG required for Telegram inline / prepared share photos. */
export async function captureShareCardImage(): Promise<ShareCardCapture | null> {
  const host = document.querySelector('.card-capture-host') as HTMLElement | null;
  if (!host) return null;

  showCaptureHost(host);
  try {
    const {
      fullBlob,
      thumbBlob,
      width,
      height,
      thumbWidth,
      thumbHeight,
    } = await captureShareCardFromHost(host);
    const [url, thumbUrl] = await Promise.all([
      uploadImage(new File([fullBlob], 'portfolio-card.jpg', { type: 'image/jpeg' }), 'share-temp'),
      uploadImage(new File([thumbBlob], 'portfolio-thumb.jpg', { type: 'image/jpeg' }), 'share-temp'),
    ]);
    return { url, thumbUrl, width, height, thumbWidth, thumbHeight };
  } finally {
    hideCaptureHost(host);
  }
}

async function captureAndSendPortfolioCardInternal(): Promise<void> {
  const host = document.querySelector('.card-capture-host') as HTMLElement | null;
  if (!host) return;

  showCaptureHost(host);

  try {
    const { fullBlob } = await captureShareCardFromHost(host);
    const file = new File([fullBlob], 'portfolio-card.jpg', { type: 'image/jpeg' });
    const imageUrl = await uploadImage(file, 'cards');
    await sendPortfolioCard(imageUrl);
  } finally {
    hideCaptureHost(host);
  }
}

export async function captureAndSendPortfolioCard(): Promise<void> {
  await Promise.race([
    captureAndSendPortfolioCardInternal(),
    sleep(CAPTURE_TIMEOUT_MS).then(() => {
      throw new Error('Card capture timed out');
    }),
  ]);
}
