const { formatCurrency, formatDate, formatMonth } = require('../utils/format');

function transactionMessage({ groupName, type, amount, description, transactionDate }) {
  const label = type === 'income' ? 'Thu' : 'Chi';
  return [
    `📢 ${label} mới`,
    `Nhóm: ${groupName}`,
    `Số tiền: ${formatCurrency(amount)}`,
    `Ngày: ${formatDate(transactionDate)}`,
    `Nội dung: ${description}`,
  ].join('\n');
}

function salaryDayMessage({ employeeName, groupName, closingDate, totalSalary, totalAdvance, netAmount }) {
  return [
    '💼 Chốt lương ngày',
    `Nhân viên: ${employeeName}`,
    `Nhóm: ${groupName}`,
    `Ngày: ${formatDate(closingDate)}`,
    `Tổng lương: ${formatCurrency(totalSalary)}`,
    `Tạm ứng: ${formatCurrency(totalAdvance)}`,
    `Thực nhận: ${formatCurrency(netAmount)}`,
  ].join('\n');
}

function salaryMonthMessage({ employeeName, groupName, closingMonth, totalSalary, totalAdvance, netAmount }) {
  return [
    '🗓️ Chốt lương tháng',
    `Nhân viên: ${employeeName}`,
    `Nhóm: ${groupName}`,
    `Tháng: ${formatMonth(closingMonth)}`,
    `Tổng lương: ${formatCurrency(totalSalary)}`,
    `Tạm ứng: ${formatCurrency(totalAdvance)}`,
    `Thực nhận: ${formatCurrency(netAmount)}`,
  ].join('\n');
}

function expenseDayClosingMessage({ groupName, closingDate, totalIncome, totalExpense, balance }) {
  return [
    '📒 Chốt chi tiêu ngày',
    `Nhóm: ${groupName}`,
    `Ngày: ${formatDate(closingDate)}`,
    `Tổng thu: ${formatCurrency(totalIncome)}`,
    `Tổng chi: ${formatCurrency(totalExpense)}`,
    `Số dư: ${formatCurrency(balance)}`,
  ].join('\n');
}

function expenseMonthClosingMessage({ groupName, closingMonth, totalIncome, totalExpense, balance }) {
  return [
    '📆 Chốt chi tiêu tháng',
    `Nhóm: ${groupName}`,
    `Tháng: ${formatMonth(closingMonth)}`,
    `Tổng thu: ${formatCurrency(totalIncome)}`,
    `Tổng chi: ${formatCurrency(totalExpense)}`,
    `Số dư: ${formatCurrency(balance)}`,
  ].join('\n');
}

module.exports = {
  transactionMessage,
  salaryDayMessage,
  salaryMonthMessage,
  expenseDayClosingMessage,
  expenseMonthClosingMessage,
};
