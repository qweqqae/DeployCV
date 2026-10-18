const { getBotApiSecret } = require('./telegramAuth');

const DONATE_SUCCESS_MESSAGE =
  'You unlocked the ❤️ Community Partner badge. Turn it on in the mini app: Design → Visibility.';

function donateAgainKeyboard() {
  return {
    inline_keyboard: [[{ text: 'Donate Again', callback_data: 'donate:again' }]],
  };
}

const START_CAPTION =
  'This bot helps you easily build a stylish portfolio visit card. '
  + 'No more building websites or sending heavy files. Just fill in your details '
  + 'and get a ready-made compact page for clients. /donate for donate';

const DONATE_PROMPT = 'Donation amount (Stars)';
const CUSTOM_AMOUNT_PROMPT =
  'Enter an amount in stars (Reply to this message with your answer)';

function donateAmountKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '5 ⭐️', callback_data: 'donate:5' },
        { text: '20 ⭐️', callback_data: 'donate:20' },
        { text: '100 ⭐️', callback_data: 'donate:100' },
        { text: '200 ⭐️', callback_data: 'donate:200' },
      ],
      [{ text: 'Custom amount', callback_data: 'donate:custom' }],
    ],
  };
}

function clampStars(amount) {
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 2500) return null;
  return n;
}

async function sendDonateInvoice(ctx, amount) {
  const stars = clampStars(amount);
  if (!stars) return false;

  const title = 'Support this project';
  const description = 'Donation in Telegram Stars';
  const payload = `donate:${ctx.from.id}:${Date.now()}`;
  const prices = [{ label: `${stars} ⭐️`, amount: stars }];
  const other = { provider_token: '' };

  try {
    const chatId =
      ctx.chat?.id
      ?? ctx.callbackQuery?.message?.chat?.id;
    if (!chatId) return false;

    await ctx.api.sendInvoice(
      chatId,
      title,
      description,
      payload,
      'XTR',
      prices,
      other,
    );
    return true;
  } catch (err) {
    console.error('sendDonateInvoice failed:', err);
    return false;
  }
}

function isCustomAmountPromptMessage(text) {
  return typeof text === 'string' && text.trim() === CUSTOM_AMOUNT_PROMPT;
}

async function safeDeleteMessage(api, chatId, messageId) {
  if (!chatId || !messageId) return;
  try {
    await api.deleteMessage(chatId, messageId);
  } catch {
    // already gone or not allowed
  }
}

async function deleteDonateAmountMessage(ctx) {
  const msg = ctx.callbackQuery?.message;
  if (!msg) return;
  if ((msg.text || '').trim() !== DONATE_PROMPT) return;
  try {
    await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
  } catch {
    // already deleted or too old
  }
}

async function grantSupporterStatus(telegramId) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const botSecret = getBotApiSecret();
  if (!supabaseUrl || !anonKey || !botSecret || !telegramId) return;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/portfolio-api/bot/grant-supporter`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'X-Bot-Token': botSecret,
      },
      body: JSON.stringify({ telegram_id: telegramId }),
    });
    if (!res.ok) {
      console.error('grantSupporterStatus failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('grantSupporterStatus error:', err);
  }
}

function registerDonateHandlers(bot) {
  bot.command('donate', async (ctx) => {
    const arg = (ctx.match || '').trim();
    if (arg && /^\d+$/.test(arg)) {
      const ok = await sendDonateInvoice(ctx, parseInt(arg, 10));
      if (!ok) {
        await ctx.reply('Enter an amount between 1 and 2500 Stars.');
      }
      return;
    }
    await ctx.reply(DONATE_PROMPT, {
      reply_markup: donateAmountKeyboard(),
    });
  });

  bot.callbackQuery(/^donate:(\d+)$/, async (ctx) => {
    const amount = parseInt(ctx.match[1], 10);
    const ok = await sendDonateInvoice(ctx, amount);
    await ctx.answerCallbackQuery(
      ok ? undefined : { text: 'Could not open payment. Try again.', show_alert: true },
    );
    if (ok) {
      await deleteDonateAmountMessage(ctx);
    } else if (ctx.callbackQuery.message) {
      await ctx.reply('Could not create the invoice. Try again or use /donate <amount>.');
    }
  });

  bot.callbackQuery('donate:again', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(DONATE_PROMPT, {
      reply_markup: donateAmountKeyboard(),
    });
  });

  bot.callbackQuery('donate:custom', async (ctx) => {
    await ctx.answerCallbackQuery();
    const msg = ctx.callbackQuery?.message;
    if (!msg) return;
    try {
      await ctx.editMessageText(CUSTOM_AMOUNT_PROMPT, {
        reply_markup: { inline_keyboard: [] },
      });
    } catch (err) {
      console.error('editMessageText donate:custom failed:', err);
      await ctx.reply(CUSTOM_AMOUNT_PROMPT);
    }
  });

  bot.on('pre_checkout_query', async (ctx) => {
    const payload = ctx.preCheckoutQuery.invoice_payload || '';
    if (!payload.startsWith('donate:')) {
      await ctx.answerPreCheckoutQuery(false, { error_message: 'Invalid payment.' });
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on('message:successful_payment', async (ctx) => {
    const payment = ctx.message.successful_payment;
    if (!payment?.invoice_payload?.startsWith('donate:')) return;

    await grantSupporterStatus(ctx.from.id);

    const chatId = ctx.chat?.id;
    const invoiceMessageId = ctx.message?.message_id;
    if (chatId && invoiceMessageId) {
      try {
        await ctx.api.deleteMessage(chatId, invoiceMessageId);
      } catch (err) {
        console.error('delete donate invoice message failed:', err);
      }
    }

    if (chatId) {
      await ctx.api.sendMessage(chatId, DONATE_SUCCESS_MESSAGE, {
        reply_markup: donateAgainKeyboard(),
      });
    }
  });
}

/**
 * If user replies to the custom-amount prompt with a number, send invoice.
 * @returns {boolean} true when handled
 */
async function tryHandleCustomDonateReply(ctx) {
  const reply = ctx.message?.reply_to_message;
  if (!reply?.from?.is_bot || reply.from.id !== ctx.me.id) return false;
  if (!isCustomAmountPromptMessage(reply.text)) return false;

  const chatId = ctx.chat?.id;
  const userMessageId = ctx.message?.message_id;
  const promptMessageId = reply.message_id;

  const raw = (ctx.message.text || '').trim();
  if (!/^\d+$/.test(raw)) {
    await ctx.reply('Send a number from 1 to 2500.');
    return true;
  }

  const amount = parseInt(raw, 10);
  const ok = clampStars(amount) !== null;

  if (chatId) {
    await safeDeleteMessage(ctx.api, chatId, userMessageId);
    if (ok) {
      await safeDeleteMessage(ctx.api, chatId, promptMessageId);
    }
  }

  if (!ok) {
    await ctx.reply('Enter an amount between 1 and 2500 Stars.');
    return true;
  }

  const sent = await sendDonateInvoice(ctx, amount);
  if (!sent) {
    await ctx.reply('Could not create the invoice. Try again or use /donate <amount>.');
  }
  return true;
}

module.exports = {
  START_CAPTION,
  donateAmountKeyboard,
  registerDonateHandlers,
  tryHandleCustomDonateReply,
};
