const { query } = require('../config/database');
const { parseAmount } = require('../utils/format');
const { getGroupById } = require('./groupService');

async function listEmployeesByGroup(groupId) {
  const result = await query(
    `SELECT *
     FROM employees
     WHERE group_id = $1
     ORDER BY active DESC, created_at DESC`,
    [groupId]
  );

  return result.rows;
}

async function addEmployee(groupId, { name, role, dailyRate }) {
  await getGroupById(groupId);
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    const error = new Error('Tên nhân viên là bắt buộc.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const result = await query(
    `INSERT INTO employees (group_id, name, role, daily_rate)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [groupId, trimmedName, String(role || '').trim() || null, parseAmount(dailyRate || 0)]
  );

  return result.rows[0];
}

async function getEmployeeById(employeeId) {
  const result = await query(
    `SELECT e.*, g.name AS group_name, g.telegram_chat_id
     FROM employees e
     JOIN groups g ON g.id = e.group_id
     WHERE e.id = $1`,
    [employeeId]
  );

  if (!result.rows[0]) {
    const error = new Error('Không tìm thấy nhân viên.');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  return result.rows[0];
}

module.exports = {
  listEmployeesByGroup,
  addEmployee,
  getEmployeeById,
};
