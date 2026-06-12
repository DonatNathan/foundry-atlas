import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. See server/.env.example.');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Many managed Postgres providers require SSL.
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
});

export const query = (text, params) => pool.query(text, params);
