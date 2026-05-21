import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('rds.amazonaws.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const before = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users WHERE email LIKE '%@wezete.com'`,
  );
  const beforeCount = parseInt(before.rows[0].count, 10);
  console.log(`Found ${beforeCount} user(s) with @wezete.com emails`);

  if (beforeCount === 0) {
    console.log('Nothing to rename. Done.');
    await pool.end();
    return;
  }

  const result = await pool.query(
    `UPDATE users
     SET email = REPLACE(email, '@wezete.com', '@greenmark.com'),
         updated_at = NOW()
     WHERE email LIKE '%@wezete.com'
     RETURNING email`,
  );

  console.log(`Renamed ${result.rowCount} user(s):`);
  for (const row of result.rows) {
    console.log(`  -> ${row.email}`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
