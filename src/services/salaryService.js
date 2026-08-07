const { query, withTransaction } = require('../config/database');
const { parseAmount, toDateInputValue, toMonthInputValue } = require('../utils/format');
const { getEmployeeById } = require('./employeeService');

async function addSalaryEntry(employeeId, { amount, workDate, note }) {
  const employee = await getEmployeeById(employeeId);
  const resolvedAmount = amount === undefined || amount === null || amount === ''
    ? Number(employee.daily_rate || 0)
    : parseAmount(amount);

  const result = await query(
    `INSERT INTO salary_entries (employee_id, amount, work_date, note)
     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4)
     RETURNING *`,
    [employeeId, resolvedAmount, workDate || null, String(note || '').trim() || null]
  );

  return result.rows[0];
}

async function addSalaryAdvance(employeeId, { amount, advanceDate, note }) {
  await getEmployeeById(employeeId);
  const result = await query(
    `INSERT INTO salary_advances (employee_id, amount, advance_date, note)
     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4)
     RETURNING *`,
    [employeeId, parseAmount(amount), advanceDate || null, String(note || '').trim() || null]
  );

  return result.rows[0];
}

async function getSalaryOverview(employeeId) {
  const employee = await getEmployeeById(employeeId);
  const [entriesResult, advancesResult, closingsDayResult, closingsMonthResult, totalsResult] = await Promise.all([
    query(
      `SELECT *
       FROM salary_entries
       WHERE employee_id = $1
       ORDER BY work_date DESC, id DESC
       LIMIT 20`,
      [employeeId]
    ),
    query(
      `SELECT *
       FROM salary_advances
       WHERE employee_id = $1
       ORDER BY advance_date DESC, id DESC
       LIMIT 20`,
      [employeeId]
    ),
    query(
      `SELECT *
       FROM salary_daily_closings
       WHERE employee_id = $1
       ORDER BY closing_date DESC, id DESC
       LIMIT 10`,
      [employeeId]
    ),
    query(
      `SELECT *
       FROM salary_monthly_closings
       WHERE employee_id = $1
       ORDER BY closing_month DESC, id DESC
       LIMIT 10`,
      [employeeId]
    ),
    query(
      `SELECT
        COALESCE((SELECT SUM(amount) FROM salary_entries WHERE employee_id = $1), 0) AS total_salary,
        COALESCE((SELECT SUM(amount) FROM salary_advances WHERE employee_id = $1), 0) AS total_advance`,
      [employeeId]
    ),
  ]);

  const totals = totalsResult.rows[0] || { total_salary: 0, total_advance: 0 };
  const totalSalary = Number(totals.total_salary || 0);
  const totalAdvance = Number(totals.total_advance || 0);

  return {
    employee,
    entries: entriesResult.rows,
    advances: advancesResult.rows,
    dailyClosings: closingsDayResult.rows,
    monthlyClosings: closingsMonthResult.rows,
    totals: {
      totalSalary,
      totalAdvance,
      netAmount: totalSalary - totalAdvance,
    },
  };
}

async function closeSalaryDay(employeeId, { closingDate, note }) {
  const employee = await getEmployeeById(employeeId);
  const date = closingDate || toDateInputValue();

  return withTransaction(async (client) => {
    const totalsResult = await client.query(
      `SELECT
        COALESCE((SELECT SUM(amount) FROM salary_entries WHERE employee_id = $1 AND work_date = $2), 0) AS total_salary,
        COALESCE((SELECT SUM(amount) FROM salary_advances WHERE employee_id = $1 AND advance_date = $2), 0) AS total_advance`,
      [employeeId, date]
    );

    const totals = totalsResult.rows[0];
    const totalSalary = Number(totals.total_salary || 0);
    const totalAdvance = Number(totals.total_advance || 0);
    const netAmount = totalSalary - totalAdvance;

    const result = await client.query(
      `INSERT INTO salary_daily_closings (employee_id, closing_date, total_salary, total_advance, net_amount, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, closing_date)
       DO UPDATE SET total_salary = EXCLUDED.total_salary,
                     total_advance = EXCLUDED.total_advance,
                     net_amount = EXCLUDED.net_amount,
                     note = EXCLUDED.note
       RETURNING *`,
      [employeeId, date, totalSalary, totalAdvance, netAmount, String(note || '').trim() || null]
    );

    return {
      employee,
      closing: result.rows[0],
    };
  });
}

async function closeSalaryMonth(employeeId, { closingMonth, note }) {
  const employee = await getEmployeeById(employeeId);
  const month = closingMonth || toMonthInputValue();

  return withTransaction(async (client) => {
    const totalsResult = await client.query(
      `SELECT
        COALESCE((SELECT SUM(amount) FROM salary_entries WHERE employee_id = $1 AND TO_CHAR(work_date, 'YYYY-MM') = $2), 0) AS total_salary,
        COALESCE((SELECT SUM(amount) FROM salary_advances WHERE employee_id = $1 AND TO_CHAR(advance_date, 'YYYY-MM') = $2), 0) AS total_advance`,
      [employeeId, month]
    );

    const totals = totalsResult.rows[0];
    const totalSalary = Number(totals.total_salary || 0);
    const totalAdvance = Number(totals.total_advance || 0);
    const netAmount = totalSalary - totalAdvance;

    const result = await client.query(
      `INSERT INTO salary_monthly_closings (employee_id, closing_month, total_salary, total_advance, net_amount, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, closing_month)
       DO UPDATE SET total_salary = EXCLUDED.total_salary,
                     total_advance = EXCLUDED.total_advance,
                     net_amount = EXCLUDED.net_amount,
                     note = EXCLUDED.note
       RETURNING *`,
      [employeeId, month, totalSalary, totalAdvance, netAmount, String(note || '').trim() || null]
    );

    return {
      employee,
      closing: result.rows[0],
    };
  });
}

module.exports = {
  addSalaryEntry,
  addSalaryAdvance,
  getSalaryOverview,
  closeSalaryDay,
  closeSalaryMonth,
};
