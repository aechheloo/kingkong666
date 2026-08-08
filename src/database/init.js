const { pool } = require('../config/database');

const statements = [
  `CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    telegram_chat_id TEXT,
    wash_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (wash_fee_percent >= 0 AND wash_fee_percent <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE groups ADD COLUMN IF NOT EXISTS wash_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (wash_fee_percent >= 0 AND wash_fee_percent <= 100)`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    daily_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (daily_rate >= 0),
    revenue_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (revenue_percent >= 0 AND revenue_percent <= 100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS revenue_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (revenue_percent >= 0 AND revenue_percent <= 100)`,
  `CREATE TABLE IF NOT EXISTS salary_entries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS salary_advances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS daily_closings (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    closing_date DATE NOT NULL,
    total_income NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_expense NUMERIC(14, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, closing_date)
  )`,
  `CREATE TABLE IF NOT EXISTS monthly_closings (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    closing_month TEXT NOT NULL,
    total_income NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_expense NUMERIC(14, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, closing_month)
  )`,
  `CREATE TABLE IF NOT EXISTS salary_daily_closings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    closing_date DATE NOT NULL,
    total_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_advance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, closing_date)
  )`,
  `CREATE TABLE IF NOT EXISTS salary_monthly_closings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    closing_month TEXT NOT NULL,
    total_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_advance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
    wash_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    wash_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    revenue_after_wash NUMERIC(14, 2) NOT NULL DEFAULT 0,
    revenue_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    salary_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, closing_month)
  )`,
  `ALTER TABLE salary_monthly_closings ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE salary_monthly_closings ADD COLUMN IF NOT EXISTS wash_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE salary_monthly_closings ADD COLUMN IF NOT EXISTS wash_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE salary_monthly_closings ADD COLUMN IF NOT EXISTS revenue_after_wash NUMERIC(14, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE salary_monthly_closings ADD COLUMN IF NOT EXISTS revenue_percent NUMERIC(5, 2) NOT NULL DEFAULT 0`,
  `ALTER TABLE salary_monthly_closings ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(14, 2) NOT NULL DEFAULT 0`,
  'CREATE INDEX IF NOT EXISTS idx_transactions_group_date ON transactions(group_id, transaction_date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_employees_group ON employees(group_id)',
  'CREATE INDEX IF NOT EXISTS idx_salary_entries_employee_date ON salary_entries(employee_id, work_date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_salary_advances_employee_date ON salary_advances(employee_id, advance_date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_daily_closings_group_date ON daily_closings(group_id, closing_date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_monthly_closings_group_month ON monthly_closings(group_id, closing_month DESC)',
  'CREATE INDEX IF NOT EXISTS idx_salary_daily_closings_employee_date ON salary_daily_closings(employee_id, closing_date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_salary_monthly_closings_employee_month ON salary_monthly_closings(employee_id, closing_month DESC)',
];

async function initDatabase() {
  if (!pool) {
    console.warn('Skipping database initialization because DATABASE_URL is not configured.');
    return;
  }

  const client = await pool.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
  } finally {
    client.release();
  }
}

module.exports = {
  initDatabase,
};
