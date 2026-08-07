const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const { healthCheck } = require('../config/database');
const {
  listGroups,
  createGroup,
  updateGroup,
  getGroupById,
  getGroupTransactionsSummary,
  getDashboardStats,
} = require('../services/groupService');
const {
  listTransactionsByGroup,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../services/transactionService');
const {
  listEmployeesByGroup,
  addEmployee,
} = require('../services/employeeService');
const {
  addSalaryEntry,
  addSalaryAdvance,
  getSalaryOverview,
  closeSalaryDay,
  closeSalaryMonth,
} = require('../services/salaryService');
const {
  closeExpenseDay,
  closeExpenseMonth,
} = require('../services/closingService');
const {
  sendTransactionNotification,
  sendSalaryDayNotification,
  sendSalaryMonthNotification,
  sendExpenseDayClosingNotification,
  sendExpenseMonthClosingNotification,
} = require('../services/notificationService');
const {
  formatCurrency,
  formatDate,
  formatMonth,
  toDateInputValue,
  toMonthInputValue,
} = require('../utils/format');

const router = express.Router();

router.use(adminAuth);

function wrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function feedbackFromQuery(req) {
  return {
    success: req.query.success || '',
    error: req.query.error || '',
  };
}

function redirectWithMessage(res, url, message, type = 'success') {
  const separator = url.includes('?') ? '&' : '?';
  res.redirect(`${url}${separator}${type}=${encodeURIComponent(message)}`);
}

function buildViewData(req, extra = {}) {
  return {
    ...extra,
    feedback: feedbackFromQuery(req),
    formatCurrency,
    formatDate,
    formatMonth,
    toDateInputValue,
    toMonthInputValue,
  };
}

router.get('/', (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', wrap(async (req, res) => {
  const [stats, health] = await Promise.all([getDashboardStats(), healthCheck()]);
  res.render('dashboard', buildViewData(req, {
    pageTitle: 'Dashboard',
    stats,
    health,
  }));
}));

router.route('/groups')
  .get(wrap(async (req, res) => {
    const groups = await listGroups();
    res.render('groups', buildViewData(req, {
      pageTitle: 'Nhóm',
      groups,
    }));
  }))
  .post(wrap(async (req, res) => {
    await createGroup({
      name: req.body.name,
      telegramChatId: req.body.telegram_chat_id,
    });
    redirectWithMessage(res, '/admin/groups', 'Tạo nhóm thành công.');
  }));

router.get('/groups/:id', wrap(async (req, res) => {
  const groupId = Number(req.params.id);
  const [group, transactions, employees, summary] = await Promise.all([
    getGroupById(groupId),
    listTransactionsByGroup(groupId),
    listEmployeesByGroup(groupId),
    getGroupTransactionsSummary(groupId),
  ]);

  res.render('group-detail', buildViewData(req, {
    pageTitle: `Nhóm ${group.name}`,
    group,
    transactions: transactions.slice(0, 10),
    employees,
    summary,
  }));
}));

router.post('/groups/:id/edit', wrap(async (req, res) => {
  await updateGroup(Number(req.params.id), {
    name: req.body.name,
    telegramChatId: req.body.telegram_chat_id,
  });
  redirectWithMessage(res, `/admin/groups/${req.params.id}`, 'Cập nhật nhóm thành công.');
}));

router.post('/groups/:id/transaction', wrap(async (req, res) => {
  const groupId = Number(req.params.id);
  const [group, transaction] = await Promise.all([
    getGroupById(groupId),
    addTransaction(groupId, {
      type: req.body.type,
      amount: req.body.amount,
      description: req.body.description,
      transactionDate: req.body.transaction_date,
    }),
  ]);

  await sendTransactionNotification({
    telegramChatId: group.telegram_chat_id,
    groupName: group.name,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    transactionDate: transaction.transaction_date,
  });

  redirectWithMessage(res, `/admin/groups/${groupId}`, 'Đã thêm giao dịch.');
}));

router.get('/groups/:id/transactions', wrap(async (req, res) => {
  const groupId = Number(req.params.id);
  const [group, transactions] = await Promise.all([
    getGroupById(groupId),
    listTransactionsByGroup(groupId),
  ]);

  res.render('transactions', buildViewData(req, {
    pageTitle: `Giao dịch - ${group.name}`,
    group,
    transactions,
  }));
}));

router.post('/transactions/:id/edit', wrap(async (req, res) => {
  const transaction = await updateTransaction(Number(req.params.id), {
    type: req.body.type,
    amount: req.body.amount,
    description: req.body.description,
    transactionDate: req.body.transaction_date,
  });
  redirectWithMessage(res, `/admin/groups/${transaction.group_id}/transactions`, 'Đã cập nhật giao dịch.');
}));

router.post('/transactions/:id/delete', wrap(async (req, res) => {
  const transaction = await deleteTransaction(Number(req.params.id));
  redirectWithMessage(res, `/admin/groups/${transaction.group_id}/transactions`, 'Đã xóa giao dịch.');
}));

