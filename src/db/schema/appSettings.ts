/**
 * Application Settings Schema
 * Key-value store for application configuration
 * Allows GUI-based management of environment preferences
 */

import { pgTable, text, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

/**
 * Application Settings Table
 * Stores configuration that can be managed via GUI
 */
export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Setting key (unique identifier)
  key: text('key').notNull().unique(),

  // Setting value (stored as JSON for flexibility)
  value: jsonb('value').notNull(),

  // Setting metadata
  category: text('category').notNull().default('general'),
  label: text('label').notNull(),
  description: text('description'),

  // Value type for UI rendering
  valueType: text('value_type').notNull().default('string'), // string, number, boolean, select, json

  // For select type - available options
  options: jsonb('options'), // Array of { value: string, label: string }

  // Validation
  isRequired: boolean('is_required').notNull().default(false),
  defaultValue: jsonb('default_value'),

  // Whether this setting requires server restart to take effect
  requiresRestart: boolean('requires_restart').notNull().default(false),

  // Display order within category
  sortOrder: text('sort_order').notNull().default('0'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Types
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

// Setting categories
export const SETTING_CATEGORIES = {
  API: 'api',
  SERVER: 'server',
  SECURITY: 'security',
  AI: 'ai',
  GENERAL: 'general',
} as const;

// Default settings to seed
export const DEFAULT_APP_SETTINGS: Omit<NewAppSetting, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // API Settings
  {
    key: 'CASTRO_API_PORT',
    value: 3001,
    category: SETTING_CATEGORIES.API,
    label: 'API Server Port',
    description: 'Port number for the Castro API server',
    valueType: 'number',
    isRequired: true,
    defaultValue: 3001,
    requiresRestart: true,
    sortOrder: '1',
  },
  {
    key: 'CASTRO_DEV_MODE',
    value: true,
    category: SETTING_CATEGORIES.SECURITY,
    label: 'Development Mode',
    description: 'Enable development mode (bypasses authentication). Disable for production.',
    valueType: 'boolean',
    isRequired: false,
    defaultValue: true,
    requiresRestart: true,
    sortOrder: '1',
  },
  {
    key: 'CASTRO_API_KEY',
    value: '',
    category: SETTING_CATEGORIES.SECURITY,
    label: 'API Key',
    description: 'Secret API key for production authentication. Leave empty in dev mode.',
    valueType: 'password',
    isRequired: false,
    defaultValue: '',
    requiresRestart: true,
    sortOrder: '2',
  },
  // AI Settings
  {
    key: 'OLLAMA_BASE_URL',
    value: 'http://localhost:11434',
    category: SETTING_CATEGORIES.AI,
    label: 'Ollama Base URL',
    description: 'Base URL for the Ollama LLM server',
    valueType: 'string',
    isRequired: true,
    defaultValue: 'http://localhost:11434',
    requiresRestart: false,
    sortOrder: '1',
  },
  {
    key: 'OLLAMA_MODEL',
    value: 'llama3.2',
    category: SETTING_CATEGORIES.AI,
    label: 'Ollama Model',
    description: 'Default Ollama model for AI processing',
    valueType: 'string',
    isRequired: true,
    defaultValue: 'llama3.2',
    requiresRestart: false,
    sortOrder: '2',
  },
  {
    key: 'WHISPER_BASE_URL',
    value: 'http://localhost:9000',
    category: SETTING_CATEGORIES.AI,
    label: 'Whisper Base URL',
    description: 'Base URL for the Whisper transcription server',
    valueType: 'string',
    isRequired: true,
    defaultValue: 'http://localhost:9000',
    requiresRestart: false,
    sortOrder: '3',
  },
  // Server Settings
  {
    key: 'LOG_LEVEL',
    value: 'info',
    category: SETTING_CATEGORIES.SERVER,
    label: 'Log Level',
    description: 'Server logging verbosity level',
    valueType: 'select',
    options: [
      { value: 'debug', label: 'Debug' },
      { value: 'info', label: 'Info' },
      { value: 'warn', label: 'Warning' },
      { value: 'error', label: 'Error' },
    ],
    isRequired: true,
    defaultValue: 'info',
    requiresRestart: false,
    sortOrder: '1',
  },
  {
    key: 'MAX_UPLOAD_SIZE_MB',
    value: 100,
    category: SETTING_CATEGORIES.SERVER,
    label: 'Max Upload Size (MB)',
    description: 'Maximum file upload size in megabytes',
    valueType: 'number',
    isRequired: true,
    defaultValue: 100,
    requiresRestart: false,
    sortOrder: '2',
  },
  // Rate Limiting
  {
    key: 'RATE_LIMIT_STANDARD',
    value: 100,
    category: SETTING_CATEGORIES.SECURITY,
    label: 'Standard Rate Limit',
    description: 'Maximum requests per minute for standard API endpoints',
    valueType: 'number',
    isRequired: true,
    defaultValue: 100,
    requiresRestart: true,
    sortOrder: '3',
  },
  {
    key: 'RATE_LIMIT_STRICT',
    value: 10,
    category: SETTING_CATEGORIES.SECURITY,
    label: 'Strict Rate Limit',
    description: 'Maximum requests per minute for sensitive endpoints (credentials, config)',
    valueType: 'number',
    isRequired: true,
    defaultValue: 10,
    requiresRestart: true,
    sortOrder: '4',
  },
];
