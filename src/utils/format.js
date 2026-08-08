function formatCurrency(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(safeAmount)}đ`;
}

function formatMoneyInput(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return '';
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTime(value) {
  if (!value) {
    return '-';
  }

  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatMonth(value) {
  if (!value) {
    return '-';
  }

  const [year, month] = String(value).split('-');
  if (!year || !month) {
    return String(value);
  }

  return `${month}/${year}`;
}

function formatPercent(value) {
  const percent = Number(value || 0);
  const safePercent = Number.isFinite(percent) ? percent : 0;
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safePercent);
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function toDateInputValue(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(value = new Date()) {
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toMonthInputValue(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(value)) {
    return value.slice(0, 7);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseAmount(value) {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  const raw = String(value ?? '').trim().replace(/đ/gi, '').replace(/\s/g, '');
  let normalized;

  if (/^\d+\.\d{1,2}$/.test(raw)) {
    normalized = raw;
  } else if (/^\d+,\d{1,2}$/.test(raw)) {
    normalized = raw.replace(',', '.');
  } else {
    normalized = raw.replace(/[^\d]/g, '');
  }

  if (!normalized) {
    const error = new Error('Số tiền không hợp lệ.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error('Số tiền không hợp lệ.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  return amount;
}

function parsePercent(value) {
  const normalized = String(value ?? '')
    .replace('%', '')
    .replace(',', '.')
    .trim();
  const percent = normalized === '' ? 0 : Number(normalized);

  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    const error = new Error('Phần trăm phải từ 0 đến 100.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  return percent;
}

module.exports = {
  formatCurrency,
  formatMoneyInput,
  formatDate,
  formatTime,
  formatMonth,
  formatPercent,
  toDateInputValue,
  toTimeInputValue,
  toMonthInputValue,
  parseAmount,
  parsePercent,
};
