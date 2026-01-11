// Database module - main entry point
// Re-exports connection, schema, and utilities

export { db, pool, checkConnection, closeConnection } from './connection';
export * from './schema';
