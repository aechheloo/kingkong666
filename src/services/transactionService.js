const { query } = require('../config/database');
const { getGroupById } = require('./groupService');
const { parseAmount } = require('../utils/format');

function normalizeType(type) {
  return type === 'income' ? 'income' : 'expense';
}

function buildTimestamp(transactionDate, transactionTime, timezoneOffset) {
  const date = String(transactionDate || '').trim();
  const time = String(transactionTime || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const offsetMinutes = Number(timezoneOffset);
  if (!Number.isFinite(offsetMinutes)) {
    return `${date}T${time}:00`;
  }

  const sign = offsetMinutes <= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `${date}T${time}:00${sign}${hours}:${minutes}`;
}

async function listTransactionsByGroup(groupId) {
  const result = await query(
    `SELECT *
     FROM transactions
     WHERE group_id = $1
     ORDER BY transaction_date DESC, created_at DESC, id DESC`,
    [groupId]
  );

  return result.rows;
}

async function addTransaction(groupId, {
  type,
  amount,
  description,
  transactionDate,
  transactionTime,
  timezoneOffset,
}) {
  await getGroupById(groupId);
  const trimmedDescription = String(description || '').trim();
  if (!trimmedDescription) {
    const error = new Error('Nội dung giao dịch là bắt buộc.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const timestamp = buildTimestamp(transactionDate, transactionTime, timezoneOffset);
  const result = await query(
    `INSERT INTO transactions (group_id, type, amount, description, transaction_date, created_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), COALESCE($6::timestamptz, NOW()))
     RETURNING *`,
    [
      groupId,
      normalizeType(type),
      parseAmount(amount),
      trimmedDescription,
      transactionDate || null,
      timestamp,
    ]
  );

  return result.rows[0];
}

async function updateTransaction(transactionId, {
  type,
  amount,
  description,
  transactionDate,
  transactionTime,
  timezoneOffset,
}) {
  const trimmedDescription = String(description || '').trim();
  if (!trimmedDescription) {
    const error = new Error('Nội dung giao dịch là bắt buộc.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const timestamp = buildTimestamp(transactionDate, transactionTime, timezoneOffset);
  const result = await query(
    `UPDATE transactions
     SET type = $2,
         amount = $3,
         description = $4,
         transaction_date = COALESCE($5, transaction_date),
         created_at = COALESCE($6::timestamptz, created_at),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      transactionId,
      normalizeType(type),
      parseAmount(amount),
      trimmedDescription,
      transactionDate || null,
      timestamp,
    ]
  );

  if (!result.rows[0]) {
    const error = new Error('Không tìm thấy giao dịch.');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  return result.rows[0];
}

async function deleteTransaction(transactionId) {
  const result = await query(
    `DELETE FROM transactions
     WHERE id = $1
     RETURNING *`,
    [transactionId]
  );

  if (!result.rows[0]) {
    const error = new Error('Không tìm thấy giao dịch.');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  return result.rows[0];
}

module.exports = {
  listTransactionsByGroup,
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
