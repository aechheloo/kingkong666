const { withTransaction } = require('../config/database');
const { getGroupById } = require('./groupService');

async function closeExpenseDay(groupId, { closingDate, note }) {
  const group = await getGroupById(groupId);
  const date = closingDate || new Date().toISOString().slice(0, 10);

  return withTransaction(async (client) => {
    const totalsResult = await client.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM transactions
      WHERE group_id = $1 AND transaction_date = $2`,
      [groupId, date]
    );

    const totals = totalsResult.rows[0];
    const totalIncome = Number(totals.total_income || 0);
    const totalExpense = Number(totals.total_expense || 0);
    const balance = totalIncome - totalExpense;

    const result = await client.query(
      `INSERT INTO daily_closings (group_id, closing_date, total_income, total_expense, balance, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (group_id, closing_date)
       DO UPDATE SET total_income = EXCLUDED.total_income,
                     total_expense = EXCLUDED.total_expense,
                     balance = EXCLUDED.balance,
                     note = EXCLUDED.note
       RETURNING *`,
      [groupId, date, totalIncome, totalExpense, balance, String(note || '').trim() || null]
    );

    return { group, closing: result.rows[0] };
  });
}

async function closeExpenseMonth(groupId, { closingMonth, note }) {
  const group = await getGroupById(groupId);
  const month = closingMonth || new Date().toISOString().slice(0, 7);

  return withTransaction(async (client) => {
    const totalsResult = await client.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM transactions
      WHERE group_id = $1 AND TO_CHAR(transaction_date, 'YYYY-MM') = $2`,
      [groupId, month]
    );

    const totals = totalsResult.rows[0];
    const totalIncome = Number(totals.total_income || 0);
    const totalExpense = Number(totals.total_expense || 0);
    const balance = totalIncome - totalExpense;

    const result = await client.query(
      `INSERT INTO monthly_closings (group_id, closing_month, total_income, total_expense, balance, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (group_id, closing_month)
       DO UPDATE SET total_income = EXCLUDED.total_income,
                     total_expense = EXCLUDED.total_expense,
                     balance = EXCLUDED.balance,
                     note = EXCLUDED.note
       RETURNING *`,
      [groupId, month, totalIncome, totalExpense, balance, String(note || '').trim() || null]
    );

    return { group, closing: result.rows[0] };
  });
}

module.exports = {
  closeExpenseDay,
  closeExpenseMonth,
};
