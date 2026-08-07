const telegramModule = require('node-telegram-bot-api');

const TelegramBot = telegramModule.TelegramBot || telegramModule;

let bot;

function getBot() {
  if (bot) {
    return bot;
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return null;
  }

  bot = new TelegramBot(token, {});
  return bot;
}

async function sendMessage(chatId, text) {
  const client = getBot();
  if (!client || !chatId) {
    return { sent: false, reason: 'Telegram is not configured' };
  }

  await client.sendMessage(String(chatId), text);
  return { sent: true };
}

module.exports = {
  sendMessage,
};
