import pg from 'pg';

const { Pool } = pg;

// Two supported ways to configure the connection:
//   1. DATABASE_URL=postgres://user:password@host:5432/db
//      (a single URL — note: special characters in the password must be
//       percent-encoded, e.g. "@" -> "%40")
//   2. Discrete PG* vars: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
//      (no encoding needed — best when the password has special characters)
const hasUrl = !!process.env.DATABASE_URL;
const hasDiscrete = !!(process.env.PGDATABASE || process.env.PGUSER);

if (!hasUrl && !hasDiscrete) {
  console.error(
    'No database config found. Set DATABASE_URL, or the PG* variables ' +
      '(PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE). See server/.env.example.'
  );
  process.exit(1);
}

// Many managed Postgres providers require SSL; local ones generally don't.
const ssl = process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined;

// When DATABASE_URL is absent, node-postgres reads the PG* env vars itself.
export const pool = new Pool(
  hasUrl ? { connectionString: process.env.DATABASE_URL, ssl } : { ssl }
);

export const query = (text, params) => pool.query(text, params);
