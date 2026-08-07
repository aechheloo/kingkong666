const { sendMessage } = require('../bot/telegram');
const {
  transactionMessage,
  salaryDayMessage,
  salaryMonthMessage,
  expenseDayClosingMessage,
  expenseMonthClosingMessage,
} = require('../bot/messages');

async function sendToGroup(chatId, message) {
  if (!chatId || !process.env.BOT_TOKEN) {
    return { sent: false, reason: 'Missing telegram configuration' };
  }

  try {
    return await sendMessage(chatId, message);
  } catch (error) {
    console.error('Failed to send Telegram message', error);
    return { sent: false, reason: error.message };
  }
}

function sendTransactionNotification(payload) {
  return sendToGroup(payload.telegramChatId, transactionMessage(payload));
}

function sendSalaryDayNotification(payload) {
  return sendToGroup(payload.telegramChatId, salaryDayMessage(payload));
}

function sendSalaryMonthNotification(payload) {
  return sendToGroup(payload.telegramChatId, salaryMonthMessage(payload));
}

function sendExpenseDayClosingNotification(payload) {
  return sendToGroup(payload.telegramChatId, expenseDayClosingMessage(payload));
}

function sendExpenseMonthClosingNotification(payload) {
  return sendToGroup(payload.telegramChatId, expenseMonthClosingMessage(payload));
}

module.exports = {
  sendTransactionNotification,
  sendSalaryDayNotification,
  sendSalaryMonthNotification,
  sendExpenseDayClosingNotification,
  sendExpenseMonthClosingNotification,
};
