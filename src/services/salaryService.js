const { query, withTransaction } = require('../config/database');
const { parseAmount, toDateInputValue, toMonthInputValue } = require('../utils/format');
const { getEmployeeById } = require('./employeeService');

function calculateSalary(employee, totalRevenue, totalAdvance) {
  const washFeePercent = Number(employee.wash_fee_percent || 0);
  const revenuePercent = Number(employee.revenue_percent || 0);
  const washFeeAmount = Math.round((totalRevenue * washFeePercent) / 100);
  const revenueAfterWash = totalRevenue - washFeeAmount;
  const salaryAmount = Math.round((revenueAfterWash * revenuePercent) / 100);
  const netAmount = salaryAmount - totalAdvance;

  return {
    totalRevenue,
    washFeePercent,
    washFeeAmount,
    revenueAfterWash,
    revenuePercent,
    salaryAmount,
    totalAdvance,
    netAmount,
  };
}

async function addSalaryEntry(employeeId, { amount, workDate, note }) {
  await getEmployeeById(employeeId);

  const result = await query(
    `INSERT INTO salary_entries (employee_id, amount, work_date, note)
     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4)
     RETURNING *`,
    [employeeId, parseAmount(amount), workDate || null, String(note || '').trim() || null]
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
  const currentMonth = toMonthInputValue();
  const [entriesResult, advancesResult, closingsDayResult, closingsMonthResult, totalsResult] = await Promise.all([
    query(
      `SELECT *
       FROM salary_entries
       WHERE employee_id = $1
       ORDER BY work_date DESC, id DESC
       LIMIT 50`,
      [employeeId]
    ),
    query(
      `SELECT *
       FROM salary_advances
       WHERE employee_id = $1
       ORDER BY advance_date DESC, id DESC
       LIMIT 50`,
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
        COALESCE((SELECT SUM(amount)
                  FROM salary_entries
                  WHERE employee_id = $1 AND TO_CHAR(work_date, 'YYYY-MM') = $2), 0) AS total_revenue,
        COALESCE((SELECT SUM(amount)
                  FROM salary_advances
                  WHERE employee_id = $1 AND TO_CHAR(advance_date, 'YYYY-MM') = $2), 0) AS total_advance`,
      [employeeId, currentMonth]
    ),
  ]);

  const totals = totalsResult.rows[0] || { total_revenue: 0, total_advance: 0 };
  const calculation = calculateSalary(
    employee,
    Number(totals.total_revenue || 0),
    Number(totals.total_advance || 0)
  );

  return {
    employee,
    currentMonth,
    entries: entriesResult.rows,
    advances: advancesResult.rows,
    dailyClosings: closingsDayResult.rows,
    monthlyClosings: closingsMonthResult.rows,
    totals: calculation,
  };
}

async function closeSalaryDay(employeeId, { closingDate, note }) {
  const employee = await getEmployeeById(employeeId);
  const date = closingDate || toDateInputValue();

  return withTransaction(async (client) => {
    const [totalsResult, entriesResult] = await Promise.all([
      client.query(
        `SELECT
          COALESCE((SELECT SUM(amount) FROM salary_entries WHERE employee_id = $1 AND work_date = $2), 0) AS total_revenue,
          COALESCE((SELECT SUM(amount) FROM salary_advances WHERE employee_id = $1 AND advance_date = $2), 0) AS total_advance`,
        [employeeId, date]
      ),
      client.query(
        `SELECT amount, note, work_date
         FROM salary_entries
         WHERE employee_id = $1 AND work_date = $2
         ORDER BY id ASC`,
        [employeeId, date]
      ),
    ]);

    const totals = totalsResult.rows[0];
    const totalRevenue = Number(totals.total_revenue || 0);
    const totalAdvance = Number(totals.total_advance || 0);
    const netAmount = totalRevenue - totalAdvance;

    const result = await client.query(
      `INSERT INTO salary_daily_closings (employee_id, closing_date, total_salary, total_advance, net_amount, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, closing_date)
       DO UPDATE SET total_salary = EXCLUDED.total_salary,
                     total_advance = EXCLUDED.total_advance,
                     net_amount = EXCLUDED.net_amount,
                     note = EXCLUDED.note
       RETURNING *`,
      [employeeId, date, totalRevenue, totalAdvance, netAmount, String(note || '').trim() || null]
    );

    return {
      employee,
      entries: entriesResult.rows,
      totalRevenue,
      closing: result.rows[0],
    };
  });
}

async function closeSalaryMonth(employeeId, { closingMonth, note }) {
  const employee = await getEmployeeById(employeeId);
  const month = closingMonth || toMonthInputValue();

  return withTransaction(async (client) => {
    const [totalsResult, dailyResult] = await Promise.all([
      client.query(
        `SELECT
          COALESCE((SELECT SUM(amount) FROM salary_entries WHERE employee_id = $1 AND TO_CHAR(work_date, 'YYYY-MM') = $2), 0) AS total_revenue,
          COALESCE((SELECT SUM(amount) FROM salary_advances WHERE employee_id = $1 AND TO_CHAR(advance_date, 'YYYY-MM') = $2), 0) AS total_advance`,
        [employeeId, month]
      ),
      client.query(
        `SELECT work_date, SUM(amount) AS total_revenue
         FROM salary_entries
         WHERE employee_id = $1 AND TO_CHAR(work_date, 'YYYY-MM') = $2
         GROUP BY work_date
         ORDER BY work_date ASC`,
        [employeeId, month]
      ),
    ]);

    const totals = totalsResult.rows[0];
    const calculation = calculateSalary(
      employee,
      Number(totals.total_revenue || 0),
      Number(totals.total_advance || 0)
    );

    const result = await client.query(
      `INSERT INTO salary_monthly_closings (
         employee_id, closing_month, total_salary, total_advance, net_amount,
         total_revenue, wash_fee_percent, wash_fee_amount, revenue_after_wash,
         revenue_percent, salary_amount, note
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (employee_id, closing_month)
       DO UPDATE SET total_salary = EXCLUDED.total_salary,
                     total_advance = EXCLUDED.total_advance,
                     net_amount = EXCLUDED.net_amount,
                     total_revenue = EXCLUDED.total_revenue,
                     wash_fee_percent = EXCLUDED.wash_fee_percent,
                     wash_fee_amount = EXCLUDED.wash_fee_amount,
                     revenue_after_wash = EXCLUDED.revenue_after_wash,
                     revenue_percent = EXCLUDED.revenue_percent,
                     salary_amount = EXCLUDED.salary_amount,
                     note = EXCLUDED.note
       RETURNING *`,
      [
        employeeId,
        month,
        calculation.salaryAmount,
        calculation.totalAdvance,
        calculation.netAmount,
        calculation.totalRevenue,
        calculation.washFeePercent,
        calculation.washFeeAmount,
        calculation.revenueAfterWash,
        calculation.revenuePercent,
        calculation.salaryAmount,
        String(note || '').trim() || null,
      ]
    );

    return {
      employee,
      dailyRevenue: dailyResult.rows,
      calculation,
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
