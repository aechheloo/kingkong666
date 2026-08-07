const { query } = require('../config/database');
const { parseAmount } = require('../utils/format');

async function listGroups() {
  const result = await query(
    `SELECT
      g.*,
      COALESCE((SELECT COUNT(*) FROM employees e WHERE e.group_id = g.id AND e.active = TRUE), 0) AS employee_count,
      COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.group_id = g.id AND t.type = 'income'), 0) AS total_income,
      COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.group_id = g.id AND t.type = 'expense'), 0) AS total_expense
    FROM groups g
    ORDER BY g.created_at DESC`
  );

  return result.rows;
}

async function createGroup({ name, telegramChatId }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    const error = new Error('Tên nhóm là bắt buộc.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const result = await query(
    `INSERT INTO groups (name, telegram_chat_id)
     VALUES ($1, $2)
     RETURNING *`,
    [trimmedName, String(telegramChatId || '').trim() || null]
  );

  return result.rows[0];
}

async function updateGroup(groupId, { name, telegramChatId }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    const error = new Error('Tên nhóm là bắt buộc.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const result = await query(
    `UPDATE groups
     SET name = $2,
         telegram_chat_id = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [groupId, trimmedName, String(telegramChatId || '').trim() || null]
  );

  if (!result.rows[0]) {
    const error = new Error('Không tìm thấy nhóm.');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  return result.rows[0];
}

async function getGroupById(groupId) {
  const result = await query(
    `SELECT
      g.*,
      COALESCE((SELECT COUNT(*) FROM employees e WHERE e.group_id = g.id AND e.active = TRUE), 0) AS employee_count,
      COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.group_id = g.id AND t.type = 'income'), 0) AS total_income,
      COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.group_id = g.id AND t.type = 'expense'), 0) AS total_expense
    FROM groups g
    WHERE g.id = $1`,
    [groupId]
  );

  if (!result.rows[0]) {
    const error = new Error('Không tìm thấy nhóm.');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  return result.rows[0];
}

async function getGroupTransactionsSummary(groupId) {
  const result = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
    FROM transactions
    WHERE group_id = $1`,
    [groupId]
  );

  const row = result.rows[0] || { total_income: 0, total_expense: 0 };
  return {
    totalIncome: parseAmount(row.total_income),
    totalExpense: parseAmount(row.total_expense),
    balance: parseAmount(row.total_income) - parseAmount(row.total_expense),
  };
}

async function getDashboardStats() {
  const [groupsResult, employeesResult, totalsResult, recentTransactionsResult] = await Promise.all([
    query('SELECT COUNT(*) AS count FROM groups'),
    query('SELECT COUNT(*) AS count FROM employees WHERE active = TRUE'),
    query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM transactions`
    ),
    query(
      `SELECT t.*, g.name AS group_name
       FROM transactions t
       JOIN groups g ON g.id = t.group_id
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT 10`
    ),
  ]);

  const totals = totalsResult.rows[0] || { total_income: 0, total_expense: 0 };
  const totalIncome = Number(totals.total_income || 0);
  const totalExpense = Number(totals.total_expense || 0);

  return {
    groupCount: Number(groupsResult.rows[0]?.count || 0),
    employeeCount: Number(employeesResult.rows[0]?.count || 0),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    recentTransactions: recentTransactionsResult.rows,
  };
}

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  getGroupById,
  getGroupTransactionsSummary,
  getDashboardStats,
};
