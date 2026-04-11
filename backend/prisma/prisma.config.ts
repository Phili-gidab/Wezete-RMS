import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

const envPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

const dbUrl = result.parsed?.DATABASE_URL || process.env.DATABASE_URL || '';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: dbUrl,
  },
});
