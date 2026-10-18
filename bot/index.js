require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-app.vercel.app';
const START_BANNER_URL = `${WEB_APP_URL}/start-banner.jpg`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const DEFAULT_SHARE_PITCH_RU = 'Моё портфолио. Открой мини-апп.';
const DEFAULT_SHARE_PITCH_EN = 'My portfolio. Open the mini-app.';
const MINI_APP_SHORT = process.env.MINI_APP_SHORT_NAME || 'cvapp';
const {
  START_CAPTION,
  registerDonateHandlers,
  tryHandleCustomDonateReply,
} = require('../api/botDonate');

registerDonateHandlers(bot);

function portfolioStartAppLink(botUsername, username) {
  const nick = String(username || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `https://t.me/${botUsername}/${MINI_APP_SHORT}?startapp=${nick}`;
}

function shareLocale(profile) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};
  return theme.uiLocale === 'en' ? 'en' : 'ru';
}

function defaultShareBody(profile) {
  const name = profile.display_name || profile.username;
  const pitch = shareLocale(profile) === 'en' ? DEFAULT_SHARE_PITCH_EN : DEFAULT_SHARE_PITCH_RU;
  return `${name}\n\n${pitch}`;
}

function resolveShareBody(profile) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};
  const raw = typeof theme.shareMessage === 'string' ? theme.shareMessage.trim() : '';
  if (raw) return raw.slice(0, 900);
  return '';
}

function portfolioShareCaption(profile, botUsername) {
  const theme = profile.theme && typeof profile.theme === 'object' ? profile.theme : {};
  const body = resolveShareBody(profile).trim();
  const startLink = portfolioStartAppLink(botUsername, profile.username);
  if (theme.shareIncludeDirectLink === false) {
    return body;
  }
  if (!body) return startLink;
  return `${body}\n\n${startLink}`;
}

function pickSharePhotoUrl(profile) {
  return profile.share_card_url || profile.header_image_url || profile.avatar_url || START_BANNER_URL;
}

async function loadShareProfile(queryText, telegramId) {
  if (!supabase) return null;

  const raw = queryText.trim().toLowerCase().replace(/^@/, '');
  if (raw.length >= 3) {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, bio, theme, share_card_url, avatar_url, header_image_url')
      .eq('username', raw)
      .eq('is_public', true)
      .single();
    return data;
  }

  const { data } = await supabase
    .from('profiles')
    .select('username, display_name, bio, theme, share_card_url, avatar_url, header_image_url')
    .eq('telegram_id', telegramId)
    .single();
  return data;
}

bot.on('inline_query', async (ctx) => {
  const profile = await loadShareProfile(ctx.inlineQuery.query, ctx.inlineQuery.from.id);
  const botUsername = ctx.me.username;

  if (!profile) {
    const raw = ctx.inlineQuery.query.trim().toLowerCase().replace(/^@/, '');
    const hint = raw.length >= 3
      ? `Profile @${raw} not found.`
      : 'Save your portfolio in the mini app first, then share again.';
    await ctx.answerInlineQuery([{
      type: 'article',
      id: 'portfolio-missing',
      title: 'Portfolio not ready',
      description: hint,
      input_message_content: { message_text: `${hint}\n\nOpen the bot to create your visit card.` },
      reply_markup: new InlineKeyboard().webApp('Open mini app', WEB_APP_URL),
    }], { cache_time: 5, is_personal: true });
    return;
  }

  const photoUrl = pickSharePhotoUrl(profile);
  const portfolioUrl = `${WEB_APP_URL}/u/${profile.username}`;
  const bioLine = profile.bio ? profile.bio.slice(0, 120) : `Portfolio @${profile.username}`;

  await ctx.answerInlineQuery([{
    type: 'photo',
    id: `portfolio-${profile.username}`,
    photo_url: photoUrl,
    thumb_url: photoUrl,
    title: profile.display_name || profile.username,
    description: bioLine,
    caption: portfolioShareCaption(profile, botUsername),
    reply_markup: new InlineKeyboard().webApp('Открыть портфолио', portfolioUrl),
  }], { cache_time: 30, is_personal: true });
});

bot.command('start', async (ctx) => {
  const startParam = ctx.match;

  if (startParam) {
    const username = startParam.trim().toLowerCase();
    const keyboard = new InlineKeyboard().webApp(
      'View Portfolio',
      `${WEB_APP_URL}/u/${username}`
    );

    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, bio, username')
        .eq('username', username)
        .eq('is_public', true)
        .single();

      if (profile) {
        return ctx.reply(
          `👤 *${profile.display_name || profile.username}*\n` +
          `${profile.bio ? `\n${profile.bio}\n` : ''}` +
          `\n${portfolioStartAppLink(ctx.me.username, username)}`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
      }
    }

    return ctx.reply(`Profile @${username} not found.`, { reply_markup: keyboard });
  }

  const keyboard = new InlineKeyboard().webApp('Create portfolio visit card', WEB_APP_URL);

  await ctx.replyWithPhoto(START_BANNER_URL, {
    caption: START_CAPTION,
    reply_markup: keyboard,
  });
});

bot.command('profile', async (ctx) => {
  if (!supabase) {
    return ctx.reply('Database not configured.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', ctx.from.id)
    .single();

  if (!profile) {
    const keyboard = new InlineKeyboard().webApp('Create Portfolio', WEB_APP_URL);
    return ctx.reply('You don\'t have a portfolio yet. Create one!', { reply_markup: keyboard });
  }

  const shareLink = portfolioStartAppLink(ctx.me.username, profile.username);
  const keyboard = new InlineKeyboard()
    .webApp('✏️ Edit Portfolio', `${WEB_APP_URL}/editor`)
    .row()
    .url('🔗 Share Link', shareLink);

  await ctx.reply(
    `📋 *Your Portfolio*\n\n` +
    `Name: ${profile.display_name}\n` +
    `Username: @${profile.username}\n` +
    `Status: ${profile.activity_status}\n` +
    `${profile.activity_message ? `Message: ${profile.activity_message}\n` : ''}` +
    `\nShare: \`${shareLink}\``,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

bot.command('share', async (ctx) => {
  if (!supabase) return ctx.reply('Database not configured.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('telegram_id', ctx.from.id)
    .single();

  if (!profile) {
    return ctx.reply('Create a portfolio first with /start');
  }

  const link = portfolioStartAppLink(ctx.me.username, profile.username);
  await ctx.reply(
    `🔗 Share your portfolio:\n\n${link}\n\n` +
    `Anyone can open it to see your profile!`,
    {
      reply_markup: new InlineKeyboard().url(
        '📤 Share',
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Check out ${profile.display_name}'s portfolio!`)}`
      ),
    }
  );
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;
  if (await tryHandleCustomDonateReply(ctx)) return;

  const username = text.replace('@', '').toLowerCase().trim();
  if (username.length < 3) return;

  if (supabase) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('username', username)
      .single();

    if (profile) {
      const keyboard = new InlineKeyboard().webApp(
        'View Portfolio',
        `${WEB_APP_URL}/u/${profile.username}`
      );
      return ctx.reply(
        `Found: *${profile.display_name}* (@${profile.username})`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    }
  }
});

bot.catch((err) => {
  console.error('Bot error:', err);
});

bot.start({
  onStart: (info) => console.log(`Bot @${info.username} is running`),
});
