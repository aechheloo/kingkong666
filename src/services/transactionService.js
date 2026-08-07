const { query } = require('../config/database');
const { getGroupById } = require('./groupService');
const { parseAmount } = require('../utils/format');

function normalizeType(type) {
  return type === 'income' ? 'income' : 'expense';
}

async function listTransactionsByGroup(groupId) {
  const result = await query(
    `SELECT *
     FROM transactions
     WHERE group_id = $1
     ORDER BY transaction_date DESC, id DESC`,
    [groupId]
  );

  return result.rows;
}

async function addTransaction(groupId, { type, amount, description, transactionDate }) {
  await getGroupById(groupId);
  const trimmedDescription = String(description || '').trim();
  if (!trimmedDescription) {
    const error = new Error('Nội dung giao dịch là bắt buộc.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const result = await query(
    `INSERT INTO transactions (group_id, type, amount, description, transaction_date)
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE))
     RETURNING *`,
    [groupId, normalizeType(type), parseAmount(amount), trimmedDescription, transactionDate || null]
  );

  return result.rows[0];
}

async function updateTransaction(transactionId, { type, amount, description, transactionDate }) {
  const trimmedDescription = String(description || '').trim();
  if (!trimmedDescription) {
    const error = new Error('Nội dung giao dịch là bắt buộc.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const result = await query(
    `UPDATE transactions
     SET type = $2,
         amount = $3,
         description = $4,
         transaction_date = COALESCE($5, transaction_date),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [transactionId, normalizeType(type), parseAmount(amount), trimmedDescription, transactionDate || null]
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
