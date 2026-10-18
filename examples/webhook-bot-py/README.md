# Python webhook bot (minimal)

Flask app that receives Telegram updates. Same role as the TypeScript example: host the bot yourself instead of Vercel `api/bot.js`.

## Setup

```bash
cd examples/webhook-bot-py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python bot.py
```

## Environment

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | BotFather token |
| `WEBHOOK_SECRET` | `secret_token` for `setWebhook` |
| `WEB_APP_URL` | Mini App URL for `/start` button |
| `PORT` | Default `8080` |

## Register webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://YOUR_HOST/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>"
```

Point `WEB_APP_URL` at your deployed `web/` build. Portfolio API stays on Supabase edge.
