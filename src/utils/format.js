function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

function pad(number) {
  return String(number).padStart(2, '0');
}

function toDateInputValue(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
  const normalized = String(value || '').replace(/,/g, '').trim();
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error('Số tiền không hợp lệ.');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  return amount;
}

module.exports = {
  formatCurrency,
  formatDate,
  formatMonth,
  toDateInputValue,
  toMonthInputValue,
  parseAmount,
};
