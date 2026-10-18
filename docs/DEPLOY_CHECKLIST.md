# Fresh deploy checklist (E2E)

Use this after cloning [DeployCV](https://github.com/qweqqae/DeployCV). Automated checks from a clean clone are marked **verified**.

## Phase 0 — Repo sanity (**verified**)

- [ ] `git clone` + `cd web && cp .env.example .env && npm install && npm run build` succeeds (placeholders only; runtime needs real Supabase).
- [ ] No secrets in repo (only `.env.example` files).
- [ ] `examples/webhook-bot-ts`: `npm install && npm run build` (**verified**).
- [ ] `examples/webhook-bot-py`: `python3 -m py_compile bot.py` (**verified**).
- [ ] Root `api/portfolio.js` / `api/image-proxy.js` load without env (smoke import).

## Phase 1 — Supabase

- [ ] New project created; save **URL**, **anon**, **service role** (service role never in the web client).
- [ ] **Storage**: create bucket `portfolio-images`, **public** read (not created by SQL migrations).
- [ ] Run migrations `001` → `009` in order (`supabase db push` or SQL Editor). Two files share prefix `003_` — keep filename order.
- [ ] Edge secrets set (Dashboard → Edge Functions → Secrets):

  | Secret | Must match |
  |--------|------------|
  | `BOT_TOKEN` | Telegram bot token |
  | `BOT_USERNAME` | Without `@` |
  | `WEB_APP_URL` | Final HTTPS app URL (no trailing slash issues for share URLs) |
  | `BOT_API_SECRET` | Same value as Vercel `BOT_API_SECRET` |
  | `SUPABASE_URL` | Project URL |
  | `SUPABASE_SERVICE_ROLE_KEY` | Service role key |

- [ ] Deploy: `supabase functions deploy portfolio-api --project-ref YOUR_REF`

**Smoke (curl):** `GET https://YOUR_REF.supabase.co/functions/v1/portfolio-api/health` (if exposed) or call a documented public route from README.

## Phase 2 — Vercel (web + API)

- [ ] Import repo; build uses root `vercel.json` (`web/dist` + `api/*`).
- [ ] Environment variables (Production + Preview as needed):

  **Web (build):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BOT_USERNAME`, `VITE_MINI_APP_SHORT_NAME`, `VITE_APP_NAME`

  **Server:** `BOT_TOKEN`, `BOT_USERNAME`, `WEB_APP_URL`, `BOT_API_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_WEBHOOK_SECRET`, `VITE_SUPABASE_URL` (used by some API routes)

- [ ] `BOT_API_SECRET` identical on Vercel and Supabase edge.
- [ ] Deploy production; open `https://YOUR_DOMAIN` — Mini App should load (Telegram WebView).

## Phase 3 — Telegram bot

- [ ] BotFather: Mini App URL → `WEB_APP_URL`, short name → `VITE_MINI_APP_SHORT_NAME`.
- [ ] Set webhook (secret must match `TELEGRAM_WEBHOOK_SECRET`):

  ```bash
  curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
    -d "url=https://YOUR_DOMAIN/api/bot" \
    -d "secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET"
  ```

- [ ] `/start` in Telegram: welcome + Web App button.
- [ ] Optional: add `web/public/start-banner.jpg` (1200×630); `/start` and share flow reference `/start-banner.jpg` — **file not in repo**; without it, photo may be missing but app still works.

## Phase 4 — Functional smoke

- [ ] Open Mini App from bot → auth via `initData` → profile loads or empty state.
- [ ] Upload avatar/header → object appears under `portfolio-images` in Storage.
- [ ] Save profile → refresh → data persists.
- [ ] Public page `/p/:slug` (or your route) loads from `public_profiles` (no `telegram_id` leak).
- [ ] Inline / share: prepare message → caption + optional direct link checkbox behavior.
- [ ] `/donate` (if enabled): invoice → payment → supporter badge (migration `009`).

## Phase 5 — Local dev (optional)

- [ ] `web/.env` with real Supabase URL/anon; `npm run dev`.
- [ ] Dev may hit Supabase directly (`web/src/lib/api.ts`) vs `/api/portfolio` in production — expect different CORS/proxy behavior.
- [ ] Full bot locally: run `api/bot.js` with env or use `examples/webhook-bot-*` (minimal `/start` only, not full `api/bot.js` feature parity).

## Common pitfalls

| Symptom | Likely cause |
|---------|----------------|
| Profile save drops social links / avatars | Old client without `sanitizeProfileUpdates` fix — use current `main`. |
| 401 on edge upload/share | Wrong `BOT_API_SECRET` or missing `initData` |
| CORS errors from random origins | By design — only `WEB_APP_URL` and Telegram origins |
| Images won’t load in card | URL not on allowlist (Supabase public bucket or `WEB_APP_URL`) |
| Webhook 403 | `TELEGRAM_WEBHOOK_SECRET` mismatch |
| Upload fails | Bucket `portfolio-images` missing or not public read |
| Two `003_*` migrations | Both required; do not skip either |

## Production reference (not part of OSS clone)

The maintainer’s live app may use different branding (`VITE_APP_NAME`, assets). OSS defaults are generic on purpose.
