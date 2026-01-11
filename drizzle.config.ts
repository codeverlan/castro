import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  // Schema location
  schema: './src/db/schema/index.ts',
  // Output directory for migrations
  out: './drizzle/migrations',
  // Database dialect
  dialect: 'postgresql',
  // Database connection
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'castro',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  // Verbose output
  verbose: true,
  // Strict mode for safer migrations
  strict: true,
});