router.route('/groups/:id/employees')
  .get(wrap(async (req, res) => {
    const groupId = Number(req.params.id);
    const [group, employees] = await Promise.all([
      getGroupById(groupId),
      listEmployeesByGroup(groupId),
    ]);
    res.render('employees', buildViewData(req, {
      pageTitle: `Nhân viên - ${group.name}`,
      group,
      employees,
    }));
  }))
  .post(wrap(async (req, res) => {
    await addEmployee(Number(req.params.id), {
      name: req.body.name,
      role: req.body.role,
      dailyRate: req.body.daily_rate,
    });
    redirectWithMessage(res, `/admin/groups/${req.params.id}/employees`, 'Đã thêm nhân viên.');
  }));

router.get('/employees/:id/salary', wrap(async (req, res) => {
  const overview = await getSalaryOverview(Number(req.params.id));
  res.render('salary', buildViewData(req, {
    pageTitle: `Lương - ${overview.employee.name}`,
    overview,
  }));
}));

router.post('/employees/:id/salary/add', wrap(async (req, res) => {
  await addSalaryEntry(Number(req.params.id), {
    amount: req.body.amount,
    workDate: req.body.work_date,
    note: req.body.note,
  });
  redirectWithMessage(res, `/admin/employees/${req.params.id}/salary`, 'Đã thêm lương ngày.');
}));

router.post('/employees/:id/salary/advance', wrap(async (req, res) => {
  await addSalaryAdvance(Number(req.params.id), {
    amount: req.body.amount,
    advanceDate: req.body.advance_date,
    note: req.body.note,
  });
  redirectWithMessage(res, `/admin/employees/${req.params.id}/salary`, 'Đã thêm ứng lương.');
}));

router.post('/employees/:id/salary/close-day', wrap(async (req, res) => {
  const result = await closeSalaryDay(Number(req.params.id), {
    closingDate: req.body.closing_date,
    note: req.body.note,
  });

  await sendSalaryDayNotification({
    telegramChatId: result.employee.telegram_chat_id,
    groupName: result.employee.group_name,
    employeeName: result.employee.name,
    closingDate: result.closing.closing_date,
    totalSalary: result.closing.total_salary,
    totalAdvance: result.closing.total_advance,
    netAmount: result.closing.net_amount,
  });

  redirectWithMessage(res, `/admin/employees/${req.params.id}/salary`, 'Đã chốt lương ngày.');
}));

router.post('/employees/:id/salary/close-month', wrap(async (req, res) => {
  const result = await closeSalaryMonth(Number(req.params.id), {
    closingMonth: req.body.closing_month,
    note: req.body.note,
  });

  await sendSalaryMonthNotification({
    telegramChatId: result.employee.telegram_chat_id,
    groupName: result.employee.group_name,
    employeeName: result.employee.name,
    closingMonth: result.closing.closing_month,
    totalSalary: result.closing.total_salary,
    totalAdvance: result.closing.total_advance,
    netAmount: result.closing.net_amount,
  });

  redirectWithMessage(res, `/admin/employees/${req.params.id}/salary`, 'Đã chốt lương tháng.');
}));

router.post('/groups/:id/close-expense-day', wrap(async (req, res) => {
  const result = await closeExpenseDay(Number(req.params.id), {
    closingDate: req.body.closing_date,
    note: req.body.note,
  });

  await sendExpenseDayClosingNotification({
    telegramChatId: result.group.telegram_chat_id,
    groupName: result.group.name,
    closingDate: result.closing.closing_date,
    totalIncome: result.closing.total_income,
    totalExpense: result.closing.total_expense,
    balance: result.closing.balance,
  });

  redirectWithMessage(res, `/admin/groups/${req.params.id}`, 'Đã chốt chi tiêu ngày.');
}));

router.post('/groups/:id/close-expense-month', wrap(async (req, res) => {
  const result = await closeExpenseMonth(Number(req.params.id), {
    closingMonth: req.body.closing_month,
    note: req.body.note,
  });

  await sendExpenseMonthClosingNotification({
    telegramChatId: result.group.telegram_chat_id,
    groupName: result.group.name,
    closingMonth: result.closing.closing_month,
    totalIncome: result.closing.total_income,
    totalExpense: result.closing.total_expense,
    balance: result.closing.balance,
  });

  redirectWithMessage(res, `/admin/groups/${req.params.id}`, 'Đã chốt chi tiêu tháng.');
}));

router.get('/settings', wrap(async (req, res) => {
  const health = await healthCheck();
  res.render('settings', buildViewData(req, {
    pageTitle: 'Settings',
    settings: {
      port: process.env.PORT || '8080',
      databaseSsl: process.env.DATABASE_SSL || 'false',
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasBotToken: Boolean(process.env.BOT_TOKEN),
      adminUsername: process.env.ADMIN_USERNAME || '(chưa set)',
    },
    health,
  }));
}));

module.exports = router;
