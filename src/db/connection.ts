import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database connection configuration
// Uses environment variables for secure credential management
const connectionConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'castro',
  // Connection pool settings for production use
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '2000'),
};

// Create PostgreSQL connection pool
const pool = new Pool(connectionConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Create Drizzle ORM instance with schema
export const db = drizzle(pool, { schema });

// Export pool for direct access if needed
export { pool };

// Database connection health check
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Graceful shutdown helper
export async function closeConnection(): Promise<void> {
  await pool.end();
}
