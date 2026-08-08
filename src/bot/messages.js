const {
  formatCurrency,
  formatDate,
  formatMonth,
  formatPercent,
} = require('../utils/format');

const SEPARATOR = '──────────────────';

function dayMonth(value) {
  const formatted = formatDate(value);
  return formatted === '-' ? formatted : formatted.slice(0, 5);
}

function employeeDisplayName(name, role) {
  const alias = String(role || '').trim();
  return alias ? `${name} (${alias})` : name;
}

function transactionMessage({
  groupName,
  type,
  amount,
  description,
  transactionDate,
  transactionTime,
}) {
  if (type === 'expense') {
    return [
      'CHI TIÊU',
      '',
      `Ngày: ${formatDate(transactionDate)}`,
      `Giờ: ${transactionTime || '-'}`,
      '',
      `- ${formatCurrency(amount)} (${description})`,
    ].join('\n');
  }

  return [
    '📢 Thu mới',
    `Nhóm: ${groupName}`,
    `Số tiền: ${formatCurrency(amount)}`,
    `Ngày: ${formatDate(transactionDate)}`,
    `Nội dung: ${description}`,
  ].join('\n');
}

function salaryDayMessage({
  employeeName,
  employeeRole,
  closingDate,
  closingTime,
  entries,
  totalRevenue,
}) {
  const lines = [
    'DOANH THU NGÀY',
    '',
    `Ngày: ${formatDate(closingDate)}`,
    `Giờ chốt: ${closingTime || '-'}`,
    `Tên: ${employeeDisplayName(employeeName, employeeRole)}`,
    '',
  ];

  for (const entry of entries || []) {
    lines.push(`+ ${formatCurrency(entry.amount)}`);
  }

  lines.push('', SEPARATOR, `TỔNG: ${formatCurrency(totalRevenue)}`);
  return lines.join('\n');
}

function salaryMonthMessage({
  employeeName,
  employeeRole,
  closingMonth,
  closingDate,
  closingTime,
  dailyRevenue,
  calculation,
}) {
  const lines = [
    'DOANH THU THÁNG',
    '',
    `Tháng: ${formatMonth(closingMonth)} • Chốt: ${formatDate(closingDate)} ${closingTime || '-'}`,
    `Tên: ${employeeDisplayName(employeeName, employeeRole)}`,
    '',
  ];

  for (const item of dailyRevenue || []) {
    lines.push(`${dayMonth(item.work_date)}: +${formatCurrency(item.total_revenue)}`);
  }

  lines.push(
    '',
    SEPARATOR,
    `TỔNG DOANH THU: ${formatCurrency(calculation.totalRevenue)}`,
    `PHÍ RỬA: ${formatPercent(calculation.washFeePercent)}%`,
    `DOANH THU SAU RỬA: ${formatCurrency(calculation.revenueAfterWash)}`,
    `PHẦN TRĂM DOANH THU: ${formatPercent(calculation.revenuePercent)}%`,
    `TIỀN LƯƠNG: ${formatCurrency(calculation.salaryAmount)}`
  );

  if (Number(calculation.totalAdvance || 0) > 0) {
    lines.push(`ĐÃ ỨNG: ${formatCurrency(calculation.totalAdvance)}`);
  }

  lines.push(`CÒN LẠI: ${formatCurrency(calculation.netAmount)}`);
  return lines.join('\n');
}

function expenseDayClosingMessage({
  closingDate,
  closingTime,
  expenses,
  totalExpense,
}) {
  const lines = [
    'CHI TIÊU',
    '',
    `Ngày: ${formatDate(closingDate)}`,
    `Giờ chốt: ${closingTime || '-'}`,
    '',
  ];

  for (const expense of expenses || []) {
    lines.push(`- ${formatCurrency(expense.amount)} (${expense.description})`);
  }

  lines.push('', SEPARATOR, `TỔNG CHI: ${formatCurrency(totalExpense)}`);
  return lines.join('\n');
}

function expenseMonthClosingMessage({
  closingMonth,
  closingDate,
  closingTime,
  dailyExpenses,
  totalExpense,
}) {
  const lines = [
    'CHI TIÊU THÁNG',
    '',
    `Tháng: ${formatMonth(closingMonth)} • Chốt: ${formatDate(closingDate)} ${closingTime || '-'}`,
    '',
  ];

  for (const item of dailyExpenses || []) {
    lines.push(`${dayMonth(item.transaction_date)}: ${formatCurrency(item.total_expense)}`);
  }

  lines.push('', SEPARATOR, `TỔNG CHI THÁNG: ${formatCurrency(totalExpense)}`);
  return lines.join('\n');
}

module.exports = {
  transactionMessage,
  salaryDayMessage,
  salaryMonthMessage,
  expenseDayClosingMessage,
  expenseMonthClosingMessage,
};
