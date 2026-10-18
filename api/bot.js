const { Bot, webhookCallback } = require('grammy');
const { getBotApiSecret } = require('./telegramAuth');
const { buildInlinePortfolioResult, pickSharePhotoUrl } = require('./sharePreparedCommon');
const { portfolioStartAppLink } = require('./miniAppLink');
const { START_CAPTION, registerDonateHandlers, tryHandleCustomDonateReply } = require('./botDonate');

const bot = new Bot(process.env.BOT_TOKEN);
registerDonateHandlers(bot);

const WEB_APP_URL = process.env.WEB_APP_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-app.vercel.app');

const START_BANNER_URL = `${WEB_APP_URL}/start-banner.jpg`;

const startKeyboard = () => ({
  inline_keyboard: [[{ text: 'Create portfolio visit card', web_app: { url: WEB_APP_URL } }]],
});

const API_URL = `${process.env.SUPABASE_URL}/functions/v1/portfolio-api`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function botApi(path) {
  const botSecret = getBotApiSecret();
  if (!API_URL || !ANON_KEY || !botSecret) return null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'X-Bot-Token': botSecret,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function portfolioWebAppUrl(username) {
  return `${WEB_APP_URL}/u/${username}`;
}

bot.on('inline_query', async (ctx) => {
  const raw = ctx.inlineQuery.query.trim().toLowerCase().replace(/^@/, '');
  const path = raw.length >= 3
    ? `/bot/share-payload?username=${encodeURIComponent(raw)}`
    : `/bot/share-payload?telegram_id=${ctx.inlineQuery.from.id}`;

  const data = await botApi(path);
  const profile = data?.profile;
  const botUsername = ctx.me.username;

  if (!profile) {
    const hint = raw.length >= 3
      ? `Profile @${raw} not found.`
      : 'Save your portfolio in the mini app first, then share again.';
    await ctx.answerInlineQuery([{
      type: 'article',
      id: 'portfolio-missing',
      title: 'Portfolio not ready',
      description: hint,
      input_message_content: {
        message_text: `${hint}\n\nOpen the bot to create your visit card.`,
      },
      reply_markup: {
        inline_keyboard: [[
          { text: 'Open mini app', web_app: { url: WEB_APP_URL } },
        ]],
      },
    }], { cache_time: 5, is_personal: true });
    return;
  }

  const photoUrl = pickSharePhotoUrl(profile, WEB_APP_URL);
  await ctx.answerInlineQuery(
    [buildInlinePortfolioResult(profile, botUsername, WEB_APP_URL, {
      photoUrl,
      thumbUrl: photoUrl,
      photoWidth: 1260,
      photoHeight: 1920,
      thumbWidth: 320,
      thumbHeight: 487,
    })],
    { cache_time: 30, is_personal: true },
  );
});

bot.command('start', async (ctx) => {
  const startParam = ctx.match?.trim();

  if (startParam) {
    const username = startParam.toLowerCase();
    const webUrl = `${WEB_APP_URL}/u/${username}`;
    const data = await botApi(`/bot/public-profile?username=${encodeURIComponent(username)}`);

    if (data?.profile) {
      const p = data.profile;
      return ctx.reply(
        `👤 ${p.display_name || p.username}\n` +
        `${p.bio ? `\n${p.bio}\n` : ''}` +
        `\n${portfolioStartAppLink(ctx.me.username, username)}`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: 'View Portfolio', web_app: { url: webUrl } }]],
          },
        }
      );
    }

    return ctx.reply(`Profile @${username} not found.`, {
      reply_markup: {
        inline_keyboard: [[{ text: 'Open App', web_app: { url: WEB_APP_URL } }]],
      },
    });
  }

  await ctx.replyWithPhoto(START_BANNER_URL, {
    caption: START_CAPTION,
    reply_markup: startKeyboard(),
  });
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text || '';
  if (text.startsWith('/')) return;
  if (await tryHandleCustomDonateReply(ctx)) return;
});

bot.command('profile', async (ctx) => {
  const data = await botApi(`/bot/profile?telegram_id=${ctx.from.id}`);
  const profile = data?.profile;

  if (!profile) {
    return ctx.reply('No portfolio yet.', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Create Portfolio', web_app: { url: WEB_APP_URL } }]],
      },
    });
  }

  const link = portfolioStartAppLink(ctx.me.username, profile.username);
  await ctx.reply(
    `📋 *Your Portfolio*\n\n` +
    `Name: ${profile.display_name}\n` +
    `Username: @${profile.username}\n` +
    `Status: ${profile.activity_status}\n` +
    `${profile.activity_message ? `Message: ${profile.activity_message}\n` : ''}` +
    `\nShare: ${link}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✏️ Edit', web_app: { url: `${WEB_APP_URL}/editor` } }],
          [{ text: '🔗 Share', url: `https://t.me/share/url?url=${encodeURIComponent(link)}` }],
        ],
      },
    }
  );
});

bot.command('share', async (ctx) => {
  const data = await botApi(`/bot/profile?telegram_id=${ctx.from.id}`);
  const profile = data?.profile;

  if (!profile) return ctx.reply('Create a portfolio first: /start');

  const link = portfolioStartAppLink(ctx.me.username, profile.username);
  await ctx.reply(link, {
    reply_markup: {
      inline_keyboard: [[{
        text: '📤 Share',
        url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Check out ${profile.display_name}'s portfolio!`)}`,
      }]],
    },
  });
});

bot.catch((err) => {
  console.error('Bot webhook error:', err);
});

const handleWebhook = webhookCallback(bot, 'https');

module.exports = async (req, res) => {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const isProd = process.env.VERCEL_ENV === 'production';
  if (isProd && !webhookSecret) {
    return res.status(503).json({ error: 'Webhook secret is not configured' });
  }
  if (webhookSecret) {
    const header = req.headers['x-telegram-bot-api-secret-token'];
    if (header !== webhookSecret) {
      return res.status(403).end();
    }
  }
  return handleWebhook(req, res);
};
