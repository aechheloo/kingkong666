const crypto = require('crypto');
const telegramModule = require('node-telegram-bot-api');
const { updateGroupTelegramConnection } = require('../services/groupService');

const TelegramBot = telegramModule.TelegramBot || telegramModule;

let bot;
let connectionState = null;

function getBot() {
  if (bot) {
    return bot;
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return null;
  }

  bot = new TelegramBot(token, { polling: false });
  return bot;
}

function getWebhookSecret() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    return '';
  }

  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 32);
}

async function sendMessage(chatId, text) {
  const client = getBot();
  if (!client || !chatId) {
    return { sent: false, reason: 'Telegram is not configured' };
  }

  await client.sendMessage(String(chatId), text);
  return { sent: true };
}

async function setWebhook(baseUrl) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    const error = new Error('BOT_TOKEN chưa được cấu hình.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const webhookUrl = `${String(baseUrl).replace(/\/$/, '')}/telegram/webhook`;
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['my_chat_member', 'message'],
      secret_token: getWebhookSecret(),
      drop_pending_updates: true,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    const error = new Error(data.description || 'Không thể cấu hình Telegram webhook.');
    error.statusCode = 502;
    error.expose = true;
    throw error;
  }

  return webhookUrl;
}

async function beginGroupConnection(groupId, baseUrl) {
  await setWebhook(baseUrl);
  connectionState = {
    groupId: Number(groupId),
    status: 'waiting',
    chatId: '',
    groupName: '',
    startedAt: Date.now(),
  };

  return { ...connectionState };
}

function getGroupConnectionStatus(groupId) {
  if (!connectionState || Number(connectionState.groupId) !== Number(groupId)) {
    return { status: 'idle' };
  }

  return { ...connectionState };
}

function extractGroup(update) {
  const membership = update?.my_chat_member;
  if (membership?.chat && ['group', 'supergroup'].includes(membership.chat.type)) {
    const newStatus = membership.new_chat_member?.status;
    if (['member', 'administrator'].includes(newStatus)) {
      return membership.chat;
    }
  }

  const message = update?.message;
  if (message?.chat && ['group', 'supergroup'].includes(message.chat.type)) {
    const botWasAdded = message.new_chat_members?.some((member) => member?.is_bot);
    if (botWasAdded) {
      return message.chat;
    }
  }

  return null;
}

async function handleWebhookUpdate(update, receivedSecret) {
  const expectedSecret = getWebhookSecret();
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    const error = new Error('Telegram webhook không hợp lệ.');
    error.statusCode = 401;
    throw error;
  }

  if (!connectionState || connectionState.status !== 'waiting') {
    return { handled: false };
  }

  const chat = extractGroup(update);
  if (!chat) {
    return { handled: false };
  }

  const updatedGroup = await updateGroupTelegramConnection(connectionState.groupId, {
    name: chat.title || '',
    telegramChatId: chat.id,
  });

  connectionState = {
    ...connectionState,
    status: 'connected',
    chatId: String(chat.id),
    groupName: updatedGroup.name,
    connectedAt: Date.now(),
  };

  return { handled: true, group: updatedGroup };
}

module.exports = {
  sendMessage,
  beginGroupConnection,
  getGroupConnectionStatus,
  handleWebhookUpdate,
};
