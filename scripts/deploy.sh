#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ]; then
  echo "Set SUPABASE_PROJECT_REF to your Supabase project ref"
  exit 1
fi

if [ ! -f bot/.env ]; then
  echo "Create bot/.env from bot/.env.example first"
  exit 1
fi

set -a
source bot/.env
source web/.env
set +a

echo "==> Setting Supabase edge function secrets..."
if command -v supabase &>/dev/null; then
  if [ -z "${BOT_API_SECRET:-}" ]; then
    echo "BOT_API_SECRET is required in bot/.env (openssl rand -hex 32)"
    exit 1
  fi
  supabase secrets set \
    BOT_TOKEN="$BOT_TOKEN" \
    BOT_USERNAME="${BOT_USERNAME}" \
    WEB_APP_URL="${WEB_APP_URL}" \
    BOT_API_SECRET="$BOT_API_SECRET" \
    --project-ref "$PROJECT_REF"
else
  echo "Install Supabase CLI and set secrets manually for project $PROJECT_REF"
fi

echo "==> Building web app..."
cd web && npm run build && cd ..

echo "==> Deploying to Vercel..."
npx vercel deploy --prod --yes \
  -e "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" \
  -e "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" \
  -e "VITE_BOT_USERNAME=$VITE_BOT_USERNAME" \
  -e "VITE_MINI_APP_SHORT_NAME=${VITE_MINI_APP_SHORT_NAME:-cvapp}" \
  -e "VITE_APP_NAME=${VITE_APP_NAME:-Portfolio}" \
  -e "SUPABASE_URL=$VITE_SUPABASE_URL" \
  -e "SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" \
  -e "BOT_TOKEN=$BOT_TOKEN" \
  -e "BOT_USERNAME=${BOT_USERNAME}" \
  -e "WEB_APP_URL=${WEB_APP_URL}" \
  -e "BOT_API_SECRET=$BOT_API_SECRET" \
  -e "TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET:-}"

echo ""
echo "==> Register webhook (if using Vercel bot):"
echo 'curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=$WEB_APP_URL/api/bot&secret_token=$TELEGRAM_WEBHOOK_SECRET"'
