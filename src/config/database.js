const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = ['1', 'true', 'yes'].includes(String(process.env.DATABASE_SSL || '').toLowerCase());

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

async function query(text, params = []) {
  if (!pool) {
    const error = new Error('DATABASE_URL is not configured.');
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }

  return pool.query(text, params);
}

async function withTransaction(work) {
  if (!pool) {
    const error = new Error('DATABASE_URL is not configured.');
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function healthCheck() {
  if (!pool) {
    return {
      connected: false,
      message: 'DATABASE_URL is not configured',
    };
  }

  try {
    await pool.query('SELECT 1');
    return {
      connected: true,
      message: 'Database connection is healthy',
    };
  } catch (error) {
    return {
      connected: false,
      message: error.message,
    };
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  healthCheck,
};
