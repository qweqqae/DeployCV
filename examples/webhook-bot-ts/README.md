# TypeScript webhook bot (minimal)

Standalone Express server that accepts Telegram webhooks. Use this if you do **not** want to run the bot on Vercel.

## Setup

```bash
cd examples/webhook-bot-ts
cp .env.example .env
npm install
npm run build
npm start
```

## Environment

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | From BotFather |
| `WEBHOOK_SECRET` | Same as `TELEGRAM_WEBHOOK_SECRET` in main app |
| `PORT` | HTTP port (default `8080`) |
| `WEBHOOK_PATH` | Path segment (default `/telegram/webhook`) |

## Register webhook

```bash
export BOT_TOKEN=...
export PUBLIC_URL=https://your-server.example.com
curl "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d "url=${PUBLIC_URL}/telegram/webhook" \
  -d "secret_token=${WEBHOOK_SECRET}"
```

## Extending

- Import handlers from the root `api/bot.js` pattern, or call your Supabase edge routes with `Authorization: Bearer <anon>` and `X-Bot-Token: <BOT_API_SECRET>`.
- For Mini App + portfolio features, keep `portfolio-api` deployed and point `WEB_APP_URL` at your Vercel site.
