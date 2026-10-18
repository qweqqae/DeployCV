const crypto = require('crypto');

const DEFAULT_MAX_AGE_SEC = 7200;

function secureEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function validateTelegramInitData(initData, botToken, maxAgeSec = DEFAULT_MAX_AGE_SEC) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;

  const authDate = params.get('auth_date');
  if (!authDate) return false;
  const age = Math.floor(Date.now() / 1000) - Number(authDate);
  if (!Number.isFinite(age) || age < 0 || age > maxAgeSec) return false;

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return secureEqual(calculatedHash, hash);
}

function getTelegramUser(initData) {
  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

function getBotApiSecret() {
  return process.env.BOT_API_SECRET || '';
}

module.exports = {
  validateTelegramInitData,
  getTelegramUser,
  getBotApiSecret,
  secureEqual,
};
