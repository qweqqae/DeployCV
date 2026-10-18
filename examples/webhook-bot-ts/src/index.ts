import express from 'express';

const token = process.env.BOT_TOKEN;
const secret = process.env.WEBHOOK_SECRET;
const port = Number(process.env.PORT || 8080);
const path = process.env.WEBHOOK_PATH || '/telegram/webhook';

if (!token || !secret) {
  console.error('BOT_TOKEN and WEBHOOK_SECRET are required');
  process.exit(1);
}

const app = express();
app.use(express.json());

app.post(path, async (req, res) => {
  const header = req.headers['x-telegram-bot-api-secret-token'];
  if (header !== secret) {
    res.status(403).end();
    return;
  }

  const update = req.body;
  const message = update.message;
  if (message?.text === '/start') {
    const chatId = message.chat.id;
    const webAppUrl = process.env.WEB_APP_URL;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Open the portfolio mini app from the menu button.',
        reply_markup: webAppUrl
          ? { inline_keyboard: [[{ text: 'Open app', web_app: { url: webAppUrl } }]] }
          : undefined,
      }),
    });
  }

  res.status(200).json({ ok: true });
});

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

app.listen(port, () => {
  console.log(`Webhook listening on :${port}${path}`);
});
