function getMiniAppShortName() {
  return process.env.MINI_APP_SHORT_NAME || 'cvapp';
}

function portfolioStartAppLink(botUsername, username) {
  const short = getMiniAppShortName();
  const nick = String(username || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `https://t.me/${botUsername}/${short}?startapp=${nick}`;
}

module.exports = {
  getMiniAppShortName,
  portfolioStartAppLink,
};
